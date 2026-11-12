"""Construit voix.json (format ElevenLabs with-timestamps) à partir d'une prise mp3 et du texte, via faster-whisper.
Usage : python3 aligner.py voix.mp3 "texte exact" sortie.json"""
import base64, difflib, json, re, sys, unicodedata
from faster_whisper import WhisperModel

mp3, texte, dst = sys.argv[1:4]
m = WhisperModel('small', device='cpu', compute_type='int8')
import subprocess, numpy as np
pcm = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',mp3,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True,check=True).stdout, np.float32)
segs, _ = m.transcribe(pcm, language='fr', word_timestamps=True)
heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
norm = lambda x: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', x.lower()).encode('ascii', 'ignore').decode())
mots = [(mo.group(), mo.start()) for mo in re.finditer(r"\S+", texte)]
# Une apostrophe colle deux mots chez Whisper ou non : on compare mot à mot, au mieux.
sm = difflib.SequenceMatcher(a=[norm(w) for w, _ in mots], b=[norm(h[0]) for h in heard], autojunk=False)
t_mot = [None] * len(mots)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        t_mot[a + k] = heard[b + k][1:]
# Mots non reconnus : interpolés entre voisins.
for i in range(len(mots)):
    if t_mot[i] is None:
        prev = next((t_mot[j] for j in range(i - 1, -1, -1) if t_mot[j]), (0, 0))
        nxt = next((t_mot[j] for j in range(i + 1, len(mots)) if t_mot[j]), (prev[1] + .3, prev[1] + .6))
        t_mot[i] = (prev[1], nxt[0])
starts = [0.0] * len(texte); ends = [0.0] * len(texte)
for (w, pos), (a, b) in zip(mots, t_mot):
    for k in range(len(w)):
        starts[pos + k] = a + (b - a) * k / len(w); ends[pos + k] = b
for i in range(len(texte)):
    if texte[i] == ' ':
        starts[i] = ends[i] = ends[i - 1] if i else 0
print('reconnu :', ' '.join(h[0] for h in heard))
print([(w, round(t[0], 2)) for (w, _), t in zip(mots, t_mot)])
json.dump({'audio_base64': base64.b64encode(open(mp3, 'rb').read()).decode(),
           'alignment': {'characters': list(texte), 'character_start_times_seconds': starts,
                         'character_end_times_seconds': ends}}, open(dst, 'w'))
