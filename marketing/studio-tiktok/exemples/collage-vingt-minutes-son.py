"""Bande son de la vidéo « 20 minutes » (collage papier) : voix posée d'un bloc, musique prolongée par un fondu
sur une mesure plus haut, bruitages de papier et d'horlogerie synthétisés (claques, tic-tac, sonnerie, pages, souffles).
Usage : python3 collage-vingt-minutes-son.py voix.mp3 musique.mp3 sortie.wav
"""
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 44100
DURATION = 23.7
VOICE_AT = 0.3
rng = np.random.default_rng(9)

SLAPS = [.3, .86, 2.08, 2.38, 3.14, 4.34, 5.46, 5.82, 7.44, 8.08, 9.4, 10.36, 10.52, 10.9, 12.62, 12.9, 14.0, 14.26,
         14.6, 14.9, 15.5, 16.0, 16.46, 17.56, 19.52, 20.48, 21.12, 22.25]
WHOOSH = [0.0, 4.1, 7.3, 9.1, 12.4, 14.0, 15.4, 19.25, 21.9]
TICKS = [2.5 + k for k in range(2)] + [8.2 + k * .1 for k in range(8)] + [12.9 + k * .085 for k in range(12)]
POPS = [10.5 + i * .3 for i in range(5)]           # les mots qui s'envolent
PAGES = [10.95 + k * .14 for k in range(10)]       # les pages qui tombent sur la pile
DINGS = [9.0, 13.9]                                # fin du minuteur, fin de l'heure


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def smooth(x, k):
    return np.convolve(x, np.ones(k) / k, 'same')


def env_t(sec):
    return np.arange(int(sec * SR)) / SR


def slap():
    t = env_t(.14)
    paper = smooth(rng.standard_normal(t.size), 5) * np.exp(-t / .022)
    thump = np.sin(2 * np.pi * 92 * t) * np.exp(-t / .045)
    return .55 * paper + .7 * thump


def whoosh():
    t = env_t(.42)
    n = rng.standard_normal(t.size)
    band = smooth(n, 4) - smooth(n, 40)
    return .5 * band * np.sin(np.pi * t / t[-1]) ** 2


def flip():
    t = env_t(.32)
    n = rng.standard_normal(t.size)
    hi = n - smooth(n, 12)
    return .32 * hi * (np.exp(-((t - .06) / .03) ** 2) + .8 * np.exp(-((t - .22) / .05) ** 2))


def pop():
    t = env_t(.12)
    f = np.linspace(900, 320, t.size)
    return .45 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .03)


def tick():
    t = env_t(.03)
    return .22 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .006)


def ding():
    t = env_t(.9)
    return .2 * (np.sin(2 * np.pi * 1760 * t) + .5 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t / .25)


def wink():
    t = env_t(.18)
    return .18 * np.sin(2 * np.pi * 1320 * t) * np.exp(-t / .05)


def put(out, x, at):
    i = int(at * SR)
    x = x[:max(0, len(out) - i)]
    out[i:i + len(x)] += x


voice_path, music_path, dst = sys.argv[1:4]
n = int(DURATION * SR)
voice, music, fx = np.zeros(n, np.float32), np.zeros(n, np.float32), np.zeros(n, np.float32)

put(voice, load(voice_path), VOICE_AT)

# La musique dure 22 s : à 21 s, fondu d'une seconde vers la même musique reprise à 11 s (16 temps plus tôt à 96 bpm).
m = load(music_path)
cut, back, xf = int(21 * SR), int(11 * SR), SR
head = m[:cut + xf].copy()
tail = m[back:back + (n - cut)].copy()
fade = np.linspace(0, 1, xf)
music[:cut] = head[:cut]
music[cut:cut + xf] = head[cut:cut + xf] * (1 - fade) + tail[:xf] * fade
music[cut + xf:cut + len(tail)] = tail[xf:len(tail)]
music[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))

for at in SLAPS:
    put(fx, slap(), at)
for at in WHOOSH:
    put(fx, whoosh() * (.5 if at == 0 else 1), at)
for at in TICKS:
    put(fx, tick(), at)
for at in POPS:
    put(fx, pop() * .6, at)
for at in PAGES:
    put(fx, flip() * .8, at)
for at in DINGS:
    put(fx, ding(), at)
put(fx, wink(), 22.92)

mix = voice / max(1e-6, np.abs(voice).max()) * .9 + music / max(1e-6, np.abs(music).max()) * .3 + fx * .22
mix /= max(1, np.abs(mix).max() / .97)
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print('ok', dst, round(len(mix) / SR, 2), 's')
