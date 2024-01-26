const crypto = require('crypto');
const fs = require('fs');
const readline = require('node:readline/promises');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
}); 


const path = process.argv[2] || fs.readFileSync(__dirname+'/default_path').toString();


(async ()=>{
  const port = (await rl.question('Which port is your LMS telnet using ? (default :  9090)\n')) || 9090;
  const host = await rl.question('Which host is your LMS telnet using ? (default : 127.0.0.1)\n') || '127.0.0.1';
  const login = await rl.question('Login for your LMS ? (leave blank if you have no login/password set)\n');
  const pass = await rl.question('Password for your LMS ? (leave blank if you have no login/password set)\n');
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
