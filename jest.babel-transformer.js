// Jest transform for `npm run test:coverage` (plain jest). CRA's
// react-scripts test supplies its own babel config, but standalone jest
// needs babel-preset-react-app wired explicitly to parse JSX/ESM.
const babelJest = require('babel-jest');

module.exports = (babelJest.default || babelJest).createTransformer({
  presets: [require.resolve('babel-preset-react-app')],
  babelrc: false,
  configFile: false,
});
