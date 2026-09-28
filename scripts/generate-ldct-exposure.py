"""Accumulate equal simulated photon-count units from the existing chest source.

The first unit is byte-for-byte the existing layer-1 input. Further units are
independent Poisson draws of the same mean, summed BEFORE the logarithm. Every
frame uses the same angles, Ramp FBP and display windows. Only the compact WebP
is deployed; arrays, metadata and the contact sheet stay outside the repository.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.transform import iradon


VERSION = 'ldct-chest-exposure-v1'
MEDIA_ID = 'ldct_chest_exposure_v1'
SOURCE_VERSION = 'ldct-chest-open-v2'
LAYER = 1
SIZE = 192
LEVELS = [1, 2, 3, 4]
SEEDS = [28226, 38226, 48226, 58226]
INCIDENT_PER_UNIT = 50000
MAX_BYTES = 180000
DEFAULT_SOURCE = Path(__file__).resolve().parents[2] / 'ldct-media-polish-assets' / 'chest'


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def array_sha(array):
    """Hash actual numeric storage, with dtype/shape recorded separately."""
    return hashlib.sha256(np.ascontiguousarray(array).tobytes()).hexdigest()


def gray(array, window):
    return np.rint(np.clip((array-window[0])/(window[1]-window[0]), 0, 1)*255).astype(np.uint8)


def projection_gray(array, meta):
    display = gray(array, meta['projection_window'])
    levels = meta['projection_gray_levels']
    return np.rint(np.rint(display/255*(levels-1))*255/(levels-1)).astype(np.uint8)


def load_source(directory):
    meta = json.loads((directory/'chest-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == SOURCE_VERSION
    assert meta['size'] == SIZE and meta['angles'] == 192
    assert meta['incident'] == INCIDENT_PER_UNIT
    assert meta['layers'][LAYER]['seed'] == SEEDS[0]
    assert meta['image_window'] == [0.001, 0.022]
    assert meta['projection_gray_levels'] == 64
    with np.load(directory/'chest-numerics.npz', allow_pickle=False) as stored:
        source = {key: stored[f'{LAYER}:{key}'].copy() for key in ('truth', 'clean', 'counts', 'sinogram', 'fbp')}
    assert all(value.shape == (SIZE, SIZE) for value in source.values())
    assert np.issubdtype(source['counts'].dtype, np.integer)
    expected_counts = np.random.default_rng(SEEDS[0]).poisson(INCIDENT_PER_UNIT*np.exp(-source['clean']))
    assert np.array_equal(expected_counts, source['counts'])
    assert np.array_equal(-np.log(np.maximum(source['counts'], 1)/INCIDENT_PER_UNIT), source['sinogram'])
    # These legacy hashes intentionally use float32, as the chest generator does.
    for key, field in [('truth', 'truth_hash'), ('sinogram', 'projection_hash')]:
        legacy_sha = hashlib.sha256(np.asarray(source[key], dtype='<f4').tobytes()).hexdigest()
        assert legacy_sha == meta['layers'][LAYER][field]
    return source, meta


def reconstruction(sinogram, meta):
    angles = np.linspace(0, 180, meta['angles'], endpoint=False)
    return iradon(sinogram, theta=angles, filter_name='ramp', circle=True)/meta['spacing_mm']


def atlas_pixels(frames):
    return np.concatenate([
        np.concatenate([frames[f'{step}:{kind}'] for step in range(len(LEVELS))], axis=1)
        for kind in ('fbp', 'sinogram')
    ], axis=0)


def check_original_pixels(source_dir, frames, source_meta):
    # Check against the already delivered lossless chest atlases, not only a
    # duplicate renderer. This prevents an initial image jump on entering play.
    for kind, atlas_id in [('fbp', 'ldct_chest_v1_images'), ('sinogram', 'ldct_chest_v1_projections')]:
        atlas = next(record for record in source_meta['atlases'] if record['id'] == atlas_id)
        path = source_dir/f'{atlas_id}.webp'
        assert file_sha(path) == atlas['sha256']
        column = atlas['keys'].index(kind)
        with Image.open(path) as image:
            original = np.asarray(image.convert('L'))[LAYER*SIZE:(LAYER+1)*SIZE, column*SIZE:(column+1)*SIZE]
        assert np.array_equal(frames[f'0:{kind}'], original)


def generate(output, source_dir):
    source, source_meta = load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    expected_per_unit = INCIDENT_PER_UNIT*np.exp(-source['clean'])
    arrays = {'truth': source['truth'], 'clean': source['clean']}
    frames, records = {}, []
    cumulative = np.zeros_like(source['counts'])
    noiseless_fbp = reconstruction(source['clean'], source_meta)
    body = source['truth'] > 0.002
    for step, level in enumerate(LEVELS):
        increment = source['counts'].copy() if step == 0 else np.random.default_rng(SEEDS[step]).poisson(expected_per_unit)
        cumulative = cumulative+increment
        sinogram = -np.log(np.maximum(cumulative, 1)/(INCIDENT_PER_UNIT*level))
        fbp = reconstruction(sinogram, source_meta)
        for key, value in [('increment', increment), ('counts', cumulative), ('sinogram', sinogram), ('fbp', fbp)]:
            arrays[f'{step}:{key}'] = value.copy()
        frames[f'{step}:fbp'] = gray(fbp, source_meta['image_window'])
        frames[f'{step}:sinogram'] = projection_gray(sinogram, source_meta)
        records.append({
            'step': step, 'exposure_units': level, 'seed': SEEDS[step],
            'incident_total': INCIDENT_PER_UNIT*level,
            'increment_sha256': array_sha(increment), 'counts_sha256': array_sha(cumulative),
            'sinogram_sha256': array_sha(sinogram), 'fbp_sha256': array_sha(fbp),
            'sinogram_rmse_vs_clean': float(np.sqrt(np.mean((sinogram-source['clean'])**2))),
            'fbp_rmse_vs_noiseless_fbp_in_body': float(np.sqrt(np.mean((fbp[body]-noiseless_fbp[body])**2))),
        })
    assert np.array_equal(arrays['0:fbp'], source['fbp'])
    assert np.array_equal(arrays['0:sinogram'], source['sinogram'])
    check_original_pixels(source_dir, frames, source_meta)
    path = output/f'{MEDIA_ID}.webp'
    Image.fromarray(atlas_pixels(frames)).save(path, format='WEBP', lossless=True, method=6)
    assert path.stat().st_size < MAX_BYTES
    np.savez_compressed(output/'exposure-numerics.npz', **arrays)
    np.savez_compressed(output/'exposure-frames.npz', **frames)
    metadata = {
        'version': VERSION, 'source_version': SOURCE_VERSION, 'source_layer': LAYER,
        'source_numerics_sha256': file_sha(source_dir/'chest-numerics.npz'),
        'source_metadata_sha256': file_sha(source_dir/'chest-metadata.json'),
        'source': source_meta['source'], 'size': SIZE, 'angles': source_meta['angles'],
        'spacing_mm': source_meta['spacing_mm'], 'incident_per_unit': INCIDENT_PER_UNIT,
        'exposure_levels': LEVELS, 'seeds': SEEDS,
        'image_window': source_meta['image_window'], 'projection_window': source_meta['projection_window'],
        'projection_gray_levels': source_meta['projection_gray_levels'],
        'numeric_hash_format': 'SHA256 of C-contiguous array bytes: counts/increments int64, other arrays float64',
        'records': records,
        'atlas': {'id': MEDIA_ID, 'columns': 4, 'rows': 2, 'row_kinds': ['fbp', 'sinogram'],
                  'bytes': path.stat().st_size, 'sha256': file_sha(path)},
        'method': 'Sum independent equal-mean Poisson count increments at fixed angles; normalize by total incident counts before negative log; reconstruct each cumulative sinogram with Ramp FBP. No smoothing or new projection directions.',
        'limits': 'Simulated exposure units only, with no mapping to clinical mA, mAs or patient dose. Existing source CT noise is part of the digital object. No new lesion or source lung-cancer claim. Not scanner raw projections or a clinical acquisition.',
    }
    (output/'exposure-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    review = Image.new('RGB', (SIZE*4, (SIZE+36)*2), '#10151b')
    draw = ImageDraw.Draw(review)
    for row, kind in enumerate(('fbp', 'sinogram')):
        for step, level in enumerate(LEVELS):
            y = row*(SIZE+36)
            draw.text((step*SIZE+8, y+10), f'{kind.upper()} - {level} exposure unit(s)', fill='#edf2f7')
            review.paste(Image.fromarray(frames[f'{step}:{kind}']).convert('RGB'), (step*SIZE, y+36))
    review.save(output/'exposure-review.png')
    print(json.dumps({'generated': True, **metadata['atlas'], 'output': str(output), 'records': records}), flush=True)


def verify(output, source_dir):
    source, source_meta = load_source(source_dir)
    meta = json.loads((output/'exposure-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == VERSION and meta['source_version'] == SOURCE_VERSION
    assert meta['source_layer'] == LAYER and meta['source'] == source_meta['source']
    assert meta['source_numerics_sha256'] == file_sha(source_dir/'chest-numerics.npz')
    assert meta['source_metadata_sha256'] == file_sha(source_dir/'chest-metadata.json')
    assert meta['exposure_levels'] == LEVELS and meta['seeds'] == SEEDS
    assert meta['incident_per_unit'] == INCIDENT_PER_UNIT
    for key in ('size', 'angles', 'spacing_mm', 'image_window', 'projection_window', 'projection_gray_levels'):
        assert meta[key] == source_meta[key]
    with np.load(output/'exposure-numerics.npz', allow_pickle=False) as saved:
        arrays = {key: saved[key] for key in saved.files}
    with np.load(output/'exposure-frames.npz', allow_pickle=False) as saved:
        frames = {key: saved[key] for key in saved.files}
    assert np.array_equal(arrays['truth'], source['truth'])
    assert np.array_equal(arrays['clean'], source['clean'])
    previous = np.zeros_like(source['counts'])
    for step, level in enumerate(LEVELS):
        expected_increment = np.random.default_rng(SEEDS[step]).poisson(INCIDENT_PER_UNIT*np.exp(-source['clean']))
        increment, counts = arrays[f'{step}:increment'], arrays[f'{step}:counts']
        assert np.array_equal(increment, expected_increment)
        assert np.array_equal(counts, previous+increment)
        assert np.all(counts >= previous)
        measured = -np.log(np.maximum(counts, 1)/(INCIDENT_PER_UNIT*level))
        assert np.array_equal(arrays[f'{step}:sinogram'], measured)
        # Four small FBP checks are bounded; no complete SART regeneration.
        assert np.array_equal(arrays[f'{step}:fbp'], reconstruction(measured, source_meta))
        assert np.array_equal(frames[f'{step}:fbp'], gray(arrays[f'{step}:fbp'], source_meta['image_window']))
        assert np.array_equal(frames[f'{step}:sinogram'], projection_gray(measured, source_meta))
        assert meta['records'][step]['incident_total'] == INCIDENT_PER_UNIT*level
        for key in ('increment', 'counts', 'sinogram', 'fbp'):
            assert meta['records'][step][f'{key}_sha256'] == array_sha(arrays[f'{step}:{key}'])
        previous = counts
    for key in ('counts', 'sinogram', 'fbp'):
        assert np.array_equal(arrays[f'0:{key}'], source[key])
    check_original_pixels(source_dir, frames, source_meta)
    path = output/f'{MEDIA_ID}.webp'
    assert meta['atlas']['columns'] == 4 and meta['atlas']['rows'] == 2
    assert meta['atlas']['row_kinds'] == ['fbp', 'sinogram']
    assert meta['atlas']['bytes'] == path.stat().st_size < MAX_BYTES
    assert meta['atlas']['sha256'] == file_sha(path)
    with Image.open(path) as image:
        assert image.size == (SIZE*4, SIZE*2)
        assert np.array_equal(np.asarray(image.convert('L')), atlas_pixels(frames))
    print(json.dumps({'verified': True, 'original_input_and_pixels_exact': True,
                      'nested_poisson_counts': True, 'same_angles_and_windows': True,
                      'independent_fbp_recomputations': len(LEVELS), **meta['atlas']}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--source-dir', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    (verify if args.verify_only else generate)(args.output.resolve(), args.source_dir.resolve())
