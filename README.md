# Evo Sabre
Toolset and sources file used for customizing RPI audio distributions with EVO Sabre hardware support 

This repository holds sources and methods for installing the specific hardware found in a EVO Sabre (second display, remote control) and some utilities in a fresh distribution for audio playback on raspberry pi. 

## Currently supported : 
 
### Volumio
* Installation of OLED #2 Display
* Installation of IR remote
* Installation of aptswi (web interface with some system options, see below) 
  
### moOde audio
* Installation of OLED #2 Display
* Installation of IR remote
* Installation of aptswi (web interface with some system options, see below) 

### APTSWI : Audiophonics ToolSet in a Web Interface
Some options can be configured by the user (such as OLED #2 brightness, sleep-delay or boot logo) in a tiny web interface powered by nodeJS. 
You can get there by using your web-browser to open the port 4150 : 
* On Volumio navigate to http://volumio:4150. 
* Same thing on moOde Audio with http://moode:4150. 
* It works with your EVO Sabre IP as well : http://192.168.xx.xx:4150.

In Volumio, you will also find an option to change your timezone since this is not natively possible without using SSH. After doing so you will need to restart OLED #2 (a reboot will also work) to have your right display print your local time.


## Important notes : 
To avoid conflicts it is recommanded to use this toolset on a **fresh** (non-customized) release. 
It is strongly advised to back-up configuration file and your local music library before installing anything with this toolset.

Some devices require the audio output to be already configured with the ES9038 driver to work. You should do this in your regular distribution interface **before** running any customization script.

**Remember your device must have network access to download dependencies.** This toolset is not designed for offline installation.

## Usage : 

* Update package repo list
```bash
sudo apt-get update
```

* Download source files (this repository).
```bash
git clone http://github.com/audiophonics/Evo_Sabre
```
* Enter directory.
```bash
cd Evo_Sabre
```
* Each supported distribution has its own directory, enter the one corresponding to the distribution installed on your EVO. 
```bash
# for Volumio
cd volumio
# for moOde audio
cd moode
```
* Run the installation script **as root** to install all available features
```bash
sudo bash install.sh
```

*most scripts deal with hardware configuration and will require you to reboot after completion. A successful script installation will explicitely notify you from terminal if a reboot is needed.*

## Install duration :
Some scripts and core functionnalities automatically download and compile frameworks from source. This is due to the wide range of Linux flavors that are found across the audio distributions for raspberry pi and the different rate at which updates happen. Since the defaults packages and libraries natively available on those systems can vary a lot, do not expect installation time to be consistent from one distribution to another. Installing OLED#2 can take about 5 minutes on moOde audio and up to 30 minutes on Volumio. 

