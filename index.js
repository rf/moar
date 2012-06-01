module.exports = (function () {

  // for windows, use the javascript version
  if (process.platform == "win32") return require('./moar');
  else return function (options) {

    var spawn = require('child_process').spawn;
    var pager;
    var args = [];

    if (process.env.PAGER) {
      pager = process.env.PAGER;
    } else {
      pager = 'less -R';
    }

    var split = pager.split(' ');
    if (split.length > 1) {
      // there are arguments, handle those separately
      pager = split.shift();
      args = split;
    }

    var ps = spawn(pager, args, {customFds: [-1, 1, 2]}); 

    ps.on('exit', function () {
      ps.stdin.emit('done');
    });

    return ps.stdin;
  };

}());

