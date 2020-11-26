#!/usr/bin/env python
import time
import _thread
import json
from PIL import ImageFont
from luma.core.interface.serial import spi
from luma.core.render import canvas
from luma.oled.device import ssd1322

def autocut_long_string(base_x,font,remainder):
    result = []
    while( len(remainder) ):
        remainder, cut_str = string_cutter(base_x,remainder,font)
        result.append(cut_str)
    return result
        
def string_cutter(base_x,string,font):
    buildstr = ""
    for c in string:
        buildstr += c
        width, char = font.getsize(buildstr)
        if(width > (oled_width - base_x) ):
           break
    return(string[len(buildstr):], buildstr)      

class scroll_string:
    def __init__(self, string, width, midpoint):
        self.string = string
        self.width = width    
        self.midpoint = midpoint    
        
class autoscroller:
    def __init__(self,base_x,font,string):
        predicted_width, char  = font.getsize(string)
        overflow = oled_width - predicted_width - base_x
        if(overflow<0):
            self.fit_screen = False
            strings = autocut_long_string(base_x,font,string)
            parsed_strings = []
            l = len(strings)
            i = 0
            y = 0
            z = 0
            for s in strings:
                y = (i+1)%l
                z = (i+2)%l
                remainder, cut_str = string_cutter(base_x,strings[y] +strings[z],font)
                joined_string = strings[i] + cut_str 
                width, char  = font_title.getsize(joined_string)  
                midpoint, char  = font_title.getsize(strings[i])  
                parsed_strings.append( scroll_string(joined_string, width, midpoint) )
                i+=1
        else:
            parsed_strings = [scroll_string(string , predicted_width , predicted_width )]
            self.fit_screen = True
            
        self.strings = parsed_strings
        self.index = 0
        self.x_scroll = 0
        self.base_x = base_x
        
    def current_chunk(self):
        return(self.strings[self.index]) 
        
    def next_cycle(self):
        self.index = (self.index + 1)%len(self.strings)
        self.x_scroll = 0
        return(self.current_chunk())
        
    def scroll(self):
        if self.fit_screen == False:
            self.x_scroll += 1
            if(self.strings[self.index].midpoint <= self.x_scroll):
                self.next_cycle()
    def x(self):
        return(self.base_x - self.x_scroll )

def format_ms_to_text(ms):
    s_min = ms // 60000
    s_sec = ms % 60000
    return ( str(s_min).zfill(2)+":"+str(s_sec)[:-3].zfill(2) )

def make_font(name, size):
    return ImageFont.truetype(font_folder_path+"/"+name, size)

def getPlaybackValue(key):
    if(key in playback_values):
        return(playback_values[key]) 

def isValidTxtKey(key):
    if playback_values[key] != "" and playback_values[key] != None:
        return True
    return False   
 
def text_track_artist_album():
    temp_text_elem = []
    text = ""
    try:
        if isValidTxtKey("track_name"):
            temp_text_elem.append(playback_values["track_name"])
    except:
        pass
    try:
        if isValidTxtKey("artist_name"):
            temp_text_elem.append(playback_values["artist_name"])    
    except:
        pass              
    try:
        if isValidTxtKey("album_name"):
            temp_text_elem.append(playback_values["album_name"])
    except:
        pass
    if len(temp_text_elem) > 0:
        i = 0
        while i< len(temp_text_elem):
            text += temp_text_elem[i] 
            if (i+1) >= len(temp_text_elem):
                text += " - "
                break
            else:
                text += " - "
            i += 1
    else:
        text = "..."
    return text    
    
def volume_screen():
    global current_page, new_data
    clear_screen()
    vol_txt = "-1"
    vol_int = 0
    timestart = time.time()
    while current_page == "print_volume":
        if len(new_data) and "volume" in new_data:  
            timestart = time.time()
            new_data = []
            vol_txt = str(getPlaybackValue("volume"))
            vol_int = int(getPlaybackValue("volume"))
           
            with canvas(device) as draw:
                vol_width, char = font_vol.getsize(vol_txt)
                x_vol = ((oled_width - vol_width) / 2)
                # Volume Display
                draw.text((5, 5), text="\uf028", font=awesomefontbig, fill=1)
                draw.text((x_vol, -15), vol_txt, font=font_vol, fill=1)
                # Volume Bar
                draw.rectangle((0,53,255,60), outline=1, fill=0)
                Volume_bar =  ((vol_int * 2.52)+2)
                draw.rectangle((2,55,Volume_bar,58), outline=0, fill=1)       
        if(time.time() - timestart > volume_display_time):
            print_playback()
            return
        time.sleep(0.1) 
    return
    
def ip_screen():
    global current_page, new_data
    clear_screen()
    ip = str(getPlaybackValue("ip"))
    volume = str(getPlaybackValue("volume"))
    while current_page == "print_ip": 
        new_data = []
        with canvas(device) as draw:
            draw.text((1, 45), text="\uf028", font=awesomefont, fill=1)
            draw.text((20, 42), volume, font=font_ip, fill=1)
            draw.text((28,-8),time.strftime("%X"), font=font_32,fill=1)
            draw.text((90, 42),ip, font=font_ip, fill=1)
            draw.text((70, 45), "\uf0e8", font=awesomefont, fill=1)      
        time.sleep(1) 
    return    
    
def screen_saver():
    step = 0;
    matrix_size = oled_width*oled_height
    while current_page == "screen_saver":
        if(step == matrix_size):
            step = 0;
        step+=1
        if(step % 6 == 0):
            x = step % oled_width
            y = step // oled_width
            with canvas(device) as draw:
                draw.rectangle((x,y,x+5,y+5), outline=0, fill=1)
        else:
            clear_screen()
        time.sleep(0.1) 
    return 0

def play_screen_playback():
    # DO NOT edit those parameters
    global new_data
    global current_page
    global playback_values
    clear_screen()
    formatted_seek = "00:00 / 00:00"
    
    #left margin for seekbar
    seek_bar_x_left = oled_width-5
    seek_bar_x_width = seek_bar_x_left - seek_bar_x
    seek_bar_y_bottom = seek_bar_y + seek_bar_y_height
    seek_fill_rightmost_position = seek_bar_x_left
    # bool container which changes according to the availability of data regarding duration & seek  
    print_seek_bar = True
    # icon for play/pause/stop
    status_icon = "\uf04d"
    auto_scroller = autoscroller(scroll_line_base_x,font_title,"...")
    
    while current_page == "print_playback":
        # read and compute new parameters if any 
        if (len(new_data)):    
           
            if ("all" in new_data or "track_name" in new_data or "album_name" in new_data or "artist_name" in new_data ):
                # computing how to display newly received track title
                auto_scroller = autoscroller(scroll_line_base_x,font_title,text_track_artist_album())
                
            if ( ( "all" in new_data or "track_position" in new_data ) and ( getPlaybackValue("track_position") >-1 and getPlaybackValue("track_duration") >-1) ):
                # computing seek
                try: 
                    seek_ratio = getPlaybackValue("track_position") / ( getPlaybackValue("track_duration") * 1000.0)
                    seek_fill_rightmost_position = seek_bar_x + seek_bar_x_width * seek_ratio
                    formatted_seek = format_ms_to_text( getPlaybackValue("track_position") ) + "/" + format_ms_to_text( getPlaybackValue("track_duration")* 1000 )
                    print_seek_bar = True 
                except ZeroDivisionError:
                    print_seek_bar = False
                    seek_ratio = seek_bar_x
                    seek_fill_rightmost_position = seek_bar_x
                    try:
                        formatted_seek = format_ms_to_text( getPlaybackValue("track_position") )
                    except:
                        pass
                       
            if("all" in new_data or "player_status" in new_data ):
                if getPlaybackValue("player_status")     == "pause":
                    status_icon = "\uf04c"
                elif getPlaybackValue("player_status")   == "stop":
                    status_icon = "\uf04d"
                elif getPlaybackValue("player_status")   == "play":
                    status_icon = "\uf04b"
                # computing play/pause/stop logo       
            new_data = []
   
        # sending print data   
        with canvas(device) as draw:	
                # scrolling text
                draw.text((auto_scroller.x(), scroll_line_base_y),auto_scroller.current_chunk().string , font=font_title, fill=1)
                # play / pause / stop logo
                draw.text((2, 40), text=status_icon, font=awesomefont, fill=1)
                draw.text((seek_bar_x+2, seek_bar_y -18), text=formatted_seek, font=font_time, fill=1)
                if print_seek_bar:
                    # outline for seek
                    draw.rectangle((seek_bar_x,seek_bar_y,seek_bar_x_left,seek_bar_y_bottom), outline=1, fill=0)
                    # fill for seek
                    draw.rectangle((seek_bar_x,seek_bar_y,seek_fill_rightmost_position,seek_bar_y_bottom), outline=1, fill=1)
        auto_scroller.scroll()
        
        time.sleep(0.03)  
    return 0
"""
def logo_screen():
    try:
        with open('logo.json') as json_file:
            data = json.load(json_file)
            step = 0
            with canvas(device) as draw:	
                for p in data["data"]:
                    x = step % (oled_width)
                    y = step // (oled_width) 
                    if p >0:            
                        draw.point( (x,y),fill=1 )
                    step += 1    
    except:
        print("no logo file found!")
"""      

def logo_screen():
    try:
        f = open("logo.logo", "r")
        status = False
        data = []
        for x in f:
            x = int(x)
            color = 0
            i = 0 
            status = not status # invert write on / write off ( lossless decompression of b&w logo file)
            if status:
                color = 1
            while i < x:
                data.append(color)
                i+=1
        step = 0
        with canvas(device) as draw:
            for p in data:
                x = step % (oled_width)
                y = step // (oled_width) 
                if p >0:            
                    draw.point( (x,y),fill=1 )
                step += 1    
    except:
        print("no logo file found!")


          
def clear_screen():
    with canvas(device) as draw:
        draw.rectangle((0,0,oled_width,oled_height), outline=0, fill=0)

def print_playback():
    global new_data, current_page
    new_data = ["all"]
    current_page = "print_playback"  
    _thread.start_new_thread(play_screen_playback,()) 

def print_volume():
    global current_page
    current_page = "print_volume"  
    _thread.start_new_thread(volume_screen,()) 

def print_ip(): 
    global current_page, new_data
    if current_page != "print_ip":
        new_data = ["ip"]
        current_page = "print_ip"  
        _thread.start_new_thread(ip_screen,())  

def print_screen_saver():
    global current_page
    if(current_page != "screen_saver"):
        current_page = "screen_saver"
        _thread.start_new_thread(screen_saver,()) 

font_folder_path = "fonts"
serial = spi(port=0, device=0, gpio_DC=27, gpio_RST=24)
device = ssd1322(serial, rotate=0, mode="1", framebuffer="diff_to_previous")
device.contrast(50)
oled_width	= 256
oled_height	= 64
scroll_line_base_x = 5
scroll_line_base_y = 0    
seek_bar_x = 25
seek_bar_y = 52
seek_bar_y_height = 5
volume_display_time = 5
current_page = ""  
new_data = [] 
font_title      = make_font('msyh.ttf', 22)     
font_vol        = make_font('msyh.ttf', 55)
font_time		= make_font('msyh.ttf', 15)
awesomefont		= make_font('fontawesome-webfont.ttf', 14)
awesomefontbig	= make_font('fontawesome-webfont.ttf', 42)
font_ip			= make_font('msyh.ttf', 15)
font_32			= make_font('arial.ttf', 50)
playback_values = {}