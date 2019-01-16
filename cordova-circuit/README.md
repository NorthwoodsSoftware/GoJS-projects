This demonstrates a GoJS diagram in Apache Cordova.
No platforms are included by default, they must be added.

First, assuming you already have npm and git:
```
$ npm install
```

Install platforms (such as "browser"):
```
$ node_modules/.bin/cordova platform add browser
```

Build the js bundle:
```
$ webpack
```

Start app with:
```
$ node_modules/.bin/cordova run browser
```
