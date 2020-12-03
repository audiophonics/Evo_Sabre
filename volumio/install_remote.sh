#!/bin/bash

start_time="$(date +"%T")"

cd remote
printf "\n\n##### INSTANCE OF INSTALLATION REMOTE CONTROL FOR VOLUMIO ####\n\n" >> install_log.txt
bash install.sh |& tee -a install_log.txt
cd ..

exit 0