"""Original, non-clinical LDCT phantom: Poisson projections -> FBP / SART-TV.

Numerical sources and review sheets stay OUTSIDE public/. Only the lossless atlas
is imported with app/scripts/import-image.mjs --lossless after visual review.
Requires numpy, scipy, scikit-image, Pillow. No patient data or model weights.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.restoration import denoise_tv_chambolle
from skimage.transform import iradon, iradon_sart, radon

VERSION = "ldct-phantom-v1"
SEED = 2258
SIZE = 160
SPACING_MM = 1.2
ANGLES = np.linspace(0.0, 180.0, 240, endpoint=False)
SIGNALS = {"low": 900, "medium": 9000, "high": 90000}
TV_WEIGHTS = [0.00012, 0.00050, 0.0020]
WINDOW = [0.008, 0.024]
ITERATIONS = 5


def phantom(z: int) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    yy, xx = np.mgrid[:SIZE, :SIZE]
    x, y = (xx - SIZE / 2) / (SIZE / 2), (yy - SIZE / 2) / (SIZE / 2)
    body = x * x + y * y <= 0.84**2
    image = np.where(body, 0.016, 0.0)
    section = [0.90, 1.0, 0.90][z]
    inserts = [(-0.30, -0.25, 0.13, 0.012), (0.26, -0.23, 0.13, -0.009)]
    for cx, cy, radius, contrast in inserts:
        region = (x - cx)**2 + (y - cy)**2 <= (radius * section)**2
        image[region] += contrast
    # Three connected rods, and a weak spherical insert. Geometry is shared by
    # every signal/algorithm variant; adjacent z sections are not random images.
    for cx, radius in [(-0.39, 0.048), (-0.25, 0.035), (-0.12, 0.022)]:
        image[(x - cx)**2 + (y - 0.26)**2 <= radius**2] += 0.009
    weak = (x - 0.29)**2 + (y - 0.26)**2 <= (0.082 * section)**2
    image[weak] += 0.0014
    center_weak = (x - 0.29)**2 + (y - 0.26)**2 <= (0.048 * section)**2
    local_background = ((x - 0.29)**2 + (y - 0.26)**2 >= 0.105**2) & ((x - 0.29)**2 + (y - 0.26)**2 <= 0.16**2)
    uniform = (x > -0.19) & (x < 0.14) & (y > -0.13) & (y < 0.10)
    return image, {"weak": center_weak, "background": local_background, "noise": uniform}


def display(image: np.ndarray) -> np.ndarray:
    return np.rint(np.clip((image - WINDOW[0]) / (WINDOW[1] - WINDOW[0]), 0, 1) * 255).astype(np.uint8)


def fingerprint(array: np.ndarray) -> str:
    return hashlib.sha256(np.asarray(array, dtype="<f4").tobytes()).hexdigest()


def generate(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    frames = np.zeros((3, 13, SIZE, SIZE), dtype=np.uint8)
    numeric: dict[str, np.ndarray] = {"angles": ANGLES}
    records = []
    for z in range(3):
        truth, masks = phantom(z)
        clean = radon(truth * SPACING_MM, theta=ANGLES, circle=True)
        numeric[f"truth_{z}"] = truth.astype(np.float32)
        numeric[f"clean_projection_{z}"] = clean.astype(np.float32)
        frames[z, 12] = display(truth)
        for signal_index, (signal, incident) in enumerate(SIGNALS.items()):
            # Same slice/level has one recorded projection realization consumed
            # by every algorithm. We do NOT remove projection angles for low.
            noise_seed = SEED + 100 * z
            rng = np.random.default_rng(noise_seed)
            counts = rng.poisson(incident * np.exp(-clean))
            noisy = -np.log(np.maximum(counts, 1) / incident)
            projection_hash = fingerprint(noisy)
            numeric[f"counts_{signal}_{z}"] = counts.astype(np.int32)
            numeric[f"projection_{signal}_{z}"] = noisy.astype(np.float32)
            variants = [iradon(noisy, theta=ANGLES, filter_name="ramp", circle=True) / SPACING_MM]
            for tv_weight in TV_WEIGHTS:
                estimate = np.zeros_like(truth)
                for _ in range(ITERATIONS):
                    estimate = iradon_sart(noisy, theta=ANGLES, image=estimate * SPACING_MM, relaxation=0.15) / SPACING_MM
                    estimate = denoise_tv_chambolle(estimate, weight=tv_weight, max_num_iter=30, channel_axis=None)
                    estimate = np.clip(estimate, 0, 0.05)
                variants.append(estimate)
            for method, reconstructed in enumerate(variants):
                key = f"{signal}_{'fbp' if method == 0 else f'ir{method}'}_{z}"
                numeric[key] = reconstructed.astype(np.float32)
                frames[z, signal_index * 4 + method] = display(reconstructed)
                records.append({
                    "key": key, "signal": signal, "slice": z, "column": signal_index * 4 + method,
                    "projection_hash": projection_hash, "noise_seed": noise_seed,
                    "weak_contrast": float(reconstructed[masks["weak"]].mean() - reconstructed[masks["background"]].mean()),
                    "uniform_sd": float(reconstructed[masks["noise"]].std()),
                    "numeric_hash": fingerprint(reconstructed),
                })
            print(f"generated slice {z + 1}/3, signal {signal}", flush=True)
    atlas_pixels = np.concatenate([np.concatenate(list(row), axis=1) for row in frames], axis=0)
    atlas_path = output / "ldct_phantom_v1_atlas.webp"
    Image.fromarray(atlas_pixels).save(atlas_path, "WEBP", lossless=True, method=6)
    with Image.open(atlas_path) as check:
        assert np.array_equal(np.asarray(check.convert("L")), atlas_pixels), "Lossless atlas round trip failed"
    np.savez_compressed(output / "ldct-phantom-v1-numerics.npz", **numeric)
    metadata = {
        "version": VERSION, "seed": SEED, "image_size": SIZE, "spacing_mm": SPACING_MM,
        "projection_angles": len(ANGLES), "signal_counts": SIGNALS, "window_mu_per_mm": WINDOW,
        "algorithm": "FBP ramp; nonnegative SART alternating TV regularization (educational, not a vendor implementation)",
        "sart_relaxation": 0.15, "iterations": ITERATIONS, "tv_weights": TV_WEIGHTS,
        "atlas_columns": 13, "atlas_rows": 3, "truth_column": 12,
        "atlas_bytes": atlas_path.stat().st_size,
        "atlas_sha256": hashlib.sha256(atlas_path.read_bytes()).hexdigest(),
        "records": records,
    }
    (output / "ldct-phantom-v1-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    # Review sheet is not a shipped game asset. Labels are intentionally absent
    # from atlas so the player cannot see hidden ground truth before submitting.
    sheet = Image.new("RGB", (SIZE * 4, (SIZE + 24) * 3), "#091222")
    draw = ImageDraw.Draw(sheet)
    for row, (label, col) in enumerate([("HIGH", 8), ("MEDIUM", 4), ("LOW", 0)]):
        for method in range(4):
            frame = Image.fromarray(frames[1, col + method]).convert("RGB")
            sheet.paste(frame, (method * SIZE, row * (SIZE + 24)))
            draw.text((method * SIZE + 4, row * (SIZE + 24) + SIZE + 5), f"{label} {'FBP' if method == 0 else 'IR ' + str(method)}", fill="white")
    sheet.save(output / "review.png")
    print(json.dumps({"atlas": str(atlas_path), "bytes": atlas_path.stat().st_size, "metadata": str(output / "ldct-phantom-v1-metadata.json")}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path, help="Staging directory outside app/public")
    generate(parser.parse_args().output.resolve())
