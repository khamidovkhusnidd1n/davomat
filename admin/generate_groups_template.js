const XLSX = require('xlsx');
const path = require('path');

const data = [
  {
    "Guruh Nomi": "Matematika-1",
    "Fan Nomi": "Matematika",
    "Talaba F.I.Sh": "Ali Valiyev",
    "Telefon raqami": "+998901234567"
  },
  {
    "Guruh Nomi": "Matematika-1",
    "Fan Nomi": "Matematika",
    "Talaba F.I.Sh": "Vali Aliyev",
    "Telefon raqami": "+998907654321"
  },
  {
    "Guruh Nomi": "Ingliz tili A1",
    "Fan Nomi": "Ingliz tili",
    "Talaba F.I.Sh": "Karim Shodiyev",
    "Telefon raqami": "+998912345678"
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Guruhlar va Talabalar");

// Adjust column widths
ws['!cols'] = [
  { wch: 25 }, // Guruh Nomi
  { wch: 20 }, // Fan Nomi
  { wch: 30 }, // Talaba F.I.Sh
  { wch: 20 }  // Telefon raqami
];

const outputPath = path.join(__dirname, 'public', 'Guruhlar_Shabloni.xlsx');
XLSX.writeFile(wb, outputPath);
console.log("Guruhlar_Shabloni.xlsx generated successfully at:", outputPath);
