"""Visible low-count simulation; projection-driven SART-TV starts from noisy FBP.

Original licensed CT anatomy and fixed windows are reused. New media/version
does not overwrite historical no-noise/zero-initialized experiment recordings.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.restoration import denoise_tv_chambolle
from skimage.transform import iradon_sart, radon

spec = importlib.util.spec_from_file_location('deep_source', Path(__file__).with_name('generate-ldct-deep-experiments.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

VERSION = 'ldct-chest-noisy-v4'
EXPOSURE_VERSION = 'ldct-chest-exposure-v3-noisy'
ITERATION_VERSION = 'ldct-chest-iterations-v4-fbp'
EXPOSURE_ID = 'ldct_chest_noisy_v4_exposure'
CHEST_ID = 'ldct_chest_noisy_v4_iterations'
SIZE = 192
INCIDENT = 2000
TV_WEIGHT = .00045
RELAXATION = .055
GRAY_LEVELS = 64
STEPS = list(range(13))
Y, X = np.mgrid[:SIZE, :SIZE]
FOV = (X-SIZE//2)**2 + (Y-SIZE//2)**2 < (SIZE//2-1)**2


def gray(array, window):
    pixels = base.gray(array, window)
    return np.rint(np.rint(pixels/255*(GRAY_LEVELS-1))*255/(GRAY_LEVELS-1)).astype(np.uint8)


def counts_for(clean, layer, unit=0, incident=INCIDENT):
    return np.random.default_rng(28225 + layer + 10000*unit).poisson(incident*np.exp(-clean))


def measured_from(counts, incident):
    return -np.log(np.maximum(counts, 1)/incident)


def update(previous, measured, meta):
    spacing = meta['spacing_mm']
    theta = np.linspace(0, 180, meta['angles'], endpoint=False)
    sart = iradon_sart(measured, theta=theta, image=previous*spacing,
                       relaxation=RELAXATION, clip=(0, .06*spacing))/spacing
    estimate = denoise_tv_chambolle(sart, weight=TV_WEIGHT, eps=meta['tv_eps'], max_num_iter=meta['tv_max_iterations'])
    estimate[~FOV] = 0
    return estimate, sart


def sequence(source, meta, layer, incident=INCIDENT):
    counts = counts_for(source[f'{layer}:clean'], layer, incident=incident)
    measured = measured_from(counts, incident)
    initial = base.fbp(measured, meta)
    estimate = initial.copy()
    states, before_tv = [estimate.copy()], []
    for n in range(1, 13):
        estimate, sart = update(estimate, measured, meta)
        states.append(estimate.copy())
        before_tv.append(sart)
    return counts, measured, initial, states, before_tv


def pilot(output, source_dir):
    source, meta = base.load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (SIZE*5, (SIZE+26)*3), '#0d1722')
    draw = ImageDraw.Draw(sheet)
    metrics = []
    for row, incident in enumerate((1000, 2000, 4000)):
        counts, measured, initial, states, _ = sequence(source, meta, 1, incident)
        total = sum(counts_for(source['1:clean'], 1, unit, incident) for unit in STEPS)
        thirteen = base.fbp(measured_from(total, incident*13), meta)
        columns = [(initial, 'FBP / start'), (states[1], 'IR 1'), (states[6], 'IR 6'), (states[12], 'IR 12'), (thirteen, 'FBP x13 counts')]
        for col, (array, label) in enumerate(columns):
            x, y = col*SIZE, row*(SIZE+26)
            draw.text((x+4, y+6), f'I0={incident} {label}', fill='white')
            sheet.paste(Image.fromarray(gray(array, meta['image_window'])).convert('RGB'), (x, y+26))
        body = source['1:truth'] > .002
        clean_fbp = base.fbp(source['1:clean'], meta)
        metrics.append({'incident': incident, 'zero_count_fraction': float(np.mean(counts == 0)),
                        'fbp_noise_rmse_vs_noiseless_fbp': float(np.sqrt(np.mean((initial[body]-clean_fbp[body])**2))),
                        'fbp_rmse_vs_object': float(np.sqrt(np.mean((initial-source['1:truth'])**2))),
                        'ir12_rmse_vs_object': float(np.sqrt(np.mean((states[12]-source['1:truth'])**2)))})
    sheet.save(output/'noisy-pilot.png')
    (output/'noisy-pilot.json').write_text(json.dumps(metrics, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'pilot': str(output/'noisy-pilot.png'), 'parameters': {'tv_weight': TV_WEIGHT, 'relaxation': RELAXATION}, 'candidates': metrics}), flush=True)


def atlas_pixels(frames, media_id):
    if media_id == EXPOSURE_ID:
        return np.concatenate([np.concatenate([frames[f'exposure:{n}:{kind}'] for n in STEPS], axis=1)
                               for kind in ('fbp', 'sinogram')], axis=0)
    return np.concatenate([np.concatenate([frames[f'{layer}:iteration:{n}'] for n in STEPS], axis=1)
                           for layer in range(3)], axis=0)


def generate(output, source_dir):
    source, meta = base.load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    arrays, frames, records = {}, {}, []
    theta = np.linspace(0, 180, meta['angles'], endpoint=False)
    for layer in range(3):
        counts, measured, initial, states, before_tv = sequence(source, meta, layer)
        arrays[f'{layer}:counts'] = counts
        arrays[f'{layer}:sinogram'] = measured
        arrays[f'{layer}:fbp'] = initial
        layer_records = []
        for n, estimate in enumerate(states):
            predicted = radon(estimate*meta['spacing_mm'], theta=theta, circle=True)
            arrays[f'{layer}:iteration:{n}'] = estimate
            arrays[f'{layer}:forward:{n}'] = predicted
            arrays[f'{layer}:residual:{n}'] = abs(measured-predicted)
            if n: arrays[f'{layer}:sart_before_tv:{n}'] = before_tv[n-1]
            frames[f'{layer}:iteration:{n}'] = gray(estimate, meta['image_window'])
            layer_records.append({'round': n, 'input_hash': base.array_sha(measured), 'estimate_hash': base.array_sha(estimate),
                                  'rmse': float(np.sqrt(np.mean((estimate-source[f'{layer}:truth'])**2))),
                                  'relative_residual': float(np.linalg.norm(measured-predicted)/np.linalg.norm(measured))})
        records.append({'layer': layer, 'zero_count_fraction': float(np.mean(counts == 0)), 'iterations': layer_records})
    total = np.zeros_like(arrays['1:counts'])
    for step in STEPS:
        increment = counts_for(source['1:clean'], 1, step)
        total = total+increment
        measured = measured_from(total, INCIDENT*(step+1))
        estimate = base.fbp(measured, meta)
        arrays[f'exposure:{step}:increment'] = increment
        arrays[f'exposure:{step}:counts'] = total.copy()
        arrays[f'exposure:{step}:sinogram'] = measured
        arrays[f'exposure:{step}:fbp'] = estimate
        frames[f'exposure:{step}:fbp'] = gray(estimate, meta['image_window'])
        frames[f'exposure:{step}:sinogram'] = gray(measured, meta['projection_window'])
    assert np.array_equal(arrays['exposure:0:fbp'], arrays['1:fbp'])
    assert np.array_equal(arrays['1:fbp'], arrays['1:iteration:0'])
    assert np.array_equal(frames['exposure:0:fbp'], frames['1:iteration:0'])
    atlases = []
    for media_id, rows in [(EXPOSURE_ID, 2), (CHEST_ID, 3)]:
        path = output/f'{media_id}.webp'
        pixels = atlas_pixels(frames, media_id)
        Image.fromarray(pixels).save(path, 'WEBP', lossless=True, method=6)
        with Image.open(path) as image:
            assert np.array_equal(np.asarray(image.convert('L')), pixels)
        atlases.append({'id': media_id, 'columns': 13, 'rows': rows,
                       'bytes': path.stat().st_size, 'sha256': base.file_sha(path)})
    assert sum(a['bytes'] for a in atlases) <= 500000
    np.savez_compressed(output/'noisy-numerics.npz', **arrays)
    np.savez_compressed(output/'noisy-frames.npz', **frames)
    metadata = {
        'version': VERSION, 'exposure_version': EXPOSURE_VERSION, 'iteration_version': ITERATION_VERSION,
        'source_version': meta['version'], 'source': meta['source'],
        'source_numerics_sha256': base.file_sha(source_dir/'chest-numerics.npz'),
        'source_metadata_sha256': base.file_sha(source_dir/'chest-metadata.json'),
        'size': SIZE, 'angles': meta['angles'], 'spacing_mm': meta['spacing_mm'], 'incident_per_unit': INCIDENT,
        'image_window': meta['image_window'], 'projection_window': meta['projection_window'], 'display_gray_levels': GRAY_LEVELS,
        'iteration_initialization': 'same noisy Ramp FBP, exactly equal to first exposure result',
        'relaxation': RELAXATION, 'tv_weight': TV_WEIGHT, 'tv_eps': meta['tv_eps'], 'tv_max_iterations': meta['tv_max_iterations'],
        'exposure_seeds': [28226+10000*n for n in STEPS], 'records': records, 'atlases': atlases,
        'limitations': 'Image-derived simulated projections/counts, not source scanner raw data. No calibrated patient mA/dose or source lung-cancer annotation. Every round uses the SAME low-count input, not the accumulated exposure demo data. SART data-consistency updates plus fixed TV; no image-only blur, no image-specific window or inserted lesion.'}
    (output/'noisy-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    sheet = Image.new('RGB', (SIZE*3, (SIZE+25)*2), '#0d1722')
    draw = ImageDraw.Draw(sheet)
    for index, (key, label) in enumerate([('exposure:0:fbp', 'Counts 1'), ('exposure:6:fbp', 'Counts 7'), ('exposure:12:fbp', 'Counts 13'),
                                         ('1:iteration:0', 'IR start = FBP'), ('1:iteration:6', 'IR 6'), ('1:iteration:12', 'IR 12')]):
        x, y = index%3*SIZE, index//3*(SIZE+25)
        draw.text((x+6, y+6), label, fill='white')
        sheet.paste(Image.fromarray(frames[key]).convert('RGB'), (x, y+25))
    sheet.save(output/'noisy-review.png')
    print(json.dumps({'generated': True, 'atlas_bytes': sum(a['bytes'] for a in atlases), 'atlases': atlases}), flush=True)


def verify(output, source_dir):
    source, original = base.load_source(source_dir)
    meta = json.loads((output/'noisy-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == VERSION and meta['source'] == original['source']
    assert meta['source_numerics_sha256'] == base.file_sha(source_dir/'chest-numerics.npz')
    assert meta['source_metadata_sha256'] == base.file_sha(source_dir/'chest-metadata.json')
    assert meta['incident_per_unit'] == INCIDENT and meta['display_gray_levels'] == GRAY_LEVELS
    assert meta['tv_weight'] == TV_WEIGHT and meta['relaxation'] == RELAXATION
    assert meta['image_window'] == original['image_window'] and meta['projection_window'] == original['projection_window']
    with np.load(output/'noisy-numerics.npz', allow_pickle=False) as raw:
        arrays = {key: raw[key] for key in raw.files}
    with np.load(output/'noisy-frames.npz', allow_pickle=False) as raw:
        frames = {key: raw[key] for key in raw.files}
    for layer in range(3):
        counts = counts_for(source[f'{layer}:clean'], layer)
        measured = measured_from(counts, INCIDENT)
        initial = base.fbp(measured, original)
        assert np.array_equal(arrays[f'{layer}:counts'], counts)
        assert np.array_equal(arrays[f'{layer}:sinogram'], measured)
        assert np.array_equal(arrays[f'{layer}:iteration:0'], initial)
        assert np.array_equal(arrays[f'{layer}:fbp'], initial)
        assert np.count_nonzero(frames[f'{layer}:iteration:0']) > SIZE*SIZE//4
        for n in STEPS:
            estimate = arrays[f'{layer}:iteration:{n}']
            assert np.array_equal(frames[f'{layer}:iteration:{n}'], gray(estimate, meta['image_window']))
            assert meta['records'][layer]['iterations'][n]['input_hash'] == base.array_sha(measured)
            assert meta['records'][layer]['iterations'][n]['estimate_hash'] == base.array_sha(estimate)
    total = np.zeros_like(arrays['1:counts'])
    for n in STEPS:
        increment = counts_for(source['1:clean'], 1, n)
        total = total+increment
        measured = measured_from(total, INCIDENT*(n+1))
        assert np.array_equal(arrays[f'exposure:{n}:increment'], increment)
        assert np.array_equal(arrays[f'exposure:{n}:counts'], total)
        assert np.array_equal(arrays[f'exposure:{n}:sinogram'], measured)
        assert np.array_equal(arrays[f'exposure:{n}:fbp'], base.fbp(measured, original))
        assert np.array_equal(frames[f'exposure:{n}:fbp'], gray(arrays[f'exposure:{n}:fbp'], meta['image_window']))
        assert np.array_equal(frames[f'exposure:{n}:sinogram'], gray(measured, meta['projection_window']))
    for n in (1, 6, 12):
        estimate, sart = update(arrays[f'1:iteration:{n-1}'], arrays['1:sinogram'], original)
        assert np.array_equal(estimate, arrays[f'1:iteration:{n}'])
        assert np.array_equal(sart, arrays[f'1:sart_before_tv:{n}'])
    assert np.array_equal(frames['1:iteration:0'], frames['exposure:0:fbp'])
    for atlas in meta['atlases']:
        path = output/f"{atlas['id']}.webp"
        assert path.stat().st_size == atlas['bytes'] and base.file_sha(path) == atlas['sha256']
        with Image.open(path) as image:
            assert np.array_equal(np.asarray(image.convert('L')), atlas_pixels(frames, atlas['id']))
    assert sum(a['bytes'] for a in meta['atlases']) <= 500000
    print(json.dumps({'verified': True, 'exposure_levels': 13, 'iteration_states': 13, 'layers': 3,
                      'initial_exposure_fbp_exact': True, 'independent_sart_tv_steps': [1, 6, 12],
                      'bytes': sum(a['bytes'] for a in meta['atlases'])}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--source-dir', type=Path, default=base.SOURCE_DIR)
    parser.add_argument('--pilot', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    operation = verify if args.verify_only else pilot if args.pilot else generate
    operation(args.output.resolve(), args.source_dir.resolve())
