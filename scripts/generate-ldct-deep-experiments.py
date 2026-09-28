"""Extend manual LDCT exposure and actual SART-TV states without replacing old frames.

Existing native CT images remain the source of SIMULATED projections; neither
the fictional physical-phantom scene nor the patient's story is a claim that
these media were acquired from that scanner. Raw arrays and review stay external.
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

SIZE = 192
SOURCE_VERSION = 'ldct-chest-open-v2'
EXPOSURE_VERSION = 'ldct-chest-exposure-v2'
CHEST_VERSION = 'ldct-chest-iterations-v3'
EXPOSURE_ID = 'ldct_chest_exposure_v2_extra'
CHEST_ID = 'ldct_chest_iterations_v3_extra'
EXPOSURES = list(range(1, 14))
EXTRA_EXPOSURES = list(range(4, 13))
ITERATIONS = list(range(13))
EXTRA_ITERATIONS = [3, 5, 6, 7, 9, 10, 11, 12]
OLD_ITERATIONS = [0, 1, 2, 4, 8]
SEEDS = [28226 + step * 10000 for step in range(13)]
MAX_BYTES = 500000
SOURCE_DIR = Path(__file__).resolve().parents[2] / 'ldct-media-polish-assets' / 'chest'
OLD_EXPOSURE_DIR = Path(__file__).resolve().parents[2] / 'ldct-exposure-assets'
Y, X = np.mgrid[:SIZE, :SIZE]
FOV = (X-SIZE//2)**2 + (Y-SIZE//2)**2 < (SIZE//2-1)**2


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def array_sha(array):
    return hashlib.sha256(np.ascontiguousarray(array).tobytes()).hexdigest()


def gray(array, window):
    return np.rint(np.clip((array-window[0])/(window[1]-window[0]), 0, 1)*255).astype(np.uint8)


def projection_gray(array, meta):
    pixels = gray(array, meta['projection_window'])
    levels = meta['projection_gray_levels']
    return np.rint(np.rint(pixels/255*(levels-1))*255/(levels-1)).astype(np.uint8)


def load_source(directory):
    meta = json.loads((directory/'chest-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == SOURCE_VERSION
    assert meta['size'] == SIZE and meta['angles'] == SIZE
    assert meta['incident'] == 50000 and meta['projection_gray_levels'] == 64
    assert meta['image_window'] == [0.001, 0.022]
    assert meta['relaxation'] == .055 and meta['tv_weight'] == .00018
    with np.load(directory/'chest-numerics.npz', allow_pickle=False) as stored:
        source = {key: stored[key].copy() for key in stored.files}
    return source, meta


def sart_step(previous, measured, meta):
    angles = np.linspace(0, 180, meta['angles'], endpoint=False)
    spacing = meta['spacing_mm']
    update = iradon_sart(measured, theta=angles, image=previous*spacing,
                         relaxation=meta['relaxation'], clip=(0, .06*spacing))/spacing
    estimate = denoise_tv_chambolle(update, weight=meta['tv_weight'],
                                   eps=meta['tv_eps'], max_num_iter=meta['tv_max_iterations'])
    estimate[~FOV] = 0
    return estimate, update


def fbp(sinogram, meta):
    angles = np.linspace(0, 180, meta['angles'], endpoint=False)
    return iradon(sinogram, theta=angles, filter_name='ramp', circle=True)/meta['spacing_mm']


def pixels_for(media_id, frames):
    if media_id == EXPOSURE_ID:
        return np.concatenate([
            np.concatenate([frames[f'exposure:{step}:{kind}'] for step in EXTRA_EXPOSURES], axis=1)
            for kind in ('fbp', 'sinogram')
        ], axis=0)
    return np.concatenate([
        np.concatenate([frames[f'{layer}:iteration:{n}'] for n in EXTRA_ITERATIONS], axis=1)
        for layer in range(3)
    ], axis=0)


def check_legacy(source, frames, source_dir, old_exposure_dir, arrays, meta):
    with np.load(old_exposure_dir/'exposure-numerics.npz', allow_pickle=False) as old:
        for step in range(4):
            for kind in ('increment', 'counts', 'sinogram', 'fbp'):
                assert np.array_equal(arrays[f'exposure:{step}:{kind}'], old[f'{step}:{kind}'])
    with np.load(old_exposure_dir/'exposure-frames.npz', allow_pickle=False) as old:
        for step in range(4):
            for kind in ('fbp', 'sinogram'):
                assert np.array_equal(frames[f'exposure:{step}:{kind}'], old[f'{step}:{kind}'])
    source_atlas = next(item for item in meta['atlases'] if item['id'] == 'ldct_chest_v1_images')
    with Image.open(source_dir/'ldct_chest_v1_images.webp') as image:
        original = np.asarray(image.convert('L'))
    for layer in range(3):
        for n in OLD_ITERATIONS:
            for kind in ('iteration', 'forward', 'residual'):
                key = f'{layer}:{kind}:{n}'
                assert np.array_equal(arrays[key], source[key]), key
            column = source_atlas['keys'].index(f'iteration:{n}')
            assert np.array_equal(frames[f'{layer}:iteration:{n}'],
                                  original[layer*SIZE:(layer+1)*SIZE, column*SIZE:(column+1)*SIZE])


def generate(output, source_dir, old_exposure_dir):
    source, meta = load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    arrays, frames, exposure_records, iteration_records = {}, {}, [], []
    cumulative = np.zeros_like(source['1:counts'])
    expected = meta['incident']*np.exp(-source['1:clean'])
    noiseless = fbp(source['1:clean'], meta)
    body = source['1:truth'] > .002
    for step, level in enumerate(EXPOSURES):
        increment = np.random.default_rng(SEEDS[step]).poisson(expected)
        cumulative = cumulative + increment
        measured = -np.log(np.maximum(cumulative, 1)/(meta['incident']*level))
        estimate = fbp(measured, meta)
        for kind, value in [('increment', increment), ('counts', cumulative), ('sinogram', measured), ('fbp', estimate)]:
            arrays[f'exposure:{step}:{kind}'] = value.copy()
        frames[f'exposure:{step}:fbp'] = gray(estimate, meta['image_window'])
        frames[f'exposure:{step}:sinogram'] = projection_gray(measured, meta)
        exposure_records.append({
            'step': step, 'units': level, 'seed': SEEDS[step], 'incident_total': meta['incident']*level,
            'input_hash': array_sha(measured),
            'fbp_rmse_vs_noiseless_in_body': float(np.sqrt(np.mean((estimate[body]-noiseless[body])**2))),
        })
    angles = np.linspace(0, 180, meta['angles'], endpoint=False)
    for layer in range(3):
        measured = source[f'{layer}:sinogram']
        estimate = np.zeros_like(source[f'{layer}:truth'])
        records = []
        for n in ITERATIONS:
            if n:
                arrays[f'{layer}:previous:{n}'] = estimate.copy()
                estimate, update = sart_step(estimate, measured, meta)
                arrays[f'{layer}:sart_before_tv:{n}'] = update
            predicted = radon(estimate*meta['spacing_mm'], theta=angles, circle=True)
            arrays[f'{layer}:iteration:{n}'] = estimate.copy()
            arrays[f'{layer}:forward:{n}'] = predicted
            arrays[f'{layer}:residual:{n}'] = abs(measured-predicted)
            frames[f'{layer}:iteration:{n}'] = gray(estimate, meta['image_window'])
            records.append({'iteration': n, 'input_hash': array_sha(measured), 'estimate_hash': array_sha(estimate),
                            'relative_residual': float(np.linalg.norm(measured-predicted)/np.linalg.norm(measured)),
                            'rmse': float(np.sqrt(np.mean((estimate-source[f'{layer}:truth'])**2)))})
        iteration_records.append({'layer': layer, 'records': records})
    check_legacy(source, frames, source_dir, old_exposure_dir, arrays, meta)
    atlases = []
    for media_id, columns, rows in [(EXPOSURE_ID, 9, 2), (CHEST_ID, 8, 3)]:
        path = output/f'{media_id}.webp'
        pixels = pixels_for(media_id, frames)
        Image.fromarray(pixels).save(path, 'WEBP', lossless=True, method=6)
        with Image.open(path) as image:
            assert np.array_equal(np.asarray(image.convert('L')), pixels)
        atlases.append({'id': media_id, 'columns': columns, 'rows': rows,
                        'bytes': path.stat().st_size, 'sha256': file_sha(path)})
    assert sum(item['bytes'] for item in atlases) <= MAX_BYTES
    np.savez_compressed(output/'deep-numerics.npz', **arrays)
    np.savez_compressed(output/'deep-frames.npz', **frames)
    metadata = {
        'exposure_version': EXPOSURE_VERSION, 'chest_version': CHEST_VERSION,
        'source_version': SOURCE_VERSION, 'source': meta['source'],
        'source_numerics_sha256': file_sha(source_dir/'chest-numerics.npz'),
        'source_metadata_sha256': file_sha(source_dir/'chest-metadata.json'),
        'source_parameters': {key: meta[key] for key in ('size', 'spacing_mm', 'angles', 'incident', 'image_window',
                                                        'projection_window', 'projection_gray_levels', 'relaxation',
                                                        'tv_weight', 'tv_eps', 'tv_max_iterations')},
        'exposure_seeds': SEEDS, 'exposure_records': exposure_records, 'iteration_records': iteration_records,
        'extra_exposure_steps': EXTRA_EXPOSURES, 'extra_iterations': EXTRA_ITERATIONS, 'atlases': atlases,
        'legacy_array_and_pixel_exact': True,
        'limits': 'Image-derived simulated photon counts and SART-TV reconstruction, not physical scanner acquisition or clinical dose. Same licensed anatomy/position/window; no inserted lesion. Physical-phantom story is fictional. Dense forward/residual arrays are retained externally but are not deployed or approximated by nearest-checkpoint images.',
    }
    (output/'deep-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    # One bounded visual sheet: first/middle/last counts and same-layer states.
    columns = [('exposure:0:fbp', 'Exposure 1'), ('exposure:6:fbp', 'Exposure 7'), ('exposure:12:fbp', 'Exposure 13'),
               ('1:iteration:1', 'SART-TV 1'), ('1:iteration:6', 'SART-TV 6'), ('1:iteration:12', 'SART-TV 12')]
    sheet = Image.new('RGB', (3*SIZE, 2*(SIZE+28)), '#10151b')
    draw = ImageDraw.Draw(sheet)
    for index, (key, label) in enumerate(columns):
        x, y = index % 3*SIZE, index//3*(SIZE+28)
        draw.text((x+6, y+7), label, fill='white')
        sheet.paste(Image.fromarray(frames[key]).convert('RGB'), (x, y+28))
    sheet.save(output/'deep-review.png')
    print(json.dumps({'generated': True, 'atlases': atlases, 'total_bytes': sum(item['bytes'] for item in atlases),
                      'legacy_exact': True, 'output': str(output)}), flush=True)


def verify(output, source_dir, old_exposure_dir):
    source, meta = load_source(source_dir)
    delivery = json.loads((output/'deep-metadata.json').read_text(encoding='utf-8'))
    assert delivery['exposure_version'] == EXPOSURE_VERSION and delivery['chest_version'] == CHEST_VERSION
    assert delivery['source'] == meta['source']
    assert delivery['source_numerics_sha256'] == file_sha(source_dir/'chest-numerics.npz')
    assert delivery['source_metadata_sha256'] == file_sha(source_dir/'chest-metadata.json')
    with np.load(output/'deep-numerics.npz', allow_pickle=False) as stored:
        arrays = {key: stored[key] for key in stored.files}
    with np.load(output/'deep-frames.npz', allow_pickle=False) as stored:
        frames = {key: stored[key] for key in stored.files}
    previous = np.zeros_like(source['1:counts'])
    for step, level in enumerate(EXPOSURES):
        increment = np.random.default_rng(SEEDS[step]).poisson(meta['incident']*np.exp(-source['1:clean']))
        assert np.array_equal(arrays[f'exposure:{step}:increment'], increment)
        cumulative = arrays[f'exposure:{step}:counts']
        assert np.array_equal(cumulative, previous+increment) and np.all(cumulative >= previous)
        measured = -np.log(np.maximum(cumulative, 1)/(meta['incident']*level))
        assert np.array_equal(arrays[f'exposure:{step}:sinogram'], measured)
        assert np.array_equal(arrays[f'exposure:{step}:fbp'], fbp(measured, meta))
        assert np.array_equal(frames[f'exposure:{step}:fbp'], gray(arrays[f'exposure:{step}:fbp'], meta['image_window']))
        assert np.array_equal(frames[f'exposure:{step}:sinogram'], projection_gray(measured, meta))
        previous = cumulative
    angles = np.linspace(0, 180, meta['angles'], endpoint=False)
    for layer in range(3):
        measured = source[f'{layer}:sinogram']
        for n in ITERATIONS:
            estimate = arrays[f'{layer}:iteration:{n}']
            assert np.array_equal(frames[f'{layer}:iteration:{n}'], gray(estimate, meta['image_window']))
            predicted = radon(estimate*meta['spacing_mm'], theta=angles, circle=True)
            assert np.array_equal(predicted, arrays[f'{layer}:forward:{n}'])
            assert np.array_equal(abs(measured-predicted), arrays[f'{layer}:residual:{n}'])
            record = delivery['iteration_records'][layer]['records'][n]
            assert record['input_hash'] == array_sha(measured) and record['estimate_hash'] == array_sha(estimate)
        assert not arrays[f'{layer}:iteration:0'].any()
    # Independent non-legacy middle and final updates, not a full second generation.
    for n in (6, 12):
        estimate, update = sart_step(arrays[f'1:iteration:{n-1}'], source['1:sinogram'], meta)
        assert np.array_equal(estimate, arrays[f'1:iteration:{n}'])
        assert np.array_equal(update, arrays[f'1:sart_before_tv:{n}'])
    check_legacy(source, frames, source_dir, old_exposure_dir, arrays, meta)
    for atlas in delivery['atlases']:
        path = output/f"{atlas['id']}.webp"
        assert path.stat().st_size == atlas['bytes'] and file_sha(path) == atlas['sha256']
        with Image.open(path) as image:
            assert np.array_equal(np.asarray(image.convert('L')), pixels_for(atlas['id'], frames))
    assert sum(item['bytes'] for item in delivery['atlases']) <= MAX_BYTES
    print(json.dumps({'verified': True, 'legacy_arrays_pixels_exact': True, 'exposure_levels': len(EXPOSURES),
                      'iteration_states_per_slice': len(ITERATIONS), 'slices': 3,
                      'independent_new_sart_steps': [6, 12], 'total_bytes': sum(item['bytes'] for item in delivery['atlases'])}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--source-dir', type=Path, default=SOURCE_DIR)
    parser.add_argument('--old-exposure-dir', type=Path, default=OLD_EXPOSURE_DIR)
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    (verify if args.verify_only else generate)(args.output.resolve(), args.source_dir.resolve(), args.old_exposure_dir.resolve())
