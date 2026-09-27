"""Synthesizes the soundtrack for a recorded timeline: workshop sounds on the recorded cues
plus a quiet warm pad. No samples, only numpy.

Usage: python scripts/video/sound.py [outDir]   -> <outDir>/sound.wav
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "video-out")
tl = json.loads((OUT / "timeline.json").read_text())
SR = 48000
FPS = tl["fps"]
N = int(tl["frames"] / FPS * SR) + SR
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def at(frame: float) -> int:
    return int(frame / FPS * SR)


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def band_noise(n: int, lo: float, hi: float) -> np.ndarray:
    """White noise shaped to a smooth band between lo and hi Hz."""
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR) + 1
    centre = np.sqrt(lo * hi)
    width = np.log(hi / lo) / 2
    X *= np.exp(-0.5 * ((np.log(f) - np.log(centre)) / width) ** 2)
    y = np.fft.irfft(X, n)
    return y / (np.abs(y).max() + 1e-9)


def add(sig: np.ndarray, start: int, gain: float = 1.0, pan: float = 0.0) -> None:
    """Mix a mono signal in at `start` with constant-power panning (-1 left … 1 right)."""
    if start >= N:
        return
    s = sig[: N - start] * gain
    a = (pan + 1) * np.pi / 4
    L[start : start + len(s)] += s * np.cos(a)
    R[start : start + len(s)] += s * np.sin(a)


def click() -> np.ndarray:
    t = t_axis(0.012)
    return band_noise(len(t), 2500, 7000) * np.exp(-t / 0.0022)


def knock(v: float) -> np.ndarray:
    t = t_axis(0.22)
    body = band_noise(len(t), 220, 900) * np.exp(-t / 0.028)
    thump = np.sin(2 * np.pi * 135 * t) * np.exp(-t / 0.05)
    return (body * 0.8 + thump * 0.6) * v


def stone() -> np.ndarray:
    t = t_axis(0.16)
    clack = band_noise(len(t), 1300, 4200) * np.exp(-t / 0.011)
    second = np.zeros_like(t)
    k = int(0.034 * SR)
    second[k:] = clack[: len(t) - k] * 0.45
    thud = np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.03) * 0.5
    return clack + second + thud


def clamp() -> np.ndarray:
    t = t_axis(0.3)
    out = np.zeros_like(t)
    tick = band_noise(int(0.008 * SR), 3000, 8000) * np.exp(-t_axis(0.008) / 0.0018)
    for i in range(4):
        k = int(i * 0.065 * SR)
        out[k : k + len(tick)] += tick * (1 - i * 0.15)
    return out


def ding() -> np.ndarray:
    t = t_axis(1.3)
    env = lambda d: np.exp(-t / d) * np.minimum(1, t / 0.004)
    note = lambda f: np.sin(2 * np.pi * f * t) * env(0.55) + 0.35 * np.sin(2 * np.pi * 3 * f * t) * env(0.12)
    out = note(659.25)
    k = int(0.13 * SR)
    out[k:] += note(987.77)[: len(t) - k] * 0.8
    return out


def slide(v: float) -> np.ndarray:
    t = t_axis(1.1)
    env = np.sin(np.pi * np.clip(t / 1.1, 0, 1)) ** 2
    return band_noise(len(t), 140, 650) * env * v


# ----- cues -----
saw_speed = np.zeros(tl["frames"] + 2)
for c in tl["cues"]:
    s = at(c["frame"])
    kind, v = c["type"], c.get("value", 1)
    if kind == "click":
        add(click(), s, 0.10, 0.1)
    elif kind == "knock":
        add(knock(v), s, 0.55, -0.05)
    elif kind == "stone":
        add(stone(), s, 0.32, 0.25)
    elif kind == "clamp":
        add(clamp(), s, 0.22, -0.2)
    elif kind == "ding":
        add(ding(), s, 0.16, 0)
    elif kind == "slide":
        add(slide(v), s, 0.20, 0)
    elif kind == "saw":
        saw_speed[c["frame"]] = max(saw_speed[c["frame"]], v)

# Saw: raspy band noise, loudness following the stroke speed, pulsing with the teeth.
if saw_speed.any():
    frames = np.nonzero(saw_speed)[0]
    a, b = at(frames[0] - 2), at(frames[-1] + 3)
    t = np.arange(b - a) / SR
    speed = np.interp(a / SR + t, np.arange(len(saw_speed)) / FPS, saw_speed)
    env = np.clip(speed / 22, 0, 1) ** 0.8
    teeth = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 38 * t))
    rasp = band_noise(len(t), 1800, 6500) * teeth + 0.45 * band_noise(len(t), 500, 1500)
    add(rasp * env, a, 0.45, 0.15)

# ----- pad: slow warm chords -----
def hz(note: str) -> float:
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    semis = names[note[0]] + (-1 if "b" in note else 0) + 12 * (int(note[-1]) - 4)
    return 440 * 2 ** (semis / 12)


CHORDS = [
    ["F2", "C3", "A3", "E4", "G4"],
    ["A2", "E3", "G3", "C4", "E4"],
    ["D3", "A3", "C4", "E4", "F4"],
    ["Bb2", "F3", "A3", "D4", "F4"],
]
CHORD_S = 4.0
total = N / SR
pad_l = np.zeros(N)
pad_r = np.zeros(N)
for i in range(int(total / CHORD_S) + 1):
    start = int(i * CHORD_S * SR)
    dur = CHORD_S + 2.0
    t = t_axis(dur)
    env = np.minimum(1, t / 1.3) * np.clip((dur - t) / 1.8, 0, 1)
    for n in CHORDS[i % len(CHORDS)]:
        f = hz(n)
        for side, det in ((pad_l, 0.9986), (pad_r, 1.0014)):
            tone = np.sin(2 * np.pi * f * det * t) + 0.22 * np.sin(2 * np.pi * 2 * f * det * t) + 0.06 * np.sin(2 * np.pi * 3 * f * t)
            seg = tone * env * 0.010
            end = min(N, start + len(seg))
            side[start:end] += seg[: end - start]
fade = np.ones(N)
fade[: 2 * SR] = np.linspace(0, 1, 2 * SR)
tail = int(3 * SR)
end_sample = int(tl["frames"] / FPS * SR)
fade[end_sample - tail : end_sample] = np.linspace(1, 0, tail)
fade[end_sample:] = 0
L += pad_l * fade
R += pad_r * fade

mix = np.stack([L, R], axis=1)[:end_sample]
# Loudness: bring the mix to about -19 dBFS RMS, then round off the few peaks (knocks) softly.
mix *= 10 ** (-19 / 20) / max(1e-9, np.sqrt((mix**2).mean()))
mix = np.tanh(mix / 0.89) * 0.89
pcm = (mix * 32767).astype("<i2")
with wave.open(str(OUT / "sound.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"sound.wav: {len(pcm) / SR:.1f} s, {len(tl['cues'])} cues")
