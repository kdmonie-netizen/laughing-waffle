"""Draws desktop\\gps_conditions.ico (run once; needs Pillow, a dev-only tool).

The picture matches the page's logo: a green-yellow-red ring (the A-F grade)
around a dark disc with a white satellite-signal mark.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).with_name("gps_conditions.ico")
S = 256


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ring_colour(angle):
    # green -> yellow -> red -> green around the circle, like the page logo
    stops = [(0.0, (34, 197, 94)), (1 / 3, (234, 179, 8)), (2 / 3, (239, 68, 68)), (1.0, (34, 197, 94))]
    t = (angle % 360) / 360
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            return lerp(c0, c1, (t - t0) / (t1 - t0))
    return stops[-1][1]


def draw(size):
    big = size * 4
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    px = img.load()
    c = big / 2
    r_out, r_in = big * 0.48, big * 0.36
    for y in range(big):
        for x in range(big):
            d = math.hypot(x - c, y - c)
            if d <= r_out:
                if d >= r_in:
                    px[x, y] = ring_colour(math.degrees(math.atan2(y - c, x - c)) + 90) + (255,)
                else:
                    px[x, y] = (10, 14, 23, 255)
    g = ImageDraw.Draw(img)
    w = max(4, round(big * 0.045))
    # signal arcs over a dot (receiver)
    for k, rr in enumerate((0.11, 0.19, 0.27)):
        box = [c - big * rr, c + big * 0.06 - big * rr, c + big * rr, c + big * 0.06 + big * rr]
        g.arc(box, 215, 325, fill=(230, 235, 243, 255), width=w)
    dot = big * 0.055
    g.ellipse([c - dot, c + big * 0.06 - dot, c + dot, c + big * 0.06 + dot], fill=(90, 176, 255, 255))
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    base = draw(S)
    base.save(OUT, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    base.save(OUT.with_suffix(".png"))
    print("wrote", OUT)
