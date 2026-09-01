const assert = require("node:assert/strict");
const TingState = require("../state.js");

class MemoryStorage {
  constructor(seed = {}) { this.data = new Map(Object.entries(seed)); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
}

const bank = Array.from({ length: 25 }, (_, i) => ({ id: `q_${i}`, legacyId: `old_${i}` }));
const storage = new MemoryStorage({
  "ting-wrong": JSON.stringify(["old_1", "old_2", "old_3"]),
  "ting-wrong-questions": JSON.stringify([{ id: "old_1" }, { id: "old_2" }, { id: "old_3" }]),
  "ting-favorites": JSON.stringify(["old_4"]),
  "ting-answered": "20",
  "ting-practice-index": "19"
});
let state = TingState.load(storage);
TingState.reconcile(state, bank);
assert.deepEqual(state.wrongIds, ["q_1", "q_2", "q_3"]);
assert.deepEqual(bank.filter(q => state.wrongIds.includes(q.id)).map(q => q.id), ["q_1", "q_2", "q_3"]);
assert.equal(state.practiceQuestionId, "q_19");
assert.equal(state.answerTotal, 20);
assert.equal(TingState.save(storage, state), true);
state = TingState.load(storage);
assert.deepEqual(state.wrongIds, ["q_1", "q_2", "q_3"]);
assert.equal(state.practiceQuestionId, "q_19");
assert.equal(state.answerTotal, 20);
console.log("错题3道、进度20题、刷新恢复：通过");
