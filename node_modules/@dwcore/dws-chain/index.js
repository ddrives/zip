var Writable = require('readable-stream').Writable
var inherits = require('inherits')
var bufferFrom = require('buffer-from')

if (typeof Uint8Array === 'undefined') {
  var U8 = require('typedarray').Uint8Array
} else {
  var U8 = Uint8Array
}

function ChainStream(opts, cb) {
  if (!(this instanceof ChainStream)) return new ChainStream(opts, cb)

  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}

  var csEncode = opts.encoding
  var shouldInferEncoding = false

  if (!csEncode) {
    shouldInferEncoding = true
  } else {
    csEncode =  String(csEncode).toLowerCase()
    if (csEncode === 'u8' || csEncode === 'uint8') {
      csEncode = 'uint8array'
    }
  }

  Writable.call(this, { objectMode: true })

  this.csEncode = csEncode
  this.shouldInferEncoding = shouldInferEncoding

  if (cb) this.on('finish', function () { cb(this.getBody()) })
  this.body = []
}

module.exports = ChainStream
inherits(ChainStream, Writable)

ChainStream.prototype._write = function(chunk, enc, next) {
  this.body.push(chunk)
  next()
}

ChainStream.prototype.inferEncoding = function (buff) {
  var firstBuffer = buff === undefined ? this.body[0] : buff;
  if (Buffer.isBuffer(firstBuffer)) return 'buffer'
  if (typeof Uint8Array !== 'undefined' && firstBuffer instanceof Uint8Array) return 'uint8array'
  if (Array.isArray(firstBuffer)) return 'array'
  if (typeof firstBuffer === 'string') return 'string'
  if (Object.prototype.toString.call(firstBuffer) === "[object Object]") return 'object'
  return 'buffer'
}

ChainStream.prototype.getBody = function () {
  if (!this.csEncode && this.body.length === 0) return []
  if (this.shouldInferEncoding) this.csEncode = this.inferEncoding()
  if (this.csEncode === 'array') return arrayChainStream(this.body)
  if (this.csEncode === 'string') return stringChainStream(this.body)
  if (this.csEncode === 'buffer') return bufferChainStream(this.body)
  if (this.csEncode === 'uint8array') return u8ChainStream(this.body)
  return this.body
}

var isArray = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]'
}

function isArrayish (arr) {
  return /Array\]$/.test(Object.prototype.toString.call(arr))
}

function isBufferish (p) {
  return typeof p === 'string' || isArrayish(p) || (p && typeof p.subarray === 'function')
}

function stringChainStream (parts) {
  var strings = []
  var needsToString = false
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]
    if (typeof p === 'string') {
      strings.push(p)
    } else if (Buffer.isBuffer(p)) {
      strings.push(p)
    } else if (isBufferish(p)) {
      strings.push(bufferFrom(p))
    } else {
      strings.push(bufferFrom(String(p)))
    }
  }
  if (Buffer.isBuffer(parts[0])) {
    strings = Buffer.concat(strings)
    strings = strings.toString('utf8')
  } else {
    strings = strings.join('')
  }
  return strings
}

function bufferChainStream (parts) {
  var bufs = []
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]
    if (Buffer.isBuffer(p)) {
      bufs.push(p)
    } else if (isBufferish(p)) {
      bufs.push(bufferFrom(p))
    } else {
      bufs.push(bufferFrom(String(p)))
    }
  }
  return Buffer.concat(bufs)
}

function arrayChainStream (parts) {
  var res = []
  for (var i = 0; i < parts.length; i++) {
    res.push.apply(res, parts[i])
  }
  return res
}

function u8ChainStream (parts) {
  var len = 0
  for (var i = 0; i < parts.length; i++) {
    if (typeof parts[i] === 'string') {
      parts[i] = bufferFrom(parts[i])
    }
    len += parts[i].length
  }
  var u8 = new U8(len)
  for (var i = 0, offset = 0; i < parts.length; i++) {
    var part = parts[i]
    for (var j = 0; j < part.length; j++) {
      u8[offset++] = part[j]
    }
  }
  return u8
}
