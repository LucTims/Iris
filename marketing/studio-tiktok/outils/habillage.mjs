// Habillage Iris des vidéos TikTok : accroche, badge, sous-titres, écran de fin.
// Usage (sandbox Higgsfield) : node habillage.mjs <spec.json> <dossier-sortie>
// Polices attendues dans ./fonts (Plus Jakarta Sans 600/800, Newsreader 400 normal/italique).
import pw from '/usr/local/lib/node_modules/playwright/index.js';
import fs from 'node:fs';
import path from 'node:path';

const [, , specPath, out] = process.argv;
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const f = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join('fonts', n)).toString('base64')}`;
const C = { brand: '#BF6345', ground: '#F8F8F7', ink: '#161616', muted: '#6B6862' };
const css = `
@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:J;font-weight:600;src:url(${f('plus-jakarta-sans-latin-600-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
@font-face{font-family:N;font-style:italic;font-weight:400;src:url(${f('newsreader-latin-400-italic.woff2')})}
*{margin:0;padding:0;box-sizing:border-box} html,body{width:1080px;height:1920px;background:transparent;overflow:hidden}
body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased}`;
const mark = (h) => `<svg viewBox="0 0 59 271" height="${h}" style="display:block"><circle cx="29" cy="29" r="29" fill="${C.brand}"/><circle cx="29" cy="29" r="15" fill="${C.ink}"/><path d="M54 75 5 118l9 153h29z" fill="${C.brand}"/></svg>`;
const page = (body, bg = 'transparent') => `<!doctype html><html><head><meta charset="utf-8"><style>${css} body{background:${bg}}</style></head><body>${body}</body></html>`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Sous-titre : mots surlignés en terracotta (liste spec.chunks[i].hl).
const cap = (text, hl = []) => {
  const html = text.split(' ').map((w) => hl.includes(w)
    ? `<span style="background:${C.brand};padding:0 14px;border-radius:12px;white-space:nowrap">${esc(w)}</span>` : esc(w)).join(' ');
  return page(`<div style="position:absolute;left:72px;right:150px;top:1150px;text-align:center;font-weight:800;font-size:70px;line-height:1.25;color:#fff;text-shadow:0 3px 20px rgba(0,0,0,.55),0 0 2px rgba(0,0,0,.6)">${html}</div>`);
};
// Accroche : la dernière partie (après « | ») passe en italique terracotta.
const hook = (text) => {
  const [a, b = ''] = text.split('|');
  return page(`<div style="position:absolute;left:72px;right:150px;top:250px;background:${C.ground};border-radius:28px;padding:40px 46px;box-shadow:0 10px 40px rgba(0,0,0,.25)">
  <div style="font-family:N;font-size:78px;line-height:1.04;letter-spacing:-0.02em;color:${C.ink}">${esc(a)}<em style="color:${C.brand}">${esc(b)}</em></div></div>`);
};
const badge = (name, role) => page(`<div style="position:absolute;left:72px;top:250px;display:flex;align-items:center;gap:16px;padding:16px 28px 16px 20px;border-radius:999px;background:rgba(248,248,247,.95)">
  ${mark(44)}<div><div style="font-size:30px;font-weight:800;line-height:1;color:${C.ink}">${esc(name)}</div><div style="font-size:21px;font-weight:600;color:${C.muted};margin-top:5px">${esc(role)}</div></div></div>`);
const end = (l1, l2, cta) => page(`<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px;padding-bottom:220px">
  ${mark(250)}<div style="font-family:N;font-size:96px;text-align:center;line-height:1.04;color:${C.ink}">${esc(l1)}<br><em style="color:${C.brand}">${esc(l2)}</em></div>
  <div style="font-size:34px;font-weight:800;padding:24px 40px;border-radius:999px;border:3px solid ${C.ink};color:${C.ink}">${esc(cta)}</div></div>`, C.ground);

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const shot = async (html, file, omit = true) => {
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, file), omitBackground: omit });
};
fs.mkdirSync(out, { recursive: true });
if (spec.hook) await shot(hook(spec.hook.text), 'hook.png');
if (spec.badge) await shot(badge(spec.badge.name, spec.badge.role), 'badge.png');
const e = spec.endcard || {};
await shot(end(e.l1 || 'Ton savoir,', e.l2 || 'ton livre.', e.cta || 'Écris « DÉMO » sur WhatsApp'), 'end.png', false);
for (const [i, c] of spec.chunks.entries()) await shot(cap(c.text, c.hl), `cap${i}.png`);
await b.close();
console.log('habillage ok', spec.chunks.length, 'sous-titres');
