/**
 * One webpack factory for the shell (host) and every remote.
 *
 * Study notes (see docs/STUDY_GUIDE.md §8):
 *  - Each app is a Module Federation "container". Remotes set `filename: 'remoteEntry.js'`
 *    and `exposes`; the shell has neither and loads remotes *dynamically* from a runtime
 *    manifest (src/federation/loadRemote.ts) instead of a hard-coded `remotes: {}` map.
 *  - `shared` is a short, deliberate list. React must be a singleton: two copies give
 *    "Invalid hook call". `requiredVersion` comes from each app's package.json, so a
 *    mismatch produces a console warning (add `strictVersion: true` to make it fatal).
 *  - `publicPath: 'auto'` lets chunks resolve relative to wherever remoteEntry.js was
 *    served from, which is what makes versioned, relocatable deploys work.
 *  - remoteEntry.js is NOT content-hashed (it is the stable pointer); everything else is.
 */
const fs = require('node:fs');
const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const {
  DefinePlugin,
  container: { ModuleFederationPlugin },
} = require('webpack');

function sharedDeps(pkg) {
  const deps = pkg.dependencies ?? {};
  const singleton = (name, version = deps[name]) => ({ singleton: true, requiredVersion: version });
  return {
    react: singleton('react'),
    'react-dom': singleton('react-dom'),
    'react-dom/client': singleton('react-dom/client', deps['react-dom']),
    // The platform package: hooks, schemas and types every module codes against.
    '@demo/shell-sdk': singleton('@demo/shell-sdk'),
  };
}

/**
 * @param {{ dirname: string, name: string, port: number, title: string,
 *           exposes?: Record<string,string>, define?: (isProd: boolean) => Record<string,string> }} opts
 */
module.exports = function createConfig({ dirname, name, port, title, exposes, define }) {
  return (_env, argv) => {
    const isProd = argv.mode === 'production';
    const pkg = require(path.join(dirname, 'package.json'));
    const publicDir = path.join(dirname, 'public');
    const hashed = isProd ? '[name].[contenthash:8].js' : '[name].js';

    return {
      mode: isProd ? 'production' : 'development',
      context: dirname,
      // index.ts only does `import('./bootstrap')`: the async boundary that lets the
      // share scope negotiate before any shared module (React) is consumed.
      entry: './src/index.ts',
      devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
      output: {
        path: path.join(dirname, 'dist'),
        publicPath: 'auto',
        uniqueName: name,
        filename: hashed,
        chunkFilename: hashed,
        clean: true,
      },
      resolve: { extensions: ['.tsx', '.ts', '.js'] },
      module: {
        rules: [
          {
            test: /\.[jt]sx?$/,
            exclude: /node_modules/,
            use: { loader: 'babel-loader', options: { rootMode: 'upward' } },
          },
          {
            test: /\.css$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  // *.module.css => CSS Modules with an app prefix, so remotes can't
                  // collide with each other or with the shell (CSS isolation).
                  modules: {
                    auto: true,
                    namedExport: false,
                    localIdentName: `${name}__[local]--[hash:base64:5]`,
                  },
                },
              },
            ],
          },
        ],
      },
      plugins: [
        new ModuleFederationPlugin({
          name,
          ...(exposes ? { filename: 'remoteEntry.js', exposes } : {}),
          shared: sharedDeps(pkg),
        }),
        new HtmlWebpackPlugin({ template: path.join(__dirname, 'index.html'), title }),
        new DefinePlugin({
          __APP_VERSION__: JSON.stringify(pkg.version),
          ...(define ? define(isProd) : {}),
        }),
      ],
      // Bundle-size budget: a production build fails if any JS asset grows past this.
      performance: {
        hints: isProd ? 'error' : false,
        maxAssetSize: 250 * 1024,
        maxEntrypointSize: 250 * 1024,
        assetFilter: (file) => file.endsWith('.js'),
      },
      devServer: {
        port,
        hot: false,
        liveReload: true,
        historyApiFallback: true,
        // The shell on :3000 fetches remoteEntry.js from :3001/:3002.
        headers: { 'Access-Control-Allow-Origin': '*' },
        static: fs.existsSync(publicDir) ? { directory: publicDir } : false,
        client: { overlay: { errors: true, warnings: false } },
      },
    };
  };
};
