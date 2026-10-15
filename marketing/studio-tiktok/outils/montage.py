"""Montage d'une vidéo TikTok Iris (9:16) à partir d'un fichier spec.json.

Usage (sandbox Higgsfield) : python3 montage.py <spec.json> <dossier-habillage> <sortie.mp4>

La voix off est transcrite (faster-whisper) puis alignée sur le texte écrit
pour caler les sous-titres et les changements de plan au mot près.
"""
import difflib
import json
import subprocess
import sys
import unicodedata

from faster_whisper import WhisperModel

spec_path, ov, out = sys.argv[1:4]
spec = json.load(open(spec_path))
CH = [c["text"] for c in spec["chunks"]]
audio = spec["voice_audio"]
N = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=25,format=yuv420p"


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if c.isalpha())


def align():
    """Heure de début de chaque morceau de sous-titre, alignée lettre à lettre."""
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(audio, language="fr", word_timestamps=True)
    heard, times = "", []
    for s in segs:
        for w in s.words:
            n = norm(w.word)
            for k, c in enumerate(n):
                heard += c
                times.append(w.start + (w.end - w.start) * k / max(len(n), 1))
    written, owner = "", []
    for i, c in enumerate(CH):
        n = norm(c)
        written += n
        owner += [i] * len(n)
    t = [None] * len(written)
    for a, b, size in difflib.SequenceMatcher(None, written, heard, autojunk=False).get_matching_blocks():
        for k in range(size):
            t[a + k] = times[b + k]
    starts = []
    for i in range(len(CH)):
        hit = [t[j] for j, o in enumerate(owner) if o == i and t[j] is not None]
        starts.append(hit[0] if hit else (starts[-1] + 0.6 if starts else 0.0))
    starts[0] = 0.0
    return starts


dur = float(subprocess.check_output(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]))
st = align()
END_AUDIO = dur + 0.3
ENDCARD = 2.5
TOTAL = END_AUDIO + ENDCARD

# Plans : chacun commence au morceau de sous-titre « from » et dure jusqu'au plan suivant.
scenes = spec["scenes"]
inputs, filt = [], []
for k, sc in enumerate(scenes):
    t0 = st[sc["from"]]
    t1 = st[scenes[k + 1]["from"]] if k + 1 < len(scenes) else END_AUDIO
    d = t1 - t0
    if sc["type"] == "video":
        inputs += ["-ss", str(sc.get("offset", 0)), "-i", sc["src"]]
        filt.append(f"[{k}:v]{N},tpad=stop_mode=clone:stop_duration=30,trim=duration={d:.3f},setpts=PTS-STARTPTS[s{k}]")
    else:  # image fixe animée par un zoom lent, alterné avant/arrière
        inputs += ["-loop", "1", "-framerate", "25", "-t", f"{d:.3f}", "-i", sc["src"]]
        z = "1.0+0.0016*on" if k % 2 else "1.10-0.0016*on"
        filt.append(f"[{k}:v]scale=1296:2316:force_original_aspect_ratio=increase,crop=1296:2316,"
                    f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=25,"
                    f"setsar=1,format=yuv420p,trim=duration={d:.3f},setpts=PTS-STARTPTS[s{k}]")
n = len(scenes)
inputs += ["-loop", "1", "-framerate", "25", "-t", str(ENDCARD), "-i", f"{ov}/end.png"]
filt.append(f"[{n}:v]{N},fade=t=in:st=0:d=0.35[s{n}]")
filt.append("".join(f"[s{k}]" for k in range(n + 1)) + f"concat=n={n + 1}:v=1:a=0[base]")

# Habillage : l'accroche couvre les premiers morceaux, puis les sous-titres prennent le relais.
first_cap = spec.get("hook", {}).get("until", 0)
over = []
if "hook" in spec:
    over.append(("hook.png", 0, st[first_cap] - 0.05))
if "badge" in spec:
    over.append(("badge.png", st[spec["badge"].get("from", 0)], st[spec["badge"].get("until", len(CH) - 1)]))
for i in range(first_cap, len(CH)):
    over.append((f"cap{i}.png", st[i], st[i + 1] - 0.03 if i + 1 < len(CH) else END_AUDIO))
idx, cur = n + 1, "base"
for j, (png, s, e) in enumerate(over):
    inputs += ["-i", f"{ov}/{png}"]
    filt.append(f"[{cur}][{idx}:v]overlay=0:0:enable='between(t,{s:.3f},{e:.3f})'[o{j}]")
    cur, idx = f"o{j}", idx + 1
inputs += ["-i", audio]
filt.append(f"[{idx}:a]aresample=48000,apad,atrim=0:{TOTAL:.3f}[aout]")

subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filt),
                "-map", f"[{cur}]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                "-t", f"{TOTAL:.3f}", out], check=True)
print(f"montage ok {out} {TOTAL:.1f}s")
