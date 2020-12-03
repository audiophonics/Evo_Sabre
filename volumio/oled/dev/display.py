#!/usr/bin/env python

import time
import threading
import json
import apdisplaylib
from PIL import ImageFont
from luma.core.interface.serial import spi
from luma.core.render import canvas
from luma.oled.device import ssd1322
   
   
# ----------------------------------
# Default initial configuration
serial = spi(port=0, device=0, gpio_DC=27, gpio_RST=24)
device = ssd1322(serial, rotate=0, mode="1", framebuffer="diff_to_previous")
device.contrast(50)
oled_width	= 256
oled_height	= 64
font_folder_path = "fonts"
font_title      =  ImageFont.truetype(font_folder_path+"/msyh.ttf", 22)


# ----------------------------------
# variables parameters


# ----------------------------------
# classes definitions : pages handler

class page_manager:
    def __init__(self):
        self.current_page = None
        self.event_scope = {}
        
    def load_page(self, newpage):
        if self.current_page : 
            print("async closing previous page")
            self._async_unload_current_page(callback = lambda a : self._load_page(newpage) )
        else: 
            print("1st page, loading normally")
            self._load_page(newpage)

    def _async_unload_current_page(self, **kwargs):
        if "callback" in kwargs:
            self.current_page.events.addEventListener( "close",kwargs["callback"])
        # close current page
        self.current_page.close()            

    def _load_page(self, newpage):
        self.current_page = newpage
        newpage._events.emit("load",newpage)

    # Every object passed in this data structure must be instantiable
    def set_event_scope(self, **kwargs):
        self.event_scope = {}
        for i in kwargs.keys():
             self.event_scope[i] = kwargs[i]

    def create_page(self):
        page = _page()
        instantiated_event_scope = {}
        for i in self.event_scope.keys():
            instantiated_event_scope[i] = self.event_scope[i].instance()  
        page.event_scope = instantiated_event_scope
        
        # About mute_event_scope
        #
        # Let's say we have a "next_page" event that triggered the creation
        # of this page. This same page cannot start listening to the same event
        # right away. Because the first "next_page" event is still resolving 
        # so this listenner would join its stack.
        # A single "next_page" event would then both create this page and
        # immediately trigger whatever this page is supposed to do in response 
        # to another future "next_page" event.         
        #
        # To solve this issue, mute all event scope (so it is still available
        # to write logic) but start listening (unmute) only when page has loaded
        page._mute_event_scope()
        page.events.addEventListener("load",page._unmute_event_scope)
        page.events.addEventListener("close",page._clear_event_scope)
        return page
    
class _page:
    def __init__(self):
        self.refresh_delay = 1
        self.items = []
        self.running = False
        self._thread = None
        self._events = apdisplaylib.event_emitter()
        self.events = self._events.instance()
        self.event_scope = {}
    
    def _mute_event_scope(self,*args):
        for i in self.event_scope:
            self.event_scope[i].mute()        
        
    def _unmute_event_scope(self,*args):
        for i in self.event_scope:
            self.event_scope[i].unmute()        
    
    def _clear_event_scope(self,*args):
        for i in self.event_scope:
            self.event_scope[i].remove()
  
    def add_item(self,item):
        self.items.append(item)
        return item
    
    def start(self,*args):
        if self.running : return
        self._thread = threading.Thread(target=self.draw_fn)
        self._thread.start()
        self.running = True
    
    def show(self,*args):  
        device.clear()
        for i in self.items:
            i.print_to_display()       
        
    def close(self,*args):
        if not self.running : return
        # Flag as not running. Will end thread and trigger close event if defined
        self.running = False
        # Somehow I got the feeling that event_scope should be muted there 
        
    def draw_fn(self,*args):
        self._events.emit("start", self)
        device.clear()
        while True:  
            if not self.running : 
                self._events.emit("close", self)
                return
            for i in self.items:
                i.print_to_display()
            time.sleep(self.refresh_delay) 
        return            


            
            
# ----------------------------------
# classes definitions : dynamic objects handler

class horizontal_fillbar:
    def __init__(self, x, y, value, max):
        self.value = value
        self.max = max
        self.x = x
        self.y = y
        self.padding = 2
        self.width = oled_width - x 
        self.height = 5
        self._fill_width = 0
        
    def update_value(self,value):
        self.value = value
        self._fill_width = self.value * ( (self.width - 2*self.padding) / self.max)

    def print_to_display(self):
        with canvas(device) as draw:
            draw.rectangle((self.x,self.y,self.width,self.height), outline=1, fill=0)
            draw.rectangle(
                (self.x + self.padding,
                self.y + self.padding,
                self._fill_width - self.padding,
                self.height - self.padding),
                outline=0,
                fill=1)       

class text_box_inline:
    def __init__(self, x, y, text, font):
        self.text = text
        self.font = font
        self.x = x
        self.y = y
        self.fill = 1
        self.stroke = 0

    def update_text(self,text):
        self.text = text

    def print_to_display(self):
        with canvas(device) as draw:
            draw.text(
                (self.x, self.y),
                text = self.text,
                font = self.font,
                fill = self.fill)
        
# ----------------------------------

def change_brightness(newval):
    newval = int(newval)
    if newval < 255 and newval > 0:
        try : device.contrast(newval)
        except : pass
