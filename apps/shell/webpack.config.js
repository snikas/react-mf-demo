const createConfig = require('../../tools/webpack.base.cjs');

// The shell is a host with NO static `remotes` map. It reads the runtime manifest named
// below and loads each remote's remoteEntry.js on demand (src/federation/loadRemote.ts).
module.exports = createConfig({
  dirname: __dirname,
  name: 'shell',
  port: 3000,
  title: 'Protection Console (MF demo)',
  define: (isProd) => ({
    __REMOTES_MANIFEST__: JSON.stringify(isProd ? 'remotes.json' : 'remotes.local.json'),
  }),
});
