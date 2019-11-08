#!/usr/bin/env bash

sudo apt update
sudo apt-get install -y expect

echo 'export NVM_DIR="/opt/circleci/.nvm"' >> $BASH_ENV
echo ' [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> $BASH_ENV

source /opt/circleci/.nvm/nvm.sh
nvm install v12
npm install -g npm
nvm alias default v12
