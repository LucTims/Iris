"""Horodatage mot à mot d'une voix off (faster-whisper, français), pour caler l'animation sur la voix.
Usage : python3 mots.py voix1.mp3 [voix2.mp3 …]  → écrit voixN.mp3.words.json et affiche « mot@seconde ».
"""
import json
import sys
from faster_whisper import WhisperModel

m = WhisperModel("small", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    segs, _ = m.transcribe(f, language="fr", word_timestamps=True)
    ws = [(round(w.start, 2), round(w.end, 2), w.word.strip()) for s in segs for w in s.words]
    json.dump(ws, open(f + ".words.json", "w"))
    print(f, " ".join(f"{w[2]}@{w[0]}" for w in ws))
