import time
display = None
page_manager = None

def clock_page():
    page = page_manager.create_page()
    page.refresh_delay = 0.5
    page.no_contrast_reload = True
    network_status = page.event_scope["network_status"]
    
    # Build the page 
    def init(*args): 
   
        # ------ 
        # Time    
        time_clock = page.add_item(
            display.text_box_inline(
                20,
                -11,
                display.font_55
            )
        )   
        
        def update_clock(*args):
            t = time.localtime()
            time_clock.text = time.strftime("%X", t)
        update_clock()
        page.events.addEventListener("draw", update_clock ) 
    
        # ------ 
        # Ip Address   
        network_ip_text = page.add_item(
            display.text_box_inline(
                58,
                43,
                display.font_time
            )
        )
        
        def update_network_ip(*args):
            network_ip = network_status.data.get("ip",False)
            if network_ip :
                network_ip_text.x = 58
                network_ip_text.text = network_ip
            else :
                network_ip_text.text = "Not connected"
                network_ip_text.x = 73              
                
        update_network_ip()        
        network_status.addEventListener("ip",update_network_ip)
        
        
        
        page.start()
        
        
        
    # load page in page manager and start displaying it when loaded
    page.events.addEventListener("load", init ) 
    page_manager.load_page(page)
    
def screen_saver():

    # Create page, define refresh delay
    page = page_manager.create_page()
    page.refresh_delay = 0.04
    start_contrast = page_manager.display.current_contrast
    end_contrast = 0
    # Build the page 
    def init(*args): 
        square = page.add_item(
            display.square(0,0,3)
        )          
        
        
        def move_square(*args):
            counter = ( page.animation_frame * square.length  ) % ( (display.oled_width *  display.oled_height)   ) 
            
            square.x = ( counter ) % display.oled_width
            square.y = ( (  (counter ) // (display.oled_width)  ) * square.length ) % display.oled_height
            
            
            fade_out_frames = display.oled_width // square.length
            
            if page_manager.display.current_contrast >= end_contrast :
                fade_out = int( start_contrast - 1 / fade_out_frames * page.animation_frame * ( start_contrast - end_contrast) )
                page_manager.display.change_brightness(fade_out)
                
            
        page.events.addEventListener("draw", move_square)
        
        page.start()
        
        
        
    # load page in page manager and start displaying it when loaded
    page.events.addEventListener("load", init ) 
    page_manager.load_page(page)
    
    
    
    
    
    
def playback_page():

    # Create page, define refresh delay
    page = page_manager.create_page()
    page.refresh_delay = 0.04
    
    # To display this page we need data from player and from network
    player_status = page.event_scope["player_status"]
    network_status = page.event_scope["network_status"]
    

    # Build the page 
    def init(*args): 
  
        # ------ 
        # Item : scrolling text with title, album and artist name 
        title_artist_album = page.add_item( display.text_autoscroll( -6, display.font_title ) )   
        
        # How this item should be set and updated : display current title, artist ,album name
        def update_title_artist_album(*args):
            text = display.concat_force_separator(
                [
                    player_status.data.get("track_name"),
                    player_status.data.get("artist_name"),
                    player_status.data.get("album_name")
                ])  
            title_artist_album.update_text(text)
        
        # Item should be updated (recomputed) in response to a change of title, artist or album        
        update_title_artist_album()
        player_status.addEventListeners(["track_name","artist_name","album_name"], update_title_artist_album )  
       
       
        # ------ 
        # Play / Pause / Stop Logo     
        playback_status_logo = page.add_item(
            display.text_box_inline(
                5,
                31,
                display.font_awesome
            )
        )

        def update_playback_status_logo(*args):
            status_logo = display.status_logo(player_status.data.get("player_status") )
            playback_status_logo.update_text(status_logo)

        update_playback_status_logo()
        player_status.addEventListener("player_status", update_playback_status_logo )  
        
        
        # ------ 
        # Seek bar & seek text
        seek_bar = page.add_item( 
            display.horizontal_fillbar(  5,  50, 0, 0 ) 
        )
        seek_text = page.add_item(
            display.text_box_inline(
                23,
                27,
                display.font_time
            )
        )
        
        def update_seek(*args):

            try:
                position = int(float( player_status.data.get( "track_position",0) )*1000) 
                track_pos_as_text = display.format_ms_to_text( position ) 
            except :
                position = 0
                track_pos_as_text = "--:--"
            seek_bar.update_value(position)
                
            try:
                duration = int(float( player_status.data.get( "track_duration",0) )*1000) 
                track_dur_as_text = display.format_ms_to_text(duration) 
            except :
                duration = 0
                track_dur_as_text = "--:--"
            seek_bar.max = duration   
            seek_text.update_text(  track_pos_as_text  + " / " + track_dur_as_text)
            
            
            
        update_seek()
        player_status.addEventListeners(["track_position","track_duration"],update_seek )
        
        
        # ------ 
        # Repeat logo   
        repeat_logo = page.add_item(
            display.text_box_inline(
                125,
                31,
                display.font_icons
            )
        )
        
        def update_repeat_logo(*args):
            repeat_mode = int(player_status.data.get("repeat",0))
            repeat_once = int(player_status.data.get("repeatonce",0))
            if repeat_mode and repeat_once:
                repeat_logo.text = "\uea2d"
            elif repeat_mode :
                repeat_logo.text = "\uea2e"
            else :
                repeat_logo.text = ""
                
        update_repeat_logo()        
        player_status.addEventListeners(["repeat","repeatonce"],update_repeat_logo)
        
        # ------ 
        # Shuffle logo   
        shuffle_logo = page.add_item(
            display.text_box_inline(
                145,
                31,
                display.font_icons
            )
        )
        
        def update_shuffle_logo(*args):
            shuffle_mode = int(player_status.data.get("shuffle",0))
            if shuffle_mode :
                shuffle_logo.text = "\uea30"
            else :
                shuffle_logo.text = ""
                
        update_shuffle_logo()        
        player_status.addEventListener("shuffle",update_shuffle_logo)
                
        # ------ 
        # Network logo   
        network_logo = page.add_item(
            display.text_box_inline(
                188,
                30,
                display.font_icons
            )
        )
        
        def update_network_logo(*args):
            network_ip = network_status.data.get("ip",False)
            if network_ip :
                network_logo.text = "\uea1b"
            else :
                network_logo.text = ""
                
        update_network_logo()        
        network_status.addEventListener("ip",update_network_logo)
        
        # ------ 
        # Volume logo + value in digit
        volume_logo = page.add_item(
            display.text_box_inline(
                210,
                31,
                display.font_icons
            )
        )
        
        volume_text = page.add_item(
            display.text_box_inline(
                229,
                27,
                display.font_time
            )
        )
        volume_text.update_text(str(player_status.data.get("volume","--")))

        def update_volume_value_logo(*args):
            # get current volume value
           
            try: 
                volume_value = int( float( player_status.data.get("volume",0) ) )
            except:
                volume_value = 0
            volume_as_string = str(player_status.data.get("volume","--"))
            
            volume_text.update_text( volume_as_string )
            
            # Change volume logo according to volume value
            if player_status.data.get("mute", False):
               volume_logo.text = "\uea2a" 
            elif volume_value > 66:
                volume_logo.text = "\uea26"
            elif volume_value > 33 : 
                volume_logo.text = "\uea27"
            elif volume_value > 0 :
                volume_logo.text = "\uea28"
            else :    
                volume_logo.text = "\uea29"
            
        update_volume_value_logo()             
        player_status.addEventListeners(["volume","mute"],update_volume_value_logo )  
        page.start()

    # load page in page manager and start displaying it when loaded
    page.events.addEventListener("load", init ) 
    page_manager.load_page(page)
    
    
    
    
    
    
    
    
    
    
def logo_page():

    # Create page, define refresh delay
    page = page_manager.create_page()
    page.refresh_delay = 5
    
    socket_control = page.event_scope["socket_control"]
    socket_control.addEventListener("next",lambda *a : page_manager.display_page("playback_page"))     
    # Declare what happens when the screen is ready to display this page
    def init(*args): 
        logo = page.add_item(
            display.logo()
        )          
        page.show()
        
    # load page in page manager and start displaying it when loaded
    page.events.addEventListener("load", init ) 
    page_manager.load_page(page)
    

    
default_page = clock_page

