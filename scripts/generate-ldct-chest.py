"""Numerical chest reconstruction teaching data, not a learned model.

Three neighboring transverse sections -> seeded count projections -> identical
input for Ramp FBP and true repeated SART updates with TV regularization.
Only lossless atlases go to the game; sources/metadata/review stay external.

Without --source this reproduces the archived v1 simplified chest. With --source
it uses licensed CT image slices as an image-derived digital object: subsequent
projections/count noise are simulated, NOT the source scanner's raw detector data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from skimage.restoration import denoise_tv_chambolle
from skimage.transform import radon, iradon, iradon_sart, resize

VERSION = 'ldct-chest-v1'
SEED = 28225
SIZE = 192
SPACING = 1.5
ANGLES = np.linspace(0, 180, 192, endpoint=False)
INCIDENT = 20000
WINDOW = [0.001, 0.022]
RELAXATION = .055
TV_WEIGHT = .00030
ITERATIONS = [0, 1, 2, 4, 8]
IMAGE_KEYS = ['truth', 'fbp', *[f'iteration:{n}' for n in ITERATIONS]]
PROJECTION_KEYS = ['sinogram', *[f'forward:{n}' for n in ITERATIONS], *[f'residual:{n}' for n in ITERATIONS]]
Y, X = np.mgrid[:SIZE, :SIZE]
FOV = (X-SIZE//2)**2 + (Y-SIZE//2)**2 < (SIZE//2-1)**2
SOURCE = None
PROJECTION_GRAY_LEVELS = 256


def ellipse(cx, cy, rx, ry, angle=0):
    c, s = np.cos(angle), np.sin(angle)
    dx, dy = X-cx, Y-cy
    return ((dx*c+dy*s)/rx)**2 + ((-dx*s+dy*c)/ry)**2 <= 1


def vessel(x1, y1, x2, y2, r1, r2):
    dx, dy = x2-x1, y2-y1
    t = np.clip(((X-x1)*dx+(Y-y1)*dy)/(dx*dx+dy*dy), 0, 1)
    return (X-(x1+t*dx))**2 + (Y-(y1+t*dy))**2 <= (r1+t*(r2-r1))**2


def chest(layer):
    """Deterministic related 2-D sections; no claims of patient-specific anatomy."""
    z = layer-1
    body = ellipse(96, 97, 84+.3*z, 63-.4*z)
    inner = ellipse(96, 96.5, 78+.3*z, 56-.4*z)
    image = np.zeros((SIZE, SIZE))
    image[body] = .0135
    image[inner] = .0190
    lungs = ellipse(63.5-.3*z, 96.5, 29.5+.2*z, 44.5-.5*z, -.05) | ellipse(129+.2*z, 96, 27.5+.2*z, 43-.5*z, .07)
    # Mediastinal and cardiac impressions interrupt the medial lung contours.
    lungs &= ~ellipse(105+.4*z, 102, 25+.4*z, 27+.5*z, -.25)
    lungs &= ~ellipse(90, 81, 10, 17)
    lungs &= inner
    image[lungs] = (.0046 + .00018*np.sin(X*.37+z*.15)*np.cos(Y*.31-z*.1))[lungs]
    for path in [(82, 98, 68, 80, 2.7, 1.2), (68, 80, 52, 61, 1.2, .65),
                 (82, 98, 49, 110, 2.5, .7), (70, 102, 48, 96, 1.4, .65),
                 (79, 106, 60, 133, 1.9, .6), (60, 133, 48, 125, .75, .5),
                 (116, 89, 133, 66, 2.6, .7), (127, 74, 144, 79, 1.2, .6),
                 (119, 104, 142, 113, 2.4, .7), (132, 110, 141, 130, 1.2, .6)]:
        x1,y1,x2,y2,r1,r2 = path
        region = vessel(x1+.15*z,y1,x2+.25*z,y2+.3*z,r1+.08*z,r2) & lungs
        image[region] = .0145
    # Vessel cross sections change smoothly with layer rather than randomizing.
    for cx,cy,r in [(52,75,1.35),(47,121,1.1),(68,120,1.3),(132,84,1.5),(144,100,1.1),(137,123,1.25)]:
        image[ellipse(cx+.25*z,cy+.2*z,r+.1*z,r+.1*z) & lungs] = .014
    image[ellipse(111+.2*z,129,5,5.2)] = .023
    image[ellipse(96,141,9,7.5)] = .040
    image[ellipse(96,141,6.7,5.3)] = .026
    image[ellipse(96,154,3,7)] = .036
    image[ellipse(96,151,3.3,3.1)] = .006
    for a in np.deg2rad([13,38,62,118,142,167,193,219,242,298,322,347]):
        cx,cy = 96+75*np.cos(a), 96+52*np.sin(a)
        image[ellipse(cx,cy,3.2+.12*z,2.5, a)] = .040
        image[ellipse(cx,cy,1.8,1.2,a)] = .024
    image[ellipse(96,43.5,4,2.5)] = .037
    for cx,cy in [(84,83),(109,80)]:
        image[ellipse(cx,cy,3.4,3.0)] = .024
        image[ellipse(cx,cy,2.2,1.9)] = .0015
    # A small weak known structure exists BEFORE projection in all three layers.
    # It is not an annotation, target erasure, diagnosis or post-hoc insertion.
    cx, cy, radius = 49+.25*z, 83+.2*z, [2.7,3.4,2.7][layer]
    target = ellipse(cx,cy,radius,radius)
    image[target] += .0028
    core = ellipse(cx,cy,radius*.6,radius*.6)
    annulus = ellipse(cx,cy,radius+4.0,radius+4.0) & ~ellipse(cx,cy,radius+1.8,radius+1.8) & lungs
    return image, lungs, core, annulus, {'x':cx,'y':cy,'radius':radius}


def use_open_chest(path):
    """Select only three native adjacent sections; never add a synthetic lesion.

    Metadata and source checksum pin the audited, redistributable Nat_07 source.
    nibabel is required only for this openly licensed NIfTI source mode.
    """
    global VERSION, SPACING, SOURCE, chest, WINDOW, TV_WEIGHT, INCIDENT, PROJECTION_GRAY_LEVELS
    import nibabel as nib
    from scipy import ndimage

    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest == 'a0b9ae7c5d021bf6f072fae7e7b0a7a224e238033eb243fcb0e1268bf6eb413a', 'Unreviewed source volume'
    source = nib.load(path)
    assert source.shape == (512, 512, 1019)
    assert nib.aff2axcodes(source.affine) == ('L', 'A', 'S')
    start = 788
    # Native LAS: transpose x/y then reverse anterior axis for radiological LPS.
    sections = np.asarray(source.dataobj[:, :, start:start+3], dtype=np.float64)
    native_spacing = float(abs(source.affine[0, 0]))
    # A small border keeps the entire body support within the parallel-beam FOV.
    interior = 168
    offset = (SIZE-interior)//2
    SPACING = native_spacing*512/interior
    WINDOW = [0.001, 0.022]
    TV_WEIGHT = .00018
    INCIDENT = 50000
    VERSION = 'ldct-chest-open-v2'
    PROJECTION_GRAY_LEVELS = 64
    prepared = []
    for layer in range(3):
        hu = sections[:, :, layer].T[::-1].copy()
        # Remove table/external lines, not pulmonary anatomy: take the largest
        # connected body support, fill enclosed lung cavities, retain HU inside.
        labels, count = ndimage.label(hu > -500)
        areas = np.bincount(labels.ravel()); areas[0] = 0
        assert count and areas.max() > 20000
        body = ndimage.binary_fill_holes(labels == areas.argmax())
        body = ndimage.binary_dilation(body, iterations=2)
        hu = np.where(body, np.clip(hu, -1000, 2000), -1000)
        attenuation = np.clip((hu+1000)*.00002, 0, .06)
        # Anti-aliased reduction is performed ONCE before forward projection.
        truth = np.zeros((SIZE, SIZE))
        truth[offset:offset+interior, offset:offset+interior] = resize(attenuation, (interior,interior), anti_aliasing=True, preserve_range=True)
        truth[~FOV] = 0
        lung_mask = (truth > .001) & (truth < .008) & ellipse(96,94,65,52)
        # Only for non-diagnostic reconstruction metrics. This ROI samples an
        # existing vascular detail; it is NOT a labelled cancer or standard answer.
        cx,cy = 58,80
        core = ellipse(cx,cy,1.0,1.0)
        annulus = ellipse(cx,cy,4,4) & ~ellipse(cx,cy,2,2)
        prepared.append((truth,lung_mask,core,annulus,{'x':cx,'y':cy,'radius':1.0,'meaning':'unlabelled natural pulmonary detail; no diagnosis'}))
    chest = lambda layer: prepared[layer]
    SOURCE = {
        'title':'AortaSeg-60, Nat_07, source image-derived reconstruction demonstration',
        'authors':'Dania El Rahal; David C. Rotzinger; Guillaume Fahrni',
        'url':'https://zenodo.org/records/18147026',
        'readme_url':'https://zenodo.org/records/18147026/files/README.md?download=1',
        'license':'CC BY 4.0 (author README); Zenodo metadata also lists CC0. Attribution conditions retained conservatively.',
        'license_url':'https://creativecommons.org/licenses/by/4.0/',
        'case':'Nat_07', 'source_sha256':digest,
        'slice_indices_lps_zero_based':[start,start+1,start+2],
        'native_slice_spacing_mm':float(source.header.get_zooms()[2]),
        'native_in_plane_spacing_mm':native_spacing,
        'preparation':'LAS to LPS; largest connected body support filled and dilated 2px removes external table/lines; HU converted to simplified monoenergetic attenuation; anti-aliased 512 to 168, centered in 192 canvas; no inserted lesion.',
        'limitations':'Native CT images, not scanner projection data. Count noise and all reconstruction projections are simulated. No source lung-cancer annotation, no proof the source patient has the fictional disease. Not calibrated clinical LDCT, dose or vendor algorithm.'}


def sha(array):
    return hashlib.sha256(np.asarray(array,dtype='<f4').tobytes()).hexdigest()


def gray(array, window, exponent=1):
    return np.rint(np.clip((array-window[0])/(window[1]-window[0]),0,1)**exponent*255).astype(np.uint8)


def projection_gray(array, window, exponent=1):
    display = gray(array,window,exponent)
    # One shared display quantizer reduces compressed transfer size. Numeric
    # projections/residuals and the 8-bit image atlas are untouched.
    if PROJECTION_GRAY_LEVELS < 256:
        display = np.rint(np.rint(display/255*(PROJECTION_GRAY_LEVELS-1))*255/(PROJECTION_GRAY_LEVELS-1)).astype(np.uint8)
    return display


def generate(output):
    output.mkdir(parents=True, exist_ok=True)
    arrays, records, volumes = {}, [], []
    for layer in range(3):
        truth, lungs, core, annulus, target = chest(layer)
        clean = radon(truth*SPACING, theta=ANGLES, circle=True)
        counts = np.random.default_rng(SEED+layer).poisson(INCIDENT*np.exp(-clean))
        measured = -np.log(np.maximum(counts,1)/INCIDENT)
        fbp = iradon(measured,theta=ANGLES,filter_name='ramp',circle=True)/SPACING
        numeric = {'truth':truth, 'fbp':fbp, 'sinogram':measured, 'clean':clean, 'counts':counts}
        estimate = np.zeros_like(truth)
        noise_region = ellipse(57,115,4.5,4.5) & lungs
        layer_records = []
        for n in range(9):
            if n:
                before = estimate.copy()
                update = iradon_sart(measured,theta=ANGLES,image=estimate*SPACING,relaxation=RELAXATION,clip=(0,.06*SPACING))/SPACING
                estimate = denoise_tv_chambolle(update,weight=TV_WEIGHT,eps=2e-4,max_num_iter=40)
                estimate[~FOV] = 0
                arrays[f'{layer}:sart_before_tv:{n}'] = update
                arrays[f'{layer}:previous:{n}'] = before
            if n not in ITERATIONS:
                continue
            predicted = radon(estimate*SPACING,theta=ANGLES,circle=True)
            numeric[f'iteration:{n}'] = estimate.copy()
            numeric[f'forward:{n}'] = predicted
            numeric[f'residual:{n}'] = abs(measured-predicted)
            layer_records.append({'iteration':n, 'input_hash':sha(measured), 'estimate_hash':sha(estimate),
                'relative_residual':float(np.linalg.norm(measured-predicted)/np.linalg.norm(measured)),
                'rmse':float(np.sqrt(np.mean((estimate-truth)**2))), 'noise_sd':float(estimate[noise_region].std()),
                'target_contrast':float(estimate[core].mean()-estimate[annulus].mean())})
        for key,value in numeric.items(): arrays[f'{layer}:{key}'] = value
        records.append({'layer':layer,'seed':SEED+layer,'target':target,'truth_hash':sha(truth),'projection_hash':sha(measured),
            'fbp_noise_sd':float(fbp[noise_region].std()),'fbp_target_contrast':float(fbp[core].mean()-fbp[annulus].mean()),
            'known_target_contrast':float(truth[core].mean()-truth[annulus].mean()),'iterations':layer_records})
        volumes.append(numeric)
    projection_upper = float(max(np.percentile(v['sinogram'],99.7) for v in volumes))
    projection_window = [0,projection_upper]
    frames = {}
    for layer, numeric in enumerate(volumes):
        for key in IMAGE_KEYS: frames[f'{layer}:{key}'] = gray(numeric[key],WINDOW)
        for key in PROJECTION_KEYS: frames[f'{layer}:{key}'] = projection_gray(numeric[key],projection_window,.5 if key.startswith('residual:') else 1)
    deliveries=[]
    for media_id,keys in [('ldct_chest_v1_images',IMAGE_KEYS),('ldct_chest_v1_projections',PROJECTION_KEYS)]:
        pixels = np.concatenate([np.concatenate([frames[f'{layer}:{key}'] for key in keys],axis=1) for layer in range(3)],axis=0)
        path=output/f'{media_id}.webp'
        Image.fromarray(pixels).save(path,'WEBP',lossless=True,method=6)
        with Image.open(path) as image: assert np.array_equal(np.asarray(image.convert('L')),pixels)
        assert path.stat().st_size<=600*1024
        deliveries.append({'id':media_id,'path':str(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'columns':len(keys),'rows':3,'keys':keys})
    np.savez_compressed(output/'chest-numerics.npz',**arrays)
    np.savez_compressed(output/'chest-frames.npz',**frames)
    meta={'version':VERSION,'seed':SEED,'size':SIZE,'spacing_mm':SPACING,'angles':len(ANGLES),'incident':INCIDENT,
        'image_window':WINDOW,'projection_window':projection_window,'residual_window':projection_window,'residual_exponent':.5,
        'projection_gray_levels':PROJECTION_GRAY_LEVELS,
        'relaxation':RELAXATION,'tv_weight':TV_WEIGHT,'tv_max_iterations':40,'tv_eps':2e-4,'iterations':ITERATIONS,'layers':records,'atlases':deliveries,
        'method':'Full SART projection update every outer iteration, then fixed Chambolle TV proximal-style regularization; not a clinically validated optimizer or image-only postblur.',
        'limits':'Original simplified chest-shaped digital object, not patient images, no calibrated HU/dose, no cone beam/helical/3D/beam-hardening/scatter/motion. Neighboring sections share geometry but are reconstructed independently.'}
    if SOURCE:
        meta['source'] = SOURCE
        meta['limits'] = SOURCE['limitations'] + ' Three real adjacent axial sections are separately reconstructed with the same fixed image window.'
    (output/'chest-metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    review_keys=['truth','fbp','iteration:0','iteration:1','iteration:2','iteration:4','iteration:8']
    sheet=Image.new('RGB',(len(review_keys)*SIZE,(SIZE+24)*3),'#0b1725');draw=ImageDraw.Draw(sheet)
    for layer in range(3):
        for col,key in enumerate(review_keys):
            sheet.paste(Image.fromarray(frames[f'{layer}:{key}']).convert('RGB'),(col*SIZE,layer*(SIZE+24)))
            draw.text((col*SIZE+3,layer*(SIZE+24)+SIZE+3),f'Layer {layer+1} | {key}',fill='white')
    sheet.save(output/'chest-review.png')
    print(json.dumps({'atlases':deliveries,'review':str(output/'chest-review.png'),'metrics':records},ensure_ascii=False),flush=True)


def verify(output):
    """Bounded saved-output audit; no atlas writes or complete regeneration."""
    arrays = np.load(output/'chest-numerics.npz')
    frames = np.load(output/'chest-frames.npz')
    meta = json.loads((output/'chest-metadata.json').read_text(encoding='utf-8'))
    assert meta['version'] == VERSION and meta['image_window'] == WINDOW
    assert meta['seed'] == SEED and meta['iterations'] == ITERATIONS
    for layer in range(3):
        truth, _, _, _, _ = chest(layer)
        assert np.array_equal(truth, arrays[f'{layer}:truth'])
        measured = arrays[f'{layer}:sinogram']
        clean = radon(truth*SPACING,theta=ANGLES,circle=True)
        assert np.array_equal(clean,arrays[f'{layer}:clean'])
        counts = np.random.default_rng(SEED+layer).poisson(INCIDENT*np.exp(-clean))
        assert np.array_equal(counts,arrays[f'{layer}:counts'])
        assert np.array_equal(-np.log(np.maximum(counts,1)/INCIDENT),measured)
        assert all(record['input_hash']==sha(measured) for record in meta['layers'][layer]['iterations'])
        assert not arrays[f'{layer}:iteration:0'].any()
        assert not arrays[f'{layer}:forward:0'].any()
        for key in IMAGE_KEYS:
            assert np.array_equal(frames[f'{layer}:{key}'],gray(arrays[f'{layer}:{key}'],WINDOW))
        for key in PROJECTION_KEYS:
            assert np.array_equal(frames[f'{layer}:{key}'],projection_gray(arrays[f'{layer}:{key}'],meta['projection_window'],.5 if key.startswith('residual:') else 1))
        for n in ITERATIONS:
            predicted = radon(arrays[f'{layer}:iteration:{n}']*SPACING,theta=ANGLES,circle=True)
            assert np.array_equal(predicted,arrays[f'{layer}:forward:{n}'])
            assert np.array_equal(abs(measured-predicted),arrays[f'{layer}:residual:{n}'])
    # Independently repeat one FBP and one non-initial SART+TV step, rather than
    # checking only file shape or running the full eight-iteration generator again.
    measured = arrays['1:sinogram']
    fbp = iradon(measured,theta=ANGLES,filter_name='ramp',circle=True)/SPACING
    assert np.array_equal(fbp,arrays['1:fbp'])
    before = arrays['1:previous:2']
    assert np.array_equal(before,arrays['1:iteration:1'])
    update = iradon_sart(measured,theta=ANGLES,image=before*SPACING,relaxation=RELAXATION,clip=(0,.06*SPACING))/SPACING
    assert np.array_equal(update,arrays['1:sart_before_tv:2'])
    estimate = denoise_tv_chambolle(update,weight=TV_WEIGHT,eps=2e-4,max_num_iter=40)
    estimate[~FOV] = 0
    assert np.array_equal(estimate,arrays['1:iteration:2'])
    assert np.linalg.norm(measured-arrays['1:forward:8']) < np.linalg.norm(measured-arrays['1:forward:1'])
    for atlas in meta['atlases']:
        path = output/f"{atlas['id']}.webp"
        assert path.stat().st_size==atlas['bytes'] and atlas['bytes']<=600*1024
        assert hashlib.sha256(path.read_bytes()).hexdigest()==atlas['sha256']
        pixels=np.concatenate([np.concatenate([frames[f'{layer}:{key}'] for key in atlas['keys']],axis=1) for layer in range(3)],axis=0)
        with Image.open(path) as image: assert np.array_equal(np.asarray(image.convert('L')),pixels)
    print(json.dumps({'verified':True,'layers':3,'frames':len(frames.files),'same_projection':True,'fixed_display_window':True,'independent_sart_tv_step':2,'bytes':sum(a['bytes'] for a in meta['atlases'])}),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('output',type=Path)
    parser.add_argument('--verify-only',action='store_true')
    parser.add_argument('--source',type=Path,help='Audited openly licensed AortaSeg Nat_07 NIfTI, outside the repository')
    args=parser.parse_args()
    if args.source: use_open_chest(args.source.resolve())
    (verify if args.verify_only else generate)(args.output.resolve())
