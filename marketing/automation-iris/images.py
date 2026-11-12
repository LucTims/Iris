"""Préparation des images d'un épisode « Devine son métier » (gratuit, tout en local).
  python3 images.py detourer  entree.png sortie.png       détourage rembg (modèle isnet-general-use)
  python3 images.py indices   bande.png  dossier/          bande 3:1 → indice1.png, indice2.png, indice3.png détourés
  python3 images.py couverture livre_detoure.png           cadre de la couverture bleue du livre (JSON, fractions 0..1)
"""
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

_session = None


def detoure(im):
    global _session
    from rembg import new_session, remove
    if _session is None:
        _session = new_session('isnet-general-use')
    out = remove(im.convert('RGB'), session=_session)
    # Supprime les petites taches isolées laissées par le détourage : on garde les gros morceaux seulement.
    a = np.asarray(out.getchannel('A')) > 128
    lab, n = ndimage.label(a)
    if n > 1:
        sizes = ndimage.sum(a, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.flatnonzero(sizes >= .08 * sizes.max()))
        arr = np.asarray(out).copy()
        arr[~keep, 3] = 0
        out = Image.fromarray(arr, 'RGBA')
    return out


def rogne(im, marge=12):
    # Seuil haut : le détourage laisse un voile presque transparent autour du sujet, qu'on ne veut pas garder.
    box = im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    if not box:
        raise SystemExit('détourage vide')
    x0, y0, x1, y1 = box
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))


def couverture(path):
    """Plus grande zone bleu cobalt : la couverture vierge que le personnage tient (on y colle le titre)."""
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.int16)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    bleu = (al > 128) & (b > 110) & (b > r + 60) & (b > g + 25)
    bleu = ndimage.binary_opening(bleu, iterations=3)
    lab, n = ndimage.label(bleu)
    if not n:
        return None
    sizes = ndimage.sum(bleu, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    if sizes[k - 1] < .01 * im.width * im.height:
        return None
    ys, xs = np.nonzero(lab == k)
    return {'x': xs.min() / im.width, 'y': ys.min() / im.height, 'w': (xs.max() - xs.min()) / im.width,
            'h': (ys.max() - ys.min()) / im.height, 'W': im.width, 'H': im.height}


cmd = sys.argv[1]
if cmd == 'detourer':
    rogne(detoure(Image.open(sys.argv[2])), 4).save(sys.argv[3])
elif cmd == 'indices':
    bande = Image.open(sys.argv[2]).convert('RGB')
    w = bande.width // 3
    for i in range(3):
        rogne(detoure(bande.crop((i * w, 0, (i + 1) * w, bande.height)))).save(f'{sys.argv[3]}/indice{i + 1}.png')
elif cmd == 'couverture':
    print(json.dumps(couverture(sys.argv[2])))
else:
    raise SystemExit(__doc__)
