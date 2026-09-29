"""Low-count physical-phantom STORY demo: unchanged full geometric phantom.

Actual fixed-angle Poisson counts are accumulated before log/FBP. SART-TV then
uses precisely the last cumulative measurement, starting from its FBP. The
fictional machine scene is not evidence these arrays were physically acquired.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.restoration import denoise_tv_chambolle
from skimage.transform import iradon, iradon_sart, radon

spec = importlib.util.spec_from_file_location('phantom_source', Path(__file__).with_name('generate-ldct-short-projections.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

EXPOSURE_VERSION = 'ldct-physical-phantom-exposure-v1'
IR_VERSION = 'ldct-physical-phantom-ir-v1'
EXPOSURE_ID = 'ldct_phantom_exposure_v1'
IR_ID = 'ldct_phantom_iteration_v1'
STEPS = list(range(13))
SIZE = base.SIZE
INCIDENT_PER_UNIT = 24
SEED = 2258
RELAXATION = .055
TV_WEIGHT = .0007
TV_EPS = .0002
TV_MAX_ITER = 40
DISPLAY_LEVELS = 64
SOURCE_DIR = Path(__file__).resolve().parents[2] / 'ldct-display-assets'
MAX_BYTES = 500000


def sha_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_array(array):
    return hashlib.sha256(np.ascontiguousarray(array).tobytes()).hexdigest()


def load_source(source_dir):
    meta = json.loads((source_dir/'phantom-metadata.json').read_text(encoding='utf-8'))
    assert meta['dataset'] == 'phantom' and meta['version'] == 'ldct-short-v2-display'
    with np.load(source_dir/'phantom-numerics.npz', allow_pickle=False) as saved:
        truth, clean = saved['truth'].copy(), saved['clean'].copy()
    assert np.array_equal(truth, base.phantom('phantom'))
    assert np.array_equal(clean, radon(truth*base.SPACING, theta=base.ANGLES, circle=True))
    assert base.fingerprint(truth) == meta['truth_hash']
    assert base.fingerprint(clean) == meta['clean_projection_hash']
    return truth, clean, meta


def gray(array, window):
    pixels = base.gray(array, window)
    return np.rint(np.rint(pixels/255*(DISPLAY_LEVELS-1))*255/(DISPLAY_LEVELS-1)).astype(np.uint8)


def reconstruct(measured):
    return iradon(measured, theta=base.ANGLES, filter_name='ramp', circle=True)/base.SPACING


def accumulate(clean, incident=INCIDENT_PER_UNIT):
    cumulative = np.zeros(clean.shape, dtype=np.int64)
    result = []
    for step in STEPS:
        increment = np.random.default_rng(SEED+10000*step).poisson(incident*np.exp(-clean))
        cumulative = cumulative+increment
        measured = -np.log(np.maximum(cumulative, 1)/(incident*(step+1)))
        result.append({'increment': increment, 'counts': cumulative.copy(), 'sinogram': measured, 'fbp': reconstruct(measured)})
    return result


def update(previous, measured):
    sart = iradon_sart(measured, theta=base.ANGLES, image=previous*base.SPACING,
                       relaxation=RELAXATION, clip=(0, .06*base.SPACING))/base.SPACING
    estimate = denoise_tv_chambolle(sart, weight=TV_WEIGHT, eps=TV_EPS, max_num_iter=TV_MAX_ITER)
    estimate[~base.CIRCLE] = 0
    return estimate, sart


def iterate(measured, initial):
    estimate = initial.copy()
    result = [{'image': estimate.copy()}]
    for n in range(1, 13):
        estimate, sart = update(estimate, measured)
        result.append({'image': estimate.copy(), 'sart_before_tv': sart})
    return result


def pilot(output, source_dir):
    truth, clean, meta = load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    rows = (6, 12, 24)
    sheet = Image.new('RGB', (SIZE*5, (SIZE+28)*len(rows)), '#101b26')
    draw = ImageDraw.Draw(sheet)
    records = []
    for row, incident in enumerate(rows):
        exposure = accumulate(clean, incident)
        ir = iterate(exposure[-1]['sinogram'], exposure[-1]['fbp'])
        keys = [(exposure[0]['fbp'], 'Counts 1'), (exposure[6]['fbp'], 'Counts 7'), (exposure[12]['fbp'], 'Counts 13 / IR0'),
                (ir[6]['image'], 'IR6'), (ir[12]['image'], 'IR12')]
        for col, (array, label) in enumerate(keys):
            x, y = col*SIZE, row*(SIZE+28)
            draw.text((x+4, y+7), f'I0={incident} {label}', fill='white')
            sheet.paste(Image.fromarray(gray(array, meta['display_window'])).convert('RGB'), (x, y+28))
        records.append({'incident_per_unit': incident, 'initial_zero_count_fraction': float(np.mean(exposure[0]['counts'] == 0)),
                        'final_zero_count_fraction': float(np.mean(exposure[-1]['counts'] == 0)),
                        'fbp_final_rmse': float(np.sqrt(np.mean((exposure[-1]['fbp']-truth)**2))),
                        'ir_final_rmse': float(np.sqrt(np.mean((ir[-1]['image']-truth)**2)))})
    sheet.save(output/'phantom-exposure-pilot.png')
    (output/'phantom-exposure-pilot.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'pilot': str(output/'phantom-exposure-pilot.png'), 'records': records}), flush=True)


def pixels_for(frames, media_id):
    if media_id == EXPOSURE_ID:
        return np.concatenate([np.concatenate([frames[f'exposure:{step}:{kind}'] for step in STEPS], axis=1)
                               for kind in ('fbp', 'sinogram')], axis=0)
    return np.concatenate([frames[f'iteration:{step}'] for step in STEPS], axis=1)


def generate(output, source_dir):
    truth, clean, meta = load_source(source_dir)
    output.mkdir(parents=True, exist_ok=True)
    exposures = accumulate(clean)
    iterations = iterate(exposures[-1]['sinogram'], exposures[-1]['fbp'])
    arrays, frames = {'truth': truth, 'clean': clean}, {}
    exposure_records, iteration_records = [], []
    for step, exposure in enumerate(exposures):
        for key, array in exposure.items(): arrays[f'exposure:{step}:{key}'] = array
        frames[f'exposure:{step}:fbp'] = gray(exposure['fbp'], meta['display_window'])
        frames[f'exposure:{step}:sinogram'] = gray(exposure['sinogram'], meta['projection_window'])
        exposure_records.append({'step': step, 'units': step+1, 'seed': SEED+10000*step,
                                 'incident_total': INCIDENT_PER_UNIT*(step+1),
                                 'zero_count_fraction': float(np.mean(exposure['counts'] == 0)),
                                 'input_hash': sha_array(exposure['sinogram']), 'result_hash': sha_array(exposure['fbp']),
                                 'rmse': float(np.sqrt(np.mean((exposure['fbp']-truth)**2)))})
    measured = exposures[-1]['sinogram']
    for n, iteration in enumerate(iterations):
        estimate = iteration['image']
        predicted = radon(estimate*base.SPACING, theta=base.ANGLES, circle=True)
        arrays[f'iteration:{n}'] = estimate
        arrays[f'forward:{n}'] = predicted
        arrays[f'residual:{n}'] = abs(measured-predicted)
        if n: arrays[f'sart_before_tv:{n}'] = iteration['sart_before_tv']
        frames[f'iteration:{n}'] = gray(estimate, meta['display_window'])
        iteration_records.append({'round': n, 'input_hash': sha_array(measured), 'result_hash': sha_array(estimate),
                                  'rmse': float(np.sqrt(np.mean((estimate-truth)**2))),
                                  'relative_residual': float(np.linalg.norm(measured-predicted)/np.linalg.norm(measured))})
    assert np.array_equal(arrays['iteration:0'], arrays['exposure:12:fbp'])
    assert np.array_equal(frames['iteration:0'], frames['exposure:12:fbp'])
    atlases = []
    for media_id, rows in [(EXPOSURE_ID, 2), (IR_ID, 1)]:
        path = output/f'{media_id}.webp'
        pixels = pixels_for(frames, media_id)
        Image.fromarray(pixels).save(path, 'WEBP', lossless=True, method=6)
        with Image.open(path) as image:
            assert np.array_equal(np.asarray(image.convert('L')), pixels)
        atlases.append({'id': media_id, 'columns': 13, 'rows': rows, 'bytes': path.stat().st_size, 'sha256': sha_file(path)})
    assert sum(a['bytes'] for a in atlases) < MAX_BYTES
    np.savez_compressed(output/'phantom-exposure-numerics.npz', **arrays)
    np.savez_compressed(output/'phantom-exposure-frames.npz', **frames)
    metadata = {
        'exposure_version': EXPOSURE_VERSION, 'iteration_version': IR_VERSION,
        'source_version': meta['version'], 'source_numerics_sha256': sha_file(source_dir/'phantom-numerics.npz'),
        'source_metadata_sha256': sha_file(source_dir/'phantom-metadata.json'),
        'truth_hash_float32': meta['truth_hash'], 'clean_projection_hash_float32': meta['clean_projection_hash'],
        'size': SIZE, 'angles': len(base.ANGLES), 'spacing_mm': base.SPACING,
        'incident_per_unit': INCIDENT_PER_UNIT, 'seed': SEED, 'exposure_seeds': [SEED+10000*n for n in STEPS],
        'display_window': meta['display_window'], 'projection_window': meta['projection_window'], 'display_gray_levels': DISPLAY_LEVELS,
        'relaxation': RELAXATION, 'tv_weight': TV_WEIGHT, 'tv_eps': TV_EPS, 'tv_max_num_iter': TV_MAX_ITER,
        'exposure_records': exposure_records, 'iteration_records': iteration_records, 'atlases': atlases,
        'notes': 'Unchanged original full circular geometric phantom. Poisson counts accumulated before log; zero counts floored to one at extremely low signal. SART-TV starts from FINAL cumulative FBP and always reuses that exact measured sinogram. No independent display stretching, anatomical substitution, new exposure during IR or image-only filter.',
        'limits': 'Fictional physical-phantom scene; numerical media are a simulation, not actual scanner raw data. Exposure units have no clinical mA or dose mapping. Extremely low-count early frames include photon-starvation/log-clipping bias. No diagnostic performance claim.'}
    (output/'phantom-exposure-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    sheet = Image.new('RGB', (SIZE*3, (SIZE+28)*2), '#101b26')
    draw = ImageDraw.Draw(sheet)
    for index, (key, label) in enumerate([('exposure:0:fbp', 'First exposure'), ('exposure:6:fbp', 'Exposure 7'), ('exposure:12:fbp', 'Exposure 13'),
                                         ('iteration:0', 'IR 0 = exposure 13'), ('iteration:6', 'IR 6'), ('iteration:12', 'IR 12')]):
        x, y = index%3*SIZE, index//3*(SIZE+28)
        draw.text((x+4, y+7), label, fill='white')
        sheet.paste(Image.fromarray(frames[key]).convert('RGB'), (x, y+28))
    sheet.save(output/'phantom-exposure-review.png')
    print(json.dumps({'generated': True, 'atlases': atlases, 'bytes': sum(a['bytes'] for a in atlases)}), flush=True)


def verify(output, source_dir):
    truth, clean, source_meta = load_source(source_dir)
    meta = json.loads((output/'phantom-exposure-metadata.json').read_text(encoding='utf-8'))
    assert meta['exposure_version'] == EXPOSURE_VERSION and meta['iteration_version'] == IR_VERSION
    assert meta['source_numerics_sha256'] == sha_file(source_dir/'phantom-numerics.npz')
    assert meta['source_metadata_sha256'] == sha_file(source_dir/'phantom-metadata.json')
    assert meta['display_window'] == source_meta['display_window'] and meta['projection_window'] == source_meta['projection_window']
    with np.load(output/'phantom-exposure-numerics.npz', allow_pickle=False) as raw:
        arrays = {key: raw[key] for key in raw.files}
    with np.load(output/'phantom-exposure-frames.npz', allow_pickle=False) as raw:
        frames = {key: raw[key] for key in raw.files}
    assert np.array_equal(truth, arrays['truth']) and np.array_equal(clean, arrays['clean'])
    cumulative = np.zeros(clean.shape, dtype=np.int64)
    for step in STEPS:
        increment = np.random.default_rng(SEED+10000*step).poisson(INCIDENT_PER_UNIT*np.exp(-clean))
        cumulative += increment
        measured = -np.log(np.maximum(cumulative, 1)/(INCIDENT_PER_UNIT*(step+1)))
        assert np.array_equal(arrays[f'exposure:{step}:increment'], increment)
        assert np.array_equal(arrays[f'exposure:{step}:counts'], cumulative)
        assert np.array_equal(arrays[f'exposure:{step}:sinogram'], measured)
        assert np.array_equal(arrays[f'exposure:{step}:fbp'], reconstruct(measured))
        assert np.array_equal(frames[f'exposure:{step}:fbp'], gray(arrays[f'exposure:{step}:fbp'], meta['display_window']))
        assert np.array_equal(frames[f'exposure:{step}:sinogram'], gray(measured, meta['projection_window']))
    for n in STEPS:
        estimate = arrays[f'iteration:{n}']
        assert meta['iteration_records'][n]['input_hash'] == sha_array(arrays['exposure:12:sinogram'])
        assert meta['iteration_records'][n]['result_hash'] == sha_array(estimate)
        assert np.array_equal(frames[f'iteration:{n}'], gray(estimate, meta['display_window']))
    for n in (1, 6, 12):
        estimate, before_tv = update(arrays[f'iteration:{n-1}'], arrays['exposure:12:sinogram'])
        assert np.array_equal(estimate, arrays[f'iteration:{n}'])
        assert np.array_equal(before_tv, arrays[f'sart_before_tv:{n}'])
    assert np.array_equal(arrays['iteration:0'], arrays['exposure:12:fbp'])
    assert np.array_equal(frames['iteration:0'], frames['exposure:12:fbp'])
    for atlas in meta['atlases']:
        path = output/f"{atlas['id']}.webp"
        assert path.stat().st_size == atlas['bytes'] and sha_file(path) == atlas['sha256']
        with Image.open(path) as image:
            assert np.array_equal(np.asarray(image.convert('L')), pixels_for(frames, atlas['id']))
    assert sum(a['bytes'] for a in meta['atlases']) < MAX_BYTES
    print(json.dumps({'verified': True, 'exposure_levels': 13, 'ir_states': 13, 'unchanged_phantom': True,
                      'final_exposure_ir0_exact': True, 'independent_sart_tv_steps': [1, 6, 12],
                      'bytes': sum(a['bytes'] for a in meta['atlases'])}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--source-dir', type=Path, default=SOURCE_DIR)
    parser.add_argument('--pilot', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    operation = verify if args.verify_only else pilot if args.pilot else generate
    operation(args.output.resolve(), args.source_dir.resolve())
