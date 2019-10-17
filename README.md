# Sparkswap Desktop

Buy Bitcoin instantly on the Lightning Network.

<img src="https://sparkswap.com/img/buy-btc.gif" alt="Sparkswap - stack your sats" width="600">

### Download Sparkswap Desktop

Navigate to Sparkswap Desktop's [Latest Release](https://github.com/sparkswap/sparkswap-desktop/releases/latest) and download the file for your specific platform.

- `.dmg` (macOS)
- `.exe` (Windows 8/10)
- `.AppImage` (Ubuntu/Linux)

### Verify the release

With every release, Sparkswap will cryptographically sign each application to allow users to ensure that your downloaded application was not modified by a third party. Below are instructions on how you can verify your copy of Sparkswap Desktop.

#### Before you begin

1. Install `gpg`
2. Install `sha256sum`

#### Verification steps

1. To verify your application, you will first need to verify that the releaselchecksum file `sha256sum.txt.asc` has been signed with RSA `36F4123656A9401723777B9C3692B7471CC2F716`.
```
curl -Ls https://github.com/sparkswap/sparkswap-desktop/releases/download/v0.2.0/sha256sum.txt.asc -o sha256sum.txt.asc
gpg --verify sha256sum.txt.asc
```

The file `sha256sum.txt.asc` contains cryptographic hashes of all Sparkswap Desktop applications that we will use in the next step as verification that our version of Sparkswap Desktop has not been modified.

2. Hash your downloaded copy of Sparkswap Desktop
```
sha256sum <path-to-sparkswap-desktop-file>
```

3. Verify that the output from step #2 matches the same output that is located in `sha256sum.txt.asc`
```
cat sha256sum.txt.asc
```

If the hashes match, then you have successfully verified your copy of Sparkswap Desktop.


**Additional Verification For Mac:**

1. Verify that `Sparkswap Hub, Inc.` is the signer of the application by running the following command:
```
codesign -dv --verbose=4 /Path/To/Application.app
```

**Additional Verification For Windows:**

1. Right click the exe and select Properties > Digital Signatures
2. Select the sparkswap signature and click Details
3. Verify that the information was signed by `Sparkswap Hub, Inc.`

## Installing from source

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
