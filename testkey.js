var tty = require('tty');

process.openStdin();
tty.setRawMode(true);
process.stdin.on('keypress', function (chunk, key) {
  console.dir(chunk);
  console.dir(key);
  if (key && key.name == 'q') { tty.setRawMode(false); process.exit(); }
});
