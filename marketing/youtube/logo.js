const { chromium } = require('playwright');
// Signe Iris : boîte 59 × 271. On le centre dans un disque, hauteur = 60 % du diamètre.
const mark = (ring, pupil, stem) => `<circle cx="29" cy="29" r="29" fill="${ring}"/><circle cx="29" cy="29" r="15" fill="${pupil}"/><path d="M54 75 5 118l9 153h29z" fill="${stem}"/>`;
const svg = (bg, ring, pupil, stem) => {
  const S = 800, h = S * .7, k = h / 271, w = 59 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <rect width="${S}" height="${S}" fill="${bg}"/>
  <g transform="translate(${(S - w) / 2 + 4} ${(S - h) / 2}) scale(${k})">${mark(ring, pupil, stem)}</g></svg>`;
};
const V = {
  'logo-terracotta': svg('#BF6345', '#F8F8F7', '#161616', '#F8F8F7'),
  'logo-noir': svg('#161616', '#BF6345', '#161616', '#BF6345'),
  'logo-creme': svg('#F8F8F7', '#BF6345', '#161616', '#BF6345'),
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
  const fs = require('fs');
  for (const [n, s] of Object.entries(V)) {
    fs.writeFileSync(n + '.svg', s);
    await p.setContent(`<html><body style="margin:0">${s}</body></html>`);
    await p.screenshot({ path: n + '.png', clip: { x: 0, y: 0, width: 800, height: 800 } });
  }
  // Aperçu : les trois logos recadrés en cercle comme sur YouTube.
  await p.setViewportSize({ width: 1500, height: 560 });
  await p.setContent(`<html><body style="margin:0;background:#0f0f0f;display:flex;gap:60px;align-items:center;justify-content:center;height:560px">${Object.keys(V).map((n) => `<img src="data:image/png;base64,${fs.readFileSync(n + '.png').toString('base64')}" style="width:400px;height:400px;border-radius:50%">`).join('')}</body></html>`);
  await p.screenshot({ path: 'apercu-logos.png' });
  await b.close();
})();
