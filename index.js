const yazl = require('yazl')
const dws2wrap = require('@dwcore/dws2wrap')
const through2Concurrent = require('through2-concurrent')
const dpackapi = require('@dpack/api')

module.exports = function (vault) {
  var zipfile = new yazl.ZipFile()

  // create listing stream
  dpackapi.readdir(vault, '/', {recursive: true}).then(paths => {
    var i = 0
    var listingStream = dws2wrap.obj((size, next) => {
      if (i >= paths.length) {
        return next(null, null)
      }
      next(null, paths[i++])
    })

    // create the writestream
    var zipWriteStream = listingStream
      .pipe(through2Concurrent.obj({ maxConcurrency: 3 }, async (path, enc, cb) => {
        // files only
        try {
          var entry = await dpackapi.stat(vault, path)
          if (!entry.isFile()) {
            return cb()
          }
        } catch (e) {
          return cb()
        }

        // pipe each entry into the zip
        var fileReadStream = vault.createReadStream(path)
        zipfile.addReadStream(fileReadStream, path)
        fileReadStream.on('error', onerror)
        fileReadStream.on('end', cb)
      }))
    zipWriteStream.on('data', ()=>{})
    zipWriteStream.on('error', onerror)
    zipWriteStream.on('end', () => {
      zipfile.end()
    })
  }).catch(onerror)

  // on error, push to the output stream
  function onerror (e) {
    zipfile.outputStream.emit('error', e)
  }

  return zipfile.outputStream
}