# Expo mobile shell

This React Native app wraps the hosted Rework website in `react-native-webview`; it does not translate the vanilla DOM game into native components. The game remains the single gameplay/save implementation.

Default origin: `https://play-pokeworld.github.io/`. Override it with `EXPO_PUBLIC_GAME_URL` after copying `.env.example` to `.env`.

Requires Node 22.13+ for Expo SDK 58. From this folder: `npm install`, `npx expo install --fix`, then `npx expo start`. For an installable Android APK, link this app to an EAS project once (`npx eas-cli init`) and ensure Android signing credentials are set up. A new APK is needed only when the native wrapper itself changes, not when the hosted game is updated. The wrapper fetches the game from the live website. For an initial APK build, link EAS and configure Android signing credentials. This wrapper requires a network connection and does not bundle the game's web assets for offline use. DOM storage is enabled; verify save persistence over app updates and device transfers before distribution.

The Android launcher icon is `assets/icon.png`; the adaptive foreground is `assets/adaptive-icon.png` with a dark background. Changing these images/configuration requires rebuilding and replacing the APK once; web-game updates do not.\n\nOn iPhone/iPad, the web game can be installed without a store: open the deployed game in Safari, tap Share, then **Add to Home Screen**. It runs as an online-first web app and receives game updates from the site on the next load. This is not a native iOS IPA and does not need App Store distribution.
