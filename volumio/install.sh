#!/bin/bash

start_time="$(date +"%T")"

cd remote
printf "\n\n#=#=#=#=#=#=#=#=#=# Installation of whole package (Volumio) \n\n" >> install_log.txt
bash install_remote.sh &&
bash install_web_interface.sh &&
bash install_oled.sh &&
node enable_volumio_wizard.js
cd ..

exit 0