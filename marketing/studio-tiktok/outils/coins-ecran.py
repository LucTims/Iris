"""Repère les 4 coins de l'écran vierge (blanc cassé) d'une photo générée.

Usage (sandbox Higgsfield) : python3 coins-ecran.py photoA photoB …  (fichiers .png, sans extension)
Écrit corners.json : {photo: [haut-gauche, haut-droite, bas-droite, bas-gauche]}.
"""
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

out = {}
for n in sys.argv[1:]:
    a = np.asarray(Image.open(n + ".png").convert("RGB")).astype(int)
    m = (a.max(2) > 215) & (a.max(2) - a.min(2) < 28)  # clair et peu saturé
    lab, k = ndimage.label(m)
    m = lab == 1 + int(np.argmax(ndimage.sum(m, lab, range(1, k + 1))))  # plus grande zone : l'écran
    ys, xs = np.nonzero(m)
    s, d = xs + ys, xs - ys
    pt = lambda i: (int(xs[i]), int(ys[i]))
    out[n] = [pt(s.argmin()), pt(d.argmax()), pt(s.argmax()), pt(d.argmin())]
print(json.dumps(out))
json.dump(out, open("corners.json", "w"))
