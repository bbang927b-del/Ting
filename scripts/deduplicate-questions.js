const normalize = value => String(value || "")
  .normalize("NFKC")
  .replace(/^\s*\d+[.、．]\s*/, "")
  .replace(/\s+/g, "")
  .replace(/[，,。.!！？?；;：:“”"'‘’（）()【】\[\]]/g, "")
  .replace(/以下说法(正确|错误)的是|下列说法(正确|错误)的是/g, "");

function quality(question) {
  return (question.updated ? 3 : 0) + (question.explain ? 2 : 0) +
    (question.law ? 1 : 0) + (question.image ? 1 : 0) - question.question.length / 1000;
}

function deduplicate(items, keyFor, eligible = () => true) {
  const kept = [];
  const removed = [];
  const seen = new Map();
  for (const item of items) {
    if (!eligible(item)) {
      kept.push(item);
      continue;
    }
    const key = keyFor(item);
    if (!key || !seen.has(key)) {
      seen.set(key, { item, position: kept.length });
      kept.push(item);
      continue;
    }
    const previous = seen.get(key);
    if (quality(item) > quality(previous.item)) {
      removed.push(previous.item);
      kept[previous.position] = item;
      seen.set(key, { item, position: previous.position });
    } else {
      removed.push(item);
    }
  }
  return { kept, removed };
}

function exactDeduplicate(items) {
  // Generic image questions intentionally keep different images.
  return deduplicate(items, q => `${normalize(q.question)}|${q.image || ""}`);
}

function semanticDeduplicate(items) {
  // Identical, non-trivial explanations in the same category represent the same
  // knowledge point. Image questions are exempt because their scene can differ.
  return deduplicate(
    items,
    q => `${normalize(q.explain)}|${q.category}`,
    q => !q.image && q.explain && normalize(q.explain).length >= 12
  );
}

module.exports = { normalize, deduplicate, exactDeduplicate, semanticDeduplicate };
