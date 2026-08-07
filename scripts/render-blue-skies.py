#!/usr/bin/env python3
"""Render the bundled demo wallpaper: a Bliss-style blue-sky meadow.

Procedurally generated (no copyrighted material). Output:
packages/extension/public/wallpapers/blue-skies.jpg
"""
import numpy as np
from PIL import Image, ImageFilter

W, H = 2560, 1440
rng = np.random.default_rng(20260807)

# --- sky: deep azure top -> pale horizon ---------------------------------
y = np.linspace(0, 1, H)[:, None].astype(np.float32)
x = np.linspace(0, 1, W)[None, :].astype(np.float32)

top = np.array([0.13, 0.36, 0.78], dtype=np.float32)      # deep azure
mid = np.array([0.36, 0.62, 0.92], dtype=np.float32)      # sky blue
hor = np.array([0.78, 0.89, 0.98], dtype=np.float32)      # hazy horizon

t1 = np.clip(y / 0.42, 0, 1) ** 0.8
t2 = np.clip((y - 0.42) / 0.33, 0, 1) ** 0.9
sky = top * (1 - t1)[..., None] + mid * t1[..., None]
sky = sky * (1 - t2[..., None]) + hor * t2[..., None]

img = np.broadcast_to(sky, (H, W, 3)).copy()

# gentle sun glow upper-left
glow = np.exp(-(((x - 0.30) ** 2) / 0.16 + ((y - 0.16) ** 2) / 0.10))
img += (np.array([0.10, 0.07, 0.02], dtype=np.float32) * glow[..., None])
img = np.clip(img, 0, 1)

# --- clouds: clustered soft puffs -----------------------------------------
cloud_layer = np.zeros((H, W), dtype=np.float32)

def puff(cx, cy, r, strength):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d2 = ((xx - cx) ** 2) / (r * r * 1.9) + ((yy - cy) ** 2) / (r * r * 0.55)
    return strength * np.exp(-d2)

clouds = [
    # (cx, cy, base radius, puffs, strength)
    (0.22, 0.20, 150, 7, 0.95),
    (0.55, 0.13, 120, 5, 0.85),
    (0.78, 0.24, 180, 8, 0.95),
    (0.40, 0.33, 100, 5, 0.75),
    (0.90, 0.10, 90, 4, 0.7),
    (0.08, 0.34, 80, 4, 0.65),
]
for cx, cy, r, n, s in clouds:
    for _ in range(n):
        px = cx * W + rng.normal(0, r * 0.9)
        py = cy * H + rng.normal(0, r * 0.22)
        pr = r * rng.uniform(0.45, 1.0)
        cloud_layer += puff(px, py, pr, s * rng.uniform(0.6, 1.0))

cloud_layer = np.clip(cloud_layer, 0, 1.15)
cloud_img = Image.fromarray((np.clip(cloud_layer, 0, 1) * 255).astype(np.uint8))
cloud_img = cloud_img.filter(ImageFilter.GaussianBlur(26))
cl = np.asarray(cloud_img, dtype=np.float32) / 255.0
cl = cl[..., None]

# cloud shading: bright top, faintly gray-blue belly
cloud_col = np.array([1.0, 1.0, 1.0], dtype=np.float32)
shade_col = np.array([0.82, 0.87, 0.94], dtype=np.float32)
belly = np.clip((y - 0.05) * 1.6, 0, 1)[..., None]
cloud_rgb = cloud_col * (1 - belly * 0.5) + shade_col * (belly * 0.5)

a = np.clip(cl * 1.05, 0, 1)
img = img * (1 - a) + cloud_rgb * a

# --- hill: rolling green meadow -------------------------------------------
hx = np.linspace(0, 1, W)
hill_y = (
    0.660
    - 0.045 * np.sin(hx * np.pi * 1.15 + 0.4)
    - 0.020 * np.sin(hx * np.pi * 2.6 + 1.7)
    + 0.012 * np.sin(hx * np.pi * 5.1 + 0.3)
)
hill_y = np.convolve(hill_y, np.ones(41) / 41, mode="same")
hill_y[:20] = hill_y[20]
hill_y[-20:] = hill_y[-20]

mask = (y > hill_y[None, :]).astype(np.float32)
mask_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(
    ImageFilter.GaussianBlur(2)
)
mask = (np.asarray(mask_img, dtype=np.float32) / 255.0)[..., None]

depth = np.clip((y - hill_y[None, :]) / 0.34, 0, 1)[..., None]
grass_top = np.array([0.42, 0.68, 0.24], dtype=np.float32)   # lit meadow
grass_bot = np.array([0.16, 0.42, 0.12], dtype=np.float32)   # shaded base
grass = grass_top * (1 - depth) + grass_bot * depth

# sunlit unevenness on the meadow
tex = rng.normal(0, 1, (H, W)).astype(np.float32)
tex_img = Image.fromarray(((tex - tex.min()) / (np.ptp(tex)) * 255).astype(np.uint8))
tex_img = tex_img.filter(ImageFilter.GaussianBlur(9))
tex = (np.asarray(tex_img, dtype=np.float32) / 255.0 - 0.5)[..., None]
grass = np.clip(grass + tex * np.array([0.030, 0.045, 0.020], dtype=np.float32), 0, 1)

img = img * (1 - mask) + grass * mask

# atmospheric haze just above the hill line
haze = np.exp(-np.clip((hill_y[None, :] - y) / 0.035, 0, 3) ** 2) * (y <= hill_y[None, :])
img = img * (1 - haze[..., None] * 0.35) + hor * (haze[..., None] * 0.35)

# --- finishing: vignette + dither -----------------------------------------
vig = 1 - 0.10 * (((x - 0.5) ** 2) / 0.25 + ((y - 0.5) ** 2) / 0.32)
img = np.clip(img * vig[..., None], 0, 1)
img += rng.normal(0, 0.0035, (H, W, 1)).astype(np.float32)  # anti-banding
img = np.clip(img, 0, 1)

out = Image.fromarray((img * 255).astype(np.uint8))
out.save(
    "packages/extension/public/wallpapers/blue-skies.jpg",
    quality=86,
    optimize=True,
    progressive=True,
)
print("saved", out.size)
