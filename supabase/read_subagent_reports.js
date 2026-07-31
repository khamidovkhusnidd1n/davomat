const fs = require('fs');
const readline = require('readline');
const path = require('path');

const subagentIds = [
  { id: '5b0732f5-1daa-496f-bb48-e3482c389cf1', name: 'Admin Panel Security Auditor' },
  { id: 'e2006427-7bcb-4b84-be73-0b4f41b16146', name: 'Bot Security Auditor' },
  { id: '768935f1-1020-4166-a906-4cff574fd9bb', name: 'Database Security Auditor' },
  { id: 'e2b78d76-8651-4ab5-9277-aec917d8e055', name: 'Flutter App Security Auditor' }
];

async function getFinalMessage(conversationId) {
  const logFile = `c:\\Users\\Salohiddin Markaz\\.gemini\\antigravity\\brain\\${conversationId}\\.system_generated\\logs\\transcript_full.jsonl`;
  if (!fs.existsSync(logFile)) {
    return `Log file not found: ${logFile}`;
  }

  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lastResponse = null;
  for await (const line of rl) {
    try {
      const step = JSON.parse(line);
      if (step.type === 'PLANNER_RESPONSE' && step.content) {
        lastResponse = step.content;
      }
    } catch (e) {
      // skip invalid lines
    }
  }

  return lastResponse ? lastResponse.substring(lastResponse.length - 2000) : "No response content found";
}

async function run() {
  for (const sub of subagentIds) {
    console.log(`=========================================`);
    console.log(`REPORT FOR: ${sub.name} (${sub.id})`);
    console.log(`=========================================`);
    const report = await getFinalMessage(sub.id);
    console.log(report);
    console.log("\n\n");
  }
}

run();
