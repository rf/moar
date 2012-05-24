var moar = require('./index')();

require('request')('http://nodejs.org').pipe(moar).on('end', moar.end);
