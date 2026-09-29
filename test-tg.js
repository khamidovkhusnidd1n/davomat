require('dotenv').config({path: 'admin/.env.local'});
async function run() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const tg_id = '5665068725';
  
  const photosRes = await fetch('https://api.telegram.org/bot' + token + '/getUserProfilePhotos?user_id=' + tg_id + '&limit=1');
  const photosData = await photosRes.json();
  console.log('Photos Data:', JSON.stringify(photosData, null, 2));
}
run();
