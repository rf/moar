var term = require('node-terminal');
var util = require('utile');
var wordwrap = require('wordwrap');
var _ = require('underscore');
var tty = require('tty');
var colors = require('colors');
var EventEmitter = require('events').EventEmitter;

var size = process.stdout.getWindowSize();
var height = size[1] - 1;
var width = size[0] - 1;

var wrap = wordwrap(width, {mode: 'hard'});

module.exports = function (options) {
  var exports = new EventEmitter();
  var buffer = [];
  var searchResults = [];
  var previousStart = 0;
  var commandBufferLength = 0;
  var start = 0;
  var commandBuffer = '';
  var searchDirection;
  var visible = 0;
  var mode = 'command';

  term.clear();

  // actually run the search
  function search () {
    var regex = new RegExp(commandBuffer);
    for (var i = start; i < start + height; i++) {
      if (!searchResults[i] && buffer[i] !== undefined) {
        searchResults[i] = buffer[i].match(regex);
      }
    }
  }

  function refresh () {
    _.each(buffer.slice(start, start + height), function (item, index) {
        term
          .move(index, 0)
          .clearCharacters(width)
          .move(index, 0);

        if (searchResults[index + start]) term.write(item.blue);
        else term.write(item);
    });

    drawPrompt();

    visible = buffer.length;
  }

  function drawPrompt () {
    if (mode == 'command') {
      term
        .move(height, 0)
        .clearCharacters(width)
        .move(height, 0)
        .write(':' + commandBuffer);
    }

    if (mode == 'search' || mode == 'searchExecute') {
      term
        .move(height, 0)
        .clearCharacters(width)
        .move(height, 0)
        .write(searchDirection + commandBuffer);
    }
  }

  function write (data) {
    // if we're given a buffer
    if (data.isBuffer) data = data.toString('utf8');
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

      if (key.name == 'j') start += 1;
      if (key.name == 'k') start -= 1;

      if (key.name == 'q' || (key.ctrl && key.name == 'c')) {
        tty.setRawMode(false);
        term.clear();
        process.stdin.removeListener('keypress', listener);
        exports.emit('done');
      }

      if (key.name == 'escape') {
        mode = 'command';
        commandBuffer = '';
      }

      if (key.name == 'backspace') {
        commandBuffer = commandBuffer.slice(0, commandBuffer.length - 1);
      }

      if (key.name == 'enter') {
        if (mode == 'search') {
          mode = 'searchExecute';
          search();
          refresh();
        } 
      }
    }

    if (mode == 'search' && (key && key.name != 'backspace') && chunk !== undefined) {
      commandBuffer += chunk;
    }

    if (chunk == '/') {
      if (mode != 'search') {
        mode = 'search';
        searchDirection = '/';
        commandBuffer = '';
        searchResults = [];
      }
    }

    if (chunk == '?') {
      if (mode != 'search') {
        mode = 'search';
        searchDirection = '?';
        commandBuffer = '';
        searchResults = [];
      }
    }

    if (start < 0) start = 0;
    if (start > buffer.length - height) start = buffer.length - height;

    if (mode == 'searchExecute') search();

    if (start != previousStart) refresh();

    drawPrompt();

    previousStart = start;
  }

  function end () { /* nop */ }

  process.nextTick(function () {
    process.openStdin();
    process.stdin.on('keypress', listener);
    tty.setRawMode(true);
  });

  exports.write = write;
  exports.refresh = refresh;
  exports.end = end;
  exports.writable = true;

  process.on('exit', function () { tty.setRawMode(false); });

  return exports;
};

