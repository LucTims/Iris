"""Bande son de la vidéo « Le cahier de maman » (collage papier) : voix posée d'un bloc, musique douce,
bruitages de papier synthétisés (claques, bulle, cahier qui s'ouvre, envol des pages, souffles).
Usage : python3 collage-cahier-de-maman-son.py voix.mp3 musique.mp3 sortie.wav
"""
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 44100
DURATION = 21.0
VOICE_AT = 0.3
rng = np.random.default_rng(5)

SLAPS = [1.62, 2.14, 2.45, 3.02, 4.32, 5.84, 7.0, 8.42, 8.8, 10.16, 10.45, 11.0, 12.24, 12.5, 13.0, 13.9, 14.25,
         14.5, 14.8, 15.1, 15.4, 15.7, 16.1, 16.78, 17.25, 17.68, 18.0, 19.1]
SCRAPS = [3.95, 4.15, 4.35, 4.55, 4.75]   # petits papiers dans la bulle : claques plus légères
WHOOSH = [0.0, 2.85, 5.36, 9.4, 13.3, 16.7, 18.7]
POPS = [3.45, 3.55, 3.65, 3.72]
PAGES = [12.3 + k * .07 for k in range(9)]


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

m = load(music_path)[:n]
m[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR))
music[:len(m)] = m

for at in SLAPS:
    put(fx, slap(), at)
for at in SCRAPS:
    put(fx, slap() * .45, at)
for at in WHOOSH:
    put(fx, whoosh() * (.5 if at == 0 else 1), at)
for at in POPS:
    put(fx, pop() * .7, at)
for at in PAGES:
    put(fx, flip() * .8, at)
put(fx, flip(), 9.8)
put(fx, wink(), 18.32)

mix = voice / max(1e-6, np.abs(voice).max()) * .9 + music / max(1e-6, np.abs(music).max()) * .32 + fx * .22
mix /= max(1, np.abs(mix).max() / .97)
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print('ok', dst, round(len(mix) / SR, 2), 's')
