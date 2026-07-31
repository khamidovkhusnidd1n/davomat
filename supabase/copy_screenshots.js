const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\Salohiddin Markaz\\.gemini\\antigravity\\brain\\fd08cb89-9b5f-4302-953b-e14d63c00ce2';
const destDir = 'c:\\Users\\Salohiddin Markaz\\.gemini\\antigravity\\brain\\0979b87f-6a3c-4b69-a874-00f36fe457ed';

const files = ['before_edit.png', 'limit_100.png', 'limit_200.png'];

for (const file of files) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to artifacts`);
  } else {
    console.log(`File not found: ${src}`);
  }
}
