# Technical note — Update banner, map camera and multiplatform direction

## Current web architecture

Rework is a plain JavaScript/ES-module web game. Screens are constructed as DOM widgets (`UIElement`, `UIButton`, `UIContainer`) and composed through the `Engine`/`AppShell`; game behavior is split into DOM-free systems and typed `EventBus` events. It is not currently a React application.

## Update availability

`UpdateSystem` is a DOM-free singleton. It requests the same-origin `src/config/GameConfig.js` every minute with a cache-busting query and `cache: no-store`, extracts its `VERSION`, and emits `UpdateAvailableEvent` only when the deployed version is newer than the running one. Network/file-protocol errors are ignored and retried on the next interval. The `UpdateBanner` is a global AppShell overlay, listens for the event, renders live-localized text, supports session-only dismissal, and reloads the page on activation. The release pipeline must publish the source version file alongside the app for this detection strategy to work.

## Map camera

`UIMapView` owns a viewBox camera over the existing 1600×960 map. It keeps zoom and pan state across same-region rerenders, resets when the map background changes region, and bounds the camera to the map. Input is handled with Pointer Events (mouse drag when zoomed, one- or two-finger pan/pinch) and wheel zoom; three accessible UI buttons provide zoom in, zoom out and reset. The map's node/travel behavior stays unchanged. `MapInteractionRules` keeps limits and gesture thresholds out of the widget.

## Mobile battle layout

The battle window uses the existing `BattleCombatantCard`/`PokemonCardView`; no parallel mobile battle renderer is introduced. Narrow touch layouts put sprite, identity/status, and move list in separate shrinkable grid areas, allow labels and status groups to wrap, and keep the active scene and cards in document flow instead of clipping them inside a fixed-height battle container. The six team members remain available by normal page scrolling.

## React / Expo / Windows decision

Expo is not a converter for a DOM game. An Expo React Native screen cannot render these existing DOM widgets directly. There are two materially different approaches:

1. **Keep the game web-native and wrap it (recommended first):** use an Expo mobile shell with `react-native-webview` for Android/iOS and keep the current site as the game surface. Package the same web build separately for Windows with Tauri/WebView2 (or Electron). This avoids duplicating game rules and data, but requires persistent WebView storage/save migration checks, offline asset bundling, safe external-link handling, platform navigation, build/signing setup, and validation that the game continues to work under app lifecycle suspension. Expo and the Windows shell remain separate deliverables; Expo alone does not produce the Windows `.exe`.
2. **Rebuild the game in React Native:** reimplement screens, interactions, map, battle view, persistence, and navigation with React Native components, while sharing only suitable DOM-free game logic/data. This offers a more native mobile UX but is a substantial, risky, long-running rewrite; it is not an incremental conversion and can introduce game-rule and save regressions.

A third possibility is to retain the responsive web app and deliver it as a PWA plus a Windows Tauri shell; that is the smallest maintenance burden if an installed Expo app is not a hard requirement.

**Decision and scaffold:** the user selected the recommended Expo WebView + Tauri route, targeting `https://play-pokeworld.github.io/`. Initial shells now live in `apps/mobile/` and `apps/desktop/`: the mobile shell has Android back navigation, external-link policy, DOM storage, and retry UI; the Tauri shell loads only the approved site origin and exposes no native commands. The Windows target is an NSIS `.exe` installer, not a standalone portable executable. These are scaffolds only: no Expo native build or Windows package has been compiled in this environment. After the initial page opens, the launch prompt is opened directly; Settings and the prompt each expose only one “Download” action. Windows and Android use direct GitHub release asset URLs (`Pokeworld-Windows-Setup.exe` and `Pokeworld-Android.apk`). The repository currently has no published assets, so these links will return 404 until the exact-name files are attached to a GitHub Release. Build/sign the Windows NSIS package on Windows with Rust/MSVC; configure Android signing in EAS and produce an installable APK; attach both exact-name assets to a release and test the direct URLs. iOS stays disabled until a public App Store/TestFlight URL is configured: a general web page cannot directly install an IPA. Before distribution, verify the target origin is serving the intended Rework build, WebView save persistence across updates, offline expectations, and OS/app-store signing requirements.
