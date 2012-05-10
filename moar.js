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

  // possible modes:
  //   'search': entering a search string
  //   'searchExecute': executing a search
  //   'command': prompt with : for command, doesnt do anything currently
  var mode = 'command';
  var currentSearchIndex = null;

  term.clear();

  // actually run the search
  function search () {
    var regex = new RegExp(commandBuffer);
    var first, last;
    for (var i = start; i < start + height; i++) {
      if (!searchResults[i] && buffer[i] !== undefined) {
        searchResults[i] = buffer[i].match(regex);
        if (!currentSearchIndex && searchResults[i]) currentSearchIndex = i;
      }
    }
  }

  // seek forward and back in the search results
  function searchSeek (step) {
    var index = currentSearchIndex + step;

    while (index < buffer.length && index > 0) {
      if (searchResults[index]) {
        currentSearchIndex = index;
        break;
      }
      index += step;
    }

    if (currentSearchIndex > height / 2) 
      start = currentSearchIndex - (height / 2);

    search();
    refresh();
  }

  function searchReset (direction) {
    mode = 'search';
    searchDirection = direction;
    commandBuffer = '';
    searchResults = [];
  }

  function refresh () {
    if (start < 0) start = 0;
    if (start > buffer.length - height) start = buffer.length - height;

    _.each(buffer.slice(start, start + height), function (item, index) {
        term
          .move(index, 0)
          .clearCharacters(width)
          .move(index, 0);

        if (currentSearchIndex == index + start) {
          var searchIndex = searchResults[index + start].index;
          var searchLength = searchResults[index + start][0].length;
          term.write(item.slice(0, searchResults[index + start].index));
          term.write(searchResults[index + start][0].underline.cyan);
          term.write(item.slice(searchIndex + searchLength));
        } else term.write(item);
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

    if (mode == 'searchExecute') {
      if (chunk == 'n' && searchDirection == '/') searchSeek(+1);
      if (chunk == 'N' && searchDirection == '/') searchSeek(-1);
      if (chunk == 'n' && searchDirection == '?') searchSeek(-1);
      if (chunk == 'N' && searchDirection == '?') searchSeek(+1);
    }

    if (mode == 'search' && (key && key.name != 'backspace') && chunk !== undefined) {
      commandBuffer += chunk;
    }

    if (chunk == '/' && mode != search) searchReset('/');
    if (chunk == '?' && mode != search) searchReset('?');

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

