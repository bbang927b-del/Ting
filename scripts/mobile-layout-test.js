const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("style.css", "utf8");
assert.match(html, /width=device-width,initial-scale=1,viewport-fit=cover/);
assert.match(css, /max-width:720px/);
assert.match(css, /@media\(max-width:570px\)/);
assert.match(css, /env\(safe-area-inset-bottom\)/);
assert.match(css, /grid-template-columns:1fr 1fr/);
console.log("移动端视口、窄屏布局和安全区样式：通过");
