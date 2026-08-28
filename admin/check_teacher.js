const XLSX = require('xlsx');
const wbToza = XLSX.readFile('C:\\Users\\Salohiddin Markaz\\Downloads\\Eski_darslar_Toza.xlsx');
const dataToza = XLSX.utils.sheet_to_json(wbToza.Sheets[wbToza.SheetNames[0]]);

const wbReb = XLSX.readFile('C:\\Users\\Salohiddin Markaz\\Downloads\\Eski_darslar_REBUILD.xlsx');
const dataReb = XLSX.utils.sheet_to_json(wbReb.Sheets[wbReb.SheetNames[0]]);

const teacherName = 'Abidjanova Feruza Abdullayevna';
console.log('--- TOZA (Raw parse) ---');
console.log(dataToza.filter(r => r["O'qituvchi F.I.Sh"] === teacherName));
console.log('Total TOZA:', dataToza.filter(r => r["O'qituvchi F.I.Sh"] === teacherName).reduce((sum, r) => sum + r['Nazariy soat'], 0));

console.log('\n--- REBUILD (Claude) ---');
console.log(dataReb.filter(r => r["O'qituvchi F.I.Sh"] === teacherName));
console.log('Total REB:', dataReb.filter(r => r["O'qituvchi F.I.Sh"] === teacherName).reduce((sum, r) => sum + r['Nazariy soat'], 0));
