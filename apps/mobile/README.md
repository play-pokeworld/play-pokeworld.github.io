# Expo mobile shell

This React Native app wraps the hosted Rework website in `react-native-webview`; it does not translate the vanilla DOM game into native components. The game remains the single gameplay/save implementation.

Default origin: `https://play-pokeworld.github.io/`. Override it with `EXPO_PUBLIC_GAME_URL` after copying `.env.example` to `.env`.

Requires Node 22.13+ for Expo SDK 58. From this folder: `npm install`, `npx expo install --fix`, then `npx expo start`. For store builds configure EAS, app signing and store accounts. This wrapper requires a network connection and does not bundle the game's web assets for offline use. DOM storage is enabled; verify save persistence over app updates and device transfers before distribution.
