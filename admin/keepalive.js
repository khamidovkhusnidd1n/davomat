const https = require('https');

const url = 'https://davomat-53eq.onrender.com';

console.log('[KeepAlive] Started! Pinging every 10 minutes...');

setInterval(() => {
  https.get(url, (res) => {
    console.log(`[KeepAlive] Pinged ${url} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[KeepAlive] Error pinging ${url}:`, err.message);
  });
}, 10 * 60 * 1000); // 10 minutes
