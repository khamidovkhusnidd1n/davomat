const XLSX = require('xlsx');

const filePath = "C:\\Users\\Salohiddin Markaz\\Downloads\\Telegram Desktop\\14-gr.QT.OM.Rangtasvir.Newt.xls";

function smartParseSchedule(rows) {
  const result = [];
  const DAYS = {
    'душанба': 1,
    'сешанба': 2,
    'чоршанба': 3,
    'пайшанба': 4,
    'жума': 5,
    'шанба': 6,
    'якшанба': 7,
  };

  let currentDay = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    // Kunni tekshiramiz (0-ustunda bo'lishi ehtimoli katta)
    if (typeof row[0] === 'string') {
      const dayStr = row[0].toLowerCase().trim();
      if (DAYS[dayStr]) {
        currentDay = DAYS[dayStr];
      }
    }

    // Vaqt formatini qidiramiz (masalan "9-00." yoki "14:00")
    // Odatda yonma-yon ustunlarda yoki bitta ustun tashlab keladi
    let startTime = null;
    let endTime = null;

    const timeRegex = /^([01]?\d|2[0-3])[:-]([0-5]\d)\.?$/;

    for (let j = 0; j < row.length; j++) {
      if (typeof row[j] === 'string') {
        const str = row[j].trim();
        const match = str.match(timeRegex);
        if (match) {
          const formatted = `${match[1].padStart(2, '0')}:${match[2]}`;
          if (!startTime) {
            startTime = formatted;
          } else if (!endTime) {
            endTime = formatted;
            break; // Start va End topildi
          }
        }
      }
    }

    if (currentDay && startTime && endTime) {
      result.push({
        hafta_kuni: currentDay,
        boshlanish_vaqti: startTime,
        tugash_vaqti: endTime
      });
    }
  }

  return result;
}

try {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const parsed = smartParseSchedule(rows);
  console.log("SMART PARSED:");
  console.log(parsed);
} catch (e) {
  console.error("Error reading excel:", e);
}
