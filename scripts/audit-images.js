const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const questions = JSON.parse(fs.readFileSync(path.join(root, "data/questions-2026.json"), "utf8"));
const urls = [...new Set(questions.map(q => q.image).filter(Boolean))];
const failures = [];
let cursor = 0;

async function check(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Range: "bytes=0-1023", "User-Agent": "Mozilla/5.0 Ting-question-bank-audit/1.1" }, signal: AbortSignal.timeout(30000) });
      const type = response.headers.get("content-type") || "";
      if (response.ok && type.startsWith("image/")) return;
      if (response.body) await response.body.cancel();
      if (attempt === 2) failures.push({ url, status: response.status, contentType: type });
    } catch (error) {
      if (attempt === 2) failures.push({ url, error: error.message });
    }
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
  }
}

async function worker() {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    await check(url);
  }
}

Promise.all(Array.from({ length: 6 }, worker)).then(() => {
  console.log(JSON.stringify({ checked: urls.length, invalid: failures.length, failures }, null, 2));
  if (failures.length) process.exit(1);
});
