const createConfig = require('../../tools/webpack.base.cjs');

module.exports = createConfig({
  dirname: __dirname,
  name: 'policies', // becomes window.policies when remoteEntry.js loads
  port: 3001,
  title: 'Policies (standalone)',
  exposes: { './Module': './src/module.ts' },
});
