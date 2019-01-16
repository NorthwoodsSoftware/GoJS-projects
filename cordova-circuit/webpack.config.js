const config = {
  mode: "none",
  entry: "./www/js/logicCircuit.js",
  output: {
    path: __dirname + "/www/js",
    filename: "bundle.js"
  }
}

module.exports = config;