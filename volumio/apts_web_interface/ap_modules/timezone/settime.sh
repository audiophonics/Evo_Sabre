#!/bin/bash
sudo bash -c '
echo -e "tzdata tzdata/Areas select '"$1"'\ntzdata tzdata/Zones/'"$1"' select '"$2"'" > /tmp/tz ; 
debconf-set-selections /tmp/tz 2>/dev/null
rm /etc/localtime /etc/timezone 2>/dev/null 
dpkg-reconfigure -f non-interactive tzdata 2>/dev/null 
cat /etc/timezone
'