var ddatabase = require('../..')
var DWREM = require('@ddatabase/ddb-rem')

module.exports = function create (key, opts) {
  return ddatabase(DWREM, key, opts)
}
