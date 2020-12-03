#!/bin/bash

start_time="$(date +"%T")"

printf "\n\n#=#=#=#=#=#=#=#=#=# Installation of whole package (moode) \n\n" >> install_log.txt
bash install_oled.sh &&

# ---------------------------------------------------
# Say something nice and exit
printf "\n\n#=#=#=#=#=#=#=#=#=# \n"
echo started at $start_time finished at "$(date +"%T")"
echo "You should reboot now. Enjoy your Evo Sabre and have a nice day."

exit 0
