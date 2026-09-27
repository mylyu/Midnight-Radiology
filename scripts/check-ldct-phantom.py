"""Bounded numerical/encoding checks for the generated LDCT atlas (no clinical claims)."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.transform import radon

spec = importlib.util.spec_from_file_location("ldct_generator", Path(__file__).with_name("generate-ldct-phantom.py"))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


def check(directory: Path) -> None:
    metadata = json.loads((directory / "ldct-phantom-v1-metadata.json").read_text(encoding="utf-8"))
    source = np.load(directory / "ldct-phantom-v1-numerics.npz")
    atlas_file = directory / "ldct_phantom_v1_atlas.webp"
    pixels = np.asarray(Image.open(atlas_file).convert("L"))
    assert pixels.shape == (480, 2080)
    assert len(metadata["records"]) == 36
    assert hashlib.sha256(atlas_file.read_bytes()).hexdigest() == metadata["atlas_sha256"]
    assert atlas_file.stat().st_size < 600 * 1024
    assert len(source["angles"]) == 240
    for z in range(3):
        truth, _ = generator.phantom(z)
        assert np.allclose(source[f"truth_{z}"], truth, atol=1e-9)
        projection = radon(truth * generator.SPACING_MM, theta=generator.ANGLES, circle=True)
        assert np.allclose(source[f"clean_projection_{z}"], projection, atol=3e-7)
        assert np.array_equal(pixels[z*160:(z+1)*160, 12*160:13*160], generator.display(truth))
        for signal, incident in generator.SIGNALS.items():
            counts = np.random.default_rng(generator.SEED + 100 * z).poisson(incident * np.exp(-projection))
            assert np.array_equal(source[f"counts_{signal}_{z}"], counts), "Noise must be reproducible from recorded seed"
            noisy = -np.log(np.maximum(counts, 1) / incident)
            assert np.allclose(source[f"projection_{signal}_{z}"], noisy, atol=3e-7)
            group = [row for row in metadata["records"] if row["slice"] == z and row["signal"] == signal]
            assert len(group) == 4
            assert len({row["projection_hash"] for row in group}) == 1, "Methods must share noisy projections"
            assert {row["noise_seed"] for row in group} == {generator.SEED + 100 * z}
            for row in group:
                numeric = source[row["key"]]
                # File sources are float32, generation works float64; one gray
                # level at a rounding boundary is the maximum permitted drift.
                tile = pixels[z*160:(z+1)*160, row["column"]*160:(row["column"]+1)*160]
                assert np.abs(tile.astype(int) - generator.display(numeric).astype(int)).max() <= 1
                assert generator.fingerprint(numeric) == row["numeric_hash"]
    rows = {row["key"]: row for row in metadata["records"]}
    assert rows["high_fbp_1"]["uniform_sd"] < rows["low_fbp_1"]["uniform_sd"] / 2
    assert rows["medium_ir3_1"]["uniform_sd"] < rows["medium_fbp_1"]["uniform_sd"] / 2
    assert 0 < rows["medium_ir3_1"]["weak_contrast"] < rows["medium_fbp_1"]["weak_contrast"] * .95
    print(f"PASS: 36 reconstructions + 3 truth slices; common projections/seeds/window; lossless atlas {atlas_file.stat().st_size:,} bytes.")
    print("PASS: high signal reduces noise; strong regularization suppresses noise AND weak contrast in selected medium-signal example.")
    print("These checks do not replace visual review or establish clinical accuracy.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    check(parser.parse_args().directory)
