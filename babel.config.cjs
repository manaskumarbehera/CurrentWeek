// Babel is used ONLY by Jest (via babel-jest) to transpile the ES-module source
// (week.js export syntax) down to CommonJS for the test runner. Vite/esbuild
// builds the extension itself and does not use this config.
module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
};
