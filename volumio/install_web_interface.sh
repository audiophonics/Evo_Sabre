#!/bin/bash

start_time="$(date +"%T")"
this_directory=${PWD}
cd apts_web_interface
printf "\n\n##### INSTANCE OF INSTALLATION WEB INTERFACE VOLUMIO ####\n\n" >> install_log.txt
bash install.sh |& tee -a "${this_directory}/log.txt"
cd ..

exit 0
