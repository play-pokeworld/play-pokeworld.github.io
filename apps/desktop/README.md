# Tauri Windows shell

The Tauri 2 shell opens the approved hosted game origin and bundles an NSIS Windows installer (`.exe`). It is not a portable single-file game and it is not built by Expo. The remote capability is limited to `https://play-pokeworld.github.io` and grants no Tauri commands.

Build on Windows 10/11 x64 with Node.js, Rust stable/MSVC, Visual Studio C++ Build Tools and WebView2 Runtime: run `npm install`, then `npm run build`. The installer is generated under `src-tauri/target/release/bundle/nsis/`. The game needs an internet connection; the web assets are not embedded. Change the target in `src-tauri/tauri.conf.json` and matching capability URL together if the deployment moves.
