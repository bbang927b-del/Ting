(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TingState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const KEY = "ting-state-v3";
  const defaults = () => ({
    version: 3,
    practiceQuestionId: null,
    practiceIndex: 0,
    answeredIds: [],
    wrongIds: [],
    favorites: [],
    correctCount: 0,
    wrongCount: 0,
    answerTotal: 0,
    mockRecords: [],
    updatedAt: null
  });
  const uniq = values => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
  function parse(storage, key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  function load(storage) {
    const saved = parse(storage, KEY, {});
    const state = { ...defaults(), ...(saved && typeof saved === "object" ? saved : {}) };
    if (!saved || saved.version !== 3) {
      state.wrongIds = uniq([...state.wrongIds, ...parse(storage, "ting-wrong", [])]);
      state.favorites = uniq([...state.favorites, ...parse(storage, "ting-favorites", [])]);
      state.answerTotal = Math.max(Number(storage.getItem("ting-answered") || 0), state.answerTotal || 0);
      state.practiceIndex = Math.max(0, Number(storage.getItem("ting-practice-index") || 0));
      state.legacyWrongQuestions = parse(storage, "ting-wrong-questions", []);
    }
    state.answeredIds = uniq(state.answeredIds);
    state.wrongIds = uniq(state.wrongIds);
    state.favorites = uniq(state.favorites);
    return state;
  }
  function save(storage, state) {
    state.updatedAt = new Date().toISOString();
    try { storage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function reconcile(state, bank) {
    const valid = new Set(bank.map(q => q.id));
    const legacy = new Map(bank.filter(q => q.legacyId).map(q => [q.legacyId, q.id]));
    const convert = values => uniq(values.map(id => valid.has(id) ? id : legacy.get(id)).filter(id => valid.has(id)));
    const legacyQuestionIds = (state.legacyWrongQuestions || []).map(q => q.id);
    state.wrongIds = convert([...state.wrongIds, ...legacyQuestionIds]);
    state.favorites = convert(state.favorites);
    state.answeredIds = convert(state.answeredIds);
    if (state.practiceQuestionId && !valid.has(state.practiceQuestionId)) state.practiceQuestionId = legacy.get(state.practiceQuestionId) || null;
    if (!state.practiceQuestionId && bank.length) state.practiceQuestionId = bank[Math.min(state.practiceIndex || 0, bank.length - 1)].id;
    delete state.legacyWrongQuestions;
    state.version = 3;
    return state;
  }
  return { KEY, defaults, load, save, reconcile, uniq };
});
