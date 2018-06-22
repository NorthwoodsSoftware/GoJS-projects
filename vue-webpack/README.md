# vue-webpack

A GoJS project using vue.js and webpack.

This project also uses TypeScript, to load and re-compile files in the `extensionsTS` directory of the GoJS project.
You can remove the TypeScript dependencies if you are not using any TypeScript sources.

Note that the TypeScript configuration file at `extensionsTS/tsconfig.json` uses ES5 and UMD modules.
We override those settings for this project, by specifying different options to the ts-loader in the `webpack.config.js`.

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build
```

For detailed explanation on how things work, consult the [docs for vue-loader](http://vuejs.github.io/vue-loader).
