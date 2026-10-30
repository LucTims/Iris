"""Compose la bannière YouTube 2560×1440 à partir d'un panorama :
le panorama occupe la largeur, centré verticalement (la bande 2560×423 vue sur ordinateur et la zone
1546×423 vue sur mobile tombent dedans) ; au-dessus et en dessous, le même panorama flouté et assombri
(visible seulement sur télévision). Produit aussi un aperçu de la page chaîne, façon application mobile.
Usage : python3 banner.py panorama.png sortie.jpg apercu.png logo.png
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

src, dst, prev, logo = sys.argv[1:5]
W, H = 2560, 1440
pano = Image.open(src).convert('RGB')
ph = round(pano.height * W / pano.width)
pano = pano.resize((W, ph), Image.LANCZOS)
bg = pano.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(60))
bg = ImageEnhance.Brightness(bg).enhance(.45)
out = bg.copy()
y0 = (H - ph) // 2 - 30   # remonte un peu : visage et livre tiennent dans la bande 423 px
# Fondu doux entre le panorama net et le fond flouté.
mask = Image.new('L', (W, ph), 255)
d = ImageDraw.Draw(mask)
f = 80
for i in range(f):
    a = round(255 * i / f)
    d.line([(0, i), (W, i)], fill=a)
    d.line([(0, ph - 1 - i), (W, ph - 1 - i)], fill=a)
out.paste(pano, (0, y0), mask)
out.save(dst, quality=93)

# Aperçu « application mobile » : bande 1546×423 au centre, logo rond, nom de la chaîne.
strip = out.crop(((W - 1546) // 2, (H - 423) // 2, (W + 1546) // 2, (H + 423) // 2))
P = Image.new('RGB', (1080, 700), (15, 15, 15))
sw = 1000
s = strip.resize((sw, round(423 * sw / 1546)), Image.LANCZOS)
m = Image.new('L', s.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, s.width - 1, s.height - 1], 24, fill=255)
P.paste(s, (40, 40), m)
lg = Image.open(logo).convert('RGB').resize((210, 210), Image.LANCZOS)
lm = Image.new('L', lg.size, 0); ImageDraw.Draw(lm).ellipse([0, 0, 209, 209], fill=255)
P.paste(lg, (40, 360), lm)
def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        try: return ImageFont.truetype(p, sz)
        except OSError: pass
    return ImageFont.load_default()
dd = ImageDraw.Draw(P)
dd.text((290, 385), 'Iris', font=font(64), fill=(240, 240, 240))
dd.text((290, 470), '@IrisBoom', font=font(34), fill=(170, 170, 170))
dd.text((290, 520), 'Ton savoir mérite un livre', font=font(30), fill=(130, 130, 130))
P.save(prev)
print('ok', dst, prev)
