// Vidéo « Le cahier de maman » en collage papier (1080×1920, 30 i/s, 21 s, voix Fatou).
// Maman Adjoua cuisine depuis 50 ans ; ses recettes sont dans sa tête et dans un vieux cahier.
// Le « i » d'Iris (œil photo tramé + bande de papier orange) rattrape les pages qui s'envolent.
// Cinq tableaux :
//   1 · cobalt « 50 ANS DE CUISINE » ; 2 · orange « DANS SA TÊTE » (bulle de recettes, vieux cahier) ;
//   3 · cobalt « ÇA DISPARAÎT ?! » (le cahier s'ouvre, les pages s'envolent, le « i » en attrape une) ;
//   4 · jaune « IRIS LES RATTRAPE » (les pages deviennent des chapitres) ;
//   5 · cobalt « POUR CEUX QUI VIENDRONT APRÈS » (la petite-fille tient le livre), puis le « i » rejoint « Iris ».
// Chaque image est calculée par frame(t) puis capturée : rendu déterministe.
// Usage : node collage-cahier-de-maman.mjs <dossier> [t1,t2,…]
//   <dossier>/fonts/ : Archivo Black 400 et Plus Jakarta Sans 800 ;
//   <dossier>/p/ : front, profile, duo (découpes tramées produites par paper.py) ;
//   <dossier>/eye.png (œil tramé, iris centré) ; <dossier>/grain.png (grain papier 1080×1920, multiplié par-dessus).
//   Sans liste de temps : toutes les images dans <dossier>/frames/ ; avec une liste : <dossier>/check/.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(execSync('npm root -g').toString().trim(), '/'));
const pw = require('playwright');

const dir = process.argv[2] || '.';
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const FPS = 30;
const DURATION = 21;
const data = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(dir, p)).toString('base64')}`;
const font = (n) => data(path.join('fonts', n), 'font/woff2');
const png = (n) => data(n, 'image/png');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${font('archivo-black-latin-400-normal.woff2')})}
@font-face{font-family:J;font-weight:800;src:url(${font('plus-jakarta-sans-latin-800-normal.woff2')})}
:root{--cobalt:#2252FF;--orange:#FF6728;--yellow:#FFE14A;--ink:#121110;--cream:#F4EEDF;--paper:#FBF8F1;--old:#F1E3BF}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:var(--cobalt);-webkit-font-smoothing:antialiased}
.abs{position:absolute;left:0;top:0}
.scene{position:absolute;left:0;top:0;width:1080px;height:1920px;display:none}
.h{position:absolute;font-family:A;text-transform:uppercase;line-height:.92;letter-spacing:-.01em;white-space:nowrap;filter:drop-shadow(6px 8px 0 rgba(0,0,0,.22));transform-origin:50% 60%;visibility:hidden}
.cut{position:absolute;filter:drop-shadow(8px 10px 0 rgba(0,0,0,.24))}
.chip{position:absolute;font-family:J;font-weight:800;font-size:38px;letter-spacing:.06em;padding:12px 24px 10px;white-space:nowrap;filter:drop-shadow(5px 6px 0 rgba(0,0,0,.22));visibility:hidden}
.scrap{position:absolute;font-family:J;font-weight:800;font-size:32px;letter-spacing:.04em;color:var(--ink);padding:10px 18px 8px;white-space:nowrap;visibility:hidden;filter:drop-shadow(3px 4px 0 rgba(0,0,0,.18))}
.pg{position:absolute;left:14px;top:10px;width:352px;height:480px;background:var(--old);border-radius:3px;box-shadow:inset 0 0 30px rgba(140,100,40,.25)}
.lbl{font-family:J;font-weight:800;font-size:31px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink);margin-bottom:12px;white-space:nowrap}
.trk{position:relative;width:920px;height:56px;border:5px solid var(--ink);border-radius:4px}
.strip{position:absolute;left:90px;height:96px;visibility:hidden;filter:drop-shadow(6px 7px 0 rgba(0,0,0,.2))}
.strip>div{position:absolute;left:0;top:0;height:96px;background:var(--paper)}
.strip>span{position:absolute;left:30px;top:27px;font-family:A;font-size:40px;color:var(--ink);white-space:nowrap}
#grain{position:absolute;left:0;top:0;width:1080px;height:1920px;mix-blend-mode:multiply;z-index:50}
</style></head><body>

<!-- 1 · 50 ans de cuisine -->
<div id="s1" class="scene">
  <img id="front" class="cut" src="${png('p/front.png')}" style="left:40px;top:640px;width:1000px">
  <svg id="pot" class="abs" width="360" height="330" style="left:690px;top:1330px;overflow:visible;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22))">
    <path id="st1" d="M110 70 C80 30 140 10 110 -40 C80 -90 140 -110 110 -160" stroke="#FBF8F1" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path id="st2" d="M180 60 C150 20 210 0 180 -50 C150 -100 210 -120 180 -170" stroke="#FBF8F1" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path id="st3" d="M250 70 C220 30 280 10 250 -40 C220 -90 280 -110 250 -160" stroke="#FBF8F1" stroke-width="12" stroke-linecap="round" fill="none"/>
    <rect x="0" y="118" width="46" height="26" rx="13" fill="#121110"/><rect x="314" y="118" width="46" height="26" rx="13" fill="#121110"/>
    <path d="M24 100 L336 100 L322 250 Q318 310 250 312 L110 312 Q42 310 38 250 Z" fill="#121110"/>
    <rect x="12" y="84" width="336" height="30" rx="8" fill="#FF6728"/>
  </svg>
  <div id="h1a" class="h" style="left:64px;top:200px;font-size:250px;color:var(--cream)">50 ans</div>
  <div id="h1b" class="h" style="left:70px;top:440px;font-size:110px;color:var(--yellow)">de cuisine</div>
  <div id="c1" class="chip" style="left:70px;top:580px;background:var(--ink);color:var(--cream)">40 RECETTES · 0 ÉCRITE</div>
</div>

<!-- 2 · dans sa tête -->
<div id="s2" class="scene">
  <img id="prof" class="cut" src="${png('p/profile.png')}" style="left:-330px;top:900px;width:1000px">
  <div id="bub" class="abs" style="width:1080px;height:1920px;transform-origin:420px 930px">
    <svg class="abs" width="1080" height="1920" style="overflow:visible;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.2))">
      <circle id="b1" cx="372" cy="938" r="16" fill="#FBF8F1"/><circle id="b2" cx="430" cy="896" r="24" fill="#FBF8F1"/><circle id="b3" cx="500" cy="850" r="34" fill="#FBF8F1"/>
      <g id="cloud" style="transform-origin:790px 720px">
        <circle cx="800" cy="730" r="200" fill="#FBF8F1"/><circle cx="640" cy="700" r="130" fill="#FBF8F1"/><circle cx="950" cy="700" r="120" fill="#FBF8F1"/>
        <circle cx="720" cy="600" r="130" fill="#FBF8F1"/><circle cx="880" cy="600" r="120" fill="#FBF8F1"/><circle cx="690" cy="840" r="120" fill="#FBF8F1"/><circle cx="900" cy="850" r="110" fill="#FBF8F1"/>
      </g>
    </svg>
    <div id="k1" class="scrap" style="left:575px;top:580px;background:var(--yellow)">SAUCE GRAINE</div>
    <div id="k2" class="scrap" style="left:810px;top:660px;background:var(--orange)">ATTIÉKÉ</div>
    <div id="k3" class="scrap" style="left:580px;top:720px;background:var(--cream);border:3px solid var(--ink)">2 PIMENTS</div>
    <div id="k4" class="scrap" style="left:790px;top:800px;background:var(--yellow)">FEU DOUX</div>
    <div id="k5" class="scrap" style="left:640px;top:870px;background:var(--orange)">ALLOCO</div>
  </div>
  <div id="h2a" class="h" style="left:64px;top:240px;font-size:104px;color:var(--cream)">Ses recettes ?</div>
  <div id="h2b" class="h" style="left:64px;top:240px;font-size:124px;color:var(--cream)">Dans sa tête</div>
  <div id="h2c" class="h" style="left:64px;top:256px;font-size:84px;color:var(--yellow)">+ un vieux cahier</div>
  <div id="h2d" class="h" style="left:64px;top:220px;font-size:100px;color:var(--cream)">Ce qu’elle sait</div>
  <div id="h2e" class="h" style="left:64px;top:330px;font-size:104px;color:var(--yellow)">aucune école</div>
  <div id="h2f" class="h" style="left:70px;top:440px;font-size:80px;color:var(--cream)">ne l’apprend.</div>
</div>

<!-- 3 · ça disparaît -->
<div id="s3" class="scene">
  <div id="h3a" class="h" style="left:64px;top:200px;font-size:130px;color:var(--cream)">Si personne</div>
  <div id="h3b" class="h" style="left:64px;top:340px;font-size:130px;color:var(--cream)">ne l’écrit…</div>
  <div id="h3c" class="h" style="left:64px;top:230px;font-size:124px;color:var(--yellow)">Ça disparaît</div>
  <div id="h3d" class="h" style="left:820px;top:330px;font-size:240px;color:var(--yellow)">?!</div>
  <div id="c3" class="chip" style="left:70px;top:520px;background:var(--ink);color:var(--cream)">RECETTES : <span id="cnt">40</span></div>
</div>

<!-- 4 · Iris les rattrape -->
<div id="s4" class="scene">
  <div id="h4a" class="h" style="left:64px;top:220px;font-size:140px;color:var(--ink)">Iris les</div>
  <div id="h4b" class="h" style="left:64px;top:362px;font-size:140px;color:var(--ink)">rattrape</div>
  <div id="strips"></div>
  <div id="tk1" class="h" style="left:80px;top:1170px;filter:none"><div class="lbl">Dans sa tête · 40 recettes</div><div class="trk" style="border-style:dashed"><div style="position:absolute;left:6px;top:6px;right:6px;bottom:6px;background:repeating-linear-gradient(90deg,var(--ink) 0 18px,transparent 18px 34px);opacity:.35"></div></div></div>
  <div id="tk2" class="h" style="left:80px;top:1306px;filter:none"><div class="lbl">Dans un livre · 40 recettes</div><div class="trk"><div style="position:absolute;left:6px;top:6px;right:6px;bottom:6px;background:var(--ink)"></div></div></div>
</div>

<!-- 5 · pour ceux qui viendront après -->
<div id="s5" class="scene">
  <div id="duoW" class="abs">
    <img id="duo" class="cut" src="${png('p/duo.png')}" style="left:60px;top:740px;width:1000px">
    <div id="bl" class="h" style="left:628px;top:1330px;width:190px;padding:20px 12px 16px;background:var(--orange);font-size:26px;line-height:1.05;color:var(--ink);text-align:center;white-space:normal">Les recettes de Maman Adjoua</div>
  </div>
  <div id="h5a" class="h" style="left:64px;top:200px;font-size:100px;color:var(--cream)">Pour ceux qui</div>
  <div id="h5b" class="h" style="left:64px;top:308px;font-size:140px;color:var(--yellow)">viendront</div>
  <div id="h5c" class="h" style="left:64px;top:440px;font-size:140px;color:var(--yellow)">après.</div>
</div>

<!-- le vieux cahier : traverse les tableaux 2 et 3 -->
<div id="nb" class="abs" style="left:640px;top:1150px;width:380px;height:500px;z-index:5;visibility:hidden">
  <div class="abs" style="width:380px;height:500px;background:#3A2A22;border-radius:6px 14px 18px 8px;box-shadow:8px 10px 0 rgba(0,0,0,.22)"></div>
  <div id="pages"></div>
  <div id="cov" class="abs" style="width:380px;height:500px;background:#3A2A22;border-radius:6px 14px 18px 8px;transform-origin:left center;backface-visibility:hidden;overflow:hidden">
    <div class="abs" style="left:150px;top:300px;width:170px;height:170px;border-radius:50%;border:14px solid rgba(160,110,60,.35)"></div>
    <div class="abs" style="left:60px;top:90px;width:260px;padding:16px 10px 12px;background:var(--old);transform:rotate(-3deg);font-family:A;font-size:40px;text-align:center;color:var(--ink)">RECETTES</div>
    <div class="abs" style="left:0;top:0;width:26px;height:500px;background:rgba(0,0,0,.25)"></div>
  </div>
</div>

<!-- signature : le « i » rejoint « ris » -->
<div id="lock" class="abs" style="width:1080px;top:600px;display:flex;justify-content:center;align-items:flex-end;gap:24px">
  <div id="ph" style="width:94px;height:443px;flex:none"></div>
  <div id="ris" style="font-family:A;font-size:360px;line-height:.78;color:var(--cream);filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">ris</div>
</div>
<div id="url" class="abs" style="width:1080px;top:1110px;text-align:center;font-family:J;font-weight:800;font-size:46px;color:var(--cream);letter-spacing:.02em;visibility:hidden">irisboom.online</div>

<!-- le « i » personnage : barre de papier orange + œil -->
<div id="ich" class="abs" style="width:200px;height:944px;transform-origin:100px 100px;z-index:10;filter:drop-shadow(7px 9px 0 rgba(0,0,0,.22));visibility:hidden">
  <svg class="abs" width="200" height="944" style="overflow:visible"><path id="stemW" fill="#FBF8F1"/><path id="stemO" fill="#FF6728"/></svg>
  <div id="dot" class="abs" style="width:200px;height:200px;transform-origin:100px 100px">
    <svg class="abs" width="200" height="200" style="overflow:visible"><path id="ring" fill="#FBF8F1"/></svg>
    <div class="abs" style="left:8px;top:8px;width:184px;height:184px;border-radius:50%;overflow:hidden;background:var(--cream)">
      <img id="eye" src="${png('eye.png')}" style="position:absolute;width:249px;height:249px">
      <div id="lidT" class="abs" style="width:184px;height:94px;background:var(--ink)"></div>
      <div id="lidB" class="abs" style="top:90px;width:184px;height:94px;background:var(--ink)"></div>
    </div>
  </div>
</div>

<img id="grain" src="${png('grain.png')}">

<script>
const C = { cobalt: '#2252FF', orange: '#FF6728', yellow: '#FFE14A' };
const P = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const L = (a, b, p) => a + (b - a) * p;
const eo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const eio = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// Arrivée rapide avec léger dépassement.
const bo = (x, c = 1.6) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2));
const $ = (s) => document.querySelector(s);

// Bords de papier déchiré : on subdivise chaque côté et on décale les points au hasard (graine fixe).
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function torn(pts, amp, step, seed) {
  const r = rng(seed), out = [];
  pts.forEach(([x0, y0], i) => {
    const [x1, y1] = pts[(i + 1) % pts.length], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let k = 0; k < n; k++) { const u = k / n, j = k ? (r() - .5) * 2 * amp : 0; out.push([x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j]); }
  });
  return 'M' + out.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
}
const circle = (cx, cy, R, n) => Array.from({ length: n }, (_, i) => [cx + R * Math.cos(i / n * 2 * Math.PI), cy + R * Math.sin(i / n * 2 * Math.PI)]);
// La barre reprend la forme du logo Iris (haut en biseau).
$('#stemO').setAttribute('d', torn([[186, 259], [17, 407], [48, 934], [148, 934]], 3, 22, 11));
$('#stemW').setAttribute('d', torn([[192, 249], [5, 403], [39, 944], [157, 944]], 5, 16, 23));
$('#ring').setAttribute('d', torn(circle(100, 100, 101, 40), 3.5, 9, 5));

// Pages du vieux cahier : lignes d'écriture à la main figurées par des traits d'encre.
const NPAGES = 9;
const pr = rng(77);
const pageHtml = () => {
  let h = '';
  for (let y = 46; y < 450; y += 34) {
    h += '<div class="abs" style="left:22px;top:' + (y + 22) + 'px;width:310px;height:2px;background:rgba(34,82,255,.18)"></div>';
    if (pr() > .15) h += '<div class="abs" style="left:' + (26 + pr() * 10) + 'px;top:' + (y + 10) + 'px;width:' + (120 + pr() * 180) + 'px;height:6px;border-radius:3px;background:rgba(40,30,25,.55)"></div>';
  }
  return h;
};
$('#pages').innerHTML = Array.from({ length: NPAGES }, (_, i) => '<div class="pg" style="transform:rotate(' + ((pr() - .5) * 2) + 'deg)">' + pageHtml() + '</div>').join('');
const pages = [...document.querySelectorAll('.pg')];
// Envol de chaque page : direction et rotation tirées au sort ; la dernière va vers le « i ».
const FLY = pages.map(() => [(pr() - .5) * 2600, -400 - pr() * 1500, (pr() - .5) * 140]);

// Chapitres : bandes de papier crème au bout déchiré, qui arrivent de loin en tournoyant.
const CHAP = ['CH. 1 · LES SAUCES', 'CH. 2 · RIZ & ATTIÉKÉ', 'CH. 3 · LES FRITURES', 'CH. 4 · LES DOUCEURS'];
const SW = [880, 820, 860, 800];
const FROM = [[-900, -300, -40], [1000, 200, 35], [-1000, 500, 30], [900, 700, -45]];
$('#strips').innerHTML = CHAP.map((c, i) => {
  const r = rng(90 + i), w = SW[i], pts = [[0, 0], [w - 18, 0]];
  for (let y = 10; y < 96; y += 12) pts.push([w - 18 + r() * 22, y]);
  pts.push([w - 18, 96], [0, 96]);
  return '<div class="strip" style="top:' + (650 + i * 122) + 'px"><div style="width:' + w + 'px;clip-path:polygon(' + pts.map((p) => p[0].toFixed(0) + 'px ' + p[1].toFixed(0) + 'px').join(',') + ')"></div><span>' + c + '</span></div>';
}).join('');
const strips = [...document.querySelectorAll('.strip')];

// Collé d'un coup : arrive grand, s'écrase avec un léger rebond ; sort en glissant hors champ.
function slap(sel, t, t0, { rot = 0, out = 99, dir = [0, -1] } = {}) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  const p = P(t, t0, t0 + .26), q = eio(P(t, out, out + .24));
  el.style.visibility = t >= t0 && q < 1 ? 'visible' : 'hidden';
  el.style.opacity = Math.min(1, p * 6);
  el.style.transform = 'translate(' + dir[0] * q * 1300 + 'px,' + dir[1] * q * 1300 + 'px) scale(' + (1.55 - .55 * bo(p, 2.2)) + ') rotate(' + (rot + (1 - p) * 7) + 'deg)';
}

// Regard de l'œil : chaque repère [temps, x, y] est rejoint en 0,16 s.
const LOOK = [[0, 0, 0], [14.05, -12, 10], [15.7, -14, 15], [17.2, -15, 9], [18.05, 0, 0], [19.6, -14, -2], [19.85, 12, -2], [20.1, 0, 0]];
const BLINKS = [17.6, 20.45];
const IRIS_C = 582 * 249 / 1164;   // centre de l'iris dans l'image affichée
const NB = { x: 830, y: 1400 };    // centre du cahier au repos (tableau 2)

let lockS, lockX, lockY;
window.frame = (t) => {
  if (lockS === undefined) {
    const r = $('#ph').getBoundingClientRect();
    lockS = r.height / 944; lockX = r.left + 100 * lockS; lockY = r.top + 100 * lockS;
  }
  document.body.style.background = t < 3 ? C.cobalt : t < 9.7 ? C.orange : t < 13.3 ? C.cobalt : t < 16.75 ? C.yellow : C.cobalt;
  [['s1', t < 3], ['s2', t >= 3 && t < 9.75], ['s3', t >= 9.7 && t < 13.3], ['s4', t >= 13.3 && t < 16.8], ['s5', t >= 16.75]].forEach(([id, on]) => { $('#' + id).style.display = on ? 'block' : 'none'; });

  // 1 · 50 ans de cuisine : Maman Adjoua monte dans le cadre, la marmite fume.
  const fIn = bo(P(t, 0, .5)), fOut = eio(P(t, 2.8, 3.05));
  $('#front').style.transform = 'translateY(' + ((1 - fIn) * 1200 + fOut * 1300) + 'px) rotate(' + (1 - fIn) * 4 + 'deg)';
  const pIn = bo(P(t, .25, .7));
  $('#pot').style.transform = 'translate(' + (1 - pIn) * 700 + 'px,' + fOut * 1300 + 'px) rotate(' + (1 - pIn) * 12 + 'deg)';
  ['st1', 'st2', 'st3'].forEach((id, i) => {
    const el = $('#' + id), ph = t * 1.4 + i * .33;
    el.style.opacity = .85 * P(t, .6 + i * .15, 1 + i * .15);
    el.style.transform = 'translateY(' + -((ph % 1) * 40) + 'px)';
  });
  slap('#h1a', t, 1.62, { rot: -2, out: 2.85 });
  slap('#h1b', t, 2.14, { rot: 2, out: 2.88 });
  slap('#c1', t, 2.45, { rot: -3, out: 2.9 });

  // 2 · dans sa tête : la bulle se remplit de recettes, puis le vieux cahier arrive.
  const prIn = bo(P(t, 3, 3.5)), prOut = eio(P(t, 9.4, 9.7));
  $('#prof').style.transform = 'translateX(' + ((prIn - 1) * 1000 - prOut * 1100) + 'px)';
  [['#b1', 3.45], ['#b2', 3.55], ['#b3', 3.65]].forEach(([s, a]) => { const p = bo(P(t, a, a + .2), 2.2); const el = $(s); el.style.transformOrigin = el.getAttribute('cx') + 'px ' + el.getAttribute('cy') + 'px'; el.style.transform = 'scale(' + p + ')'; });
  $('#cloud').style.transform = 'scale(' + bo(P(t, 3.72, 4.05), 1.8) + ')';
  $('#bub').style.transform = 'scale(' + (1 - eio(P(t, 9.35, 9.6))) + ')';
  [['#k1', 3.95, -6], ['#k2', 4.15, 5], ['#k3', 4.35, 3], ['#k4', 4.55, -4], ['#k5', 4.75, -2]].forEach(([s, a, r]) => slap(s, t, a, { rot: r }));
  slap('#h2a', t, 3.02, { rot: -2, out: 4.2 });
  slap('#h2b', t, 4.32, { rot: 2, out: 5.7 });
  slap('#h2c', t, 5.84, { rot: -2, out: 6.88 });
  slap('#h2d', t, 7, { rot: -1, out: 9.4 });
  slap('#h2e', t, 8.42, { rot: 2, out: 9.42 });
  slap('#h2f', t, 8.8, { rot: -2, out: 9.44 });

  // Le vieux cahier : arrive en bas à droite, vient au centre (raccord), s'ouvre, puis ses pages s'envolent.
  const nIn = bo(P(t, 5.36, 5.8)), nC = eio(P(t, 9.4, 9.75));
  $('#nb').style.visibility = t >= 5.36 && t < 13.3 ? 'visible' : 'hidden';
  const ncx = L(NB.x, 540, nC), ncy = L(NB.y, 1110, nC);
  $('#nb').style.transform = 'translate(' + (ncx - NB.x + (1 - nIn) * 600) + 'px,' + (ncy - NB.y + (1 - nIn) * 500) + 'px) rotate(' + (L(-7, 0, nC) + (1 - nIn) * 20) + 'deg) scale(' + L(1, 1.5, nC) + ')';
  const open = eio(P(t, 9.8, 10.15));
  $('#cov').style.transform = 'perspective(1800px) rotateY(' + -178 * open + 'deg)';
  $('#cov').style.visibility = open < 1 ? 'visible' : 'hidden';
  pages.forEach((pg, k) => {
    const a = 12.3 + k * .07, p = P(t, a, a + (k === NPAGES - 1 ? .55 : .7));
    let [dx, dy, r] = FLY[k];
    if (k === NPAGES - 1) { dx = (800 - 540) / 1.5; dy = (1060 - 1110) / 1.5; r = 12; }
    const e = k === NPAGES - 1 ? eio(p) : p * p;
    const s = k === NPAGES - 1 ? L(1, .45, e) : 1;
    pg.style.transform = 'translate(' + dx * e + 'px,' + dy * e + 'px) rotate(' + r * e + 'deg) scale(' + s + ')';
  });

  // 3 · ça disparaît : le compteur de recettes tombe à zéro pendant l'envol.
  slap('#h3a', t, 10.16, { rot: -2, out: 12.05 });
  slap('#h3b', t, 11, { rot: 1, out: 12.08 });
  slap('#h3c', t, 12.24, { rot: -2, out: 13.05 });
  slap('#h3d', t, 12.5, { rot: 10, out: 13.08 });
  slap('#c3', t, 10.45, { rot: -3, out: 13.1 });
  $('#cnt').textContent = 40 - Math.round(40 * P(t, 12.3, 12.95));

  // 4 · Iris les rattrape : les pages reviennent et deviennent des chapitres, puis deux jauges imprimées.
  slap('#h4a', t, 13.9, { rot: -2, out: 16.6 });
  slap('#h4b', t, 14.25, { rot: 1, out: 16.62 });
  let front = null;
  strips.forEach((el, i) => {
    const a = 14.5 + i * .3, p = bo(P(t, a, a + .38), 1.2), q = eio(P(t, 16.6, 16.8));
    const [fx, fy, fr] = FROM[i];
    el.style.visibility = t >= a && q < 1 ? 'visible' : 'hidden';
    el.style.transform = 'translate(' + ((1 - p) * fx - q * 1300) + 'px,' + (1 - p) * fy + 'px) rotate(' + (1 - p) * fr + 'deg)';
    if (t >= a && t < 15.7) front = [90 + SW[i] * .6, 698 + i * 122];
  });
  slap('#tk1', t, 15.7, { out: 16.62, dir: [-1, 0] });
  slap('#tk2', t, 16.1, { out: 16.64, dir: [-1, 0] });

  // 5 · pour ceux qui viendront après.
  const dIn = bo(P(t, 16.75, 17.2)), dOut = eio(P(t, 18.7, 19));
  $('#duoW').style.transform = 'translateY(' + ((1 - dIn) * 1200 + dOut * 1300) + 'px)';
  slap('#bl', t, 17.25, { rot: -4 });
  slap('#h5a', t, 16.78, { rot: -2, out: 18.7 });
  slap('#h5b', t, 17.68, { rot: 2, out: 18.72 });
  slap('#h5c', t, 18, { rot: -2, out: 18.74 });
  slap('#ris', t, 19.1);
  const u = eo(P(t, 19.5, 20));
  $('#url').style.visibility = t >= 19.5 ? 'visible' : 'hidden';
  $('#url').style.opacity = u; $('#url').style.transform = 'translateY(' + (1 - u) * 24 + 'px)';

  // Le « i » : position du centre de l'œil (cx, cy) et échelle s.
  let cx, cy, s, rot = 0, sl = 1;
  if (t < 13.3) {
    const p = P(t, 13, 13.26); cx = 800; cy = 760; s = .6; rot = (1 - p) * 7; sl = 1.55 - .55 * bo(p, 2.2);
  } else if (t < 16.75) {
    const p = bo(P(t, 13.3, 13.75)); cx = L(800, 950, p); cy = L(760, 330, p); s = L(.6, .5, p);
  } else if (t < 18.75) {
    const p = bo(P(t, 16.75, 17.15)); cx = 950; cy = L(330, 560, p); s = L(.5, .45, p);
  } else {
    const p = bo(P(t, 18.75, 19.2)); cx = L(950, lockX, p); cy = L(560, lockY, p); s = L(.45, lockS, p);
  }
  const ich = $('#ich');
  ich.style.visibility = t >= 13 ? 'visible' : 'hidden';
  ich.style.transform = 'translate(' + (cx - 100) + 'px,' + (cy - 100) + 'px) scale(' + s * sl + ') rotate(' + rot + 'deg)';

  // Regard, clignements, clin d'œil.
  let lx = 0, ly = 0;
  for (const [k, x, y] of LOOK) { if (t < k) break; const p = eio(P(t, k, k + .16)); lx = L(lx, x, p); ly = L(ly, y, p); }
  if (front) { const dx = front[0] - cx, dy = front[1] - cy, n = Math.hypot(dx, dy); lx = 16 * dx / n; ly = 16 * dy / n; }
  let lid = t < 13.9 ? 1 : 1 - eo(P(t, 13.9, 14.05));
  BLINKS.forEach((b) => { const p = P(t, b, b + .18); if (p > 0 && p < 1) lid = Math.max(lid, 1 - Math.abs(2 * p - 1)); });
  const w = P(t, 18.3, 18.75);
  if (w > 0 && w < 1) lid = Math.max(lid, w < .3 ? w / .3 : w < .7 ? 1 : (1 - w) / .3);
  $('#dot').style.transform = 'rotate(' + (w > 0 && w < 1 ? -8 * Math.sin(Math.PI * w) : 0) + 'deg)';
  $('#eye').style.left = 92 - IRIS_C + lx + 'px'; $('#eye').style.top = 92 - IRIS_C + ly + 'px';
  $('#lidT').style.transform = 'translateY(' + -(1 - lid) * 101 + '%)';
  $('#lidB').style.transform = 'translateY(' + (1 - lid) * 101 + '%)';
};
</script></body></html>`;

const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
const outDir = path.join(dir, only ? 'check' : 'frames');
fs.mkdirSync(outDir, { recursive: true });
const times = only || Array.from({ length: Math.round(FPS * DURATION) }, (_, i) => i / FPS);
for (const [i, t] of times.entries()) {
  await p.evaluate((x) => window.frame(x), t);
  await p.screenshot({ path: path.join(outDir, only ? `t${t}.jpg` : `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
await b.close();
console.log('ok', times.length, 'images');
