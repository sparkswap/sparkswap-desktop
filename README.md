## Sparkswap Desktop

### Setup

1. Install [NodeJS 12](https://nodejs.org/en/)
2. Clone [this repo](https://github.com/sparkswap/sparkswap-desktop)
3. Run `npm install` to install dependencies

### Building for your platform

```
npm run package
```

This command will create a package of Sparkswap Desktop using a friendly file format for your current OS (either `dmg`, `AppImage`, or `exe`).

> We only support packages being built on a native OS. Building mac on windows, etc. will not work

### Running Sparkswap Desktop in Development

After running through the [setup](#setup) steps, run the following command to open an electron and react development environment:
```
npm run dev
```

React will update when you make changes, so if you change anything in `src`, the app will reload.

However, if you change anything in `electron` or `main.js` you'll need to reload by killing the current process and running `npm start` again.

## Troubleshooting

On Linux, if `postinstall` (electron-builder) results in compiler errors, you may have encountered an outstanding grpc bug. Depending on the system type, gprc may fail to compile on distributions using GCC 8.x.x. Use the following commands as a workaround:

```
sudo apt-get install g++-7
CXX=/usr/bin/g++-7 CC=/usr/bin/gcc-7 npm i
```
