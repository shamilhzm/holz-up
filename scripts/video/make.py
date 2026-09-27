"""Composites captions and cards over the recorded frames, dissolves between scenes, adds the
soundtrack and encodes an H.264/AAC MP4.

Usage: python scripts/video/make.py [outDir]   -> <outDir>/holz-up.mp4
Needs: numpy, pillow, imageio-ffmpeg (for its bundled ffmpeg).
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "video-out")
tl = json.loads((OUT / "timeline.json").read_text())
man = json.loads((OUT / "cards" / "manifest.json").read_text())
FPS, W, H = tl["fps"], tl["width"], tl["height"]
FADE = round(0.35 * FPS)  # captions and cards
XF = 8  # dissolve between scenes, frames
OPEN, CLOSE = 12, 36  # fade in from / out to black, frames

# Global frame -> recorded file, and the dissolves from each scene's last frame into the next.
files = []
for sc in tl["scenes"]:
    d = OUT / "scenes" / sc["name"] / "frames"
    files += [d / f"{i:05d}.jpg" for i in range(sc["end"] - sc["start"])]
dissolve = {}
for sc in tl["scenes"][1:]:
    for k in range(XF):
        dissolve[sc["start"] + k] = (files[sc["start"] - 1], (k + 1) / (XF + 1))

overlays = []
for item in man["captions"] + man["cards"]:
    img = Image.open(OUT / "cards" / item["file"]).convert("RGBA")
    overlays.append((item["start"], item["end"], img, img.getchannel("A")))


def alpha_at(frame: int, start: int, end: int) -> float:
    if frame < start or frame >= end:
        return 0.0
    return min(1.0, (frame - start + 1) / FADE, (end - frame) / FADE)


ffmpeg = subprocess.Popen(
    [
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(OUT / "sound.wav"),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-tune", "animation",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
        str(OUT / "holz-up.mp4"),
    ],
    stdin=subprocess.PIPE,
)
black = Image.new("RGBA", (W, H), (0, 0, 0, 255))
for f in range(tl["frames"]):
    frame = Image.open(files[f]).convert("RGBA")
    if f in dissolve:
        src, a = dissolve[f]
        frame = Image.blend(Image.open(src).convert("RGBA"), frame, a)
    for start, end, img, alpha in overlays:
        a = alpha_at(f, start, end)
        if a <= 0:
            continue
        layer = img if a >= 1 else Image.merge("RGBA", (*img.split()[:3], alpha.point(lambda v, a=a: int(v * a))))
        frame.alpha_composite(layer)
    fade = min(1.0, (f + 1) / OPEN, (tl["frames"] - f) / CLOSE)
    if fade < 1:
        frame = Image.blend(black, frame, fade)
    ffmpeg.stdin.write(frame.convert("RGB").tobytes())
    if f % 240 == 0:
        print(f"  frame {f}/{tl['frames']}", flush=True)
ffmpeg.stdin.close()
if ffmpeg.wait() != 0:
    sys.exit("ffmpeg failed")
print(f"wrote {OUT / 'holz-up.mp4'}")
