var test = require('tape')
var fs = require('fs')
var VFSystemWrapper = require('./index')

test('Reads are constrained to the given dir', t => {
  var indexjs = fs.readFileSync('./index.js', 'utf8')
  var vfsw = new VFSystemWrapper(__dirname)
  vfsw.readFile('index.js', 'utf8', (err, v) => {
    t.error(err)
    t.same(indexjs, v)
    vfsw.readFile('/index.js', 'utf8', (err, v) => {
      t.error(err)
      t.same(indexjs, v)
      vfsw.readFile('../index.js', 'utf8', (err, v) => {
        t.ok(!!err)
        t.end()
      })
    })
  })
})
