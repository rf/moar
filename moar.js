var term = require('node-terminal');
var util = require('utile');
var wordwrap = require('wordwrap');
var _ = require('underscore');
var tty = require('tty');
var colors = require('colors');
var EventEmitter = require('events').EventEmitter;


var fs = require('fs'); var path = require('path');

var size = process.stdout.getWindowSize();
var height = size[1] - 1;
var width = size[0] - 1;

// on windows the cursor wants to occupy its own line on the bottom.. or
// something like that
if (process.platform == "win32") height--;

var wrap = wordwrap(width, {mode: 'hard'});

module.exports = function (options) {
  var exports = new EventEmitter();   // based on an EE
  var buffer = [];                    // data, split into lines of length width
  var searchResults = [];         // searchResults[i] = buffer[i].match(regex);
  var previousStart = 0;          // we only refresh when start has changed
  var start = 0;                  // first line of buffer displayed on screen
  var commandBuffer = '';
  var searchDirection;            // either ? or /
  var visible = 0;                // only used on initial draw
  var currentSearchIndex = null;  // current index of search

  // possible modes:
  //   'search': entering a search string
  //   'searchExecute': executing a search
  //   'command': prompt with : for command, doesnt do anything currently
  var mode = 'command';

  term.clear();

  if (options.nowrap) {
    wrap = function (data) { return data; };
  }

  // actually run the search
  function search () {
    var step = searchDirection == '?' ? -1 : +1;
    var index = start + step;
    var wrapped = 0;
    var lineCount = 0;
    var found = false;
    var regex = new RegExp(commandBuffer);

    while (wrapped <= 1 && lineCount < height) {
      if (!searchResults[index] && buffer[index] !== undefined) {
        searchResults[index] = buffer[index].match(regex);

        // this is how we mark a line as "we searched this already but found
        // nothing".  Unfortunately each searchResult space is a tri-state; it
        // can either be 'searched with result', 'searched without result' or
        // 'not searched at all'
        if (!searchResults[index]) searchResults[index] = {index: -1};
      }

      if (searchResults[index] && searchResults[index].index != -1) {
        found = true;
        if (currentSearchIndex === null) currentSearchIndex = index;
      }

      if (found) { 
        lineCount += 1;
      }

      index += step;

      if (index < 0) {
        index = buffer.length - 1;
        wrapped += 1;
      }

      if (index >= buffer.length) {
        index = 0;
        wrapped += 1;
      }
    }

    // no search results found
    if (wrapped > 1) {
      mode = 'searchFailure';
    }
  }

  // seek forward and back in the search results
  function searchSeek (step) {
    var index = currentSearchIndex + step;
    var wrapped = 0;

    while (wrapped <= 1) {
      if (searchResults[index] && searchResults[index].index != -1) {
        currentSearchIndex = index;
        break;
      }
      index += step;
      if (index < 0) {
        index = buffer.length - 1;
        wrapped += 1;
      }

      if (index >= buffer.length) {
        index = 0;
        wrapped += 1;
      }
    }

    if (wrapped > 1) currentSearchIndex = null; // ie nothing was found
    else start = Math.max(0, currentSearchIndex - (height / 2));

    search();
    refresh();
  }

  function searchReset (direction) {
    mode = 'search';
    searchDirection = direction;
    commandBuffer = '';
    searchResults = [];
    currentSearchIndex = null;
  }

  function refresh () {
    if (start > buffer.length - height) start = buffer.length - height;
    if (start < 0) start = 0;

    // print each line
    _.each(buffer.slice(start, start + height), function (item, index) {
        term
          .move(index, 0)
          .clearCharacters(width)
          .move(index, 0);

        // nasty hacky crap to highlight the search term
        if (currentSearchIndex == (index + start)) {
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
    term
      .move(height, 0)
      .clearCharacters(width)
      .move(height, 0);

    if (mode == 'command') {
      term.write(':' + commandBuffer);
    } else if (mode == 'search') {
      term.write(searchDirection + commandBuffer);
    } else if (mode == 'searchExecute') {
      term.write(searchDirection + commandBuffer.cyan.underline);
    } else if (mode == 'searchFailure') {
      term.write("no results found".red);
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

      if (key.name == 'j' && mode != 'search') start += 1;
      if (key.name == 'k' && mode != 'search') start -= 1;

      if ((key.name == 'q' || (key.ctrl && key.name == 'c')) && mode != 'search') {
        tty.setRawMode(false);
        term.clear();
        process.stdin.removeListener('keypress', listener);
        exports.emit('done');
      }

      if (key.name == 'escape') {
        mode = 'command';
        commandBuffer = '';
      }

      if (key.name == 'backspace' && mode == 'search') {
        commandBuffer = commandBuffer.slice(0, commandBuffer.length - 1);
      }

      if (key.name == 'enter') {
        if (mode == 'search') {
          mode = 'searchExecute';
          currentSearchIndex = start;
          if (searchDirection == '/') searchSeek(+1);
          if (searchDirection == '?') searchSeek(-1);
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

    if (chunk == '/' && mode != 'search') searchReset('/');
    if (chunk == '?' && mode != 'search') searchReset('?');

    if (start != previousStart) {
      refresh();
      if (mode == 'searchExecute') {
        search();
      }
    }

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

