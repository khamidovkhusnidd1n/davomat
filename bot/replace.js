const fs = require('fs');
const file = 'c:/Users/Salohiddin Markaz/Desktop/davomat/bot/index.js';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(/'teacher'/g, "'nazoratchi'");
data = data.replace(/"teacher"/g, '"nazoratchi"');
data = data.replace(/teacher_id/g, 'nazoratchi_id');
data = data.replace(/groups_teacher_id_fkey/g, 'groups_nazoratchi_id_fkey');
data = data.replace(/const teacher = /g, 'const nazoratchi = ');
data = data.replace(/if \(!teacher \|\| !teacher\.telegram_id\)/g, 'if (!nazoratchi || !nazoratchi.telegram_id)');
data = data.replace(/if \(teacher && teacher\.telegram_id\)/g, 'if (nazoratchi && nazoratchi.telegram_id)');
data = data.replace(/teacher\.telegram_id/g, 'nazoratchi.telegram_id');
data = data.replace(/teacher\.full_name/g, 'nazoratchi.full_name');
data = data.replace(/textTeacher/g, 'textNazoratchi');
data = data.replace(/teacher warning/g, 'nazoratchi warning');
data = data.replace(/O'qituvchi \$\{teacher/g, "Nazoratchi ${nazoratchi");

fs.writeFileSync(file, data);
console.log("Done");
