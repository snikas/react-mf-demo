const createConfig = require('../../tools/webpack.base.cjs');

module.exports = createConfig({
  dirname: __dirname,
  name: 'audit',
  port: 3002,
  title: 'Audit log (standalone)',
  exposes: { './Module': './src/module.tsx' },
});
