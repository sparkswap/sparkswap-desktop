## Setup

1. Run `npm install` to install dependencies

## Develop

Run `npm run dev` to open the electron and app and serve the development React app.

Ignore the Browser window that opens - it won't work as the app currently relies on electron.

React will update when you make changes, so if you change anything in `src`, the app will reload.

However, if you change anything in `electron` or `main.js` you'll need to reload by running `npm start` again.

## Build

1. Build the React app with `npm run build`
2. Build the Electron releases with `npm run package` (you can run releases for individual platforms too)

## Common Build Errors

- If `postinstall` (electron-builder) results in compiler errors, you may have encountered an outstanding grpc bug.
  gprc fails to compile on Linux / GCC 8.x.x. The current workaround for this is:
 `CXX=/usr/bin/g++-7 CC=/usr/bin/gcc-7 npm i`. This requires having
  GCC 7 installed, via `sudo apt-get install g++-7`

## Releases

To build dmg, AppImage, and exe for Sparkswap Desktop, run the following commands.

```
npm run build-prod && npm run package-all
```

Additionally, each package has its own individual command for being built:
```
npm run package-mac
npm run package-win
npm run package-linux
```

NOTE: You can only build for mac when using mac (this is not suported on linux).
NOTE: `wine` is required to build packages for windows if you are on a non-windows machine

All releases should be performed on Mac, as this is the only platform that will allow us building the app for all platforms
