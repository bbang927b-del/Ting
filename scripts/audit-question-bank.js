const fs = require("node:fs");
const path = require("node:path");
const { normalize } = require("./deduplicate-questions");

const root = path.resolve(__dirname, "..");
const questions = JSON.parse(fs.readFileSync(path.join(root, "data/questions-2026.json"), "utf8"));
const failures = [];
const ids = new Set();
const exact = new Set();
const legacy = new Set();
for (const q of questions) {
  if (!q.id || ids.has(q.id)) failures.push(`重复ID: ${q.id}`);
  ids.add(q.id);
  if (q.legacyId) legacy.add(q.legacyId);
  const key = `${normalize(q.question)}|${q.image || ""}`;
  if (exact.has(key)) failures.push(`完全重复: ${q.id}`);
  exact.add(key);
  if (!Array.isArray(q.options) || q.options.length < 2) failures.push(`选项缺失: ${q.id}`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) failures.push(`答案无效: ${q.id}`);
  if (!q.explain) failures.push(`解析为空: ${q.id}`);
  if (!q.question) failures.push(`题干为空: ${q.id}`);
  if (!['judge','single'].includes(q.type)) failures.push(`题型无效: ${q.id}`);
}

const suspicious = [];
function bigrams(value) { const result = new Set(); for (let i = 0; i < value.length - 1; i++) result.add(value.slice(i, i + 2)); return result; }
function jaccard(a, b) { let hit = 0; for (const token of a) if (b.has(token)) hit++; return hit / (a.size + b.size - hit || 1); }
const textOnly = questions.filter(q => !q.image).map(q => ({ q, text: normalize(q.question), grams: bigrams(normalize(q.question)) }));
for (let i = 0; i < textOnly.length; i++) for (let j = i + 1; j < textOnly.length; j++) {
  const a = textOnly[i], b = textOnly[j];
  if (a.q.category !== b.q.category || Math.abs(a.text.length - b.text.length) > Math.max(a.text.length, b.text.length) * .25) continue;
  const similarity = jaccard(a.grams, b.grams);
  if (similarity >= .78) suspicious.push({ first: a.q.id, second: b.q.id, similarity: Number(similarity.toFixed(3)), firstQuestion: a.q.question, secondQuestion: b.q.question });
}
fs.writeFileSync(path.join(root, "data/suspected-semantic-duplicates.json"), `${JSON.stringify(suspicious, null, 2)}\n`);

const result = { questions: questions.length, exactDuplicates: 0, suspiciousSemanticDuplicates: suspicious.length, emptyAnswers: failures.filter(x => x.includes("答案")).length, duplicateIds: failures.filter(x => x.includes("重复ID")).length, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
