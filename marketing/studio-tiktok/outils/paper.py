"""Transforme une découpe (PNG avec transparence) en photo tramée sur papier crème, bordée d'un liseré blanc déchiré.
C'est l'apparence de toutes les photos des vidéos « collage papier ».
Usage : python3 paper.py entree_rgba.png sortie.png [taille_max] [cellule]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
cell = int(sys.argv[4]) if len(sys.argv) > 4 else 9
rng = np.random.default_rng(7)
im = Image.open(src).convert("RGBA"); im.thumbnail((size, size), Image.LANCZOS)
pad = 70; canvas = Image.new("RGBA", (im.width + 2*pad, im.height + 2*pad), (0, 0, 0, 0)); canvas.paste(im, (pad, pad)); im = canvas
W, H = im.size
alpha = np.asarray(im.getchannel("A")).astype(np.float32) / 255
mask = ndimage.binary_fill_holes(ndimage.binary_opening(alpha > 0.5, iterations=2))
g = np.asarray(ImageOps.autocontrast(im.convert("L"), cutoff=1)).astype(np.float32) / 255
# Trame : un point par cellule, en quinconce, d'autant plus gros que la zone est sombre (dessiné à ×3 puis réduit).
S = 3; ht = Image.new("L", (W*S, H*S), 255); d = ImageDraw.Draw(ht)
for yy in range(0, H, cell):
    off = (cell // 2) if (yy // cell) % 2 else 0
    for xx in range(-off, W, cell):
        x0, x1 = max(xx, 0), min(xx + cell, W)
        if x1 <= x0: continue
        dark = 1 - float(g[yy:yy+cell, x0:x1].mean())
        if dark < 0.04: continue
        r = 0.5 * cell * 1.32 * dark ** 0.6
        cx, cy = (xx + cell/2)*S, (yy + cell/2)*S
        d.ellipse([cx - r*S, cy - r*S, cx + r*S, cy + r*S], fill=0)
dots = np.asarray(ht.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
cream = np.array([244, 238, 223], np.float32); ink = np.array([18, 17, 16], np.float32)
photo = cream[None, None, :]*dots[..., None] + ink[None, None, :]*(1-dots[..., None])
# Liseré blanc au bord irrégulier, comme du papier déchiré.
dist = ndimage.distance_transform_edt(~mask)
noise = ndimage.gaussian_filter(rng.random((H, W)), 3)*1.0 + ndimage.gaussian_filter(rng.random((H, W)), 12)*2.2
noise = (noise - noise.mean()) / noise.std()
border = dist < (22 + 7*noise); inner = ndimage.binary_erosion(mask, iterations=1)
out = np.zeros((H, W, 4), np.float32)
out[border, :3] = np.array([252, 250, 244], np.float32); out[border, 3] = 255
out[inner, :3] = photo[inner]; out[inner, 3] = 255
grain = ndimage.gaussian_filter(rng.standard_normal((H, W)), 0.8)*5
out[..., :3] = np.clip(out[..., :3] + grain[..., None]*(out[..., 3:4] > 0), 0, 255)
out[..., 3] = ndimage.gaussian_filter(out[..., 3], 0.7)
Image.fromarray(out.astype(np.uint8), "RGBA").save(dst)
print(dst, W, H)
