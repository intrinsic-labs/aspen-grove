// The app config lives in app.json. This file only adds checks that need code.
const { assertReleaseEnvClean } = require('./config/release-env-guard');

module.exports = ({ config }) => {
  assertReleaseEnvClean(process.env);
  return config;
};
