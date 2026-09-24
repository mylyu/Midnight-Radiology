"""Qualitative CT artifact teaching atlases derived from one real axial stack.

The inputs are licensed, pre-windowed PNG exports, NOT HU or raw projections.
We forward-project a display-intensity proxy solely to illustrate inconsistent
views and metal-related streaks. This is not a scanner-accurate simulation, a
diagnostic reconstruction, or a real patient's before/after examination.
The original case-reading images are never accessed or modified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy.ndimage import binary_fill_holes, gaussian_filter, rotate, shift
from skimage.transform import radon, iradon


FIXED_CROP = (0, 0, 345, 468)
SIZE = 256
COLUMNS = 4
ANGLES = np.arange(0.0, 180.0, 1.0)
SEED = 20260925
# These approximate upper posterior dental-arch coordinates were inspected in
# the ORIGINAL 345 x 468 axial field, never in the scout or central brain.
# Only the last three real exports actually intersect this region.
DENTAL_CENTRES = {
    39: ((128, 135), (236, 135)),
    40: ((128, 129), (237, 129)),
    41: ((129, 126), (238, 126)),
}
REFERENCE_LINKS = [
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC9353719/",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC7496341/",
    "https://pure.bangor.ac.uk/ws/portalfiles/portal/7372083/PDB5400-00.pdf",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_frame(source: Path, record: dict) -> tuple[Image.Image, dict]:
    path = source / record["filename"]
    assert sha256(path) == record["sha256"], f"Unreviewed source changed: {path}"
    image = Image.open(path).convert("L")
    assert image.size == (646, 468), f"Check crop for different export size: {path}"
    # Preserve the complete left-hand image field and its physical aspect.
    frame = ImageOps.pad(image.crop(FIXED_CROP), (SIZE, SIZE),
                         method=Image.Resampling.LANCZOS, color=0)
    return frame, {"file": path.name, "index": record["index"],
                   "sha256": record["sha256"], "source": record["source"]}


def backproject(projections: np.ndarray) -> np.ndarray:
    return iradon(projections, theta=ANGLES, output_size=SIZE,
                  filter_name="ramp", interpolation="linear", circle=False)


def motion_frame(frame: Image.Image, index: int) -> tuple[Image.Image, dict]:
    original = np.asarray(frame, dtype=np.float64) / 255.0
    # Different real slices, deterministic small pose variation. No clear frame
    # is slipped into the simulated motion series before the repeat acquisition.
    angle = 3.8 + 0.7 * math.sin(index * 0.31)
    displacement = (1.5, 7.0 + 0.8 * math.cos(index * 0.27))
    moved = rotate(original, angle, reshape=False, order=1, mode="constant", cval=0)
    moved = shift(moved, displacement, order=1, mode="constant", cval=0)
    stable_projection = radon(original, theta=ANGLES, circle=False)
    moved_projection = radon(moved, theta=ANGLES, circle=False)
    changed_views = (ANGLES >= 36) & (ANGLES < 120)
    inconsistent = stable_projection.copy()
    inconsistent[:, changed_views] = moved_projection[:, changed_views]
    # Add only the inconsistency residual, preserving details of the authentic
    # original rather than pretending the PNG can be quantitatively reprocessed.
    residual = backproject(inconsistent - stable_projection)
    simulated = np.clip(original + residual, 0, 1)
    return Image.fromarray(np.rint(simulated * 255).astype(np.uint8)), {
        "sourceIndex": index, "rotationDegrees": angle,
        "translationYXDisplayPixels": displacement,
        "changedProjectionAnglesHalfOpenDegrees": [36, 120],
        "meanAbsolutePixelChange": float(np.mean(np.abs(simulated - original))),
    }


def dental_frame(frame: Image.Image, index: int) -> tuple[Image.Image, dict]:
    if index not in DENTAL_CENTRES:
        return frame.copy(), {"sourceIndex": index, "simulatedMetal": False,
                              "reason": "This real layer does not intersect the reviewed dental region"}
    original = np.asarray(frame, dtype=np.float64) / 255.0
    metal = Image.new("L", (FIXED_CROP[2], FIXED_CROP[3]), 0)
    draw = ImageDraw.Draw(metal)
    for x, y in DENTAL_CENTRES[index]:
        draw.ellipse((x - 7.5, y - 4.5, x + 7.5, y + 4.5), fill=255)
    mask = np.asarray(ImageOps.pad(metal, (SIZE, SIZE),
                                  method=Image.Resampling.LANCZOS, color=0), dtype=np.float64) / 255.0
    # Dimensionless two-energy toy model: the PNG cannot supply attenuation,
    # spectrum, dose, metal composition or actual detector measurements.
    body_scale = 0.025
    body_projection = radon(original, theta=ANGLES, circle=False) * body_scale
    metal_path = radon(mask, theta=ANGLES, circle=False) * 0.55
    transmission = (0.55 * np.exp(-body_projection - 3.0 * metal_path)
                    + 0.45 * np.exp(-body_projection - 1.2 * metal_path))
    rng = np.random.default_rng(SEED + index)
    expected_counts = 7000.0 * transmission
    counts = rng.poisson(expected_counts)
    measured = -np.log(np.maximum(counts, 1.0) / 7000.0)
    ideal = body_projection + (0.55 * 3.0 + 0.45 * 1.2) * metal_path
    # Add corruption only along rays traversing the inserted dental material;
    # avoid presenting routine whole-image noise as the effect of dentures.
    ray_weight = 1.0 - np.exp(-np.square(metal_path / 0.1))
    delta = gaussian_filter((measured - ideal) * ray_weight, sigma=(0.55, 0.0))
    residual = backproject(delta) / body_scale
    # Exterior air is clipped to black in the source brain-window exports. Its
    # underlying values cannot be recovered, so do not brighten it with proxy
    # residuals. A soft object-support gate retains the patient's true anatomy.
    support = gaussian_filter(binary_fill_holes(original > 0.08).astype(float), sigma=0.65)
    simulated = np.clip(original + 0.30 * residual * support, 0, 1)
    simulated = np.maximum(simulated, mask)
    return Image.fromarray(np.rint(simulated * 255).astype(np.uint8)), {
        "sourceIndex": index, "simulatedMetal": True,
        "centresOriginalXY": DENTAL_CENTRES[index], "ellipseRadiiOriginalXY": [7.5, 4.5],
        "seed": SEED + index, "bodyProjectionScale": body_scale,
        "metalPathScale": 0.55, "energyWeights": [0.55, 0.45],
        "dimensionlessMetalCoefficients": [3.0, 1.2],
        "incidentCountsToyModel": 7000, "residualGain": 0.30,
        "rayWeightMetalPathScale": 0.1, "sinogramDetectorGaussianSigma": 0.55,
        "objectSupportThreshold": 0.08, "objectSupportGaussianSigma": 0.65,
        "meanAbsolutePixelChange": float(np.mean(np.abs(simulated - original))),
    }


def save_atlas(output: Path, frames: list[Image.Image], originals: list[dict],
               audit: dict, processing: dict, parameters: list[dict]) -> dict:
    hashes = [hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames]
    assert len(frames) >= 16 and len(set(hashes)) == len(frames), "Real distinct layers required"
    rows = math.ceil(len(frames) / COLUMNS)
    atlas = Image.new("L", (COLUMNS * SIZE, rows * SIZE), 0)
    contact = Image.new("RGB", (COLUMNS * SIZE, rows * (SIZE + 25)), "#15202a")
    draw = ImageDraw.Draw(contact)
    for i, frame in enumerate(frames):
        x, y = i % COLUMNS * SIZE, i // COLUMNS
        atlas.paste(frame, (x, y * SIZE))
        contact.paste(frame, (x, y * (SIZE + 25)))
        suffix = " | simulated" if parameters and parameters[i].get("simulatedMetal", True) else ""
        draw.text((x + 4, y * (SIZE + 25) + SIZE + 4),
                  f"real source #{originals[i]['index']}{suffix}", fill="white")
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, "WEBP", lossless=True, method=4)
    contact.save(output.with_suffix(".review.png"))
    provenance = {
        "author": audit["author"], "sourceLicense": audit["license"],
        "sourceExamination": audit["examination"], "sourceFiles": originals,
        "sourceAuditSha256": sha256(Path(processing["sourceAuditPath"])),
        "indices": [record["index"] for record in originals],
        "fixedCropLTRB": FIXED_CROP, "frameCount": len(frames), "columns": COLUMNS,
        "rows": rows, "frameWidth": SIZE, "frameHeight": SIZE,
        "frameSha256": hashes, "atlasSha256": sha256(output), "atlasBytes": output.stat().st_size,
        "processing": processing, "simulationParametersByFrame": parameters,
        "principleReferences": REFERENCE_LINKS,
        "limitation": "Same-exam pre-windowed PNG, not HU or raw projections. Any artifacts are qualitative teaching simulations added to display-intensity proxies, not measured patient motion, actual dentures, accurate material/spectrum modelling, or real paired repeat scans. Clean control means no ADDED simulation; original export imperfections remain. No diagnostic case image was changed.",
    }
    output.with_suffix(".provenance.json").write_text(json.dumps(provenance, indent=2), encoding="utf-8")
    return {"file": str(output), "frameCount": len(frames), "bytes": output.stat().st_size,
            "sha256": provenance["atlasSha256"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--kind", choices=("all", "motion", "dental"), default="all")
    args = parser.parse_args()
    audit_path = args.source / "source-audit.json"
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    audited = {item["index"]: item for item in audit["files"]}
    families = []
    if args.kind in ("all", "motion"):
        families.append((list(range(10, 34)), "adult-head-plain-v1", "adult-head-motion-v1", motion_frame,
                         "Approximate projection inconsistency from a rigid pose change over 36..119 degrees; 180 parallel-beam angles, ramp-filtered residual added to original display image"))
    if args.kind in ("all", "dental"):
        families.append((list(range(41, 25, -1)), "adult-head-dental-repeat-v1", "adult-head-dental-v1", dental_frame,
                         "Approximate two-energy beam-hardening and photon-starvation residual only for rays crossing simulated upper dental material in source #39..41; other source layers remain unchanged"))
    results = []
    for indices, clean_name, artifact_name, transform, description in families:
        clean, changed, originals, parameters = [], [], [], []
        for index in indices:
            frame, original = source_frame(args.source, audited[index])
            artifact, parameter = transform(frame, index)
            clean.append(frame)
            changed.append(artifact)
            originals.append(original)
            parameters.append(parameter)
        shared = {"sourceAuditPath": str(audit_path), "script": Path(__file__).name,
                  "scriptSha256": sha256(Path(__file__)), "seed": SEED,
                  "projectionAnglesDegrees": [0, 179], "projectionCount": len(ANGLES),
                  "frameProcessing": "Fixed source-panel crop; aspect-preserving resize; original display window; lossless WebP master"}
        results.append(save_atlas(args.output_dir / f"{clean_name}.webp", clean, originals, audit,
                                  {**shared, "simulation": "None: unmodified reference display frames"}, []))
        results.append(save_atlas(args.output_dir / f"{artifact_name}.webp", changed, originals, audit,
                                  {**shared, "simulation": description}, parameters))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
