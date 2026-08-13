
const fs = require('fs');
fetch('https://www.quantumvault.me/assets/index-Cal7b64y.js')
  .then(r => r.text())
  .then(t => {
    fs.writeFileSync('bundle.js', t);
    console.log('Bundle saved.');
  });
