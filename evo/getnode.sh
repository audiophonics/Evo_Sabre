#!/bin/sh
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-armv7l.tar.xz
tar -xf node-v20.11.0-linux-armv7l.tar.xz
rm -f node-v20.11.0-linux-armv7l.tar.xz
mv node-v20.11.0-linux-armv7l node
rm -f node/README.md
rm -f node/LICENSE
rm -f node/CHANGELOG.md
rm -rf node/share/
tce-load -wi squashfs-tools.tcz 
mksquashfs node node.tcz
rm -rf node

