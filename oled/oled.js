var spi = require('pi-spi');
var Gpio = require('onoff').Gpio;
var async = require('async');
const fs = require("fs");

const CMD_COL  			=	0x15;
const CMD_ROW   		=	0x75;
const CMD_WRITE  		=	0x5C;
const CMD_READ   		=	0x5D;
const CMD_DISPON  		=	0xAF;
const CMD_DISPOFF 		=	0xAE;
const CMD_ENGREYSCALE 	=	0x00;
const CMD_MODE			=	0xA0;
const CMD_SETSTART		=	0xA1;
const CMD_DISPOFFSET	=	0xA2;
const CMD_DISPNORM	 	=	0xA6;
const CMD_DISPINVERT 	=	0xA7;
const CMD_DISPALLON	 	=	0xA5;
const CMD_DISPALLOFF 	=	0xA4;
const CMD_VDDSEL	 	=	0xAB;
const CMD_PHASELEN	 	=	0xB1;
const CMD_SETCLKFREQ 	=	0xB3;
const CMD_DISPENHA	 	=	0xB4;
const CMD_SETGPIO	 	=	0xB5;
const CMD_SECPRECHRG 	=	0xB6;
const CMD_SETGRYTABLE 	=	0xB8;
const CMD_DEFGRYTABLE 	=	0xB9;
const CMD_PRECHRGVOL 	=	0xBB;
const CMD_SETVCOMH	 	=	0xBE;
const CMD_CONTRSTCUR 	=	0xC1;
const CMD_MSTCONTRST 	=	0xC7;
const CMD_MUXRATIO	 	=	0xCA;
const CMD_DISPENHB	 	=	0xD1;
const CMD_COMLOCK	 	=	0xFD;



function chunkString(str, length){
	return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

var Oled = function(opts) {

  this.HEIGHT = opts.height || 64;
  this.WIDTH = opts.width || 256;
  this.horizontal_columns = this.WIDTH >> 2;
  
  this.dcPinNumber = opts.dcPin || 27;
  this.rstPinNumber = opts.rstPin || 24;
  this.divisor = opts.divisor || 0xF1;
  this.device = opts.device || "/dev/spidev0.0";
  this.cursor_x = 0;
  this.cursor_y = 0;
  
  
  
  // new blank buffer
  this.buffer =  Buffer.alloc( 2 * this.horizontal_columns * this.HEIGHT );
  this.bufferlength = this.buffer.length;
  this.last_change = null;
  console.log("buffer length : ",this.bufferlength, "horizontal cols : ", this.horizontal_columns )
  
  this.change_log = {};
  this.updateInProgress = false;
  this.hex_font = null;
  this.contrast = (opts.contrast) || 0x00;
  
  var screenSize = this.WIDTH + 'x' + this.HEIGHT;
  this.wireSPI = spi.initialize(this.device);
}

Oled.prototype.begin = function(fn) {
  this.dcPin = new Gpio(this.dcPinNumber, 'low');
  this.rstPin = new Gpio(this.rstPinNumber, 'high');
  setTimeout(()=>{
    this.reset(()=>{
      this._initialise(()=>{
        if (typeof(fn) == "function") fn();
      });
  });
  }, 1);
}

Oled.prototype.end = function() { 
  this.dcPin.unexport();
  this.rstPin.unexport();
}

Oled.prototype._initialise = function(callback) {
	seq = [
		{val : CMD_COMLOCK, cmd : true}, {"dc":true},{val : 0x12},{"cd":true}, 										// open command lock 
		{val : CMD_DISPOFF , cmd : true}, 																			// display off 
		{val : CMD_COL , cmd : true}, {"dc":true}, {val : 28}, {val : 28+this.horizontal_columns -1 }, {"cd":true},	// column address 
		{val : CMD_ROW , cmd : true}, {"dc":true}, {val : 0x00}, {val : this.HEIGHT-1}, {"cd":true},	 			// row address 
		{val : CMD_SETCLKFREQ, cmd : true}, {"dc":true}, {val : this.divisor}, {"cd":true},							// divisor  
		{val : CMD_MUXRATIO, cmd : true}, {"dc":true}, {val : this.HEIGHT-1},  {"cd":true},			 				// multiplex 
		{val : CMD_DISPOFFSET, cmd : true}, {"dc":true}, {val : 0x00},  {"cd":true},								// display offset  
		{val : CMD_SETSTART, cmd : true}, {"dc":true}, {val : 0x00}, {"cd":true},									// display start line  
		{val : CMD_MODE, cmd : true}, {"dc":true}, {val : 0x14}, {val :0x11},{"cd":true},							// set remap format 
		{val : CMD_SETGPIO, cmd : true}, {"dc":true}, {val : 0x00},{"cd":true}, 									// gpio mode
		{val : CMD_VDDSEL, cmd : true},  {"dc":true},{val : 0x01}, 	{"cd":true},									// function selection
		{val : CMD_DISPENHA, cmd : true}, {"dc":true}, {val : 0x00}, {val : 0xB0}, 	{"cd":true},					// VSL selection ( 0x00 = extn / 0x02 = internal)
		{val : CMD_CONTRSTCUR, cmd : true}, {"dc":true}, {val : this.contrast},  {"cd":true},						// Contrast current
		{val : CMD_MSTCONTRST, cmd : true},{"dc":true},  {val : this.contrast},  {"cd":true},						// master current
		{val : CMD_DEFGRYTABLE, cmd : true}, 
		{val : CMD_ENGREYSCALE, cmd : true},							 											// linear grey scale table 
		{val : CMD_PHASELEN, cmd : true}, {"dc":true}, {val : 0x05}, {val : 0x03},	{"cd":true},					// Phase
		{val : CMD_DISPENHB, cmd : true}, {"dc":true}, {val : 0x82}, {val : 0x20},{"cd":true},  					// display enhancement
		{val : CMD_PRECHRGVOL, cmd : true},{"dc":true},  {val : 0x1F},  {"cd":true},								// precharge voltage
		{val : CMD_SECPRECHRG, cmd : true},{"dc":true},  {val : 0x08}, {"cd":true}, 								// precharge period
		{val : CMD_SETVCOMH, cmd : true}, {"dc":true}, {val : 0x07},  {"cd":true},									// vcomh 
		{val : CMD_DISPNORM, cmd : true},																			// display mode : normal
		{val : 0xA8 | 0x01, cmd : true}, 																			// partial display off
		{val : CMD_DISPON, cmd : true}, 																			// display ON
		
	]
	 
	this.send_instruction_seq(seq,
	()=>{  this.fullRAMclear(
		()=>{
			console.log("RAM CLEARED")
			if(typeof callback === "function") callback();
		}, true);	
	});
	  
	


 
}

Oled.prototype.send_instruction_seq = function(s,callback,index){
	index = index || 0;
	let current = s[index];
	if( !current ){ 
		typeof callback === "function" && callback();
		return;
	}
	index++;
	if( current["dc"] ){
		this.dcPin.write(1, (err)=>{
			if (err) console.error(err, d);
			this.send_instruction_seq(s,callback,index);
		});
	}
	else if( current["cd"] ){
		this.dcPin.write(0, (err)=>{
			if (err) console.error(err, d);
			this.send_instruction_seq(s,callback,index);
		});
	}
	else{
		if( typeof current.val !== 'object' ) current.val = Buffer.from([current.val]);
		this.wireSPI.write( current.val , (err, d)=> {
			if (err) console.error(err, d);
			this.send_instruction_seq(s,callback,index);
		});
	}
}

Oled.prototype.fullRAMclear = function(callback,overwrite){
	for(x = 0; x < this.WIDTH; x++){
		for(y = 0; y < this.HEIGHT; y++){
			this.drawPixel(x,y,0,overwrite);
		}
	}
	this.update( ()=>{
		if(typeof callback === "function") callback();
	});
}

Oled.prototype.update = function(callback){

	if(this.updateInProgress){
		if(typeof callback === "function") callback();
		return;
	}
	this.updateInProgress = true;
	let static_frame = Buffer.alloc(this.buffer.length);
	this.buffer.copy(static_frame);

	
	let sequence = [
		{val : CMD_COL , cmd : true}, {"dc":true}, {val : 28}, {val : 28+this.horizontal_columns-1 }, {"cd":true},	 			// column address 
		{val : CMD_ROW , cmd : true}, {"dc":true}, {val : 0x00}, {val : this.HEIGHT-1}, {"cd":true},	 						// row address 
		{val : CMD_WRITE	, cmd : true }, 																					// mode écriture
		{"dc":true}, {val : static_frame }, {"cd":true}
	
	];
	
	this.send_instruction_seq(sequence,()=>{
		this.updateInProgress = false;
		if(typeof callback === "function") callback();
	});

}

Oled.prototype._transferCommandSeq = function(cmdSeq, fn) {
	this.wireSPI.write(new Buffer(cmdSeq), function(err, d) {
		if (err) console.error(err, d);
		if (typeof(fn) == "function") fn();
	});
}

Oled.prototype.reset = function(fn) {
	var that = this;
	async.series(
	[
		function(callback){
		  that.rstPin.write(0,callback);
		},
		function(callback){
		  setTimeout(callback, 10);
		},
		function(callback){
		  that.rstPin.write(1,callback);
		}
	], 
	function(err){
		if (err) console.error(err);
		if (typeof(fn) == "function") fn();
	});
}

// set starting position of a text string on the oled
Oled.prototype.setCursor = function(x, y) {
  this.cursor_x = x;
  this.cursor_y = y;
}

// write text to the oled
Oled.prototype.writeString = function(font, size, string, color) {
  var wordArr = string.split(' '),
      len = wordArr.length,
      // start x offset at cursor pos
      offset = this.cursor_x,
      padding = 0, letspace = 0, leading = 2;

  // loop through words
  for (var w = 0; w < len; w += 1) {
    // put the word space back in
    wordArr[w] += ' ';
    var stringArr = wordArr[w].split(''),
        slen = stringArr.length,
        compare = (font.width * size * slen) + (size * (len -1));


    // loop through the array of each char to draw
    for (var i = 0; i < slen; i += 1) {
      // look up the position of the char, pull out the buffer slice
      var charBuf = this._findCharBuf(font, stringArr[i]);
      // read the bits in the bytes that make up the char
      var charBytes = this._readCharBytes(charBuf);
      // draw the entire character
      this._drawChar(charBytes, size,color);

      // calc new x position for the next char, add a touch of padding too if it's a non space char
     //padding = (stringArr[i] === ' ') ? 0 : size + letspace;
      padding = size + letspace;
      offset += (font.width * size) + padding;

      // set the 'cursor' for the next char to be drawn, then loop again for next char
      this.setCursor(offset, this.cursor_y);
    }
  }

}

// draw an individual character to the screen
Oled.prototype._drawChar = function(byteArray, size, col) {
  // take your positions...
  var x = this.cursor_x,
      y = this.cursor_y;

  // loop through the byte array containing the hexes for the char
  for (var i = 0; i < byteArray.length; i += 1) {
    for (var j = 0; j < 8; j += 1) {
      // pull color out
      var color = byteArray[i][j] * col,
          xpos, ypos;
      // standard font size
      if (size === 1) {
        xpos = x + i;
        ypos = y + j;
        this.drawPixel(xpos, ypos, color);
      } else {
        // MATH! Calculating pixel size multiplier to primitively scale the font
        xpos = x + (i * size);
        ypos = y + (j * size);
        this.fillRect(xpos, ypos, size, size, color, false);
      }
    }
  }
}

// BASIC UNICODE SUPPORT

Oled.prototype.load_hex_font = function(fontpath,callback){
	this.hex_font = {};
	fs.readFile("unifont.hex",(err,data)=>{
		let unichars = data.toString().split("\n");
		for(let unichar of unichars){
			let code = parseInt(unichar.substring(0,4),16);
			let value = unichar.substring(5);
			if(code){
				let splitval;
				let columns = 0;
				let row_length = 0;
				if( value.length === 64 ){ 
					columns = 4;
					row_length = 16;
				}
				else{ 
					columns = 2;
					row_length = 8;
				}
				splitval = chunkString(value,columns);
				for(let i in splitval){
					splitval[i] = parseInt(splitval[i],16)
				}
				this.hex_font[code] = {
					data : splitval,
					length : row_length
				}
			};
		}
		if(typeof callback === "function") {
			callback();
		}
	});
}

Oled.prototype.CacheGlyphsData = function(string){
	this.cached_glyph = {};
	if(!this.hex_font){console.log("font not loaded"); return}
	let used_chars = new Set(string);
	for(used_char of used_chars){
		let height = 0,
		binary_glyph = [],
		binary_row_string = "",
		glyph_raw_data = this.hex_font[used_char.charCodeAt()];
		
		if(glyph_raw_data){
			let data = glyph_raw_data.data,
			length = glyph_raw_data.length;
			for (var i = 0; i < data.length ; i += 1) {
				height++;
				binary_row_string = data[i].toString(2);
				while( binary_row_string.length < length ){ binary_row_string = "0" + binary_row_string; }
				binary_glyph.push(binary_row_string);
			}
		}
		
		this.cached_glyph[used_char] = {
			data : binary_glyph,
			width : binary_row_string.length,
			height : height
		};
	}
}


Oled.prototype.writeStringUnifont = function(string,color) {
	
	let temp_cursor = this.cursor_x;
    // loop through the array of each char to draw
    for (var i = 0; i < string.length ; i += 1) {
		if(!this.hex_font){console.log("font not loaded"); return}
		if(this.cursor_x  >= this.WIDTH){return}

		var charBuf = this.cached_glyph[string[i]];
		if(!charBuf || this.cursor_x+charBuf.width <= 0){
			let spacing = (charBuf && charBuf.width) ? charBuf.width : 8;
			this.setCursor( this.cursor_x + spacing , this.cursor_y );
			continue;
		}
		// dessiner le glyphe à l'endroit du curseur
		this._drawCharUnifont(charBuf,color);
		// déplacer le curseur pour le prochain glyphe
		this.setCursor(this.cursor_x+charBuf.width,this.cursor_y);
    }
	//this.cursor_x = temp_cursor;
}

Oled.prototype.getStringWidthUnifont = function(string) {
	
	
	if(!string || !string.length) return 0;
	let width = 0;
    // loop through the array of each char to draw
    for (var i = 0; i < string.length ; i += 1) {
		if(!this.hex_font){console.log("font not loaded"); return}
		var charBuf = this.hex_font[string[i].charCodeAt()];
		if(!charBuf) continue;
		width += charBuf.length;
    }
  
	return width;
}

// draw an individual character to the screen
Oled.prototype._drawCharUnifont = function(buf,color) {
	var y = this.cursor_x, // inversé parce que buf data est encodé en ligne plutôt qu'en colonnes.
		x = this.cursor_y,
		d = buf.data
	// pour chaque ligne
	for (var i = 0; i < buf.height; i += 1) {
		for (var j = 0; j < buf.width; j += 1) {
			this.drawPixel(y + j,x + i, d[i][j] * color);
		}
	}
}

// get character bytes from the supplied font object in order to send to framebuffer
Oled.prototype._readCharBytes = function(byteArray) {
  var bitArr = [],
      bitCharArr = [];
  // loop through each byte supplied for a char
  for (var i = 0; i < byteArray.length; i += 1) {
    // set current byte
    var byte = byteArray[i];
    // read each byte
    for (var j = 0; j < 8; j += 1) {
      // shift bits right until all are read
      var bit = byte >> j & 1;
      bitArr.push(bit);
    }
    // push to array containing flattened bit sequence
    bitCharArr.push(bitArr);
    // clear bits for next byte
    bitArr = [];
  }
  return bitCharArr;
}

// find where the character exists within the font object
Oled.prototype._findCharBuf = function(font, c) {
  // use the lookup array as a ref to find where the current char bytes start
  var cBufPos = font.lookup.indexOf(c) * font.width;
  // slice just the current char's bytes out of the fontData array and return
  var cBuf = font.fontData.slice(cBufPos, cBufPos + font.width);
  return cBuf;
}

// turn oled off
Oled.prototype.turnOffDisplay = function() {
	this.buffer.fill(0x00);
	this.update(
	 ()=>{
		  this.send_instruction_seq( [{val : this.DISPLAY_OFF}] );
	})

}

// turn oled on
Oled.prototype.turnOnDisplay = function() {
 this.send_instruction_seq( [{val : this.DISPLAY_ON} ] );
}


Oled.prototype.setContrast = function(contrast,cb){
	if(contrast < 0 || contrast > 255) return;
	let seq = [
		{val: CMD_MSTCONTRST, cmd : true}, {"dc":true}, {val : contrast},{"cd":true}
	];
	this.send_instruction_seq(seq,cb);
}


Oled.prototype.drawPixel = function(x,y,color,bypass_buffer) {

    // Ne rien faire si le pixel n'est pas dans l'espace de l'écran
    if (	
            x >= this.WIDTH  || 
            y >= this.HEIGHT || 
            x < 0 ||
			y < 0
        ){ 
            return;
        } 

    let horitonzal_index = x >> 1; 
    let buffer_index =  horitonzal_index   + ( (this.horizontal_columns <<1 ) * y )  // quel element du buffer faut-il modifier pour changer ce pixel ?
    let oled_subcolumn_state = this.buffer[buffer_index];	
    let right_col = x & 0x1; // chaque entrée du buffer représente 2 pixels. On détermine ici si x concerne le pixel de gauche ou de droite représenté par oled_subcolumn_state. ( true si x est impair )
    let sub_col_left = oled_subcolumn_state >> 4; // qu'est-ce qu'on a dans la col 0 (gauche) ?
    let sub_col_right = oled_subcolumn_state & 0x0f;  // qu'est-ce qu'on a dans la col 1 (droite) ?

    if(right_col){ // si x doit changer le pixel de droite
        this.buffer[buffer_index] = sub_col_left << 4 | color; // buffer[buffer_index] = pixel de gauche intact + nouveau pixel 
    }
    else { // si x doit changer le pixel de gauche
        this.buffer[buffer_index] = color << 4 | sub_col_right; // buffer[buffer_index] = nouveau pixel + pixel de droite intact
    }
}


//  Bresenham's algorithm
Oled.prototype.drawLine = function(x0, y0, x1, y1, color) {

  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1,
      dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1,
      err = (dx > dy ? dx : -dy) / 2;

  while (true) {
    this.drawPixel(x0, y0, color);

    if (x0 === x1 && y0 === y1) break;

    var e2 = err;

    if (e2 > -dx) {err -= dy; x0 += sx;}
    if (e2 < dy) {err += dx; y0 += sy;}
  }


}


Oled.prototype.fillRect = function(x, y, w, h, color) {
	for (var i = x; i < x + w; i += 1) {
		this.drawLine(i, y, i, y+h-1, color, false);
	}
}


Oled.prototype.load_and_display_logo = function(callback){
	callback = callback || function(){}
	fs.readFile("logo.logo",(err,data)=>{
		try{
			data = data.toString().split("\n");
			let flip = true;
			let p = 0;
			for(let d of data){
				while(d--){
					this.drawPixel( p % this.WIDTH ,  ~~( p / this.WIDTH ) , flip*7);
					p++;
				}
				flip = !flip;
			}
			this.update();
			callback(true);
		}
		catch(e){
			console.log("error while displaying logo")
			callback(false);
		}
	});
}

module.exports = Oled;
