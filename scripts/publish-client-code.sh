#!/usr/bin/env bash

set -e -u

echo ""
echo "Building sparkswap client for distribution"
echo ""

TAG=$1

echo "Moving to root directory of satstacker"
cd "$(dirname "$0")"
cd "../"

echo "Removing any existing working directory"
rm -rf ./publish-client-temp

echo "Creating working directory 'publish-client-temp' in $(pwd)"
mkdir -p publish-client-temp
cd publish-client-temp

echo "Setting up git for CI"
git config --list | grep -q user.email || git config --global user.email "dev@sparkswap.com"
git config --list | grep -q user.name || git config --global user.name "Sparkswap"

echo "Cloning satstacker"
git clone -b "$TAG" --single-branch git@github.com:sparkswap/satstacker.git

echo "Cloning sparkswap-desktop for updating"
git clone --single-branch git@github.com:sparkswap/sparkswap-desktop.git

echo "Preparing satstacker to be copied to client"
(
    cd satstacker
    # create a shared temp directory to copy files into so they wont get blown
    # away by the filter below
    mkdir -p ../shared-temp
    cp -r ./shared/. ../shared-temp
    git filter-branch --tag-name-filter cat --subdirectory-filter client
    rm -rf ./.git
    # We create a fake shared directory here so that we can remove the global-shared
    # symlink correctly
    mkdir -p ../shared
    # Remove symlink, we'll replace this directory below
    rm ./src/global-shared
    rm -rf ../shared
    mkdir -p ./src/global-shared
    cp -r ../shared-temp/. ./src/global-shared
)

echo "Preparing sparkswap-desktop"
(
    rm -r ./sparkswap-desktop/*
    cp -rf ./satstacker/. ./sparkswap-desktop
)

echo "Running tests"
cd sparkswap-desktop
npm install
npm run ci-test
cd ../

echo "Pushing code changes to sparkswap-desktop"
(
    cd sparkswap-desktop
    git add .
    git commit -m "Publishing client to sparkswap-desktop: $TAG"
    git tag -a $TAG -m "Adding tag for release $TAG"
    git push origin master
    git push origin master --tags
)

echo "Removing working directory"
cd ..
rm -rf ./publish-client-temp

echo "Done."
