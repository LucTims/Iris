"""Bande son du quiz « Devine son métier » (collage papier) : voix en deux morceaux (les indices, puis la révélation
après un temps de réflexion), musique de jeu, bruitages synthétisés (bips du compte à rebours, claques de papier,
tic-tac de réflexion, accord de révélation, souffles).
Usage : python3 collage-devine-son-metier-son.py voix.mp3 musique.mp3 sortie.wav
"""
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 44100
DURATION = 23.5
rng = np.random.default_rng(11)

# (début, fin) dans la prise de voix → instant de pose dans la vidéo.
PHRASES = [
    (0.0, 3.9, 2.3),     # Trois indices. Un seul métier. Tu trouves ?
    (4.45, 99, 8.3),     # C'est Koffi… jusqu'à « en commentaire. »
]
SLAPS = [.1, .35, .6, 2.3, 2.72, 3.7, 4.5, 4.98, 5.6, 5.7, 9.09, 9.79, 10.87, 11.95, 12.99, 13.69, 15.1, 15.6, 16.53,
         17.33, 17.9, 18.53, 18.81, 19.1, 19.53, 19.95, 21.25]
BUBBLES = [12.3 + i * .35 for i in range(6)]
BEEPS = [(.8, 880), (1.3, 880), (1.8, 880), (2.3, 1320)]
TICKS = [5.7 + k * .25 for k in range(10)]
WHOOSH = [0.0, 2.25, 8.3, 11.85, 14.85, 17.25, 20.9]


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


def pop():
    t = env_t(.12)
    f = np.linspace(900, 320, t.size)
    return .45 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .03)


def beep(f):
    t = env_t(.16)
    return .3 * np.sin(2 * np.pi * f * t) * np.minimum(1, t / .005) * np.exp(-t / .07)


def tick():
    t = env_t(.03)
    return .22 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .006)


def tada():
    t = env_t(.9)
    chord = sum(np.sin(2 * np.pi * f * t) for f in (523, 659, 784, 1046))
    return .12 * chord * np.minimum(1, t / .01) * np.exp(-t / .3)


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
m[-SR:] *= np.linspace(1, 0, SR)
music[:len(m)] = m

for at in SLAPS:
    put(fx, slap(), at)
for at in BUBBLES:
    put(fx, pop() * .7, at)
for at, f in BEEPS:
    put(fx, beep(f), at)
for at in TICKS:
    put(fx, tick(), at)
for at in WHOOSH:
    put(fx, whoosh() * (.5 if at == 0 else 1), at)
put(fx, tada(), 8.45)
put(fx, wink(), 22.22)

mix = voice / max(1e-6, np.abs(voice).max()) * .9 + music / max(1e-6, np.abs(music).max()) * .3 + fx * .22
mix /= max(1, np.abs(mix).max() / .97)
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print('ok', dst, round(len(mix) / SR, 2), 's')
