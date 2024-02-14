const fs = require('fs');
const readline = require('node:readline/promises');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
}); 

var TIME_BEFORE_SCREENSAVER = 120; // in sec  
var TIME_BEFORE_DEEPSLEEP = 480; // in sec
var CONTRAST = 254; // range 1-254
var DATE_FORMAT = "DD/MM/YYYY"
var TIME_FORMAT = "HH:mm:ss"

const path = process.argv[2] || fs.readFileSync(__dirname+'/lms/default_path').toString();

try{
  var data = JSON.parse(fs.readFileSync(path+'/config.json').toString())

  TIME_BEFORE_SCREENSAVER = (data && data.sleep_after) ? data.sleep_after : TIME_BEFORE_SCREENSAVER;
  TIME_BEFORE_DEEPSLEEP = (data && data.deep_sleep_after) ? data.deep_sleep_after : TIME_BEFORE_DEEPSLEEP;
  CONTRAST = (data && data.contrast) ? data.contrast : CONTRAST;
  DATE_FORMAT = (data && data.date_format) ? data.date_format : DATE_FORMAT;
  TIME_FORMAT = (data && data.time_format) ? data.time_format : TIME_FORMAT;
}
catch(e){}

(async ()=>{

  const sleep_after = await rl.question(`\nTime before screensaver in seconds? (default : ${TIME_BEFORE_SCREENSAVER} )\n`) || TIME_BEFORE_SCREENSAVER;
  const deep_sleep_after = await rl.question(`Time before screen blanking? (default : ${TIME_BEFORE_DEEPSLEEP} )\n`) || TIME_BEFORE_DEEPSLEEP;
  const contrast = await rl.question(`Contrast? (default : ${CONTRAST})\n`) || CONTRAST;
  const date_format = await rl.question(`Date Format? (default : ${DATE_FORMAT})\n`) || DATE_FORMAT;
  const time_format = await rl.question(`Time Format? (default : ${TIME_FORMAT})\n`) || TIME_FORMAT;
  
  
  rl.close();

  fs.writeFileSync(path+'/config.json', 
    JSON.stringify({sleep_after:parseInt(sleep_after), deep_sleep_after:parseInt(deep_sleep_after), contrast:parseInt(contrast), date_format, time_format})
  );
})();
