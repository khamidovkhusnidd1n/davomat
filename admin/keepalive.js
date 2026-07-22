const https = require('https');

const adminUrl = 'https://davomat-s4d0.onrender.com';
const botUrl = 'https://davomat-3sap.onrender.com';

console.log('[KeepAlive] Started! Pinging every 10 minutes...');

function pingServer() {
  // Ping Admin
  https.get(adminUrl, (res) => {
    console.log(`[KeepAlive] Pinged Admin ${adminUrl} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[KeepAlive] Error pinging Admin ${adminUrl}:`, err.message);
  });

  // Ping Bot
  https.get(botUrl, (res) => {
    console.log(`[KeepAlive] Pinged Bot ${botUrl} - Status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[KeepAlive] Error pinging Bot ${botUrl}:`, err.message);
  });
}

// Ping har 10 daqiqada (600000 ms)
setInterval(pingServer, 10 * 60 * 1000);

// Server yonishi bilan birinchi marta ping yuborish (10 soniyadan so'ng)
setTimeout(pingServer, 10000);
