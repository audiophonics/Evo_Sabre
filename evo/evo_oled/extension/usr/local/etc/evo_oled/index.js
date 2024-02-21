process.chdir(__dirname);
console.log(__dirname);

const os = require("os");
const date = require('date-and-time');
const oled = require('./oled.js');
const fonts = require('./fonts.js');
const fs = require("fs");
const http = require("http");

var DRIVER;

const default_config_path = fs.readFileSync(__dirname + '/lms/default_path').toString() || "./";

var TIME_BEFORE_CLOCK = 6000; // in ms
var TIME_BEFORE_SCREENSAVER = 120000; // in ms
var TIME_BEFORE_DEEPSLEEP = 300000; // in ms
var LOGO_DURATION = 5000; // in ms
var CONTRAST = 254; // range 1-254
var extn_exit_sleep_mode = false;

// PJS : Extract the date and time formats
var DATE_FORMAT = "DD/MM/YYYY"
var TIME_FORMAT = "HH:mm:ss"

var PENDINGSETCONTRAST = false


const opts = {
	width: 256,
	height: 64,
	dcPin: 27,
	rstPin : 24,
	contrast : CONTRAST,
	divisor : 32, 
	main_rate : 60
};


http.createServer(server).listen(4153);
function server(req,res){
	let cmd = req.url.split("\/")[1];
	value = cmd.split("=");
	cmd = value[0];
	value = value[1];
	extn_exit_sleep_mode = true;
	
	switch(cmd){
		case 'exit':
			res.end("1");
			process.exit(0);
			break;
		case 'contrast':
			if( value < 255 && value > 0 ){
				res.end("1");
				let temp = DRIVER.refresh_action;
				CONTRAST = value;
				DRIVER.refresh_action = function(){
					DRIVER.refresh_action = function(){};
					DRIVER.driver.setContrast(value, ()=>{
						DRIVER.refresh_action = temp;
						DRIVER.refresh_action();
					})
				};
				console.log("[EVO DISPLAY#2] CONTRAST set to:", CONTRAST)
				PENDINGSETCONTRAST = true

			}
			else{ res.end("0") }
			break;
		case 'sleep_after':
			TIME_BEFORE_SCREENSAVER = value;
			console.log("[EVO DISPLAY#2] TIME_BEFORE_SCREENSAVER set to:", TIME_BEFORE_SCREENSAVER)
			res.end("1");
			break;
		case 'deep_sleep_after':
			TIME_BEFORE_DEEPSLEEP = value;
			console.log("[EVO DISPLAY#2] TIME_BEFORE_DEEPSLEEP set to:", TIME_BEFORE_DEEPSLEEP)
			res.end("1");
			break;
		default:
			res.end("0");
			break;
	}
}


const REFRESH_TRACK = 20;
var api_state_waiting = false; 

function ap_oled(opts){
	this.scroller_x = 0;
	this.ip = null;
	this.height = opts.height;
	this.width = opts.width;
	this.page = null;
  this.data = {
    volume : null,
    samplerate : null,
    bitdepth : null,
	samplesize : null,
    bitrate : null,
    seek : null,
    duration : null,
    status : null,
  };
	this.raw_seek_value = 0;
	this.footertext = "";
	this.update_interval = null;
  this.refresh_track = REFRESH_TRACK;
	this.refresh_action = null;
	this.driver = new oled(opts);
}


function pad_zero(n){
    if(!n) return("00");
    n = n.toString(); 
    (n.toString().length === 1) && (n = "0"+n);
    return n;
}




ap_oled.prototype.listen_to = async function(api,frequency){
	frequency= frequency || 1000;
	let api_caller = null;
	
	if( api === "lms" ){
    
   
    
			const getlocalStreamer = require('./lms/lms.js');
       
      const streamer = await getlocalStreamer();
      if(!streamer) {	
        clearInterval(this.update_interval);
        this.page = null;
        this.lms_not_found_mode(x => this.listen_to(api));
        return;
      }
   
      const sleepMonitor = setInterval(  x=>  this.handle_sleep(false), 1000 )
      this.playback_mode();
  
      
      
      streamer.subscribe(1);
      this.handle_sleep(true);	
      
      streamer.on("connectionLost", d =>{
        clearTimeout(this.idle_timeout);
        this.idle_timeout = null;
        clearInterval(this.update_interval);
        clearInterval(sleepMonitor)
        this.page = null;
        this.lms_not_found_mode(x => this.listen_to(api));
        return;
      })   
      
      
      streamer.on("trackChange", d=>{
        this.text_to_display = streamer.formatedMainString;
        this.driver.CacheGlyphsData( this.text_to_display);
				this.text_width = this.driver.getStringWidthUnifont(this.text_to_display + " - ");
        this.scroller_x = 0;
        this.refresh_track = REFRESH_TRACK;
        this.handle_sleep(true);	
      })      
      streamer.on("volumeChange", d=>{
        this.data.volume = d;
        this.handle_sleep(true);	
      })
	  streamer.on("powerChange", d=>{
		this.powerState = d
		if (this.powerState == 1) {			
			this.handle_sleep(true);
		}
		else {
//			console.log("[POWEROFF] Enabling Clock: ", new Date())
			this.clock_mode()
//			clearTimeout(this.idle_timeout);
			this.idle_timeout=null
			this.handle_sleep(false);
		}
      })
      streamer.on("seekChange", d=>{
        this.data.seek_string = streamer.formatedSeek.seek_string;
        this.data.ratiobar  = streamer.formatedSeek.ratiobar ;
        this.handle_sleep(true);	
      })

	        
	  const formatSamplerate = (data)=>{
		switch (data){
			case "176.4k":
				data = "DSD64"
				break;
			case "352.8k":
				data = "DSD128"
				break;
			case "705.6k":
				data = "DSD256"
				break;
			default:
				data = (parseFloat(data)/1000).toString() + "k"
			}
		return data
	  }
      	        
	  const formatSamplesize = (data)=>{
		switch (data){
			case "16":
			case "24":
			case "32":
				data = data + "Bit"
				break;
			}	
		return data
	  }
      
      const foot = ()=>{
        this.footertext = "";
				if ( streamer.playerData.bitrate ) this.footertext += streamer.playerData.bitrate + " "
				if ( streamer.playerData.samplerate ) this.footertext +=formatSamplerate(streamer.playerData.samplerate) + " "
				if ( streamer.playerData.samplesize ) this.footertext +=formatSamplesize(streamer.playerData.samplesize) + " "
			}

      streamer.on("bitRateChange",    ()=>foot()  );
      streamer.on("sampleRateChange", ()=>foot()  );
	  streamer.on("sampleSizeChange", ()=>foot()  );
      streamer.on("encodingChange",   d=> this.data.trackType = d );
      streamer.on("stateChange",      d=> this.data.status = d    );
      streamer.on("repeatChange",     d=> {
        this.data.repeatSingle = null;
        this.data.repeat = null;
        if(d == 1 )  this.data.repeatSingle = true;
        if(d == 2 )  this.data.repeat = true;
      });
      
      
	}
		
	else if( api === "ip" ){
		api_caller = setInterval( ()=>{this.get_ip()}, frequency );
		return api_caller;
	}

}

ap_oled.prototype.snake_screensaver = function(){
if (this.page === "snake_screensaver") return;
	clearInterval(this.update_interval);
	this.page = "snake_screensaver";
	
	let box_pos = [0,0];
	let count = 0;
	let flip = false;
	let tail = [];
	let tail_max = 25;
	let t_tail_length = 1;
	let random_pickups = [];
	let screen_saver_animation_reset =()=>{
		tail = [];
		count = 0;
		t_tail_length = 10;
		random_pickups = [];
		let nb = 7;
		while(nb--){
			let _x =  Math.floor(Math.random() * (this.width ));
			let _y =  Math.floor(Math.random() * (this.height/3))*3;
			random_pickups.push([_x,_y]);
		}	
	}
	screen_saver_animation_reset();
	this.refresh_action = ()=>{
		this.driver.buffer.fill(0x00);
		let x;
		if( count % this.width == 0) {flip = !flip}
		if(flip) x = count % this.width +1
		else x = this.width - count % this.width
		let y = ~~( count / this.width ) *3
		tail.push([x,y]);
		if(tail.length > t_tail_length ) tail.shift();
		for(let i of tail){
			this.driver.fillRect(i[0],i[1]-1,2,3,1);
		}
		for(let r of random_pickups){
			if(  ( ( flip && x >= r[0] ) || ( !flip && x <= r[0] ) ) && y >= r[1] ){ 
				t_tail_length +=5;
				random_pickups.splice(random_pickups.indexOf(r),1)
			}
			this.driver.fillRect(r[0],r[1],1,1,1);
		}
		count++;
		this.driver.update(true);
		if(y > this.height ) screen_saver_animation_reset();
	}
	this.update_interval = setInterval( ()=>{this.refresh_action()}, 40);
}

ap_oled.prototype.deep_sleep = function(){
if (this.page === "deep_sleep") return;
	this.status_off = true;
	clearInterval(this.update_interval);
	this.page = "deep_sleep";
	this.driver.turnOffDisplay();

}

ap_oled.prototype.clock_mode = function(){
if (this.page === "clock") return;
	clearInterval(this.update_interval);
	this.page = "clock";
	
	this.refresh_action = ()=>{
		this.driver.buffer.fill(0x00);
		let fdate = date.format(new Date(),DATE_FORMAT),
		ftime = date.format(new Date(),TIME_FORMAT);
		
		this.driver.setCursor(90, 0);
		this.driver.writeString( fonts.monospace ,1,fdate,3);
		
		this.driver.setCursor(50,15);
		this.driver.writeString( fonts.monospace ,3,ftime,6);
		this.driver.drawLine(1, 41, 255, 41, 5, false);
		
		
		this.driver.setCursor(20,47);
		this.driver.writeString(fonts.monospace ,1, (this.ip?this.ip:"No network...") ,4);
		
		
		if(this.data && this.data.volume !== null ){
			let volstring = this.data.volume.toString();
			if(this.data.mute === true || volstring === "0") volstring = "X";
			this.driver.setCursor(185,47);
			this.driver.writeString(fonts.icons , 1 , "0" ,4); 
			this.driver.setCursor(195,47);
			this.driver.writeString(fonts.monospace ,1, volstring ,6);

		}
		this.driver.update(true);
	}
	this.refresh_action();
	this.update_interval = setInterval( ()=>{this.refresh_action()}, 1000);
	
}

ap_oled.prototype.lms_not_found_mode = function(cb){
if (this.page === "lms_not_found") return;
	clearInterval(this.update_interval);
	this.page = "lms_not_found";
	let timer = 5;
	this.refresh_action = ()=>{
		
		this.driver.buffer.fill(0x00);
		
		this.driver.setCursor(10, 0);
		this.driver.writeString( fonts.monospace ,2,"LMS IS NOT RUNNING",3);

		this.driver.setCursor(10, 25);
		this.driver.writeString( fonts.monospace ,2,"Retrying in... "+timer,3);
		
		this.driver.update(true);
		timer--;
		if(timer<0){
      clearInterval(this.update_interval);
       if(typeof cb === "function" ) cb();
    }
		
	}
	this.refresh_action();
	this.update_interval = setInterval( ()=>{this.refresh_action()}, 1000);
}

ap_oled.prototype.playback_mode = function(){
    
	if (this.page === "playback") return;
	if (this.powerState == 0) return;  //Prevent clock being overwritten if power is off on startup

	clearInterval(this.update_interval);
	
 	this.scroller_x = 0;
	this.page = "playback";
  this.text_to_display = this.text_to_display || "";
	this.refresh_track = REFRESH_TRACK;
	this.refresh_action =()=>{
      if(this.plotting){ return }; // skip plotting of this frame if the pi has not finished plotting the previous frame
		
      this.plotting = true;
      this.driver.buffer.fill(0x00);
		
      if(this.data){
        // volume
        if(this.data.volume !== null ){
                  let volstring = this.data.volume.toString();
                  if(this.data.mute === true || volstring === "0") volstring = "X";
                  
                  this.driver.setCursor(0,0);
                  this.driver.writeString(fonts.icons , 1 , "0" ,5); 
                  this.driver.setCursor(10,1);
                  this.driver.writeString(fonts.monospace ,1, volstring ,5);
              }    
        
        // repeat
        if(this.data.repeatSingle){
          this.driver.setCursor(232,0);
          this.driver.writeString(fonts.icons , 1 , "5" ,5); 
        } else if( this.data.repeat ){
          this.driver.setCursor(232,0);
                  this.driver.writeString(fonts.icons , 1 , "4" ,5); 
              }
        
        // track type (flac, mp3, webradio...etc.)
        if(this.data.trackType){
          this.driver.setCursor(35,1);
          this.driver.writeString(fonts.monospace , 1 , this.data.trackType ,4); 
        }
      
        // string with any data we have regarding sampling rate and bitrate
        if(this.footertext){
          this.driver.setCursor(0,57);
          this.driver.writeString(fonts.monospace , 1 , this.footertext ,5); 
        }
        
        // play pause stop logo
        if(this.data.status){
          let status_symbol = "";
          switch(this.data.status){
            case ("play"):
              status_symbol = "1";
              break;
            case ("pause"):
              status_symbol = "2"
              break;		
            case ("stop"):
              status_symbol = "3"
              break;
          }    
                  this.driver.setCursor(246,0);
                  this.driver.writeString(fonts.icons ,1, status_symbol ,6);
        }

        // track title album artists
        if(this.text_to_display.length){ 
          //  if the whole text is short enough to fit the whole screen
          if( this.text_width <= this.width ){
            this.driver.setCursor( 0, 17 );
            this.driver.writeStringUnifont(this.text_to_display,7 );  
          }
          else{ // text overflows the display (very likely considering it's 256px) : make the text scroll alongside its horizontal direction
            let text_to_display = this.text_to_display;
            text_to_display = text_to_display + " - " + text_to_display + " - ";
            if(this.scroller_x + (this.text_width) < 0 ){
              this.scroller_x = 0;
            }
            this.driver.cursor_x = this.scroller_x;
            this.driver.cursor_y = 14
            this.driver.writeStringUnifont(text_to_display,7 );
          }
        }
        // seek data
        if(this.data.seek_string){
          let border_right = this.width -5;
          let Y_seekbar = 35;
          let Ymax_seekbar = 38;
          this.driver.drawLine(3, Y_seekbar, border_right , Y_seekbar, 3);
          this.driver.drawLine(border_right, Y_seekbar,border_right , Ymax_seekbar, 3);
          this.driver.drawLine(3, Ymax_seekbar,border_right, Ymax_seekbar, 3);
          this.driver.drawLine(3, Ymax_seekbar, 3, Y_seekbar, 3);
          this.driver.cursor_y = 43;
          this.driver.cursor_x = 83;
          this.driver.writeString(fonts.monospace , 1 , this.data.seek_string ,5); 
          this.driver.fillRect(3, Y_seekbar, border_right * this.data.ratiobar / 100, 4, 4);
        }
      }
		
		this.driver.update();
		this.plotting = false;
        if(this.refresh_track) return this.refresh_track--; // ne pas updater le curseur de scroll avant d'avoir écoulé les frames statiques (juste après un changement de morceau)
		this.scroller_x--;
	}

	this.update_interval = setInterval( ()=>{ this.refresh_action() },opts.main_rate);
	this.refresh_action();
}


ap_oled.prototype.get_ip = function(){
	try{
		let ips = os.networkInterfaces(), ip = "No network.";
		for(a in ips){
			if( ips[a][0]["address"] !== "127.0.0.1" ){
				ip = ips[a][0]["address"];
				break;
			}
		}
		this.ip = ip;
	}
	catch(e){this.ip = null;}
}


ap_oled.prototype.handle_sleep = function(exit_sleep, nopostdisplay = false){
	// console.log("exit_sleep", exit_sleep)
	if( !exit_sleep ){ // Est-ce que l'afficheur devrait passer en mode veille ? 
		
		if(!this.idle_timeout){ // vérifie si l'écran n'attend pas déjà de passer en veille (instruction initiée dans un cycle précédent)
			
		
			let _deepsleep_ = ()=>{this.deep_sleep();}
		
			let _screensaver_ = ()=>{
				this.snake_screensaver();
				this.idle_timeout = setTimeout(_deepsleep_,TIME_BEFORE_DEEPSLEEP);
			}
			
//			let _clock_ = ()=>{
//				this.clock_mode();
//				this.idle_timeout = setTimeout(_screensaver_,TIME_BEFORE_SCREENSAVER);
//			}
			
//			this.idle_timeout = setTimeout( _clock_ , TIME_BEFORE_CLOCK );

//			console.log("setTimeout: ", new Date())

			this.idle_timeout = setTimeout(_screensaver_,TIME_BEFORE_SCREENSAVER);

		}
	}
	else{
		if(this.status_off){
			this.status_off = null;
			this.driver.turnOnDisplay();
			if (PENDINGSETCONTRAST == true){
				this.driver.setContrast(CONTRAST) // Reset the contrast incase it was changed with display off
				console.log("[EVO DISPLAY#2] : Updated contrast set on screen wake")
			}
		}

		PENDINGSETCONTRAST = false  // If the screen was on, contrast has already been changed
		
		if(this.page !== "spdif" ){
			this.playback_mode();
		}

		if(this.idle_timeout){
			clearTimeout(this.idle_timeout);
			this.idle_timeout = null;
		}
	}
}
	
fs.readFile(default_config_path+"/config.json",(err,data)=>{
	
	const fail_warn =()=>{ console.log("[EVO DISPLAY#2] : Cannot read config file. Using default settings instead.") };
	if(err) fail_warn();
	else{
		try { 
			data = JSON.parse( data.toString() );
			console.log("[EVO DISPLAY#2] : Config loaded :",data);
			TIME_BEFORE_SCREENSAVER = (data && data.sleep_after) ? data.sleep_after  * 1000 : TIME_BEFORE_SCREENSAVER;
			TIME_BEFORE_DEEPSLEEP = (data && data.deep_sleep_after) ? data.deep_sleep_after  * 1000 : TIME_BEFORE_DEEPSLEEP;
			CONTRAST = (data && data.contrast) ? data.contrast : CONTRAST;
			DATE_FORMAT = (data && data.date_format) ? data.date_format : DATE_FORMAT;
			TIME_FORMAT = (data && data.time_format) ? data.time_format : TIME_FORMAT;
		} catch(e){fail_warn()}
	}
	
	opts.contrast = CONTRAST;
	
	const OLED = new ap_oled(opts);
	var logo_start_display_time = 0;
	
	OLED.driver.begin();
		
	DRIVER = OLED;
	OLED.driver.load_and_display_logo( default_config_path + 'logo.logo', (displaylogo)=>{ 
		console.log("[EVO DISPLAY#2] : logo loaded")
		if(displaylogo) logo_start_display_time = new Date();
	});
	OLED.driver.load_hex_font("unifont.hex", start_app);

	function start_app(){
		let time_remaining = 0;
		if(logo_start_display_time){
			time_remaining = LOGO_DURATION - ( new Date().getTime() - logo_start_display_time.getTime() )  ;
			time_remaining = (time_remaining<=0)?0:time_remaining;
		}
		setTimeout( ()=>{
			// OLED.playback_mode();
			OLED.listen_to("lms",1000);
			OLED.listen_to("ip",1000);
		}, time_remaining );
	}

	function exitcatch(options) {
		if (options.cleanup) OLED.driver.turnOffDisplay();
		if (options.exit) process.exit();
	}

	process.on('exit', 		exitcatch.bind( null, { cleanup:true} ));
	process.on('SIGINT', 	exitcatch.bind( null, { exit:true	} ));
	process.on('SIGUSR1',	exitcatch.bind( null, { exit:true	} ));
	process.on('SIGUSR2', 	exitcatch.bind( null, { exit:true	} ));

});
