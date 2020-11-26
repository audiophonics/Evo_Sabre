import json
import urllib.request as url 
import time
import evo_display as display
import socket 
import sys

clock_ip_after = 5	# time before displaying clock & ip screen if no action
screen_saver_after = 300 # time before displaying clock & ip screen if no action (must be > to block ip after)
 
if len(sys.argv)>1 and sys.argv[1] == "clear":
	display.clear_screen()
	exit(0)
		

#   Use this look up table to automatically convert the data structure from the distribution API to the data structure of the OLED driver
# 	Useful for easy porting to other distributions
#   Here Volumio API uses the key "title" for the track title, but display driver is looking for a "track_name" key.
# 	Functions map_playback_keys and map_playback_key below are made for this purpose

playback_dict = {
	"status"		: "player_status",
	"title"		 : "track_name",
	"album"		 : "album_name",
	"artist"		: "artist_name",
	"duration"	  : "track_duration",
	"seek"		  : "track_position",
	"bitrate"	   : "track_bitrate",
	"samplerate"	: "track_samplerate",
	"volume"		: "volume"
}

# default data structure that will be used in OLED driver script
playback_data = {
	"player_status" : "stop" ,
	"track_name" : "" ,
	"album_name" : "" ,
	"artist_name" : "" ,
	"track_duration" : -1,
	"track_position" : -1,
	"track_bitrate" : "",
	"track_samplerate" : "",
	"volume" : -1,
	"ip" : "No Connection",
	"host_name" : "hostname"
}

def map_playback_keys(keys):   
	for l in list(keys):
		data = map_playback_key(l)
		if(data):
			keys[data] = keys.pop(l)
	return keys

def map_playback_key(key):
	if(key in playback_dict):
		return playback_dict[key]
	else:
		return False

# method to retrieve ipv4
def getWanIP():
	fD = ("223.5.5.5", 53)
	wanIP = "No Connection"
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		s.connect(fD)
		wanIP = "http://"+s.getsockname()[0]
		s.close()
	except :
		pass
	return wanIP

# get data that should be on display
def get_volumio_apistate():
	data = json.load(url.urlopen('http://127.0.0.1:3000/api/v1/getstate')) # method to retrieve volumio status through API call
	data["ip"] = getWanIP()
	return map_playback_keys(data)

# helper function : compare two playback data structure to see what changed since last scan
def compare_states(a, b):
	changes = []
	for i in a:
		if i in b and b[i] != a[i]:
			a[i] = b[i]
			changes.append(i)
	return changes

# main 

def monitor_api():
	print_once = True;
	sleeping = False
	last_change = time.time()										 # time counter to keep track of duration between each action (mostly for display sleep management)
	while(True): 													 # data gathering loop
		d = get_volumio_apistate()									 # get data from volumio API
		changes = compare_states(display.playback_values,d) 		 # compare data to previous data to check if anything new occured (which will cause display to update accordingly)

		if print_once == True:										 # Do only once at start
			print_once = False
			display.clear_screen()									 # show ip / clock
			display.print_ip()										
			changes = [];											 # override list of changes so display will keep on that page until something occurs

		
		# what happens if something has changed since last cycle
		if(len(changes) > 0):
		
			# are we exiting sleep mode ? 
			if(sleeping == True):
				sleeping = False

			last_change = time.time() 								# reset change count
			display.new_data = changes
			if display.current_page == "print_playback":
				if( "volume" in changes ): 							# if volume changes while playback is on display
					display.clear_screen()							# stop displaying playback and display volume instead
					display.print_volume()
			elif display.current_page == "screen_saver":
				if( "volume" in changes ): 							# if volume changes while playback is on display
					display.clear_screen()							# stop displaying playback and display volume instead
					display.print_volume()
				else:
					display.print_playback() 
			elif  display.current_page == "print_ip":
				if( "volume" in changes ): 							# if volume changes while ip/time is on display
					display.clear_screen()							# stop displaying ip and display volume instead
					display.print_volume()
				else:												# if anything else changes while ip_time display
					display.clear_screen()							# stop displaying ip and display playback instead
					display.print_playback()  

		# what happens if nothing changed 
		elif (sleeping == False and time.time() - last_change > clock_ip_after and display.current_page != "print_ip"):	# no need to check whether playback is on play because track position counts as a change
			display.print_ip()										# display ip / time / volume screen if not already on screen
		elif display.current_page == "print_ip" and (time.time() - last_change > screen_saver_after): 	
			display.print_screen_saver()							# if already displaying ip/time/vol screen, print instead.
			sleeping = True
		time.sleep(0.5)												# this is NOT the display refresh rate (will not affect smooth text scrolling), but the frequency at which data is fetched (latency between action and display change). 


display.playback_values = playback_data							# send base data structure to display driver script
display.logo_screen()											# display logo 
time.sleep(5)														# wait for boot to finish
monitor_api()														# start monitoring 
 