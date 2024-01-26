#!/bin/sh
rm -f evo_oled.tcz
chmod +x extension/usr/local/bin
tce-load -w squashfs-tools.tcz
tce-load -li squashfs-tools.tcz
mksquashfs extension evo_oled.tcz