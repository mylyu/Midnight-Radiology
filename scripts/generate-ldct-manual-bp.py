"""Small-step direct backprojection atlas from the existing repaired phantom.

Only compute extra unfiltered BP checkpoints; do not regenerate source photons,
FBP variants or SART. Source arrays, fixed window and golden-angle prefix order
remain the same as generate-ldct-short-projections.py.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.transform import iradon, order_angles_golden_ratio

VERSION = 'ldct-manual-bp-v1'
MEDIA_ID = 'ldct_manual_bp_v1'
COUNTS = [1, 2, 4, 8, *range(16, 161, 8)]
SIZE, COLUMNS, ROWS = 160, 6, 4
WINDOW = [1.6, 4.0]
DEFAULT_SOURCE = Path(__file__).resolve().parents[2]/'ldct-display-assets'


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def numeric_sha(array):
    return hashlib.sha256(np.ascontiguousarray(array).tobytes()).hexdigest()


def gray(array):
    return np.rint(np.clip((array-WINDOW[0])/(WINDOW[1]-WINDOW[0]), 0, 1)*255).astype(np.uint8)


def load_source(directory):
    meta = json.loads((directory/'phantom-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == 'ldct-short-v2-display' and meta['dataset'] == 'phantom'
    assert meta['size'] == SIZE and meta['angles'] == 160 and meta['spacing_mm'] == 1.2
    assert meta['bp_signal'] == 'high' and meta['bp_window'] == WINDOW
    with np.load(directory/'phantom-numerics.npz', allow_pickle=False) as saved:
        keys = ['angles', 'sinogram:high', 'fbp:high:none', *[f'bp:{n}' for n in meta['bp_counts']]]
        source = {key: saved[key].copy() for key in keys}
    assert np.array_equal(source['angles'], np.linspace(0, 180, 160, endpoint=False))
    assert source['sinogram:high'].shape == (SIZE, SIZE)
    legacy_hash = hashlib.sha256(np.asarray(source['sinogram:high'], dtype='<f4').tobytes()).hexdigest()
    assert legacy_hash == meta['bp_projection_hash']
    assert np.array_equal(source['bp:160'], source['fbp:high:none'])
    return source, meta


def reconstruct(source, count):
    order = np.array(list(order_angles_golden_ratio(source['angles'])))
    indices = order[:count]
    return iradon(source['sinogram:high'][:, indices], theta=source['angles'][indices],
                  filter_name=None, circle=True)/1.2


def atlas_pixels(frames):
    pixels = np.zeros((SIZE*ROWS, SIZE*COLUMNS), dtype=np.uint8)
    for index, frame in enumerate(frames):
        row, column = divmod(index, COLUMNS)
        pixels[row*SIZE:(row+1)*SIZE, column*SIZE:(column+1)*SIZE] = frame
    return pixels


def check_original(source_dir, source, source_meta, numeric, frames):
    original_path = source_dir/f"{source_meta['media_id']}.webp"
    assert file_sha(original_path) == source_meta['atlas_sha256']
    with Image.open(original_path) as image:
        original = np.asarray(image.convert('L'))
    # Every previous checkpoint, including exact first/final frames, remains.
    for count in source_meta['bp_counts']:
        index = COUNTS.index(count)
        assert np.array_equal(numeric[f'bp:{count}'], source[f'bp:{count}'])
        original_index = source_meta['frame_keys'].index(f'bp:{count}')
        row, column = divmod(original_index, source_meta['columns'])
        pixels = original[row*SIZE:(row+1)*SIZE, column*SIZE:(column+1)*SIZE]
        assert np.array_equal(frames[index], pixels)


def generate(output, source_dir):
    source, source_meta = load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    numeric, frames = {}, []
    for count in COUNTS:
        key = f'bp:{count}'
        # Reuse all six existing checkpoints; the final original uses canonical
        # angle order to remain exactly identical to high-signal no-filter FBP.
        numeric[key] = source[key].copy() if key in source else reconstruct(source, count)
        frames.append(gray(numeric[key]))
    check_original(source_dir, source, source_meta, numeric, frames)
    path = output/f'{MEDIA_ID}.webp'
    Image.fromarray(atlas_pixels(frames)).save(path, 'WEBP', lossless=True, method=6)
    assert path.stat().st_size < 180000
    np.savez_compressed(output/'manual-bp-numerics.npz', **numeric)
    np.savez_compressed(output/'manual-bp-frames.npz', frames=np.stack(frames))
    metadata = {
        'version': VERSION, 'media_id': MEDIA_ID, 'counts': COUNTS,
        'size': SIZE, 'columns': COLUMNS, 'rows': ROWS, 'bp_window': WINDOW,
        'spacing_mm': 1.2, 'source_version': source_meta['version'], 'source_signal': 'high',
        'source_numerics_sha256': file_sha(source_dir/'phantom-numerics.npz'),
        'source_metadata_sha256': file_sha(source_dir/'phantom-metadata.json'),
        'source_projection_sha256_float32': source_meta['bp_projection_hash'],
        'angle_indices_golden_order': list(map(int, order_angles_golden_ratio(source['angles']))),
        'numeric_hashes_float64': {key: numeric_sha(value) for key, value in numeric.items()},
        'atlas_bytes': path.stat().st_size, 'atlas_sha256': file_sha(path),
        'method': 'High-signal measured projection; golden-angle prefixes; direct iradon filter_name=None with its normal angle-count normalization. Fixed [1.6,4.0] display window. Existing checkpoints reused exactly; final canonical angle order preserves exact existing no-filter equality.',
        'limits': 'Original numerical phantom. More backprojected measured directions are not increased exposure, new acquisition or a clinical dose setting. No source geometry, input, filter or window change.',
    }
    (output/'manual-bp-metadata.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
    review = Image.new('RGB', (SIZE*COLUMNS, (SIZE+28)*ROWS), '#111820')
    draw = ImageDraw.Draw(review)
    for index, (count, frame) in enumerate(zip(COUNTS, frames)):
        row, column = divmod(index, COLUMNS)
        x, y = column*SIZE, row*(SIZE+28)
        draw.text((x+6, y+8), f'BP: {count} directions', fill='white')
        review.paste(Image.fromarray(frame).convert('RGB'), (x, y+28))
    review.save(output/'manual-bp-review.png')
    print(json.dumps({'generated': True, 'path': str(path), 'frames': len(COUNTS),
                      'bytes': metadata['atlas_bytes'], 'sha256': metadata['atlas_sha256']}), flush=True)


def verify(output, source_dir):
    source, source_meta = load_source(source_dir)
    meta = json.loads((output/'manual-bp-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == VERSION and meta['media_id'] == MEDIA_ID
    assert meta['counts'] == COUNTS and meta['bp_window'] == WINDOW
    assert meta['source_numerics_sha256'] == file_sha(source_dir/'phantom-numerics.npz')
    assert meta['source_metadata_sha256'] == file_sha(source_dir/'phantom-metadata.json')
    assert meta['source_projection_sha256_float32'] == source_meta['bp_projection_hash']
    assert meta['angle_indices_golden_order'] == list(order_angles_golden_ratio(source['angles']))
    assert max(b-a for a, b in zip(COUNTS, COUNTS[1:])) == 8
    with np.load(output/'manual-bp-numerics.npz', allow_pickle=False) as saved:
        numeric = {key: saved[key] for key in saved.files}
    with np.load(output/'manual-bp-frames.npz', allow_pickle=False) as saved:
        frames = saved['frames'].copy()
    assert frames.shape == (len(COUNTS), SIZE, SIZE)
    for index, count in enumerate(COUNTS):
        key = f'bp:{count}'
        assert np.array_equal(gray(numeric[key]), frames[index])
        assert meta['numeric_hashes_float64'][key] == numeric_sha(numeric[key])
    # Bounded independent calculations cover first, new intermediate and final;
    # the final tolerance accounts only for summation order (same full input).
    for count in (1, 16, 80, 160):
        np.testing.assert_allclose(numeric[f'bp:{count}'], reconstruct(source, count), rtol=0, atol=1e-12)
    check_original(source_dir, source, source_meta, numeric, frames)
    path = output/f'{MEDIA_ID}.webp'
    assert path.stat().st_size == meta['atlas_bytes'] < 180000
    assert file_sha(path) == meta['atlas_sha256']
    with Image.open(path) as image:
        assert image.size == (SIZE*COLUMNS, SIZE*ROWS)
        assert np.array_equal(np.asarray(image.convert('L')), atlas_pixels(frames))
    print(json.dumps({'verified': True, 'frames': len(COUNTS), 'max_increment': 8,
                      'original_six_checkpoints_exact': True, 'fixed_window': WINDOW,
                      'independent_bp_checks': [1, 16, 80, 160], 'bytes': meta['atlas_bytes'],
                      'sha256': meta['atlas_sha256']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--source-dir', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    (verify if args.verify_only else generate)(args.output.resolve(), args.source_dir.resolve())
