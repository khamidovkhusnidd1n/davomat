const fs = require('fs');
const path = require('path');

const src = 'c:\\Users\\Salohiddin Markaz\\.gemini\\antigravity\\brain\\a6bd5766-c8cc-4b85-92d0-2a8a8bf06627\\fixed_bars.png';
const dest = 'c:\\Users\\Salohiddin Markaz\\.gemini\\antigravity\\brain\\0979b87f-6a3c-4b69-a874-00f36fe457ed\\fixed_bars.png';

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log("Copied fixed_bars.png to artifacts");
} else {
  console.log("File fixed_bars.png not found yet");
}
