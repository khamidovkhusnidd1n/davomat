const xlsx = require('xlsx');
const path = require('path');
const p = "C:\\Users\\Salohiddin Markaz\\Downloads\\Telegram Desktop\\Rangtasvir guruh davomat 14.xlsx";
const wb = xlsx.readFile(p);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);
console.log('Rows:', data.length);
console.log(data.slice(0, 2));
