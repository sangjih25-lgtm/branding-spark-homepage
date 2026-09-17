// 정적 홈페이지 빌드: src/partials + src/pages → 루트 HTML
// 실행: node src/build.mjs  (Node 18+)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = (f) => readFileSync(join(root, "src", "partials", f), "utf8").replace(/^\uFEFF/, "");
const head = P("head.html"), nav = P("nav.html"), footer = P("footer.html"), scripts = P("scripts.html"), icons = P("icons.html");

// 캐시 무효화: 내용이 바뀐 CSS·JS만 주소(?v=해시)가 바뀌어 손님 브라우저가 즉시 새 파일을 받는다
const ver = (f) => f + "?v=" + createHash("md5").update(readFileSync(join(root, f))).digest("hex").slice(0, 8);
const ASSETS = ["css/site.css", "js/site.js", "js/pre.js"];

const SITE = "https://bspark.co.kr";
const pages = readdirSync(join(root, "src", "pages")).filter((f) => f.endsWith(".html"));
const urls = [];

for (const file of pages) {
  const raw = readFileSync(join(root, "src", "pages", file), "utf8").replace(/^\uFEFF/, "");
  // 첫 줄들의 <!-- key: value --> 를 메타로 사용
  const meta = {};
  const body = raw.replace(/^(?:<!--\s*(\w+):\s*(.*?)\s*-->\r?\n)+/, (block) => {
    for (const m of block.matchAll(/<!--\s*(\w+):\s*(.*?)\s*-->/g)) meta[m[1]] = m[2];
    return "";
  });
  const out = file; // 파일명 그대로 (index.html, about.html ...)
  const path = out === "index.html" ? "/" : "/" + out;
  const canon = SITE + path;
  const fill = (s) => s
    .replaceAll("{{TITLE}}", meta.title ?? "브랜딩스파크")
    .replaceAll("{{DESC}}", meta.desc ?? "")
    .replaceAll("{{CANON}}", canon)
    .replaceAll("{{ACTIVE}}", meta.active ?? "")
    .replaceAll("{{BODYCLASS}}", meta.bodyclass ?? "");
  let html = fill(head) + icons + fill(nav) + body + footer + scripts;
  for (const a of ASSETS) html = html.replaceAll(`"${a}"`, `"${ver(a)}"`);
  // 활성 메뉴 표시
  html = html.replace(new RegExp(`(<a[^>]*data-nav="${meta.active ?? "__none__"}"[^>]*class=")`), "$1active ");
  writeFileSync(join(root, out), html, "utf8");
  urls.push({ loc: canon, pri: out === "index.html" ? "1.0" : "0.8" });
  console.log("built", out);
}

const today = new Date().toISOString().slice(0, 10);
const sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.pri}</priority></url>`).join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(root, "sitemap.xml"), sm, "utf8");
console.log("sitemap.xml updated (" + urls.length + " urls)");
