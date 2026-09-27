"""Small, lossless teaching frames from one reproducible CT forward model.

No medical source images or neural network. Keep the numerical NPZ, review sheet
and metadata outside public/. Only import ldct_projection_v2_atlas.webp.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.transform import iradon, iradon_sart, order_angles_golden_ratio, radon

VERSION = "ldct-projection-v2"
SEED = 2258
SIZE = 160
SPACING = 1.2
ANGLES = np.linspace(0, 180, SIZE, endpoint=False)
SIGNALS = {"low": 160, "medium": 1600, "high": 16000}
FILTERS = ["ramp", "shepp-logan", "hann"]
BP_COUNTS = [1, 2, 4, 8, 24, 160]
ITERATIONS = [0, 1, 2, 4, 8]
WINDOW = [0.005, 0.030]
STRUCTURES = [
    {"id": "bead", "label": "左上的圆块", "x": 35.0, "y": 37.5, "radius": 6.5, "contrast": 0.012},
    {"id": "rod", "label": "左下的小细棒", "x": 30.5, "y": 63.0, "radius": 2.4, "contrast": 0.009},
    {"id": "faint", "label": "右下的浅圆块", "x": 64.5, "y": 63.0, "radius": 4.1, "contrast": 0.0020},
]


def fingerprint(array: np.ndarray) -> str:
    return hashlib.sha256(np.asarray(array, dtype="<f4").tobytes()).hexdigest()


def to_gray(array: np.ndarray, window: tuple[float, float] | list[float]) -> np.ndarray:
    return np.rint(np.clip((array - window[0]) / (window[1] - window[0]), 0, 1) * 255).astype(np.uint8)


def generate(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    yy, xx = np.mgrid[:SIZE, :SIZE]
    circle = (xx - 80)**2 + (yy - 80)**2 < 79**2
    body = (xx - 80)**2 + (yy - 80)**2 <= (SIZE * .42)**2
    truth = np.where(body, .016, .0)
    trace = np.zeros_like(truth)
    structure_checks = []
    for structure in STRUCTURES:
        cx, cy, radius = (structure[k] / 100 * SIZE for k in ["x", "y", "radius"])
        mask = (xx - cx)**2 + (yy - cy)**2 <= radius**2
        contribution = mask * structure["contrast"]
        trace += contribution
        truth += contribution
        # A centroid check catches either horizontal mirroring or sin(theta)'s
        # sign being changed in the browser coordinate helper.
        projection = radon(contribution * SPACING, theta=ANGLES, circle=True)
        centroid = (projection * np.arange(SIZE)[:, None]).sum(axis=0) / projection.sum(axis=0)
        target = 80 + (cx - 80) * np.cos(np.deg2rad(ANGLES)) - (cy - 80) * np.sin(np.deg2rad(ANGLES))
        error = float(np.max(np.abs(centroid - target)))
        assert error < .6, (structure["id"], error)
        structure_checks.append({"id": structure["id"], "maximum_centroid_error_px": error})
    truth[(xx - 100.8)**2 + (yy - 61.6)**2 <= 10.4**2] -= .009
    for cx, radius in [(60.0, 2.8), (70.4, 1.76)]:
        truth[(xx - cx)**2 + (yy - 100.8)**2 <= radius**2] += .009

    clean = radon(truth * SPACING, theta=ANGLES, circle=True)
    trace_sino = radon(trace * SPACING, theta=ANGLES, circle=True)
    frames: dict[str, np.ndarray] = {}
    numeric: dict[str, np.ndarray] = {"truth": truth, "trace_truth": trace, "clean": clean, "trace_sino": trace_sino, "angles": ANGLES}
    frames["trace:truth"] = to_gray(trace, [0, .014])
    frames["trace:sinogram"] = to_gray(trace_sino, [0, float(trace_sino.max())])
    frames["truth"] = to_gray(truth, WINDOW)
    projection_window = [0, float(clean.max() * 1.06)]
    frames["sinogram:clean"] = to_gray(clean, projection_window)
    projections = {}
    metrics = {}
    noise_mask = (xx > 69) & (xx < 91) & (yy > 70) & (yy < 90)
    for signal, incident in SIGNALS.items():
        rng = np.random.default_rng(SEED)
        counts = rng.poisson(incident * np.exp(-clean))
        noisy = -np.log(np.maximum(counts, 1) / incident)
        projections[signal] = noisy
        numeric[f"counts:{signal}"] = counts
        numeric[f"sinogram:{signal}"] = noisy
        frames[f"sinogram:{signal}"] = to_gray(noisy, projection_window)
        for filter_name in FILTERS:
            result = iradon(noisy, theta=ANGLES, filter_name=filter_name, circle=True) / SPACING
            key = f"fbp:{signal}:{filter_name}"
            numeric[key] = result
            frames[key] = to_gray(result, WINDOW)
            metrics[key] = {"noise_sd": float(result[noise_mask].std()), "projection_hash": fingerprint(noisy)}

    # Reveal the geometry of smearing a projection back along its measured
    # direction. Prefix angles are spread over the half-turn, not adjacent.
    # BP has a different amplitude dimension; its fixed common display window
    # is documented rather than quietly windowing each prefix independently.
    full_bp = iradon(trace_sino, theta=ANGLES, filter_name=None, circle=True)
    bp_window = [0, float(full_bp.max() * 1.45)]
    order = list(order_angles_golden_ratio(ANGLES))
    for count in BP_COUNTS:
        selected = order[:count]
        result = iradon(trace_sino[:, selected], theta=ANGLES[selected], filter_name=None, circle=True)
        key = f"bp:{count}"
        frames[key] = to_gray(result, bp_window)
        numeric[key] = result

    # SART here has no neural prior or hidden final-image denoising. Show the
    # actual estimate, its forward projection, and measured-minus-predicted
    # residual after each full pass. The initial estimate is genuinely zero.
    measured = projections["low"]
    estimate = np.zeros_like(truth)
    residual_scale = float(np.percentile(np.abs(measured), 99.5))
    iteration_metrics = []
    for iteration in range(max(ITERATIONS) + 1):
        if iteration:
            estimate = iradon_sart(measured, theta=ANGLES, image=estimate * SPACING, relaxation=.035, clip=(0, .060 * SPACING)) / SPACING
            estimate[~circle] = 0
        if iteration not in ITERATIONS:
            continue
        predicted = radon(estimate * SPACING, theta=ANGLES, circle=True)
        residual = measured - predicted
        frames[f"iteration:{iteration}"] = to_gray(estimate, WINDOW)
        frames[f"forward:{iteration}"] = to_gray(predicted, projection_window)
        # Absolute discrepancy, same scale for all frames. Black is smaller
        # discrepancy, NOT a negative value or proof of a correct diagnosis.
        frames[f"residual:{iteration}"] = to_gray(np.abs(residual), [0, residual_scale])
        numeric[f"iteration:{iteration}"] = estimate.copy()
        numeric[f"forward:{iteration}"] = predicted
        numeric[f"residual:{iteration}"] = residual
        iteration_metrics.append({"iteration": iteration, "relative_residual": float(np.linalg.norm(residual) / np.linalg.norm(measured)), "image_rmse": float(np.sqrt(np.mean((estimate - truth)**2))), "noise_sd": float(estimate[noise_mask].std())})

    # Append new options only: the first 37 tiles remain pixel-identical. None
    # means unity TOTAL response and is actual unfiltered BP of the FULL phantom,
    # not the earlier three-insert teaching BP or Ramp without an extra window.
    full_none = iradon(clean, theta=ANGLES, filter_name=None, circle=True) / SPACING
    none_window = [0, float(full_none.max() * 1.05)]
    for signal in SIGNALS:
        noisy = projections[signal]
        for filter_name in ["none", "cosine", "hamming"]:
            result = iradon(noisy, theta=ANGLES, filter_name=None if filter_name == "none" else filter_name, circle=True) / SPACING
            key = f"fbp:{signal}:{filter_name}"
            frames[key] = to_gray(result, none_window if filter_name == "none" else WINDOW)
            numeric[key] = result
            metrics[key] = {"noise_sd": float(result[noise_mask].std()), "projection_hash": fingerprint(noisy)}

    # The large uniform body dominates an unfiltered BP's low frequencies.
    # Do not "fix" this by sharpening or erasing its DC term after the fact.
    # Stage 3 instead compares ALL six methods on the same sparse test object,
    # retaining known insert positions and adding the two small rods.
    sparse = trace.copy()
    for cx, radius in [(60.0, 2.8), (70.4, 1.76)]:
        sparse[(xx - cx)**2 + (yy - 100.8)**2 <= radius**2] += .009
    sparse_clean = radon(sparse * SPACING, theta=ANGLES, circle=True)
    sparse_counts = np.random.default_rng(SEED).poisson(SIGNALS["high"] * np.exp(-sparse_clean))
    sparse_projection = -np.log(np.maximum(sparse_counts, 1) / SIGNALS["high"])
    numeric["filter:sparse:truth"] = sparse
    numeric["filter:sparse:projection"] = sparse_projection
    sparse_bp = iradon(sparse_projection, theta=ANGLES, filter_name=None, circle=True) / SPACING
    sparse_none_window = [0, float(sparse_bp.max() * 1.05)]
    for filter_name in ["none", "ramp", "shepp-logan", "cosine", "hamming", "hann"]:
        result = iradon(sparse_projection, theta=ANGLES, filter_name=None if filter_name == "none" else filter_name, circle=True) / SPACING
        key = f"filter:sparse:{filter_name}"
        numeric[key] = result
        frames[key] = to_gray(result, sparse_none_window if filter_name == "none" else [0, .014])
        metrics[key] = {"projection_hash": fingerprint(sparse_projection)}

    columns = 8
    rows = int(np.ceil(len(frames) / columns))
    pixels = np.zeros((rows * SIZE, columns * SIZE), dtype=np.uint8)
    frame_records = []
    for index, (key, frame) in enumerate(frames.items()):
        row, column = divmod(index, columns)
        pixels[row * SIZE:(row + 1) * SIZE, column * SIZE:(column + 1) * SIZE] = frame
        frame_records.append({"key": key, "column": column, "row": row, "numeric_hash": fingerprint(numeric[key]) if key in numeric else None})
    atlas_path = output / "ldct_projection_v2_atlas.webp"
    Image.fromarray(pixels).save(atlas_path, "WEBP", lossless=True, method=6)
    with Image.open(atlas_path) as check:
        assert np.array_equal(np.asarray(check.convert("L")), pixels)
    np.savez_compressed(output / "ldct-projection-v2-numerics.npz", **numeric)
    metadata = {"version": VERSION, "seed": SEED, "size": SIZE, "spacing_mm": SPACING, "signal_incident_counts": SIGNALS, "angles": len(ANGLES), "display_window": WINDOW, "projection_window": projection_window, "bp_window": bp_window, "none_full_phantom_window": none_window, "residual_abs_window": [0, residual_scale], "bp_prefix_counts": BP_COUNTS, "bp_angles_degrees": {str(count): ANGLES[order[:count]].tolist() for count in BP_COUNTS}, "iterations": iteration_metrics, "sart_relaxation": .035, "structures": STRUCTURES, "structure_checks": structure_checks, "coordinate_formula": "detector = 80 + (x-80)*cos(theta) - (y-80)*sin(theta), x right and y down", "columns": columns, "rows": rows, "frames": frame_records, "metrics": metrics, "atlas_bytes": atlas_path.stat().st_size, "atlas_sha256": hashlib.sha256(atlas_path.read_bytes()).hexdigest()}
    metadata["stage3_sparse"] = {"projection_hash": fingerprint(sparse_projection), "incident_counts": SIGNALS["high"], "fbp_display_window": [0, .014], "unfiltered_display_window": sparse_none_window, "methods": ["none", "ramp", "shepp-logan", "cosine", "hamming", "hann"], "reason": "Uniform full-body background masks sparse feature shape in unfiltered BP; compare all six methods on identical sparse projections, without post-hoc sharpening."}
    (output / "ldct-projection-v2-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    sheet = Image.new("RGB", (SIZE * columns, (SIZE + 23) * rows), "#08111e")
    draw = ImageDraw.Draw(sheet)
    for i, (key, frame) in enumerate(frames.items()):
        row, col = divmod(i, columns)
        sheet.paste(Image.fromarray(frame).convert("RGB"), (col * SIZE, row * (SIZE + 23)))
        draw.text((col * SIZE + 3, row * (SIZE + 23) + SIZE + 3), key, fill="white")
    sheet.save(output / "review.png")
    print(json.dumps({"path": str(atlas_path), "bytes": atlas_path.stat().st_size, "frames": len(frames), "iteration_metrics": iteration_metrics}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    generate(parser.parse_args().output.resolve())
