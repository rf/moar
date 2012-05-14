# moar

`moar` is an abstraction on top of $PAGER for nodejs.  That is, it helps you
page data in the terminal from node.

On *nix systems, we can simply run $PAGER, and pipe the data in. If $PAGER isn't
set, we default to `less`.

Windows has `more`, but it sucks.  So, on Windows, we fall back to a pure
javascript implementation of similar paging functionality to `less`.

You can install it like this:

```
$ npm i moar
```

and use it like this

```javascript
var moar = require('moar');
require('request')('http://nodejs.org').pipe(moar).on('end', moar.end);
```

`moar` implements some of the writable stream interface, so you can `pipe`
data to it or `write` to it.

# License

MIT, as always.
