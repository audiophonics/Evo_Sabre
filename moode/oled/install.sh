#!/bin/bash

start_time="$(date +"%T")"
echo "* Installing : Evo Sabre OLED#2"
echo "" > install_log.txt

# ---------------------------------------------------
# install C dependencies
apt-get -y install libfreetype6-dev libjpeg-dev python3-venv  > /dev/null 2>> install_log.txt

# ---------------------------------------------------
# Create & enter python virtual environment
echo "installing python env and dependencies"
python3 -m venv "${PWD}"
source bin/activate
python3 -m pip install --upgrade pip setuptools
python3 -m pip install -r requirements.txt
deactivate

# ---------------------------------------------------
# Enable spi-dev module to allow hardware interfacing
if ! grep -q spi-dev "/etc/modules"; then
	echo "spi-dev" >> /etc/modules
fi
if ! grep -q dtparam=spi=on "/boot/config.txt"; then
	echo "dtparam=spi=on"  >> /boot/config.txt
fi

# ---------------------------------------------------
# Register & enable service so display will run at boot
printf "[Unit]
Description=OLED Display Service
After=mpd.service
Requires=mpd.service

[Service]
WorkingDirectory=${PWD}
ExecStartPre=/bin/sleep 4
ExecStart=${PWD}/bin/python3 ${PWD}/oled.py
StandardOutput=null
KillSignal=SIGINT
Type=simple
Restart=always
User=pi

[Install]
WantedBy=multi-user.target"> /etc/systemd/system/oled.service &&

systemctl enable oled> /dev/null 2>> install_log.txt &&
echo "OLED#2 service enabled ( /etc/systemd/system/oled.service )"
# ---------------------------------------------------
# Say something nice and exit
echo "* End of installation : Evo Sabre OLED#2 - reboot required"
echo started at $start_time finished at "$(date +"%T")" >> install_log.txt
exit 0