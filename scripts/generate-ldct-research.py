"""Train a tiny learned IMAGE postprocessor on original digital phantoms.

The intentionally narrow training set has large, strong inserts. Three fixed
held-out phantoms probe a familiar strong insert and small low-contrast inserts.
No inference output is painted, erased, sharpened or blended by hand. Numerical
sources, weights and review sheets remain outside the web deployment directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from PIL import Image, ImageDraw
from skimage.restoration import denoise_tv_chambolle
from skimage.transform import iradon, iradon_sart, radon

VERSION = "ldct-research-v1"
SEED = 28116
SIZE = 128
SPACING = 1.2
ANGLES = np.linspace(0, 180, 160, endpoint=False)
TRAIN_COUNT = 96
EPOCHS = 40
SCALE = .035
WINDOW = [.007, .029]
METHODS = ["reference", "fbp", "iterative", "learned"]
CASES = [
    {"id": "control", "label": "常规结构", "target": [86, 83, 8.5, .010], "seed": 90101},
    {"id": "faint", "label": "小而浅的结构", "target": [86, 83, 4.5, .004], "seed": 90201},
    {"id": "shifted", "label": "换位置复核", "target": [44, 83, 5.5, .004], "seed": 90301},
]
YY, XX = np.mgrid[:SIZE, :SIZE]
INSIDE = (XX - 64)**2 + (YY - 64)**2 < 63**2


def sha(array: np.ndarray) -> str:
    return hashlib.sha256(np.asarray(array, dtype="<f4").tobytes()).hexdigest()


def ellipse(cx: float, cy: float, rx: float, ry: float, angle: float = 0):
    c, s = np.cos(angle), np.sin(angle)
    dx, dy = XX - cx, YY - cy
    return ((dx * c + dy * s) / rx)**2 + ((-dx * s + dy * c) / ry)**2 <= 1


def training_phantom(seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    image = np.zeros((SIZE, SIZE))
    image[ellipse(64, 64, rng.uniform(48, 54), rng.uniform(46, 53))] = rng.uniform(.014, .017)
    # No insert smaller than radius 7 or weaker than contrast .006 is present.
    for _ in range(rng.integers(2, 6)):
        cx, cy = rng.uniform(38, 90, size=2)
        region = ellipse(cx, cy, rng.uniform(7, 14), rng.uniform(7, 14), rng.uniform(0, np.pi))
        image[region] += rng.choice([-1, 1]) * rng.uniform(.006, .010)
    return np.clip(image, 0, .035)


def test_phantom(case: dict, z: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    image = np.zeros((SIZE, SIZE))
    image[ellipse(64, 64, 53, 50)] = .016
    image[ellipse(43, 43, 10, 12)] += .010
    image[ellipse(86, 44, 12, 9)] -= .008
    image[ellipse(64, 62, 8, 5, .25)] += .006
    cx, cy, radius, contrast = case["target"]
    radius *= [.87, 1, .87][z]
    target = ellipse(cx, cy, radius, radius)
    image[target] += contrast
    core = ellipse(cx, cy, radius * .62, radius * .62)
    annulus = ellipse(cx, cy, radius + 6, radius + 6) & ~ellipse(cx, cy, radius + 2.5, radius + 2.5)
    return image, core, annulus


def acquire(image: np.ndarray, seed: int, incident: int) -> tuple[np.ndarray, np.ndarray]:
    clean = radon(image * SPACING, theta=ANGLES, circle=True)
    counts = np.random.default_rng(seed).poisson(incident * np.exp(-clean))
    measured = -np.log(np.maximum(counts, 1) / incident)
    fbp = iradon(measured, theta=ANGLES, filter_name="ramp", circle=True) / SPACING
    return measured, fbp


class TinyPostprocessor(nn.Module):
    """Small encoder-decoder, no projection input, no test-specific masking."""
    def __init__(self):
        super().__init__()
        self.entry = nn.Conv2d(1, 12, 5, padding=2)
        self.down1 = nn.Conv2d(12, 16, 3, stride=2, padding=1)
        self.down2 = nn.Conv2d(16, 24, 3, stride=2, padding=1)
        self.mid = nn.Conv2d(24, 16, 3, padding=1)
        self.up = nn.Conv2d(16, 12, 3, padding=1)
        self.exit = nn.Conv2d(12, 1, 3, padding=1)

    def forward(self, image):
        value = F.relu(self.entry(image))
        value = F.relu(self.down1(value))
        value = F.relu(self.down2(value))
        value = F.interpolate(F.relu(self.mid(value)), scale_factor=2, mode="bilinear", align_corners=False)
        value = F.interpolate(F.relu(self.up(value)), scale_factor=2, mode="bilinear", align_corners=False)
        return self.exit(value)


def display(image: np.ndarray) -> np.ndarray:
    return np.rint(np.clip((image - WINDOW[0]) / (WINDOW[1] - WINDOW[0]), 0, 1) * 255).astype(np.uint8)


def generate(output: Path, epochs: int):
    output.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(SEED)
    torch.set_num_threads(4)
    torch.use_deterministic_algorithms(True)
    rng = np.random.default_rng(SEED)
    clean_train, noisy_train = [], []
    for i in range(TRAIN_COUNT):
        image = training_phantom(50000 + i)
        _, fbp = acquire(image, 60000 + i, 3500)
        clean_train.append(image)
        noisy_train.append(fbp)
    train_input = torch.from_numpy(np.asarray(noisy_train, dtype=np.float32)[:, None] / SCALE)
    train_target = torch.from_numpy(np.asarray(clean_train, dtype=np.float32)[:, None] / SCALE)
    model = TinyPostprocessor()
    optimizer = torch.optim.Adam(model.parameters(), lr=.002)
    losses = []
    model.train()
    for epoch in range(epochs):
        order = rng.permutation(TRAIN_COUNT)
        epoch_losses = []
        for start in range(0, TRAIN_COUNT, 8):
            selected = order[start:start + 8]
            result = model(train_input[selected])
            loss = F.mse_loss(result, train_target[selected])
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
            epoch_losses.append(float(loss.detach()))
        losses.append(float(np.mean(epoch_losses)))
        if epoch % 10 == 0 or epoch == epochs - 1:
            print(f"epoch {epoch + 1}/{epochs}: {losses[-1]:.7f}", flush=True)
    model.eval()
    weights_path = output / "ldct-research-v1-weights.pt"
    torch.save(model.state_dict(), weights_path)
    weight_hash = hashlib.sha256(weights_path.read_bytes()).hexdigest()
    numeric = {"training_phantoms": np.asarray(clean_train, dtype=np.float32), "training_fbp": np.asarray(noisy_train, dtype=np.float32)}
    frames, records = [], []
    for case in CASES:
        for z in range(3):
            truth, target, background = test_phantom(case, z)
            seed = case["seed"] + z
            measured, fbp = acquire(truth, seed, 3500)
            estimate = np.zeros_like(truth)
            for _ in range(3):
                estimate = iradon_sart(measured, theta=ANGLES, image=estimate * SPACING, relaxation=.08, clip=(0, .04 * SPACING)) / SPACING
                estimate = denoise_tv_chambolle(estimate, weight=.00045, max_num_iter=30)
                estimate[~INSIDE] = 0
            with torch.no_grad():
                learned = model(torch.from_numpy(fbp.astype(np.float32))[None, None] / SCALE)[0, 0].numpy() * SCALE
            images = {"reference": truth, "fbp": fbp, "iterative": estimate, "learned": learned}
            projection_hash = sha(measured)
            numeric[f"{case['id']}:{z}:projection"] = measured
            for method, image in images.items():
                key = f"{case['id']}:{z}:{method}"
                numeric[key] = image
                contrast = float(image[target].mean() - image[background].mean())
                records.append({"key": key, "case": case["id"], "slice": z, "method": method, "seed": seed, "projection_hash": projection_hash, "numeric_hash": sha(image), "target_contrast": contrast, "contrast_fraction": contrast / case["target"][3], "body_noise_sd": float(image[ellipse(62, 92, 7, 6)].std()), "rmse": float(np.sqrt(np.mean((image - truth)**2)))})
                frames.append(display(image))
            print(case["id"], z, {r["method"]: round(r["contrast_fraction"], 3) for r in records[-4:]}, flush=True)
    columns, rows = 12, 3
    pixels = np.concatenate([np.concatenate(frames[i * columns:(i + 1) * columns], axis=1) for i in range(rows)], axis=0)
    atlas_path = output / "ldct_research_v1_atlas.webp"
    Image.fromarray(pixels).save(atlas_path, "WEBP", lossless=True, method=6)
    with Image.open(atlas_path) as check:
        assert np.array_equal(np.asarray(check.convert("L")), pixels)
    np.savez_compressed(output / "ldct-research-v1-numerics.npz", **numeric)
    metadata = {"version": VERSION, "seed": SEED, "size": SIZE, "spacing_mm": SPACING, "angles": len(ANGLES), "incident_counts": 3500, "display_window": WINDOW, "cases": CASES, "train_phantom_seeds": [50000, 50000 + TRAIN_COUNT - 1], "train_noise_seeds": [60000, 60000 + TRAIN_COUNT - 1], "train_count": TRAIN_COUNT, "epochs": epochs, "losses": losses, "model": "6 convolution encoder-decoder; two stride-2 layers; bilinear upsampling; no skip; learned image-domain postprocessing", "train_limitation": "Only large strong inserts: radius >=7, contrast >=.006. Small weak inserts intentionally absent; held-out stress suite is illustrative, not unbiased performance validation.", "parameters": sum(p.numel() for p in model.parameters()), "optimizer": "Adam lr=.002, batch8, MSE", "weights_sha256": weight_hash, "sart_passes": 3, "sart_relaxation": .08, "tv_weight": .00045, "methods": METHODS, "columns": columns, "rows": rows, "records": records, "atlas_bytes": atlas_path.stat().st_size, "atlas_sha256": hashlib.sha256(atlas_path.read_bytes()).hexdigest(), "torch": torch.__version__}
    (output / "ldct-research-v1-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    sheet = Image.new("RGB", (SIZE * 4, (SIZE + 23) * 9), "#091522")
    draw = ImageDraw.Draw(sheet)
    for index, (record, frame) in enumerate(zip(records, frames)):
        row, col = divmod(index, 4)
        sheet.paste(Image.fromarray(frame).convert("RGB"), (col * SIZE, row * (SIZE + 23)))
        draw.text((col * SIZE + 2, row * (SIZE + 23) + SIZE + 3), record["key"], fill="white")
    sheet.save(output / "review.png")
    print(json.dumps({"atlas": str(atlas_path), "bytes": atlas_path.stat().st_size, "weights_hash": weight_hash}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("--epochs", type=int, default=EPOCHS)
    args = parser.parse_args()
    generate(args.output.resolve(), args.epochs)
