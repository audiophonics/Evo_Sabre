#!/bin/bash

start_time="$(date +"%T")"



# ---------------------------------------------------
# install C dependencies
printf "\n\ninstalling C deps\n"
apt-get update
apt-get -y install libfreetype6-dev libjpeg-dev python3-venv

# ---------------------------------------------------
# Create & enter python virtual environment
printf "\n\nSetting python venv\n"
python3 -m venv "${PWD}"
source bin/activate

# ---------------------------------------------------
# Install python dependencies in venv
printf "\n\nInstalling python deps\n"
python3 -m pip install --upgrade pip setuptools
python3 -m pip install -r requirements.txt
deactivate

# ---------------------------------------------------
# Enable spi-dev module to allow hardware interfacing
printf "\n\nEnabling SPI\n"
if ! grep -q spi-dev "/etc/modules"; then
	echo "spi-dev" >> /etc/modules
fi
if ! grep -q dtparam=spi=on "/boot/config.txt"; then
	echo "dtparam=spi=on"  >> /boot/config.txt
fi

# ---------------------------------------------------
printf "\n\nCreating service\n"
# Register & enable service so display will run at boot
printf "[Unit]
Description=OLED Display Service
After=mpd.service

[Service]
ExecStartPre=/bin/sleep 5
ExecStart=${PWD}/bin/python3 ${PWD}/moode_oled_4.00_spi_audiophonics.py
StandardOutput=null
Type=simple
Restart=always
User=pi

[Install]
WantedBy=multi-user.target"> /etc/systemd/system/oled.service

systemctl enable oled

# ---------------------------------------------------
# Say something nice and exit
printf "\n\n-----------------------------------------\n"
echo started at $start_time finished at "$(date +"%T")"
echo "You should reboot now. Enjoy your display and have a nice day."
exit 0
