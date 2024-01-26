# Installing PicorePlayer on Audiophonics Evo Sabre #

This branch holds source code and configuration files to install piCorePlayer on a raspberry Pi mounted on an Audiophonics Evo Sabre. 

It deals with : 
* Installation of the display oled#2 (rightmost display) and making it listen directly to LMS.
* Installation & configuration of the remote layer (lirc).

## Prerequisites : ##
* SSH access to the raspberry pi is required.
* Starting from a fresh pcp image, the filesystem needs to be resized to be at least 200mb.
* Display oled#2 driver is written in nodejs, we need to download it and make it into a tce package (.tcz)

## Notes : ##
* To achieve the maximum stream capabilities, the whole sets assumes that Squeezelite & LMS instances are running on the same device (player + server configuration)
* Due to the way pCp handles LMS login, I could not figure out a way to make the remote command bubble up to LMS if the latter is protected by a password. I managed to make it work with the display, but this also requires additionnal configuration. Until I find a better way to handle this, you are advised to use LMS as a passwordless streamer confined to your (secured) local network (instead of routing external connections from your router to LMS).


### Build procedure ### 
The goal of this branch is to produce those files : 
* node.tcz
* evo_oled.tcz
* evo_oled.tcz.dep
* evo_remote.tcz
* evo_remote.tcz.dep

### Nodejs
This is the easiest part. We just grab the compiled files from nodejs releases and package it as a tcz file. 
To achieve max compatibility I picked the 32bit version, but future versions might progressively use 64bit version if everything looks stable enough. 
Just run the ```sh getnode.sh``` script and grab the resulting ```node.tcz``` file. 

### evo_remote
This is also relatively easy. We need to have the lirc configuration files loaded in the right place. This extension also provides a tiny shell executable to provide a mecanism for starting the daemon & making the initial system configuration. To build the package you just need to run ```build.sh``` from the evo_remote directory and grab the resulting ```evo_remote.tcz``` and ```evo_remote.tcz.dep``` files. 

### evo_oled
Same as before, this wraps the nodejs app into a tcz package and provides a small executable to start the daemon and handle system configuration.  To build the package you just need to run ```build.sh``` from the evo_oled directory and grab the resulting ```evo_oled.tcz``` and ```evo_oled.tcz.dep``` files. 


### Installation procedure ### 
Now that we have our files we have to :
* Reboot once to get rid of installaton dependencies. 
* Place all our files into /mnt/mmcblk0p2/tce/optional/
* Load the extension for oled ```tce-load -li evo_oled```
* Load the extension for remote ```tce-load -li evo_remote```
* Run the configuration script for oled ```sudo evo_oled install```
* Run the configuration script for remote ```sudo evo_remote install```
* Back up with ```pcp bu```
* Reboot again.



### Configuring piCorePlayer ### 
The configuration scrips already took care of some of pCp configuration (mainly to register the remote & oled daemon to run as user commands).
We still need to 
* Set the audio output as Audiophonics isabre-q2m in pCp
* Install and configure LMS on your machine from pCp interface


### LMS login ###
Setting a password / login on LMS is currently discouraged because it breaks most of the remote actions that rely pCp native function. The display script is however a little bit more advanced and can go through the login step in LMS. Use the ```evo_oled login``` to explictely tell the display script how to login into your LMS. Remember that since this process spans accross both LMS high level implementation and the Raspberry Pi low-level hardware structure, I could not give it the full set of security clearances of a pure LMS plugin.

Also we have to store the key to decrypt the password somewhere persistent so the encryption key and the encrypted password both are stored on the SD card, which can be a security issue if someone gains access to your Raspberry Pi or its SD card. 
For this reasons, you are again discouraged to count on LMS password wall to secure your streamer. You should use the Evo Sabre in a private secured network instead. 

