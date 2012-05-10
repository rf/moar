# moar

<img src="https://github.com/russfrank/moar/raw/master/shot.png">

a pager for nodejs.  Install it with npm

```
$ npm i -g moar
```

now you can `moar` some files

```
$ moar README.md
```

It's really meant to be used programatically.  It partially implements the 
writable stream interface, so you can just pipe stuff into it.  It's also
an EventEmitter; it emits `done` when the user presses q or ctrl+c to stop
viewing the data.

```javascript
var moar = require('moar')();

moar.write('some stuff');
moar.write('yay');

require('request')('http://nodejs.org').pipe(moar);

moar.on('done', process.exit);
```

## what?

Look, I'm not happy about this either. The problem is that there isn't a good
way to page data cross platform. Also, I don't know how your $PAGER works, or
if it's going to be okay with the data I'd like to give it.

Thus, I present `moar`.  It will (eventually) support most of the features
`less` supports.  But instead of being written in C, it's written in javascript
so we can all hack on it and have fun with it and benefit from the awesome
cross platform ansi-to-win32-console-api magic that the libuv folks have
slaved over.

## why not just pipe to $PAGER

Look, I tried to get this to work for a while.  Trust me, it wasn't my first
instinct to re-implement $PAGER's functionality in javascript.  But without
using either a native module or internal node APIs, it's just not possible;
and even with the internal APIs it's ugly (would probably have to hit a file
first).

