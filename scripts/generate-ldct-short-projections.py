"""Three original objects, each unchanged across the projection demonstrations.

Actual Radon, Poisson count noise, BP/FBP and SART; no image-domain imitation.
Run --review-only first, inspect critical-review.png, then --pack-only. The
cached arrays/review/metadata stay outside public; import only the three WebPs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.draw import polygon
from skimage.transform import iradon, iradon_sart, order_angles_golden_ratio, radon

SIZE = 160
SPACING = 1.2
ANGLES = np.linspace(0, 180, SIZE, endpoint=False)
WINDOW = [0.005, 0.030]
VERSION = "ldct-short-v2-display"
# One fixed, offset window per object, shared by every BP direction count and
# all three unfiltered signal levels. No per-frame stretching or sharpening.
BP_WINDOWS = {"phantom": [1.6, 4.0], "face": [1.6, 4.0], "nut": [1.7, 4.5]}
SIGNALS = {"low": 3200, "medium": 8000, "high": 32000}
COUNTS = [1, 2, 4, 8, 24, 160]
ITERATIONS = [0, 1, 2, 4, 8]
FILTERS = ["none", "ramp", "shepp-logan", "cosine", "hamming", "hann"]
DATASETS = {
    "phantom": {"seed": 2258, "media_id": "ldct_short_phantom_v1", "points": [[56, 60], [48.8, 100.8], [103.2, 100.8]]},
    "face": {"seed": 2259, "media_id": "ldct_short_face_v1", "points": [[55, 60], [103, 63], [80, 82]]},
    "nut": {"seed": 2260, "media_id": "ldct_short_nut_v1", "points": [[80, 53], [57, 93], [98, 80]]},
}
YY, XX = np.mgrid[:SIZE, :SIZE]
CIRCLE = (XX - 80)**2 + (YY - 80)**2 < 79**2
BODY = (XX - 80)**2 + (YY - 80)**2 <= 67.2**2
FRAME_KEYS = [
    "trace:truth", "trace:sinogram", "truth", "sinogram:clean",
    *[key for level in SIGNALS for key in [f"sinogram:{level}", *[f"fbp:{level}:{f}" for f in ["ramp", "shepp-logan", "hann"]]]],
    *[f"bp:{n}" for n in COUNTS],
    *[f"{prefix}:{n}" for n in ITERATIONS for prefix in ["iteration", "forward", "residual"]],
    *[f"fbp:{level}:{f}" for level in SIGNALS for f in ["none", "cosine", "hamming"]],
]


def fingerprint(a: np.ndarray) -> str:
    return hashlib.sha256(np.asarray(a, dtype="<f4").tobytes()).hexdigest()


def disk(x: float, y: float, r: float):
    return (XX - x)**2 + (YY - y)**2 <= r*r


def phantom(dataset: str) -> np.ndarray:
    image = np.where(BODY, .016, .0)
    if dataset == "phantom":
        for x, y, r, contrast in [(56, 60, 10.4, .012), (48.8, 100.8, 3.84, .009), (103.2, 100.8, 6.56, .002)]:
            image[disk(x, y, r)] += contrast
        image[disk(100.8, 61.6, 10.4)] -= .009
        for x, r in [(60, 2.8), (70.4, 1.76)]:
            image[disk(x, 100.8, r)] += .009
    elif dataset == "face":
        image[disk(55, 60, 8)] += .011
        image[disk(103, 63, 7.5)] += .011
        image[disk(80, 82, 4)] += .0025
        smile = (disk(84, 80, 31) & ~disk(84, 80, 26)) & (YY >= 98 + .08*(XX-80))
        image[smile] += .009
    elif dataset == "nut":
        # A geometric teaching cross-section, not a simulated real-metal scan.
        theta = np.deg2rad(np.arange(6) * 60 + 30)
        rows, cols = polygon(80 + 34*np.sin(theta), 80 + 34*np.cos(theta), image.shape)
        image[rows, cols] = .028
        image[disk(80, 80, 14)] = .006
    else:
        raise ValueError(dataset)
    return image


def gray(a: np.ndarray, window, *, exponent: float = 1):
    scaled = np.clip((a-window[0])/(window[1]-window[0]), 0, 1)
    return np.rint(scaled**exponent*255).astype(np.uint8)


def compute(dataset: str, output: Path):
    config = DATASETS[dataset]
    truth = phantom(dataset)
    clean = radon(truth * SPACING, theta=ANGLES, circle=True)
    bp_window = BP_WINDOWS[dataset]
    projection_window = [0, float(clean.max()*1.06)]
    frames = {"truth": gray(truth, WINDOW), "sinogram:clean": gray(clean, projection_window)}
    numeric = {"truth": truth, "clean": clean, "angles": ANGLES}
    frames["trace:truth"] = frames["truth"]
    frames["trace:sinogram"] = frames["sinogram:clean"]
    numeric["trace:truth"] = truth
    numeric["trace:sinogram"] = clean
    metrics, projections = {}, {}
    noise_mask = disk(80, 126, 6)
    for level, incident in SIGNALS.items():
        counts = np.random.default_rng(config["seed"]).poisson(incident*np.exp(-clean))
        measured = -np.log(np.maximum(counts, 1)/incident)
        projections[level] = measured
        numeric[f"counts:{level}"] = counts
        numeric[f"sinogram:{level}"] = measured
        frames[f"sinogram:{level}"] = gray(measured, projection_window)
        for filt in FILTERS:
            result = iradon(measured, theta=ANGLES, filter_name=None if filt == "none" else filt, circle=True)/SPACING
            key = f"fbp:{level}:{filt}"
            numeric[key] = result
            frames[key] = gray(result, bp_window if filt == "none" else WINDOW)
            metrics[key] = {"projection_hash": fingerprint(measured), "noise_sd": float(result[noise_mask].std())}
    order = list(order_angles_golden_ratio(ANGLES))
    for count in COUNTS:
        indices = order[:count]
        # Same measured projections as the filter comparison, not a noiseless
        # alternative. At all angles reuse the exact computed unfiltered result
        # to avoid even floating-point accumulation-order differences.
        result = (numeric["fbp:high:none"].copy() if count == len(ANGLES) else
                  iradon(projections["high"][:, indices], theta=ANGLES[indices], filter_name=None, circle=True)/SPACING)
        numeric[f"bp:{count}"] = result
        frames[f"bp:{count}"] = gray(result, bp_window)
    measured = projections["low"]
    estimate = np.zeros_like(truth)
    residual_window = [0, float(np.percentile(abs(measured), 99.5))]
    iteration_metrics = []
    for n in range(9):
        if n:
            estimate = iradon_sart(measured, theta=ANGLES, image=estimate*SPACING, relaxation=.035, clip=(0, .060*SPACING))/SPACING
            estimate[~CIRCLE] = 0
        if n not in ITERATIONS:
            continue
        predicted = radon(estimate*SPACING, theta=ANGLES, circle=True)
        residual = measured-predicted
        for prefix, value, window in [("iteration", estimate, WINDOW), ("forward", predicted, projection_window), ("residual", abs(residual), residual_window)]:
            key = f"{prefix}:{n}"
            numeric[key] = value.copy()
            # Fixed square-root display exposes small residuals while preserving
            # their ordering and cross-iteration scale. Numerical data stay raw.
            frames[key] = gray(value, window, exponent=.5 if prefix == "residual" else 1)
        iteration_metrics.append({"iteration": n, "relative_residual": float(np.linalg.norm(residual)/np.linalg.norm(measured)), "rmse": float(np.sqrt(np.mean((estimate-truth)**2)))})
    # Point-coordinate geometry is independently checked against single-pixel
    # projections; a point is not falsely treated as the centroid of a whole nut.
    point_checks = []
    for x, y in config["points"]:
        px, py = int(round(x)), int(round(y))
        impulse = np.zeros_like(truth)
        impulse[py, px] = 1
        projected = radon(impulse, theta=ANGLES, circle=True)
        centroid = (projected*np.arange(SIZE)[:, None]).sum(axis=0)/projected.sum(axis=0)
        expected = 80+(px-80)*np.cos(np.deg2rad(ANGLES))-(py-80)*np.sin(np.deg2rad(ANGLES))
        error = float(abs(centroid-expected).max())
        assert error < .6
        point_checks.append({"point": [x, y], "rounded_pixel": [px, py], "maximum_centroid_error_px": error})
    # Keeping one source dictionary proves no stage swaps out the grey holder.
    assert np.array_equal(frames["trace:truth"], frames["truth"])
    assert np.array_equal(frames["trace:sinogram"], frames["sinogram:clean"])
    frame_stack = np.stack([frames[key] for key in FRAME_KEYS])
    np.savez_compressed(output/f"{dataset}-numerics.npz", **numeric)
    np.savez_compressed(output/f"{dataset}-frames.npz", frames=frame_stack)
    meta = {"version": VERSION, "dataset": dataset, "media_id": config["media_id"], "seed": config["seed"],
        "size": SIZE, "spacing_mm": SPACING, "angles": len(ANGLES), "signals": SIGNALS,
        "display_window": WINDOW, "bp_window": bp_window, "projection_window": projection_window,
        "residual_window": residual_window, "truth_hash": fingerprint(truth), "clean_projection_hash": fingerprint(clean),
        "bp_projection_hash": fingerprint(projections["high"]), "bp_signal": "high",
        "residual_display_exponent": .5,
        "bp_counts": COUNTS, "iterations": iteration_metrics, "point_checks": point_checks, "metrics": metrics,
        "frame_keys": FRAME_KEYS, "columns": 8, "rows": 6,
        "legacy_aliases": {f"filter:sparse:{f}": f"fbp:high:{f}" for f in FILTERS},
        "note": "Same full grey circular holder in every stage. BP and high-signal unfiltered FBP are identical. BP uses a fixed offset window; residual uses a fixed square-root display. No background subtraction/sharpening. Nut is a geometric test object, not a polychromatic metal simulation."}
    (output/f"{dataset}-metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"dataset": dataset, "frames": len(frames), "iterations": iteration_metrics}, ensure_ascii=False), flush=True)


CRITICAL = ["truth", "bp:4", "bp:160", "fbp:high:none", "fbp:high:ramp", "fbp:high:hann", "iteration:1", "iteration:8", "residual:1", "residual:8"]


def review(output: Path):
    sheet = Image.new("RGB", (SIZE*len(CRITICAL), (SIZE+32)*3), "#0b1725")
    draw = ImageDraw.Draw(sheet)
    for row, dataset in enumerate(DATASETS):
        cache = np.load(output/f"{dataset}-frames.npz")["frames"]
        for col, key in enumerate(CRITICAL):
            sheet.paste(Image.fromarray(cache[FRAME_KEYS.index(key)]).convert("RGB"), (col*SIZE, row*(SIZE+32)))
            draw.text((col*SIZE+3, row*(SIZE+32)+SIZE+3), f"{dataset} {key}", fill="white")
    sheet.save(output/"critical-review.png")
    print(str(output/"critical-review.png"), flush=True)


def pack(output: Path):
    for dataset, config in DATASETS.items():
        frames = np.load(output/f"{dataset}-frames.npz")["frames"]
        pixels = np.zeros((SIZE*6, SIZE*8), dtype=np.uint8)
        for index, frame in enumerate(frames):
            row, col = divmod(index, 8)
            pixels[row*SIZE:(row+1)*SIZE, col*SIZE:(col+1)*SIZE] = frame
        path = output/f"{config['media_id']}.webp"
        Image.fromarray(pixels).save(path, "WEBP", lossless=True, method=6)
        with Image.open(path) as decoded:
            assert np.array_equal(np.asarray(decoded.convert("L")), pixels)
        meta_path = output/f"{dataset}-metadata.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta.update({"atlas_bytes": path.stat().st_size, "atlas_sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"path": str(path), "id": config["media_id"], "bytes": meta["atlas_bytes"], "sha256": meta["atlas_sha256"]}), flush=True)


def verify(output: Path):
    """Bounded source audit; no generation, training, browser or clinical claim."""
    for dataset, config in DATASETS.items():
        numeric = np.load(output/f"{dataset}-numerics.npz")
        frames = np.load(output/f"{dataset}-frames.npz")["frames"]
        meta = json.loads((output/f"{dataset}-metadata.json").read_text(encoding="utf-8"))
        assert frames.shape == (46, SIZE, SIZE)
        assert np.array_equal(numeric["truth"], phantom(dataset))
        assert np.array_equal(numeric["trace:truth"], numeric["truth"])
        assert np.array_equal(numeric["trace:sinogram"], numeric["clean"])
        assert np.array_equal(frames[0], frames[2]) and np.array_equal(frames[1], frames[3])
        np.testing.assert_allclose(radon(numeric["truth"]*SPACING, theta=ANGLES, circle=True), numeric["clean"], rtol=0, atol=1e-12)
        np.testing.assert_allclose(iradon(numeric["sinogram:high"], theta=ANGLES, filter_name=None, circle=True)/SPACING,
                                   numeric["bp:160"], rtol=0, atol=1e-12)
        assert np.array_equal(numeric["bp:160"], numeric["fbp:high:none"])
        assert np.array_equal(frames[FRAME_KEYS.index("bp:160")], frames[FRAME_KEYS.index("fbp:high:none")])
        assert meta["bp_projection_hash"] == fingerprint(numeric["sinogram:high"])
        assert meta["bp_window"] == BP_WINDOWS[dataset]
        for key in FRAME_KEYS:
            if key.startswith("bp:") or key.endswith(":none"):
                assert np.array_equal(frames[FRAME_KEYS.index(key)], gray(numeric[key], BP_WINDOWS[dataset]))
        assert frames[FRAME_KEYS.index("fbp:high:none")].max() > 195
        for n in ITERATIONS:
            residual_frame = frames[FRAME_KEYS.index(f"residual:{n}")]
            assert np.array_equal(residual_frame, gray(numeric[f"residual:{n}"], meta["residual_window"], exponent=.5))
            if n:
                assert np.percentile(residual_frame, 95) > 30
        assert np.count_nonzero(numeric["iteration:0"]) == 0
        for level in SIGNALS:
            expected_hash = fingerprint(numeric[f"sinogram:{level}"])
            assert all(meta["metrics"][f"fbp:{level}:{f}"]["projection_hash"] == expected_hash for f in FILTERS)
            assert meta["metrics"][f"fbp:{level}:hann"]["noise_sd"] < meta["metrics"][f"fbp:{level}:ramp"]["noise_sd"]
        assert meta["metrics"]["fbp:low:ramp"]["noise_sd"] > meta["metrics"]["fbp:high:ramp"]["noise_sd"]
        assert .1 < meta["metrics"]["fbp:low:ramp"]["noise_sd"]/.011 < .3
        errors = [r["relative_residual"] for r in meta["iterations"]]
        assert all(a > b for a, b in zip(errors, errors[1:]))
        assert meta["iterations"][-1]["rmse"] > min(r["rmse"] for r in meta["iterations"])
        assert max(p["maximum_centroid_error_px"] for p in meta["point_checks"]) < .1
        path = output/f"{config['media_id']}.webp"
        assert path.stat().st_size < 600*1024
        assert hashlib.sha256(path.read_bytes()).hexdigest() == meta["atlas_sha256"]
        with Image.open(path) as image:
            pixels = np.asarray(image.convert("L"))
            for index, frame in enumerate(frames):
                row, col = divmod(index, 8)
                assert np.array_equal(pixels[row*SIZE:(row+1)*SIZE, col*SIZE:(col+1)*SIZE], frame)
        print(f"Verified {dataset}: same full object, 46 frames, shared projections, readable Poisson noise, true BP/SART, lossless atlas.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--review-only", action="store_true")
    mode.add_argument("--pack-only", action="store_true")
    mode.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    if args.verify_only:
        verify(output)
    elif not args.pack_only:
        for dataset in DATASETS:
            compute(dataset, output)
        review(output)
    if not args.review_only and not args.verify_only:
        pack(output)
        verify(output)
