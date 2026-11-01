#!/bin/bash
# Prépare un bac à sable vierge pour les vidéos « collage papier » : polices, grain papier, outils.
# Usage : bash installer.sh <dossier>   (y dépose fonts/, grain.png, paper.py, mots.py)
set -e
D=${1:-$HOME/tools}; mkdir -p "$D/fonts" && cd "$D"
cp "$(dirname "$0")"/paper.py "$(dirname "$0")"/mots.py . 2>/dev/null || true
python3 -c "
import numpy as np
from PIL import Image
from scipy import ndimage
r = np.random.default_rng(1)
g = ndimage.gaussian_filter(r.standard_normal((1920, 1080)), 1.0)*6 + ndimage.gaussian_filter(r.standard_normal((1920, 1080)), 18)*30
Image.fromarray(np.clip(238 + g, 215, 255).astype(np.uint8), 'L').convert('RGB').save('grain.png')"
mkdir -p npm && cd npm
npm pack @fontsource/archivo-black @fontsource/plus-jakarta-sans --silent >/dev/null 2>&1
for f in *.tgz; do mkdir -p "${f%.tgz}" && tar xzf "$f" -C "${f%.tgz}" --strip-components=1; done
cp fontsource-archivo-black-*/files/archivo-black-latin-400-normal.woff2 fontsource-plus-jakarta-sans-*/files/plus-jakarta-sans-latin-800-normal.woff2 ../fonts/
echo "outils prêts dans $D"
