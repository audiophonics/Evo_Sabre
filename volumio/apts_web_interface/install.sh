#!/bin/bash

start_time="$(date +"%T")"

# install timezone changer
sudo groupadd audiophonics
sudo usermod -a -G audiophonics volumio

if ! grep -q '%audiophonics ALL=(ALL) NOPASSWD: /bin/sh ${PWD}/settime.sh *' "/etc/sudoers"; then
echo '%audiophonics ALL=(ALL) NOPASSWD: /bin/sh ${PWD}/settime.sh *' | sudo EDITOR='tee -a' visudo
fi


printf "[Unit]
Description=Audiophonics toolset in a web interface
After=volumio.service

[Service]
ExecStart=/bin/node ${PWD}/apts_web_interface.js
StandardOutput=null
Type=simple
Restart=always

[Install]
WantedBy=multi-user.target
"> /etc/systemd/system/apts_web_interface.service

systemctl enable apts_web_interface
systemctl start apts_web_interface
# ---------------------------------------------------
# Say something nice and exit
printf "\n\n-----------------------------------------\n"
echo started at $start_time finished at "$(date +"%T")"
echo "No need to reboot. "
exit 0