var moar = require('./index')();

moar.write('hello');

var req = require('request')('http://nodejs.org').pipe(moar);
req.on('end', moar.end);
moar.on('done', process.exit);

