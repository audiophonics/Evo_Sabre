#!/bin/bash

start_time="$(date +"%T")"

# ---------------------------------------------------
# Install C dependencies 
apt-get install -y lirc

# ---------------------------------------------------
# Enable gpio-ir driver to allow hardware interfacing
if ! grep -q "dtoverlay=gpio-ir,gpio_pin=4" "/boot/userconfig.txt"; then
    echo "dtoverlay=gpio-ir,gpio_pin=4"  >> /boot/userconfig.txt
fi
sudo rsync -a config/ /etc/lirc/

# ---------------------------------------------------
# Say something nice and exit
printf "\n\n-----------------------------------------\n"
echo started at $start_time finished at "$(date +"%T")"
echo "You should reboot now. Enjoy your remote and have a nice day."
