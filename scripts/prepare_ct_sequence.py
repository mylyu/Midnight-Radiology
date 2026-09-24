"""Render selected adjacent axial CT slices into a small, controlled preview atlas.

Input is a licensed 3-D CT volume, never a single illustration. Clinical result
images are not touched. Keep source volumes outside the repository and record
their provenance alongside the derived atlas. Requires SimpleITK, numpy, Pillow.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import SimpleITK as sitk


def load_axial(source: Path) -> tuple[np.ndarray, dict]:
    source_files = [source]
    if source.is_dir():
        reader = sitk.ImageSeriesReader()
        ids = reader.GetGDCMSeriesIDs(str(source))
        if len(ids or []) != 1:
            raise ValueError("Select exactly one DICOM series; never concatenate examinations")
        source_files = [Path(name) for name in reader.GetGDCMSeriesFileNames(str(source), ids[0])]
        reader.SetFileNames([str(name) for name in source_files])
        image = reader.Execute()
    else:
        image = sitk.ReadImage(str(source))
    if image.GetDimension() != 3:
        raise ValueError("Input must be one 3-D CT volume")
    # Native coordinates are reoriented then, for an oblique acquisition, resampled
    # to an LPS grid. Axial display: image left is patient right, top is anterior.
    meta = {"sourceFiles": [{"file": item.name, "sha256": hashlib.sha256(item.read_bytes()).hexdigest()}
                            for item in source_files],
            "inputSize": image.GetSize(), "inputSpacingMm": image.GetSpacing(),
            "inputDirection": image.GetDirection(), "inputOriginMm": image.GetOrigin()}
    image = sitk.DICOMOrient(image, "LPS")
    if not np.allclose(np.asarray(image.GetDirection()).reshape(3, 3), np.eye(3), atol=1e-5):
        corners = [image.TransformIndexToPhysicalPoint((x, y, z))
                   for x in (0, image.GetSize()[0] - 1)
                   for y in (0, image.GetSize()[1] - 1)
                   for z in (0, image.GetSize()[2] - 1)]
        lower, upper = np.min(corners, axis=0), np.max(corners, axis=0)
        spacing = np.asarray(image.GetSpacing())
        size = np.ceil((upper - lower) / spacing).astype(int) + 1
        image = sitk.Resample(image, size.tolist(), sitk.Transform(), sitk.sitkLinear,
                              lower.tolist(), spacing.tolist(), np.eye(3).ravel().tolist(),
                              -1024.0, sitk.sitkFloat32)
    data = sitk.GetArrayFromImage(image).astype(np.float32)
    meta.update({"displaySize": image.GetSize(), "displaySpacingMm": image.GetSpacing(),
                 "displayOrientation": "axial LPS; screen left=patient right; screen top=anterior",
                 "valueRange": [float(np.nanmin(data)), float(np.nanmax(data))]})
    return data, meta


def render_frame(plane: np.ndarray, spacing: tuple[float, float], center: float,
                 width: float, size: int) -> Image.Image:
    if width <= 0 or not np.isfinite(plane).all():
        raise ValueError("Invalid CT window or pixels")
    pixels = np.round(np.clip((plane - (center - width / 2)) / width, 0, 1) * 255).astype(np.uint8)
    image = Image.fromarray(pixels)
    # Keep physical aspect ratio; never stretch a rectangular CT field into a square.
    physical = (plane.shape[1] * spacing[0], plane.shape[0] * spacing[1])
    scale = size / max(physical)
    target = tuple(max(1, round(length * scale)) for length in physical)
    image = image.resize(target, Image.Resampling.LANCZOS)
    frame = Image.new("L", (size, size), 0)
    frame.paste(image, ((size - target[0]) // 2, (size - target[1]) // 2))
    return frame


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("source", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--start", type=int, required=True)
    p.add_argument("--count", type=int, default=16)
    p.add_argument("--step", type=int, default=1, help="Native resampled-grid stride; use 1 for adjacent slices")
    p.add_argument("--center", type=float, required=True)
    p.add_argument("--width", type=float, required=True)
    p.add_argument("--size", type=int, default=256)
    p.add_argument("--columns", type=int, default=4)
    p.add_argument("--crop", nargs=4, type=int, metavar=("X", "Y", "WIDTH", "HEIGHT"),
                   help="One fixed axial-grid crop for every frame; never a per-frame tracking crop")
    p.add_argument("--inspect-only", action="store_true")
    args = p.parse_args()
    volume, metadata = load_axial(args.source)
    if args.inspect_only:
        print(json.dumps(metadata, ensure_ascii=False, indent=2))
        return
    indices = [args.start + index * args.step for index in range(args.count)]
    if args.count < 2 or args.step == 0 or min(indices) < 0 or max(indices) >= volume.shape[0]:
        raise ValueError(f"Invalid sequence indices {indices}, volume depth {volume.shape[0]}")
    if args.crop:
        x, y, width, height = args.crop
        if min(x, y) < 0 or min(width, height) < 1 or x + width > volume.shape[2] or y + height > volume.shape[1]:
            raise ValueError("Crop must stay within the same physical field for all frames")
        volume = volume[:, y:y + height, x:x + width]
    frames = [render_frame(volume[index], metadata["displaySpacingMm"][:2],
                            args.center, args.width, args.size) for index in indices]
    rows = math.ceil(args.count / args.columns)
    atlas = Image.new("L", (args.size * args.columns, args.size * rows), 0)
    for index, frame in enumerate(frames):
        atlas.paste(frame, ((index % args.columns) * args.size, (index // args.columns) * args.size))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.output, format="WEBP", lossless=True, method=4)
    # Contact sheet is for development review only, not an in-game labelled image.
    contact = Image.new("RGB", (args.size * args.columns, (args.size + 24) * rows), "#15202a")
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(frames):
        x, y = index % args.columns * args.size, index // args.columns * (args.size + 24)
        contact.paste(frame, (x, y))
        draw.text((x + 4, y + args.size + 4), f"slice {indices[index]}", fill="white")
    contact_path = args.output.with_suffix(".review.png")
    contact.save(contact_path)
    record = {**metadata, "source": str(args.source), "sourceSha256":
              hashlib.sha256(args.source.read_bytes()).hexdigest() if args.source.is_file() else None,
              "indices": indices, "sliceIntervalMm": abs(args.step * metadata["displaySpacingMm"][2]),
              "fixedCropXYWH": args.crop, "center": args.center, "width": args.width,
              "frameWidth": args.size, "frameHeight": args.size, "columns": args.columns,
              "rows": rows, "frameCount": args.count, "atlasSha256":
              hashlib.sha256(args.output.read_bytes()).hexdigest(), "atlasBytes": args.output.stat().st_size,
              "rendering": "Ordered axial planes from one CT series (see slice interval), grayscale window, aspect-preserving resize, lossless WebP",
              "reviewContact": str(contact_path)}
    args.output.with_suffix(".provenance.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
