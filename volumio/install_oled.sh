#!/bin/bash

start_time="$(date +"%T")"
this_directory=${PWD}

cd oled
printf "\n\n##### INSTANCE OF INSTALLATION OLED MOODE ####\n\n" >> "${this_directory}/log.txt"
bash install.sh |& tee -a "${this_directory}/log.txt"
cd ..

exit 0
