OLED display #2 installer

Details --------------------------------------------------------------

Device		:  	Audiophonics EVO SABRE with Raspberry Pi4
Distribution	:  	Volumio
Version		: 	1.04
Author 		:	Olivier Schwach
Date (d/m/y) 	: 	24/11/2020 

Abstract --------------------------------------------------------------

Use this script on a fresh Volumio install to add support for Audiophonics EVO SABRE secondary display.

Leftmost  OLED#1 display is firmware driven.  
Rightmost OLED#2 display is software driven. 
Software (python) uses API(s) available in the distribution to gather and display data regarding playback, sampling rate, volume...etc. 
This script contains a set of instruction for automatic installation of this
software for a Volumio distribution running on a Raspberry Pi4 mounted
on Audiophonics EVO SABRE module

Usage -----------------------------------------------------------------

- Make sure networking is enabled and your Pi has internet access
- Download and copy files in /home/pi/oled
- Enter the /home/pi/oled directory 
	$ cd /home/pi/oled 
- Run installation script as root 
	$ sudo bash install
- Reboot and OLED#2 should be working

Tested versions -------------------------------------------------------
(see https://community.volumio.org/t/volumio-changelog)

-	OK	Volumio 2.853
		Raspbian 8 (Jessie)
		Linux kernel 4.19.118-v7l+ #1311
			
Maintenance notes  ----------------------------------------------------

#1.00 / python dependencies 
Issue => libssl default version (even updated from repo) does not meet requirements for installing via pip. 
Solution => Luckily there is a backport available. But since Raspbian Jessie is on archive already, it is necessary to allow packages from http://archive.debian.org/debian/ jessie-backports (done in install.sh script)

			