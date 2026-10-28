"""Bande son de la vidéo « Toi + Iris » (collage papier) : voix découpée en phrases et recalée sur l'animation,
musique à bas niveau, bruitages de papier synthétisés (claques, page qui tourne, souffles, pop, tics).
Usage : python3 collage-toi-iris-son.py voix.mp3 musique.mp3 sortie.wav
"""
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 44100
DURATION = 17.5
rng = np.random.default_rng(3)

# (début, fin) dans la prise de voix → instant de pose dans la vidéo.
PHRASES = [
    (0.00, 3.80, 0.25),   # Tu connais ton métier par cœur… mais la page reste blanche ?
    (3.80, 5.10, 4.45),   # Voici Iris.
    (5.10, 7.95, 6.10),   # Tu lui racontes ton savoir, avec tes mots.
    (7.95, 9.28, 8.95),   # Iris en fait un plan,
    (9.28, 11.20, 10.50),  # puis écrit chaque chapitre avec toi.
    (11.20, 14.48, 12.90),  # Ton savoir. Ton livre. Avec Iris.
]
SLAPS = [.83, 1.35, 1.6, 2.81, 3.25, 3.5, 4.75, 6.52, 7.25, 9.2, 9.55, 10.7, 11.3, 12.9, 13.1, 13.6, 13.9, 14.28, 14.6, 15.42]
WHOOSH = [0.0, 3.95, 5.85, 10.15, 12.45, 15.1]
POPS = [6.7, 9.95, 10.45]
TICKS = [10.9, 11.2, 11.5, 11.8, 12.1]


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


def bass():
    t = env_t(.7)
    return .55 * (np.sin(2 * np.pi * 55 * t) + .3 * np.sin(2 * np.pi * 110 * t)) * np.exp(-t / .22) * np.minimum(1, t / .01)


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

nar = load(voice_path)
fade = int(.012 * SR)
for a, b, at in PHRASES:
    seg = nar[int(a * SR):int(b * SR)].copy()
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    put(voice, seg, at)

m = load(music_path)[:n]
m[-int(.8 * SR):] *= np.linspace(1, 0, int(.8 * SR))
music[:len(m)] = m

for at in SLAPS:
    put(fx, slap(), at)
for at in WHOOSH:
    put(fx, whoosh() * (.5 if at == 0 else 1), at)
for at in POPS:
    put(fx, pop(), at)
for at in TICKS:
    put(fx, tick(), at)
put(fx, flip(), 4.3)
put(fx, bass(), 10.5)
put(fx, wink(), 16.42)

mix = voice / max(1e-6, np.abs(voice).max()) * .9 + music / max(1e-6, np.abs(music).max()) * .2 + fx * .22
mix /= max(1, np.abs(mix).max() / .97)
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print('ok', dst, round(len(mix) / SR, 2), 's')
