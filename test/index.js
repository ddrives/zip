const tape = require('tape')
const ddrive = require('@ddrive/core')
const yauzl = require('yauzl')
const tempy = require('tempy')
const fs = require('fs')
const path = require('path')
const dws2Chain = require('@dwcore/dws2-chain')
const dpackapi = require('@dpack/api')
const toZipStream = require('../')

function readFile (name) {
  return fs.readFileSync(path.join(__dirname, name), 'utf8')
}

tape('creates a valid zip vault', async t => {
  var vault = ddrive(tempy.directory())
  await new Promise(vault.ready)
  await dpackapi.writeFile(vault, 'hello.txt', readFile('hello.txt'), 'utf8')
  await dpackapi.writeFile(vault, 'log.js', readFile('log.js'), 'utf8')
  await dpackapi.mkdir(vault, 'dir')
  await dpackapi.writeFile(vault, 'dir/hello.txt', readFile('dir/hello.txt'), 'utf8')

  toZipStream(vault).pipe(dws2Chain(zipBuf => {
    console.log('is here')

    yauzl.fromBuffer(zipBuf, (err, zip) => {
      if (err) throw err
      getAllEntries(zip, entries => {
        t.equal(Object.keys(entries).length, 3)
        t.ok(entries['hello.txt'])
        t.ok(entries['log.js'])
        t.ok(entries['dir/hello.txt'])
        t.end()
      })
    })

  }))
})

tape('creates a valid zip vault from an empty vaults', async t => {
  var vault = ddrive(tempy.directory())
  await new Promise(vault.ready)

  toZipStream(vault).pipe(dws2Chain(zipBuf => {

    yauzl.fromBuffer(zipBuf, (err, zip) => {
      if (err) throw err
      getAllEntries(zip, entries => {
        t.equal(Object.keys(entries).length, 0)
        t.end()
      })
    })

  }))
})

function getAllEntries (zip, cb) {
  var entries = {}
  zip.on('entry', entry => {
    entries[entry.fileName] = entry
  })
  zip.on('end', () => cb(entries))
}
