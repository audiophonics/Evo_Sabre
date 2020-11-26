OLED display #2 installer

Details --------------------------------------------------------------

Device		:  	Audiophonics EVO SABRE with Raspberry Pi4
Distribution	:  	moOde audio
Version		: 	1.02
Author 		:	Olivier Schwach
Date (d/m/y) 	: 	24/11/2020 

Abstract --------------------------------------------------------------

Use this script on a fresh moOde audio install to add support for Audiophonics EVO SABRE secondary display.

Leftmost  OLED#1 display is firmware driven.  
Rightmost OLED#2 display is software driven. 
Software (python) uses API(s) available in the distribution to gather and display data regarding playback, sampling rate, volume...etc. 
This script contains a set of instruction for automatic installation of this
software for a moOde audio distribution running on a Raspberry Pi4 mounted
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
(see https://github.com/moode-player/moode/releases)

-	OK	moOde audio player 6.7.1
		Raspbian Buster 10.4
		Linux kernel 5.4.51 build #1325

-	OK 	moOde audio player 6.5.2
		Raspbian Buster 10
		Linux 4.19.115-v7l+ build #1305 	

Maintenance notes  ----------------------------------------------------

#1.01 / python dependencies 
Issue 		=> 	Conflict between spidev module default version 3.5 and luma.core version 2.0.1 in kernel 5.4.51
Solution 	=>	downgrade spidev from 3.5 to 3.4 in requirements.txt