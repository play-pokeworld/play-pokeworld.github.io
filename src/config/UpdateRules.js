/** @file UpdateRules.js — same-origin update check settings. */
export const UpdateRules = Object.freeze({
  VERSION_SOURCE_PATH: './src/config/GameConfig.js',
  DEPLOYMENT_SOURCE_PATH: './src/config/DeploymentConfig.js',
  CHECK_INTERVAL_MS: 60000,
  CACHE_BUSTER_PARAM: '_pw_update'
});
