#!/bin/bash

start_time="$(date +"%T")"

printf "\n\n#=#=#=#=#=#=#=#=#=# Installation of whole package (Volumio) \n\n" >> install_log.txt
bash install_remote.sh &&
bash install_web_interface.sh &&
bash install_oled.sh &&
node enable_volumio_wizard.js &&

# ---------------------------------------------------
# Say something nice and exit
printf "\n\n#=#=#=#=#=#=#=#=#=# \n"
echo started at $start_time finished at "$(date +"%T")"
echo "You should reboot now. Enjoy your Evo Sabre and have a nice day."

exit 0
