/** Direct latest-release asset destinations used by the platform-specific download button. */
const LATEST_ASSET_BASE_URL = 'https://github.com/play-pokeworld/play-pokeworld.github.io/releases/latest/download';
const WINDOWS_ASSET_NAME = 'Pokeworld-Windows-Setup.exe';
const ANDROID_ASSET_NAME = 'Pokeworld-Android.apk';

export const DownloadRules = Object.freeze({
  LATEST_ASSET_BASE_URL,
  WINDOWS_ASSET_NAME,
  ANDROID_ASSET_NAME,
  PLATFORM_DOWNLOAD_URLS: Object.freeze({
    WINDOWS: `${LATEST_ASSET_BASE_URL}/${WINDOWS_ASSET_NAME}`,
    ANDROID: `${LATEST_ASSET_BASE_URL}/${ANDROID_ASSET_NAME}`,
    IOS: '',
    OTHER: ''
  })
});
