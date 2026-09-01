const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));

assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(html, /apple-mobile-web-app-capable/);
assert.match(app, /serviceWorker\.register\("\.\/sw\.js"\)/);
assert.match(worker, /data\/questions-2026\.json\?v=20260901/);
assert.match(worker, /caches\.open\(CACHE_NAME\)/);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");
assert.ok(manifest.icons.some(icon => icon.src === "./icons/app-icon.svg"));

console.log("离线安装、核心题库缓存和主屏幕配置：通过");
