"""Bande son automatique d'un épisode « Devine son métier » : voix posées aux instants calculés par produire.mjs,
musique de jeu (bouclée si besoin), bruitages synthétisés (claques de papier, bips, tic-tac, bulles, souffles, accord).
Usage : python3 son.py timeline.json sortie.wav
timeline.json : {duree, musique, voix:[[fichier, instant]], cues:{claques, bulles, bips:[[t,f]], tics, souffles, tada, clin}}
"""
import json
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(11)


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
    return .55 * smooth(rng.standard_normal(t.size), 5) * np.exp(-t / .022) + .7 * np.sin(2 * np.pi * 92 * t) * np.exp(-t / .045)


def whoosh():
    t = env_t(.42)
    n = rng.standard_normal(t.size)
    return .5 * (smooth(n, 4) - smooth(n, 40)) * np.sin(np.pi * t / t[-1]) ** 2


def pop():
    t = env_t(.12)
    return .45 * np.sin(2 * np.pi * np.cumsum(np.linspace(900, 320, t.size)) / SR) * np.exp(-t / .03)


def beep(f):
    t = env_t(.16)
    return .3 * np.sin(2 * np.pi * f * t) * np.minimum(1, t / .005) * np.exp(-t / .07)


def tick():
    t = env_t(.03)
    return .22 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .006)


def tada():
    t = env_t(.9)
    return .12 * sum(np.sin(2 * np.pi * f * t) for f in (523, 659, 784, 1046)) * np.minimum(1, t / .01) * np.exp(-t / .3)


def wink():
    t = env_t(.18)
    return .18 * np.sin(2 * np.pi * 1320 * t) * np.exp(-t / .05)


def put(out, x, at):
    i = int(at * SR)
    x = x[:max(0, len(out) - i)]
    out[i:i + len(x)] += x


tl = json.load(open(sys.argv[1]))
dst = sys.argv[2]
n = int(tl['duree'] * SR)
voice, music, fx = np.zeros(n, np.float32), np.zeros(n, np.float32), np.zeros(n, np.float32)

fade = int(.012 * SR)
for path, at in tl['voix']:
    seg = load(path)
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    put(voice, seg, at)

m = load(tl['musique'])
if len(m) < n:
    m = np.tile(m, n // len(m) + 1)
m = m[:n]
m[-SR:] *= np.linspace(1, 0, SR)
music[:] = m

c = tl['cues']
for at in c['claques']:
    put(fx, slap(), at)
for at in c['bulles']:
    put(fx, pop() * .7, at)
for at, f in c['bips']:
    put(fx, beep(f), at)
for at in c['tics']:
    put(fx, tick(), at)
for at in c['souffles']:
    put(fx, whoosh() * (.5 if at == 0 else 1), at)
put(fx, tada(), c['tada'])
put(fx, wink(), c['clin'])

mix = voice / max(1e-6, np.abs(voice).max()) * .9 + music / max(1e-6, np.abs(music).max()) * .3 + fx * .22
mix /= max(1, np.abs(mix).max() / .97)
wavfile.write(dst, SR, (mix * 32767).astype(np.int16))
print('ok', dst, round(len(mix) / SR, 2), 's')
