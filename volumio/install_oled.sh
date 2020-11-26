#!/bin/bash

start_time="$(date +"%T")"

cd oled
printf "\n\n##### INSTANCE OF INSTALLATION OLED MOODE ####\n\n" >> install_log.txt
bash install.sh |& tee -a install_log.txt
cd ..

exit 0