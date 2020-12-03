#!/bin/bash

start_time="$(date +"%T")"
this_directory=${PWD}
cd remote
printf "\n\n##### INSTANCE OF INSTALLATION REMOTE CONTROL FOR VOLUMIO ####\n\n" >> install_log.txt
bash install.sh |& tee -a "${this_directory}/log.txt"
cd ..

exit 0
