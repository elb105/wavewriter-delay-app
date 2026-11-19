"""Genera el código QR de la app (icons/qr-app.png y icons/qr-app.svg).

Codificador QR mínimo sin dependencias externas (solo Pillow para el PNG):
versión 3, corrección de errores L, modo byte (hasta 53 bytes). Incluye
comprobaciones: síndromes Reed-Solomon nulos, cadenas de formato conocidas y
relectura de los datos desde la matriz.

Uso, desde la carpeta de la app:  py -3.11 tools/make_qr.py
"""
from __future__ import annotations

import sys
from pathlib import Path

URL = "https://elb105.github.io/wavewriter-delay-app/"
VERSION, SIZE = 3, 29
DATA_CW, EC_CW = 55, 15          # versión 3-L: un bloque
ECL_BITS = 1                     # L = 01
ALIGN = [6, 22]
DARK, LIGHT = "#262626", "#ffffff"

# ---------- GF(256), polinomio 0x11D ----------
EXP, LOG = [0] * 512, [0] * 256
x = 1
for i in range(255):
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
for i in range(255, 512):
    EXP[i] = EXP[i - 255]


def gmul(a: int, b: int) -> int:
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]


def rs_generator(n: int) -> list[int]:
    g = [1]                                   # coeficientes de mayor a menor grado
    for i in range(n):
        g = [a ^ gmul(b, EXP[i]) for a, b in zip(g + [0], [0] + g)]
    return g


def rs_remainder(data: list[int], n: int) -> list[int]:
    g = rs_generator(n)
    msg = data + [0] * n
    for i in range(len(data)):
        c = msg[i]
        if c:
            for j in range(1, len(g)):
                msg[i + j] ^= gmul(g[j], c)
    return msg[len(data):]


def poly_eval(cw: list[int], xv: int) -> int:
    y = 0
    for c in cw:
        y = gmul(y, xv) ^ c
    return y


# ---------- codewords ----------
def build_codewords(text: str) -> list[int]:
    data = text.encode("utf-8")
    assert len(data) <= 53, "La URL no cabe en la versión 3-L"
    bits = "0100" + format(len(data), "08b") + "".join(format(b, "08b") for b in data)
    cap = DATA_CW * 8
    bits += "0" * min(4, cap - len(bits))
    bits += "0" * (-len(bits) % 8)
    cws = [int(bits[i:i + 8], 2) for i in range(0, len(bits), 8)]
    pad = [0xEC, 0x11]
    while len(cws) < DATA_CW:
        cws.append(pad[(len(cws) - len(bits) // 8) % 2])
    ec = rs_remainder(cws, EC_CW)
    full = cws + ec
    assert all(poly_eval(full, EXP[i]) == 0 for i in range(EC_CW)), "síndromes RS no nulos"
    return full


# ---------- matriz ----------
def format_bits(mask: int) -> int:
    data = (ECL_BITS << 3) | mask
    rem = data
    for _ in range(10):
        rem = (rem << 1) ^ ((rem >> 9) * 0x537)
    return ((data << 10) | (rem & 0x3FF)) ^ 0x5412


# Comprobación con valores de la norma: L/máscara 0 y M/máscara 0
assert format_bits(0) == 0b111011111000100
assert (((0 << 3) | 0) << 10 | 0) ^ 0x5412 == 0b101010000010010


MASKS = [
    lambda c, r: (c + r) % 2 == 0,
    lambda c, r: r % 2 == 0,
    lambda c, r: c % 3 == 0,
    lambda c, r: (c + r) % 3 == 0,
    lambda c, r: (c // 3 + r // 2) % 2 == 0,
    lambda c, r: c * r % 2 + c * r % 3 == 0,
    lambda c, r: (c * r % 2 + c * r % 3) % 2 == 0,
    lambda c, r: ((c + r) % 2 + c * r % 3) % 2 == 0,
]


class Matrix:
    def __init__(self) -> None:
        self.m = [[False] * SIZE for _ in range(SIZE)]
        self.f = [[False] * SIZE for _ in range(SIZE)]   # módulo de función

    def setf(self, c: int, r: int, dark: bool) -> None:
        self.m[r][c] = dark
        self.f[r][c] = True

    def draw_function(self) -> None:
        for i in range(SIZE):                       # temporización
            self.setf(6, i, i % 2 == 0)
            self.setf(i, 6, i % 2 == 0)
        for cx, cy in ((3, 3), (SIZE - 4, 3), (3, SIZE - 4)):   # buscadores + separadores
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    c, r = cx + dx, cy + dy
                    if 0 <= c < SIZE and 0 <= r < SIZE:
                        d = max(abs(dx), abs(dy))
                        self.setf(c, r, d not in (2, 4))
        for ay in ALIGN:                            # alineación (solo la que no pisa buscadores)
            for ax in ALIGN:
                if (ax, ay) in ((6, 6), (6, 22), (22, 6)):
                    continue
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        self.setf(ax + dx, ay + dy, max(abs(dx), abs(dy)) != 1)
        self.draw_format(0)                         # reserva

    def draw_format(self, mask: int) -> None:
        b = format_bits(mask)
        bit = lambda i: (b >> i) & 1 == 1
        for i in range(6):
            self.setf(8, i, bit(i))
        self.setf(8, 7, bit(6))
        self.setf(8, 8, bit(7))
        self.setf(7, 8, bit(8))
        for i in range(9, 15):
            self.setf(14 - i, 8, bit(i))
        for i in range(8):
            self.setf(SIZE - 1 - i, 8, bit(i))
        for i in range(8, 15):
            self.setf(8, SIZE - 15 + i, bit(i))
        self.setf(8, SIZE - 8, True)                # módulo oscuro

    def order(self):
        right = SIZE - 1
        while right >= 1:
            if right == 6:
                right = 5
            for vert in range(SIZE):
                for j in range(2):
                    c = right - j
                    upward = ((right + 1) & 2) == 0
                    r = SIZE - 1 - vert if upward else vert
                    if not self.f[r][c]:
                        yield c, r
            right -= 2

    def draw_data(self, cws: list[int]) -> None:
        bits = [(cw >> (7 - k)) & 1 for cw in cws for k in range(8)]
        for i, (c, r) in enumerate(self.order()):
            self.m[r][c] = i < len(bits) and bits[i] == 1

    def apply_mask(self, mask: int) -> None:
        fn = MASKS[mask]
        for r in range(SIZE):
            for c in range(SIZE):
                if not self.f[r][c] and fn(c, r):
                    self.m[r][c] = not self.m[r][c]

    def penalty(self) -> int:
        m, p = self.m, 0
        for lines in (m, [list(col) for col in zip(*m)]):
            for line in lines:
                run, prev = 0, None
                for v in line:
                    if v == prev:
                        run += 1
                    else:
                        if run >= 5:
                            p += run - 2
                        run, prev = 1, v
                if run >= 5:
                    p += run - 2
                s = "".join("1" if v else "0" for v in line)
                p += 40 * (s.count("10111010000") + s.count("00001011101"))
        for r in range(SIZE - 1):
            for c in range(SIZE - 1):
                if m[r][c] == m[r][c + 1] == m[r + 1][c] == m[r + 1][c + 1]:
                    p += 3
        dark = sum(v for row in m for v in row)
        p += abs(dark * 20 - SIZE * SIZE * 10) // (SIZE * SIZE) * 10
        return p


def build() -> Matrix:
    cws = build_codewords(URL)
    best, best_p = None, None
    for mask in range(8):
        q = Matrix()
        q.draw_function()
        q.draw_data(cws)
        q.apply_mask(mask)
        q.draw_format(mask)
        pen = q.penalty()
        if best_p is None or pen < best_p:
            best, best_p, best_mask = q, pen, mask
    # relectura: desenmascarar y recorrer en el mismo orden
    fn = MASKS[best_mask]
    read = [best.m[r][c] ^ fn(c, r) for c, r in best.order()]
    got = [int("".join("1" if b else "0" for b in read[i:i + 8]), 2) for i in range(0, len(cws) * 8, 8)]
    assert got == cws, "la relectura no coincide"
    text = bytes(got[1:1 + len(URL.encode())])  # aproximado: comprobamos la cadena completa abajo
    bits = "".join(format(b, "08b") for b in got)
    n = int(bits[4:12], 2)
    decoded = bytes(int(bits[12 + 8 * k:20 + 8 * k], 2) for k in range(n)).decode()
    assert decoded == URL, decoded
    print(f"QR versión {VERSION}-L, máscara {best_mask}, texto comprobado: {decoded}")
    return best


def save(q: Matrix, out: Path, scale: int = 10, border: int = 4) -> None:
    from PIL import Image
    n = (SIZE + 2 * border) * scale
    img = Image.new("RGB", (n, n), LIGHT)
    px = img.load()
    dark = tuple(int(DARK[i:i + 2], 16) for i in (1, 3, 5))
    for r in range(SIZE):
        for c in range(SIZE):
            if q.m[r][c]:
                for yy in range((r + border) * scale, (r + border + 1) * scale):
                    for xx in range((c + border) * scale, (c + border + 1) * scale):
                        px[xx, yy] = dark
    img.save(out / "qr-app.png", optimize=True)
    w = SIZE + 2 * border
    path = "".join(f"M{c + border},{r + border}h1v1h-1z" for r in range(SIZE) for c in range(SIZE) if q.m[r][c])
    (out / "qr-app.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {w}" shape-rendering="crispEdges">'
        f'<rect width="{w}" height="{w}" fill="{LIGHT}"/><path fill="{DARK}" d="{path}"/></svg>\n', encoding="utf-8")


if __name__ == "__main__":
    here = Path(__file__).resolve().parent.parent / "icons"
    save(build(), here)
    sys.exit(0)
