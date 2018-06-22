<template>
  <div id="app">
    <h1>GoJS + Vue.js + Webpack:</h1>

    <Diagram></Diagram>

    <h2>Essential Links</h2>
    <p>This project also uses TypeScript, to load and re-compile files in the <code>extensionsTS</code> directory of the GoJS project.
      You can remove the TypeScript dependencies if you are not using any TypeScript sources.</p>

    <p>Note that In GoJS, the <code>extensionsTS</code> directory has a <code>tsconfig.json</code> file which targets ES5 and UMD modules.
      We need to compile with ES6 and ES6 modules, so this project's <code>webpack.config.js</code> file overrides this default TypeScript config.</p>

    <p>GoJS specific code is located in <code>/components/diagram.vue</code>.</p>


  </div>
</template>

<script>
  import Diagram from './components/Diagram'
  export default {
    name: 'App',
    components: {
      Diagram
    }
  }
</script>


<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
