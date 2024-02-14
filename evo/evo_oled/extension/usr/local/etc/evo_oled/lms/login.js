const crypto = require('crypto');
const fs = require('fs');
const readline = require('node:readline/promises');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
}); 

var currentPort = 9090
var currentHost = '127.0.0.1'
var currentLogin = ''
var currentPassword = ''

const path = process.argv[2] || fs.readFileSync(__dirname+'/default_path').toString();

try{
  var data = JSON.parse(fs.readFileSync(path+'/lms/config.json').toString())

  currentPort = (data && data.port) ? data.port : currentPort;
  currentHost = (data && data.host) ? data.host : currentHost;
  currentLogin = (data && data.login) ? data.login : currentLogin;

  if(data.pass){
    const k = fs.readFileSync(path+'/lms/k/k');
    let iv = Buffer.from(data.pass.iv, 'hex');
    let encryptedText = Buffer.from(data.pass.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(k), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    data.pass = decrypted.toString();
  }

  currentPassword = (data && data.pass) ? data.pass : currentPassword;

}
catch(e){}

(async ()=>{

  const port = await rl.question(`\nWhich port is your LMS telnet using ? (default : ${currentPort} )\n`) || currentPort;
  const host = await rl.question(`Which host is your LMS telnet using ? (default : ${currentHost} )\n`) || currentHost;
  const login = await rl.question(`Login for your LMS ? (default : ${currentLogin}) (Leave blank if you have no login/password set)\n` || currentLogin);
  const pass = await rl.question(`Password for your LMS ? (default : ${currentPassword}) (Leave blank if you have no login/password set)\n` || currentPassword);
  rl.close();
  let securepass;
  
  fs.mkdirSync(path+"/lms/k", { recursive: true } )
  
  if(pass){
    const k = generateKey();
    securepass = encrypt(pass, k);
    fs.writeFileSync(path+'/lms/k/k', k);
  }
  fs.writeFileSync(path+'/lms/config.json', 
    JSON.stringify({port, host, login, pass:securepass})
  );
})();

function generateKey() {
    return crypto.randomBytes(32); // AES-256 key
}
function encrypt(text, key) {
    const iv = crypto.randomBytes(16); // generate a different IV each time
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}
