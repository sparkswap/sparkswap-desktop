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
    rm -f ../shared
    mkdir -p ../shared
    cp -r ./shared/. ../shared
    git filter-branch --tag-name-filter cat --subdirectory-filter client
    rm -rf ./.git
    rm ./src/global-shared
    cp -r ../shared/. ./src/global-shared
)

echo "Pushing code changes to sparkswap-desktop"
(
    cp -rf ./satstacker/. ./sparkswap-desktop
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
