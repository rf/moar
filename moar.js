var term = require('node-terminal');
var util = require('utile');
var wordwrap = require('wordwrap');
var _ = require('underscore');
var tty = require('tty');
var EventEmitter = require('events').EventEmitter;

var size = process.stdout.getWindowSize();
var height = size[1] - 1;
var width = size[0] - 1;

var wrap = wordwrap(width, {mode: 'hard'});

module.exports = function (options) {
  var exports = new EventEmitter();
  var buffer = [];
  var start = 0;
  var stdin;
  var searchBuffer = '';
  var visible = 0;

  var mode = 'command';

  term.clear();

  function refresh () {
    _.each(buffer.slice(start, start + height), function (item, index) {
        term
          .move(index, 0)
          .clearCharacters(width)
          .move(index, 0)
          .write(item);
    });

    if (mode == 'command') {
      term
        .move(height, 0)
        .clearCharacters(width)
        .move(height, 0)
        .write(':');
    }

    if (mode == 'search' || mode == 'searchExecute') {
      term
        .move(height, 0)
        .clearCharacters(width)
        .move(height, 0)
        .write('/' + searchBuffer);
    }

    visible = buffer.length;
  }

  function write (data) {
    buffer = buffer.concat((wrap(data).split('\n')));
    if (visible < height) refresh();
  }

  function listener (chunk, key) {
    if (key) {
      if (key.name == 'up') start -= 1;
      if (key.name == 'down' || (key.name == 'enter' && mode != 'search'))
        start += 1;

      if (key.name == 'pageup') start -= height;
      if (key.name == 'pagedown' || (chunk == ' ' && mode != 'search')) start += height;

      if (key.name == 'q' || (key.ctrl && key.name == 'c')) {
        tty.setRawMode(false);
        term.clear();
        process.stdin.removeListener('keypress', listener);
        exports.emit('done');
      }

      if (key.name == 'escape') {
        mode = 'command';
        searchBuffer = '';
      }

      if (key.name == 'backspace') {
        searchBuffer = searchBuffer.slice(0, searchBuffer.length - 2);
      }

      if (key.name == 'enter') {
        if (mode == 'search') {
          mode = 'searchExecute';
        } 
      }
    }

    if (mode == 'search' && chunk) {
      searchBuffer += chunk;
    }

    if (chunk == '/') {
      if (mode == 'command') {
        mode = 'search';
      }
    }

    if (start < 0) start = 0;
    if (start > buffer.length - height) start = buffer.length - height;

    refresh();
  }

  process.nextTick(function () {
    stdin = process.openStdin();
    process.stdin.on('keypress', listener);
    tty.setRawMode(true);
  });

  exports.write = write;
  exports.refresh = refresh;

  process.on('exit', function () { tty.setRawMode(false); });

  return exports;
};

