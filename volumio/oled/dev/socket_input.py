import apdisplaylib
import display
import json
import urllib.request as url 
import socket
import time

# ----------------------------------
def main():

    #  --------------------------------------------------
    #  |                DATA GATHERING                  |
    #  --------------------------------------------------
    #
    #   Define here all the methods required for gathering data 
    #   that has to be processed for display.  The whole operation
    #   is asynchronous and uses apdisplaylib.event_emitter 
    #   abstraction to deal with async events and multiple entry points.
    
    
    # Listen to socket input, create an event emitter, 
    # route socket outupt to event emitter. 
    # Expects incomming messages to be structured in JSON 
    uds_receiver = apdisplaylib.uds_input('./input_for_display')    
    uds_receiver.onmessage = uds_receiver.events.json_to_events
    
    # Listen to playback api ( make api call every 0.4 sec ),
    # route playback api changes to attached event emitter
    player_status = apdisplaylib.change_monitor(monitor_volumio_api,0.2)

    # Listen to ipv4 changes ( read network status every 1 sec ),
    # route ipv4 changes to attached event emitter
    network_status = apdisplaylib.change_monitor(monitor_ipv4,1)
    
    # Sleep to let the events emitter load defaults configs
    time.sleep(1)
  
    #  --------------------------------------------------
    #  |            LOW LEVEL DATA HANDLING             |
    #  --------------------------------------------------
    #  Rules that will be applied regardless of what the display
    #  is currently doing (highest priority). It should be prefered 
    #  for intuitive user experience with simple, easily-predictable
    #  interfaces.
    #
    #  On the other hand, don't overuse low level data handling rules
    #  if the app has many pages with complex navigation pathes. 
    #  Breaking the user flow gets less and less enviable as the app 
    #  grows in complexity.
    
    # Create instances of events emitters for low level handling logic
    socket_input_control   = uds_receiver.events.instance()
    api_monitor_control    = player_status.events.instance()
    network_status_control = network_status.events.instance()
    
    socket_input_control.addEventListener("brightness", display.change_brightness)
    
    
    #  --------------------------------------------------
    #  |           HIGH LEVEL DATA HANDLING             |
    #  --------------------------------------------------
    #  Automatic set of rules that will define display behaviour    
    #  when specific events happen on certain pages.

    # Create page manager and attach inputs (events emitters) defined 
    # during DATA GATHERING step that will be required by pages
    page_manager = display.page_manager()
    page_manager.set_event_scope(
        socket_control = uds_receiver.events,
        player_status = player_status.events,
        network_status = network_status.events
    )
    
    # Start displaying data
    # This is the first page that should appear after the logo screen
    show_template_page_1(page_manager)

    
# ----------------------------------
# Define pages that this app can display 


def show_template_page_1(page_manager):

    # Create page, define refresh delay
    page = page_manager.create_page()
    page.refresh_delay = 0.2
    
    # Fetch instances of event inputs relevant to this page content
    socket_control = page.event_scope["socket_control"]
    player_status = page.event_scope["player_status"]
    
    # Defines rules of navigation
    player_status.addEventListeners(
        [
            "playback_status",
            "track_name",
            "artist_name",
            "album_name",
        ],  
        lambda a : show_template_page_2(page_manager) 
    )  
    
    # Declare what happens when the screen is ready to display this page
    def init(*args): 
       
                
        volume_text = page.add_item(
            display.text_box_inline(
                25,
                25,
                "",
                display.font_title
            )
        )
        update_volume =  lambda vol : volume_text.update_text( "volume : "+str(vol) )
        update_volume(player_status.data["volume"])
        player_status.addEventListener("volume", update_volume )  
        
        
        volume_bar = page.add_item(
            horizontal_fillbar(0,0,player_status.data["volume"],100)
        )
        
        
        # Declare how virtual inputs & events will affect items behaviour on display
        
        socket_control.addEventListener("next",  lambda a : show_template_page_2(page_manager) )    
        socket_control.addEventListener("close",  page.close )    
        page.start()
        
    # load page in page manager and start displaying it when loaded
    page.events.addEventListener("load", init ) 
    page_manager.load_page(page)
    
    
def show_template_page_2(page_manager):

    # Create page, define refresh delay
    page = page_manager.create_page()
    page.refresh_delay = 0.2
    
    # Create instance of required virtual inputs. 
    socket_control = page.event_scope["socket_control"]
    player_status = page.event_scope["player_status"]
    
    def init(*args): 
        # Declare items in page and what they do
                
        volume_text = page.add_item(
            display.text_box_inline(
                25,
                25,
                "",
                display.font_title
            )
        ) 
        
        update_volume =  lambda vol : volume_text.update_text( "ours : "+str(vol) )
        update_volume(player_status.data["volume"])
        player_status.addEventListener("volume", update_volume )  
        player_status.addEventListener("volume", page.show )  
        
        # Declare how virtual inputs & events will affect items behaviour on display
        socket_control.addEventListener("next",  lambda a : show_template_page_1(page_manager) ) 
        socket_control.addEventListener("close",  page.close )    
        page.show()
        
    # load page in page manager and start displaying it when loaded
    page.events.addEventListener("load", init ) 
    page_manager.load_page(page)
    



# ----------------------------------
# method to retrieve volumio status through API call
def monitor_volumio_api():
    return(json.load(url.urlopen('http://127.0.0.1:3000/api/v1/getstate')) ) 
 

# ---------------------------------- 
# method to retrieve ipv4
def monitor_ipv4():
    ip = "No Connection"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("223.5.5.5",53))
    ip = "http://"+s.getsockname()[0]
    s.close()
    return {"ip" : ip}

    
# ----------------------------------
main()