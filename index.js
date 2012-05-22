module.exports = (function () {

  // for windows, use the javascript version
  if (process.platform == "win32") return require('./moar')();

  var spawn = require('child_process').spawn;
  var pager;

  if (process.env.PAGER) {
    pager = process.env.PAGER;
  } else {
    pager = 'less';
  }

  // less needs -F to handle ansi color escapes properly
  if (pager == 'less') args = ['-R']; 

  var ps = spawn(pager, args, {customFds: [-1, 1, 2]}); 

  ps.on('exit', function () {
    ps.stdin.emit('done');
  });

  return ps.stdin;

}());

