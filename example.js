var moar = require('./index');

moar.write('hello');

var r1 = require('request')('http://nodejs.org').pipe(moar);
var r2 = require('request')('http://google.org').pipe(moar);

require('async').parallel([
  function (callback) { r1.on('end', callback); },
  function (callback) { r2.on('end', callback); },
], moar.end);

moar.on('done', process.exit);

