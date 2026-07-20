const https = require('https');

const url = 'https://davomat-s4d0.onrender.com';

console.log('[KeepAlive] Started! Pinging every 5 minutes...');

function pingServer() {
  https.get(url, (res) => {
    console.log(`[KeepAlive] Pinged ${url} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[KeepAlive] Error pinging ${url}:`, err.message);
  });
}

// Ping har 5 daqiqada (300000 ms)
setInterval(pingServer, 5 * 60 * 1000);

// Server yonishi bilan birinchi marta ping yuborish (10 soniyadan so'ng)
setTimeout(pingServer, 10000);
