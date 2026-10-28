// Vidéo motion design épurée « Ton savoir mérite un livre » (1080×1920, 30 i/s, 18 s, sans voix).
// Chaque image est calculée par frame(t) puis capturée : rendu déterministe, sans dépendre du temps réel.
// Usage : node motion-ton-savoir.mjs <dossier> [t1,t2,…]
//   <dossier>/fonts/ doit contenir Plus Jakarta Sans 800 et Newsreader 400 normal/italique.
//   Sans liste de temps : toutes les images dans <dossier>/frames/ (puis ffmpeg) ;
//   avec une liste : seulement ces instants, dans <dossier>/check/ (contrôle visuel).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '/'));
const pw = require('playwright');

const dir = process.argv[2] || '.';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const FPS = 30;
const DURATION = 18;
const f = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'fonts', n)).toString('base64')}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:J;font-weight:800;src:url(${f('plus-jakarta-sans-latin-800-normal.woff2')})}
@font-face{font-family:N;font-weight:400;src:url(${f('newsreader-latin-400-normal.woff2')})}
@font-face{font-family:N;font-style:italic;font-weight:400;src:url(${f('newsreader-latin-400-italic.woff2')})}
:root{--brand:#BF6345;--ground:#F8F8F7;--ink:#161616;--muted:#8A857E;--line:#E7E3DC}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--ground)}
body{font-family:J,sans-serif;-webkit-font-smoothing:antialiased;color:var(--ink)}
.abs{position:absolute}
.mask{overflow:hidden;padding-bottom:.08em}
.mask>span{display:inline-block;will-change:transform}
.sans{font-weight:800;letter-spacing:-.025em}
.serif{font-family:N;font-weight:400;letter-spacing:-.02em}
.it{font-style:italic;color:var(--brand)}
</style></head><body>

<!-- A · l'œil d'Iris se dessine -->
<svg id="mark" class="abs" viewBox="0 0 59 271" style="left:470px;top:620px;width:140px;overflow:visible">
  <defs><clipPath id="stemClip"><rect id="stemRect" x="0" y="60" width="59" height="0"/></clipPath></defs>
  <circle id="ring" cx="29" cy="29" r="29" fill="#BF6345"/>
  <circle id="pupil" cx="29" cy="29" r="15" fill="#161616"/>
  <path d="M54 75 5 118l9 153h29z" fill="#BF6345" clip-path="url(#stemClip)"/>
</svg>

<!-- B · le constat -->
<div id="B" class="abs" style="left:96px;right:96px;top:690px">
  <div class="mask sans" style="font-size:100px;line-height:1.02"><span>Tu sais faire</span></div>
  <div class="mask sans" style="font-size:100px;line-height:1.02"><span>ce que personne</span></div>
  <div class="mask serif it" style="font-size:132px;line-height:1.02"><span>n’enseigne.</span></div>
</div>

<!-- C · le paradoxe -->
<div id="C" class="abs" style="left:96px;right:96px;top:560px">
  <div class="mask serif" style="font-size:380px;line-height:.95"><span id="count">0</span></div>
  <div class="mask sans" style="font-size:64px;margin-top:6px"><span>ans de métier.</span></div>
  <div id="rule" style="height:4px;background:var(--brand);width:0;margin:56px 0 44px"></div>
  <div class="mask serif it" style="font-size:140px;line-height:1"><span>0 livre.</span></div>
</div>

<!-- D · la page qui s'écrit, puis le livre -->
<div id="D" class="abs" style="left:0;right:0;top:330px">
  <div class="mask sans" style="font-size:66px;text-align:center"><span>Iris l’écrit <span class="serif it" style="font-size:82px">avec toi.</span></span></div>
  <div id="stage" style="position:relative;width:520px;height:700px;margin:70px auto 0;perspective:1600px">
    <div id="page" class="abs" style="inset:0;background:#fff;border:2px solid var(--line);border-radius:10px;box-shadow:0 30px 60px -30px rgba(22,22,22,.25);transform-origin:left center">
      <div id="tbar" class="abs" style="left:56px;top:70px;height:16px;border-radius:8px;background:var(--brand);width:0"></div>
      <div id="lines"></div>
    </div>
    <div id="cover" class="abs" style="inset:0;background:var(--brand);border-radius:6px 14px 14px 6px;box-shadow:inset -10px 0 0 rgba(0,0,0,.12),0 30px 60px -24px rgba(22,22,22,.35);transform-origin:left center;padding:64px 56px;display:flex;flex-direction:column;justify-content:space-between">
      <div style="width:90px;height:8px;background:var(--ground);border-radius:4px"></div>
      <div class="serif" style="font-size:76px;line-height:1.02;color:var(--ground)">Ton savoir,<br><span style="font-style:italic">en livre.</span></div>
      <svg viewBox="0 0 59 271" style="width:30px"><circle cx="29" cy="29" r="29" fill="#F8F8F7"/><circle cx="29" cy="29" r="15" fill="#161616"/><path d="M54 75 5 118l9 153h29z" fill="#F8F8F7"/></svg>
    </div>
  </div>
</div>

<!-- E · signature -->
<div id="E" class="abs" style="left:0;right:0;top:640px;text-align:center">
  <div class="mask serif" style="font-size:150px;line-height:1"><span>Ton savoir,</span></div>
  <div class="mask serif it" style="font-size:150px;line-height:1.05"><span>ton livre.</span></div>
  <div id="lockup" style="display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:120px">
    <svg viewBox="0 0 59 271" style="width:30px"><circle cx="29" cy="29" r="29" fill="#BF6345"/><circle cx="29" cy="29" r="15" fill="#161616"/><path d="M54 75 5 118l9 153h29z" fill="#BF6345"/></svg>
    <div class="sans" style="font-size:112px;line-height:.78">ris</div>
  </div>
  <div id="url" class="sans" style="font-size:34px;color:var(--muted);letter-spacing:.02em;margin-top:34px">irisboom.online</div>
</div>

<script>
const P = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const eo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));          // sortie expo : arrivées nettes
const eio = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const $ = (s) => document.querySelector(s);
const spans = (id) => [...document.querySelectorAll('#' + id + ' .mask>span')];

// Lignes de la page (largeurs en px, 0 = saut de paragraphe).
const LINES = [408, 380, 404, 250, 0, 396, 408, 330, 0, 390, 260];
$('#lines').innerHTML = LINES.map((w, i) => w ? '<div class="abs ln" data-w="' + w + '" style="left:56px;top:' + (130 + i * 46) + 'px;height:10px;border-radius:5px;background:#D9D3CA;width:0"></div>' : '').join('');
const lns = [...document.querySelectorAll('.ln')];

// Révélation ligne par ligne derrière un masque, puis sortie vers le haut.
function lines(id, inAt, outAt, stagger = .14) {
  spans(id).forEach((s, i) => {
    const a = eo(P(window.T, inAt + i * stagger, inAt + i * stagger + .9));
    const b = eio(P(window.T, outAt + i * .07, outAt + i * .07 + .5));
    s.style.transform = 'translateY(' + ((1 - a) * 115 - b * 115) + '%)';
  });
}

window.frame = (t) => {
  window.T = t;
  // A · 0 → 2.4 s
  const ring = eo(P(t, .15, .85)), pupil = eo(P(t, .55, 1.15)), stem = eio(P(t, .95, 1.6));
  const leave = eio(P(t, 1.95, 2.5));
  $('#ring').setAttribute('r', 29 * ring);
  $('#pupil').setAttribute('r', 15 * pupil);
  $('#stemRect').setAttribute('height', 211 * stem);
  $('#mark').style.transform = 'translateY(' + (-260 * leave) + 'px) scale(' + (1 - .5 * leave) + ')';
  $('#mark').style.opacity = 1 - leave;

  // B · 2.4 → 6.2 s
  lines('B', 2.4, 5.6);

  // C · 6.2 → 9.7 s
  lines('C', 6.2, 9.15, .2);
  $('#count').textContent = Math.round(15 * eo(P(t, 6.3, 7.5)));
  $('#rule').style.width = 888 * eio(P(t, 7.7, 8.3)) * (1 - eio(P(t, 9.1, 9.5))) + 'px';
  $('#C .mask:last-child>span').style.transform = 'translateY(' + ((1 - eo(P(t, 8.05, 8.95))) * 115 - eio(P(t, 9.3, 9.8)) * 115) + '%)';

  // D · 9.7 → 13.6 s : la page apparaît, s'écrit, puis se referme en livre
  lines('D', 9.75, 13.1);
  const pin = eo(P(t, 9.8, 10.5));
  const shut = eio(P(t, 12.15, 12.85));
  const out = eio(P(t, 13.05, 13.6));
  $('#stage').style.opacity = pin * (1 - out);
  $('#stage').style.transform = 'translateY(' + ((1 - pin) * 60 - out * 40) + 'px)';
  $('#tbar').style.width = 190 * eo(P(t, 10.3, 10.75)) + 'px';
  lns.forEach((el, i) => { el.style.width = (+el.dataset.w) * eio(P(t, 10.65 + i * .13, 10.65 + i * .13 + .2)) + 'px'; });
  $('#page').style.transform = 'rotateY(' + (-90 * shut) + 'deg)';
  $('#page').style.opacity = shut < 1 ? 1 : 0;
  const open = eio(P(t, 12.55, 13.05));
  $('#cover').style.transform = 'rotateY(' + (90 * (1 - open)) + 'deg)';
  $('#cover').style.opacity = open > 0 ? 1 : 0;

  // E · 13.6 → 18 s
  lines('E', 13.7, 99, .18);
  const lk = eo(P(t, 14.9, 15.7)), ur = eo(P(t, 15.3, 16.1));
  $('#lockup').style.opacity = lk; $('#lockup').style.transform = 'translateY(' + (1 - lk) * 24 + 'px)';
  $('#url').style.opacity = ur; $('#url').style.transform = 'translateY(' + (1 - ur) * 18 + 'px)';
};
window.frame(0);
</script></body></html>`;

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
const outDir = path.join(dir, only ? 'check' : 'frames');
fs.mkdirSync(outDir, { recursive: true });
const times = only || Array.from({ length: FPS * DURATION }, (_, i) => i / FPS);
for (const [i, t] of times.entries()) {
  await p.evaluate((x) => window.frame(x), t);
  await p.screenshot({ path: path.join(outDir, only ? `t${t}.jpg` : `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95 });
}
await b.close();
console.log('ok', times.length, 'images');
