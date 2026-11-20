"""Makes the "Ft" app mark of Fresing ToolBox: drafts for the owner, the app icon, the tray icon and PNGs.

    python3 tools/make_icons.py            write everything below
    python3 tools/make_icons.py --check    fail if a written file differs from what the script makes

The F (stem and green swoosh) is the Fresing master outline, unchanged: its coordinates are those of the public
"Fr" app mark of Fresing Render (site/brand/fresing-render/fresing-render-app-icon.svg in smholte/CAD-render-animation,
"from Fresing logo rev 01"), which places the master F on the Fresing app-icon square. Only coordinates are taken;
this script is written for ToolBox (MIT).

The t is drawn new to the word mark's construction (task 0004, decided by the owner 18 Nov 2026): stems 35,
horizontal strokes 30, outer radius 52, inner radius 16, x-height 171 (master units), free stroke ends cut at 22.8°
from vertical (12.6 across a stroke of 30, as the r of the master), white letters, Fresing Green #479B29 swoosh, on
the rounded Deep Charcoal #1A2027 square of the Fresing app icon (same square, corner radius and padding).

Written (all under brand/ and app/icons/):
    brand/drafts/ft-draft-<name>.svg       each draft of the t, full size
    brand/drafts/ft-drafts.png             round 1 (A, B, C) at 256, 32, 24, 20 and 16 px, for the owner
    brand/drafts/ft-drafts-2.png           round 2 (A and five variations of it), the same way
    brand/drafts/ft-drafts-3.png           round 3 (A and six smaller steps away from it)
    brand/ft-app-icon.svg                  the chosen mark (CHOSEN below; a placeholder until the owner chooses)
    brand/ft-app-icon_<n>px.png            16 … 1024 px
    brand/fresing-toolbox.ico              16, 20, 24, 32, 40, 48, 64, 256 px – the app, the installer, shortcuts
    app/icons/tray.ico                     16, 20, 24, 32 px drawn on whole pixels – the tray on Windows
    app/icons/tray_<n>px.png               16, 20, 24, 32 px – the tray on other systems, and the tests
    app/icons/app_256px.png                the window icon
"""

import io
import math
import struct
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent

# The owner's choice of t (task 0004): A9, chosen 20 Nov 2026 after three rounds of drafts.
CHOSEN = "A9"   # the owner, 20 Nov 2026
PLACEHOLDER = "A"

GREEN = (0x47, 0x9B, 0x29, 255)
WHITE = (255, 255, 255, 255)
CHARCOAL = (0x1A, 0x20, 0x27, 255)

SQUARE = 512          # the app-icon square, in icon units
CORNER = 112          # its corner radius
PAD_X = 70            # padding left and right of the mark, as on the Fr mark
CUT = 12.6            # horizontal run of a 22.8° cut across a stroke of 30 (30 · tan 22.8°)
CUT_F = 14.7          # the same cut across the F's arm of 35
assert abs(math.degrees(math.atan(CUT / 30)) - 22.8) < 0.05
assert abs(math.degrees(math.atan(CUT_F / 35)) - 22.8) < 0.05

STEM, BAR, R_OUT, R_IN = 35, 30, 52, 16
X_TOP, BASE = 71, 242  # x-height line and baseline of the word mark (171 apart)


class Contour:
    """A closed outline of lines and circular arcs, in master units."""

    def __init__(self, x, y):
        self.start = (x, y)
        self.segs = []   # ("L", x, y) or ("A", cx, cy, r, x, y, sweep)
        self.at = (x, y)

    def line(self, x, y):
        self.segs.append(("L", x, y))
        self.at = (x, y)
        return self

    def arc(self, cx, cy, r, x, y, sweep):
        """Arc around (cx, cy) to (x, y); sweep 1 = clockwise on screen (y down), as in SVG."""
        self.segs.append(("A", cx, cy, r, x, y, sweep))
        self.at = (x, y)
        return self

    def svg(self):
        f = lambda v: ("%.3f" % v).rstrip("0").rstrip(".")
        d = ["M%s %s" % (f(self.start[0]), f(self.start[1]))]
        for s in self.segs:
            if s[0] == "L":
                d.append("L%s %s" % (f(s[1]), f(s[2])))
            else:
                _, cx, cy, r, x, y, sweep = s
                d.append("A%s %s 0 0 %d %s %s" % (f(r), f(r), sweep, f(x), f(y)))
        return " ".join(d) + " Z"

    def points(self, steps=24):
        pts = [self.start]
        at = self.start
        for s in self.segs:
            if s[0] == "L":
                at = (s[1], s[2])
                pts.append(at)
                continue
            _, cx, cy, r, x, y, sweep = s
            a0 = math.atan2(at[1] - cy, at[0] - cx)
            a1 = math.atan2(y - cy, x - cx)
            if sweep == 1 and a1 < a0:
                a1 += 2 * math.pi
            if sweep == 0 and a1 > a0:
                a1 -= 2 * math.pi
            for i in range(1, steps + 1):
                a = a0 + (a1 - a0) * i / steps
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
            at = (x, y)
        return pts


def f_mark():
    """The master F: green swoosh and white letter, unchanged."""
    swoosh = (Contour(0.087, 49).arc(52, 52, 52, 52, 0, 1).line(189.5, 0).line(172.7, 40).line(54.5, 40)
              .arc(54.5, 56, 16, 40.113, 49, 0))
    letter = (Contour(0, 60).line(38.5, 60).line(38.5, 102).line(166.5, 102).line(166.5 - CUT_F, 137)
              .line(38.5, 137).line(38.5, BASE).line(0, BASE))
    return swoosh, letter


# The three drafts of the t. L = left edge of the stem; top = top of the stem; left/right = how far the crossbar
# reaches past the stem at its top edge; foot = how far the foot reaches past the stem at its top edge.
DRAFTS = {
    "A": dict(name="A – crossbar both sides, top at the swoosh's lower edge",
              L=214, top=40, left=26, right=60, foot=58),
    "B": dict(name="B – crossbar to the right only, like the F's arm",
              L=196, top=40, left=0, right=84, foot=66),
    "C": dict(name="C – tall stem to the top of the swoosh, crossbar to the right",
              L=206, top=0, left=0, right=74, foot=56),
    # Round 2 (owner, 20 Nov 2026: "A is favourite so far, more drafts"): A's crossbar on both sides, varied.
    "A2": dict(name="A2 – as A, shorter crossbar and foot (lighter)",
               L=208, top=40, left=16, right=46, foot=46),
    "A3": dict(name="A3 – as A, taller stem (top 20 above the swoosh's lower edge)",
               L=214, top=20, left=26, right=60, foot=58),
    "A4": dict(name="A4 – as A, stem up to the top of the swoosh",
               L=214, top=0, left=26, right=60, foot=58),
    "A5": dict(name="A5 – as A, wider crossbar on both sides",
               L=226, top=40, left=40, right=74, foot=58),
    "A6": dict(name="A6 – as A, short crossbar, long foot",
               L=214, top=40, left=26, right=44, foot=70),
    # Round 3 (owner, 20 Nov 2026: "A still the best, more options"): small steps away from A itself.
    "A7": dict(name="A7 – as A, the t closer to the F",
               L=202, top=40, left=26, right=60, foot=58),
    "A8": dict(name="A8 – as A, more space between F and t",
               L=228, top=40, left=26, right=60, foot=58),
    "A9": dict(name="A9 – as A, crossbar and foot end exactly above each other",
               L=214, top=40, left=26, right=60, foot=60),
    "A10": dict(name="A10 – as A, crossbar the same length on both sides",
                L=222, top=40, left=40, right=40, foot=58),
    "A11": dict(name="A11 – as A, stem a little lower (top 10 below the swoosh's lower edge)",
                L=214, top=50, left=26, right=60, foot=58),
    "A12": dict(name="A12 – as A, stem a little higher (top 10 above the swoosh's lower edge)",
                L=214, top=30, left=26, right=60, foot=58),
}
ROUND_1 = ("A", "B", "C")
ROUND_2 = ("A", "A2", "A3", "A4", "A5", "A6")
ROUND_3 = ("A", "A7", "A8", "A9", "A10", "A11", "A12")


def t_mark(L, top, left, right, foot):
    R = L + STEM
    foot_top_end = R + foot              # the foot's top edge ends here; its lower edge CUT further left
    bar_bot = X_TOP + BAR
    foot_top = BASE - BAR
    c = Contour(L, top)
    if left:
        c.line(L, X_TOP).line(L - left, X_TOP).line(L - left - CUT, bar_bot).line(L, bar_bot)
    c.line(L, BASE - R_OUT).arc(L + R_OUT, BASE - R_OUT, R_OUT, L + R_OUT, BASE, 0)
    c.line(foot_top_end - CUT, BASE).line(foot_top_end, foot_top)
    c.line(R + R_IN, foot_top).arc(R + R_IN, foot_top - R_IN, R_IN, R, foot_top - R_IN, 1)
    c.line(R, bar_bot).line(R + right - CUT, bar_bot).line(R + right, X_TOP).line(R, X_TOP).line(R, top)
    return c


def mark(draft):
    swoosh, letter = f_mark()
    return [(GREEN, swoosh), (WHITE, letter), (WHITE, t_mark(**{k: v for k, v in DRAFTS[draft].items()
                                                              if k != "name"}))]


def bounds(shapes):
    xs = [p[0] for _, c in shapes for p in c.points()]
    ys = [p[1] for _, c in shapes for p in c.points()]
    return min(xs), min(ys), max(xs), max(ys)


def placement(shapes):
    """Scale and offset that put the mark on the square with the Fr mark's side padding, centred."""
    x0, y0, x1, y1 = bounds(shapes)
    s = (SQUARE - 2 * PAD_X) / (x1 - x0)
    return s, PAD_X - x0 * s, (SQUARE - (y1 - y0) * s) / 2 - y0 * s


def svg(draft, title):
    shapes = mark(draft)
    s, ox, oy = placement(shapes)
    paths = "\n".join('<path fill="#%02X%02X%02X" d="%s"/>' % (col[:3] + (c.svg(),)) for col, c in shapes)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!-- Fresing ToolBox app mark "Ft" · t draft %s · F from the Fresing master outline (logo rev 01) · '
            'made by tools/make_icons.py -->\n'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n'
            '<title>%s</title>\n'
            '<rect width="512" height="512" rx="%d" fill="#1A2027"/>\n'
            '<g transform="translate(%.3f %.3f) scale(%.6f)">\n%s\n</g>\n</svg>\n'
            % (draft, title, CORNER, ox, oy, s, paths))


# 16, 20 and 24 px are set by hand: each listed edge (master units) goes to the pixel border given, strokes at
# least 2 px and gaps at least 1 px; edges not listed (the inside of arcs) fall in between. 32 px and up: rounded.
_F_X = {16: {0: 2, 38.5: 4, 151.8: 7, 166.5: 8, 172.7: 8, 189.5: 9},
        20: {0: 3, 38.5: 5, 151.8: 9, 166.5: 10, 172.7: 10, 189.5: 11},
        24: {0: 3, 38.5: 6, 151.8: 11, 166.5: 12, 172.7: 12, 189.5: 13}}
_F_X_A = {16: {0: 2, 38.5: 4, 151.8: 6, 166.5: 7, 172.7: 8, 189.5: 9},
          20: {0: 3, 38.5: 5, 151.8: 8, 166.5: 9, 172.7: 10, 189.5: 11},
          24: {0: 3, 38.5: 6, 151.8: 10, 166.5: 11, 172.7: 11, 189.5: 13}}
_T_X = {"A": {16: {175.4: 8, 188: 9, 214: 10, 249: 12, 294.4: 13, 296.4: 13, 307: 14, 309: 14},
              20: {175.4: 10, 188: 11, 214: 12, 249: 14, 294.4: 16, 296.4: 16, 307: 17, 309: 17},
              24: {175.4: 12, 188: 13, 214: 14, 249: 17, 294.4: 19, 296.4: 20, 307: 20, 309: 21}},
        "B": {16: {196: 9, 231: 11, 284.4: 12, 297: 13, 302.4: 13, 315: 14},
              20: {196: 11, 231: 13, 284.4: 15, 297: 16, 302.4: 16, 315: 17},
              24: {196: 13, 231: 16, 284.4: 19, 297: 20, 302.4: 20, 315: 21}}}
_T_X["C"] = {16: {189.5: 8, 206: 9, 241: 11, 284.4: 12, 297: 13, 302.4: 13, 315: 14},   # the swoosh stops one
             20: {189.5: 10, 206: 11, 241: 13, 284.4: 15, 297: 16, 302.4: 16, 315: 17},  # pixel short of the
             24: {189.5: 12, 206: 13, 241: 16, 284.4: 19, 297: 20, 302.4: 20, 315: 21}}  # tall stem
_Y = {16: {0: 3, 40: 5, 49: 5, 60: 6, 71: 6, 101: 8, 102: 8, 137: 10, 212: 11, 242: 13},
      20: {0: 4, 40: 6, 49: 6, 60: 7, 71: 8, 101: 10, 102: 10, 137: 12, 212: 14, 242: 16},
      24: {0: 5, 40: 7, 49: 7, 60: 8, 71: 9, 101: 11, 102: 11, 137: 13, 212: 17, 242: 19}}
HAND_SET = (16, 20, 24)


_STEM_PX = {16: (10, 12), 20: (12, 14), 24: (14, 17)}   # the t's stem at the small sizes, as in A
_MAX_LEFT_PX = {16: 1, 20: 2, 24: 3}                    # so the crossbar never reaches the F's arm


def _t_rule(draft, size):
    """Small-size edges of a t with a crossbar on both sides (round 2), by the same rules as A's table: the stem
    where A has it, each bar end its own length rounded (at least 1 px left, 2 px right), every cut 1 px."""
    d = DRAFTS[draft]
    s, _, _ = placement(mark(draft))
    kpx = s * size / SQUARE
    L, R = d["L"], d["L"] + STEM
    lp, rp = _STEM_PX[size]
    out = {L: lp, R: rp}
    if d["left"]:
        top = lp - min(_MAX_LEFT_PX[size], max(1, round(d["left"] * kpx)))
        out.update({L - d["left"]: top, L - d["left"] - CUT: top - 1})
    bar = rp + max(2, round(d["right"] * kpx))
    foot = rp + max(2, round(d["foot"] * kpx))
    if abs(d["right"] - d["foot"]) < CUT:     # ends this close in the outline end in the same pixel column
        foot = bar
    elif d["right"] > d["foot"]:              # otherwise the longer one stays at least a pixel longer
        bar = max(bar, foot + 1)
    else:
        foot = max(foot, bar + 1)
    out.update({R + d["right"]: bar, R + d["right"] - CUT: bar - 1, R + d["foot"]: foot, R + d["foot"] - CUT: foot - 1})
    return out


def hand_stops(draft, size):
    """Small-size edges: one map for the F, one for the t (so the t's crossbar can pass under the swoosh's end), one
    for the heights."""
    fx = dict(_F_X[size] if draft in ("B", "C") else _F_X_A[size])
    if draft in _T_X:
        tx = dict(_T_X[draft][size])
        if 189.5 in tx:                      # C moves the swoosh's end, not the t
            fx[189.5] = tx.pop(189.5)
            fx[172.7] = min(fx[172.7], fx[189.5])
    else:
        tx = _t_rule(draft, size)
    return fx, tx, dict(_Y[size])


def snap_map(stops, scale, offset):
    """A piecewise-linear map through the given (value -> pixel) stops; straight on beyond them."""
    out = sorted(stops.items())
    assert all(b[1] >= a[1] for a, b in zip(out, out[1:])), "stops out of order"

    def m(v):
        if v <= out[0][0]:
            return out[0][1] + (v - out[0][0]) * scale
        for (a, pa), (b, pb) in zip(out, out[1:]):
            if v <= b:
                return pa + (pb - pa) * (v - a) / (b - a)
        return out[-1][1] + (v - out[-1][0]) * scale
    return m


def edges(shapes):
    xs, ys = set(), set()
    for _, c in shapes:
        pts = [c.start] + [(s[1], s[2]) if s[0] == "L" else (s[4], s[5]) for s in c.segs]
        for x, y in pts:
            xs.add(x)
            ys.add(y)
    return xs, ys


def render(draft, size, whole_pixels=False):
    """The icon at size × size px. whole_pixels: every straight edge of the mark lands on a pixel border."""
    shapes = mark(draft)
    s, ox, oy = placement(shapes)
    k = size / SQUARE
    if whole_pixels and size in HAND_SET:
        fx, tx, ys = hand_stops(draft, size)
        maps = [snap_map(fx, s * k, ox * k)] * 2 + [snap_map(tx, s * k, ox * k)]
        my = snap_map(ys, s * k, oy * k)
    elif whole_pixels:
        xs, ys = edges(shapes)
        maps = [snap_map({v: round(v * s * k + ox * k) for v in xs}, s * k, ox * k)] * 3
        my = snap_map({v: round(v * s * k + oy * k) for v in ys}, s * k, oy * k)
    else:
        maps = [lambda v: v * s * k + ox * k] * 3
        my = lambda v: v * s * k + oy * k
    ss = 16 if size <= 64 else 4          # supersampling
    img = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = CORNER * k * ss
    if whole_pixels:
        r = round(CORNER * k) * ss
    d.rounded_rectangle((0, 0, size * ss - 1, size * ss - 1), radius=r, fill=CHARCOAL)
    for (col, c), mx in zip(shapes, maps):
        d.polygon([(mx(x) * ss, my(y) * ss) for x, y in c.points()], fill=col)
    return img.resize((size, size), Image.Resampling.BOX)


def png_bytes(img):
    b = io.BytesIO()
    img.save(b, "PNG", optimize=False)
    return b.getvalue()


def ico_bytes(images):
    """A Windows .ico: 32-bit BMP entries below 256 px (every tool reads those), PNG for 256 px."""
    blobs = []
    for img in images:
        w, h = img.size
        if w >= 256:
            blobs.append(png_bytes(img))
            continue
        px = img.convert("RGBA").tobytes()
        rows = []
        for y in range(h - 1, -1, -1):                 # bottom-up, BGRA
            row = px[y * w * 4:(y + 1) * w * 4]
            rows.append(b"".join(bytes((row[i + 2], row[i + 1], row[i], row[i + 3])) for i in range(0, len(row), 4)))
        mask_row = ((w + 31) // 32) * 4
        header = struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0, 0, 0, 0, 0, 0)
        blobs.append(header + b"".join(rows) + b"\0" * (mask_row * h))
    out = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    for img, blob in zip(images, blobs):
        w, h = img.size
        out += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
    return out + b"".join(blobs)


def drafts_sheet(drafts):
    """The drafts, three to a row, large and at the small sizes, for the owner to choose from."""
    pad = 24
    col_w = 256 + 2 * pad
    smalls = (32, 24, 20, 16)
    h = pad + 256 + pad + 32 * 3 + pad + 40
    rows = (len(drafts) + 2) // 3
    sheet = Image.new("RGBA", (col_w * 3, h * rows), (240, 240, 240, 255))
    for i, draft in enumerate(drafts):
        x0 = (i % 3) * col_w + pad
        y0 = (i // 3) * h
        sheet.alpha_composite(render(draft, 256), (x0, y0 + pad))
        x = x0
        y = y0 + pad + 256 + pad
        for n in smalls:                       # actual size …
            sheet.alpha_composite(render(draft, n, whole_pixels=True), (x, y + 32 - n))
            x += n + 10
        x = x0
        y += 32 + 8
        for n in smalls[1:]:                   # … and blown up 3 ×, to see the pixels
            big = render(draft, n, whole_pixels=True).resize((n * 3, n * 3), Image.Resampling.NEAREST)
            sheet.alpha_composite(big, (x, y))
            x += n * 3 + 8
        d = ImageDraw.Draw(sheet)
        d.text((x0, y0 + h - 30), "Draft " + draft, fill=(26, 32, 39, 255))
    return sheet


def outputs():
    chosen = CHOSEN or PLACEHOLDER
    files = {}
    for draft in DRAFTS:
        files["brand/drafts/ft-draft-%s.svg" % draft] = svg(draft, "Fresing ToolBox – draft " + DRAFTS[draft]["name"]).encode()
    files["brand/drafts/ft-drafts.png"] = png_bytes(drafts_sheet(ROUND_1))
    files["brand/drafts/ft-drafts-2.png"] = png_bytes(drafts_sheet(ROUND_2))
    files["brand/drafts/ft-drafts-3.png"] = png_bytes(drafts_sheet(ROUND_3))
    title = "Fresing ToolBox" + ("" if CHOSEN else " (placeholder: draft %s until the owner chooses)" % chosen)
    files["brand/ft-app-icon.svg"] = svg(chosen, title).encode()
    for n in (16, 24, 32, 48, 64, 128, 256, 512, 1024):
        files["brand/ft-app-icon_%dpx.png" % n] = png_bytes(render(chosen, n, whole_pixels=n <= 32))
    ico = [render(chosen, n, whole_pixels=n <= 32) for n in (16, 20, 24, 32, 40, 48, 64, 256)]
    files["brand/fresing-toolbox.ico"] = ico_bytes(ico)
    tray = [render(chosen, n, whole_pixels=True) for n in (16, 20, 24, 32)]
    files["app/icons/tray.ico"] = ico_bytes(tray)
    for img in tray:
        files["app/icons/tray_%dpx.png" % img.size[0]] = png_bytes(img)
    files["app/icons/app_256px.png"] = png_bytes(render(chosen, 256))
    return files


def main(argv):
    check = "--check" in argv
    bad = []
    for rel, data in outputs().items():
        p = ROOT / rel
        if check:
            if not p.exists() or p.read_bytes() != data:
                bad.append(rel)
            continue
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    if bad:
        print("Out of date (run python3 tools/make_icons.py):\n  " + "\n  ".join(bad))
        return 1
    print("Icons up to date." if check else "Icons written.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
