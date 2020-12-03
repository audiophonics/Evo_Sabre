#!/bin/bash

start_time="$(date +"%T")"

cd apts_web_interface
printf "\n\n##### INSTANCE OF INSTALLATION WEB INTERFACE VOLUMIO ####\n\n" >> install_log.txt
bash install.sh |& tee -a install_log.txt
cd ..

exit 0
