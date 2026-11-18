// Shared by every app. webpack's babel-loader finds it via `rootMode: 'upward'`.
// Type-checking is done separately by `tsc --noEmit`; Babel only strips types.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: 'defaults' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
