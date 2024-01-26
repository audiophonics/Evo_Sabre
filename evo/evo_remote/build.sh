#!/bin/sh
rm -f evo_remote.tcz
chmod +x extension/usr/local/bin
tce-load -w squashfs-tools.tcz
tce-load -li squashfs-tools.tcz
mksquashfs extension evo_remote.tcz