"""Record reviewed CT presentation assets and their separate licenses.

Run only after visual/protocol review. This does not fetch sources, infer a
diagnosis, silently accept image substitutions, or rewrite the runtime registry.
"""
import argparse
import hashlib
import json
from pathlib import Path

BASELINE = '61172202570b78ada9253a63c65af7137547d8e3'
ASSETS = [
    ('adult-head-plain-v1', 'commons-head', ['c2n1_m7', 'c2n3_repeat_scan', 'c2n3_mystery_scan'], 'Adult head', 'noncontrast', 'none'),
    ('adult-head-motion-v1', 'commons-head', ['c2n3_m5'], 'Adult head', 'noncontrast', 'simulated-motion'),
    ('adult-head-dental-v1', 'commons-head', ['c2d4_metal_scan'], 'Adult skull base and upper dental levels', 'noncontrast', 'simulated-metal'),
    ('adult-head-dental-repeat-v1', 'commons-head', ['c2d4_m1'], 'Adult skull base and upper dental levels', 'noncontrast', 'none'),
    ('adult-neck-cta-v1', 'head-neck-cta-007', ['c2n3_cta_scan'], 'Skull-base portion of head/neck CTA', 'contrast-enhanced CTA', 'none'),
    ('coronary-cta-v1', 'imagecas-103', ['c2n3_coronary_scan'], 'Adult coronary CTA', 'cardiac-phase coronary CTA', 'none'),
    ('chest-plain-v1', 'aortaseg-nat-07', ['c2d2_lung_scan'], 'Adult chest', 'noncontrast', 'none'),
    ('abdomen-plain-v1', 'aortaseg-nat-07', ['c2d2_gut_scan'], 'Adult abdomen', 'noncontrast', 'none'),
    ('urinary-plain-v1', 'aortaseg-nat-07', ['c2n1_p_scan'], 'Adult renal levels', 'noncontrast', 'none'),
    ('lumbar-pelvis-plain-v1', 'aortaseg-nat-07', ['c2d2_trauma_scan'], 'Adult lumbar spine and pelvis', 'noncontrast; bone display window, not a new sharp reconstruction kernel', 'none'),
    ('wrist-bone-v1', 'leuven-wrist', ['c2d2_wrist_scan'], 'Wrist anatomical specimen', 'noncontrast photon-counting CT', 'none'),
    ('aorta-cta-v1', 'aortaseg-dissec-07', ['c2d4_aorta_scan'], 'Adult thoracic aorta', 'arterial-phase CTA', 'none'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_cache', type=Path)
    parser.add_argument('--reviewed', action='store_true')
    args = parser.parse_args()
    if not args.reviewed:
        raise ValueError('Visual and source review must precede this explicit recording step')
    root = Path(__file__).resolve().parents[1]
    cache = args.source_cache.resolve()
    adult = json.loads((cache / 'adult-source-provenance.json').read_text(encoding='utf-8'))
    sources = []
    for source in adult['sources']:
        sources.append({
            'id': source['id'], 'title': source.get('attribution', source['id']),
            'url': source['sourceUrl'], 'authors': source.get('authors') or source['attribution'],
            'license': 'CC-BY-4.0' if source['license'].startswith('CC-BY-4.0') else source['license'],
            'licenseUrl': source['licenseUrl'],
            'commercialRestriction': 'replace-or-obtain-license-before-commercial-use' if source.get('commercialReplacementRequired') else 'none; retain the source license and attribution',
            'limitations': (source.get('limits') or 'Per-case diagnosis and cardiac phase are not supplied; use as a brief acquisition teaching sequence, not a fictional patient diagnostic record.') + ' ' + source.get('licenseConflict', ''),
            'protocolEvidence': source['protocol'], 'publicationUrl': source.get('publicationUrl'),
        })
    for source in sources:
        if source['id'] == 'aortaseg-nat-07':
            source['limitations'] += (' Source has a cardiac pacemaker. The selected lung sequence uses LPS slices 777-846, '
                                      'away from the generator and pronounced lead streaks; it is not an implant-free or fully normal examination. '
                                      'Reviewed coverage includes kidneys, lumbar spine and upper pelvis.')
        if source['id'] == 'aortaseg-dissec-07':
            source['limitations'] += (' Author README says CC BY 4.0 while Zenodo metadata/publication also state CC0. '
                                      'Retain BY 4.0 attribution conservatively, as for Nat 07 from the same release.')
    sources.extend([
        {'id': 'commons-head', 'title': 'CT of a normal brain, axial plane (case 1), 2019',
         'url': 'https://commons.wikimedia.org/wiki/Category:Computed_tomography_of_normal_brain_in_axial_plane_(case_1)',
         'authors': ['Mikael Häggström, M.D.'], 'license': 'CC0-1.0',
         'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/', 'commercialRestriction': 'none',
         'limitations': '18-year-old male; same-examination 4 mm pre-windowed PNG exports, not original HU or detector data. Author reports normal anatomy and consent for online publication. Not the fictional elderly patients; artifact variants are explicitly simulated and not real repeat acquisitions.'},
        {'id': 'leuven-wrist', 'title': 'Multimodal CT Dataset of Cadaveric Wrist Joints, V1 (2024), specimen 7 scan 1',
         'url': 'https://doi.org/10.48804/DWF4RG',
         'authors': ['Jilmen Quintiens', 'Walter Coudyzer', 'Melissa Bevers', 'Evie Vereecke', 'G. Harry van Lenthe'],
         'license': 'CC-BY-SA-4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/',
         'commercialRestriction': 'retain independent BY-SA for this derived atlas; do not relicense it as project NC-SA',
         'limitations': '80-year-old female right cadaveric wrist, not a living fracture case. Specimen preparation has soft-tissue gas. Use as brief bone anatomy presentation only, never fracture evidence. Anonymized DICOM age 001D is not the real age. Native 0.1 mm step decimated to 2 mm sampled interval.'},
    ])
    def portable(value):
        if isinstance(value, dict):
            return {key: portable(item) for key, item in value.items() if key not in ('reviewContact', 'preview')}
        if isinstance(value, list):
            return [portable(item) for item in value]
        if isinstance(value, str):
            return value.replace(str(cache), '<source-cache>')
        return value
    sequences = []
    for name, source_id, scan_ids, anatomy, protocol, artifact in ASSETS:
        provenance = json.loads((cache / 'derived' / f'{name}.provenance.json').read_text(encoding='utf-8'))
        delivery = json.loads((cache / 'derived' / f'{name}.delivery.json').read_text(encoding='utf-8'))
        asset = f'assets/ct-sequences/{name}.webp'
        binary = (root / 'app/public' / asset).read_bytes()
        sha = hashlib.sha256(binary).hexdigest()
        assert sha == delivery['sha256']
        assert len(binary) <= 102400
        assert delivery['masterSha256'] == provenance['atlasSha256']
        assert len(scan_ids) >= 1 and delivery['frameCount'] >= 16
        sequences.append({
            'asset': asset, 'sourceId': source_id, 'sha256': sha, 'bytes': len(binary),
            **{key: delivery[key] for key in ['frameCount', 'columns', 'rows', 'frameWidth', 'frameHeight']},
            'scanIds': scan_ids, 'processing': {**portable(provenance), 'delivery': portable(delivery)},
            'review': {'anatomy': anatomy, 'protocol': protocol, 'ageGroup': 'adult', 'artifact': artifact,
                       'note': 'Reviewed as a brief educational acquisition presentation; not evidence of the fictional patient diagnosis. No lesion circles or answer captions. Final observation images unchanged.'},
        })
    total = sum(item['bytes'] for item in sequences)
    assert total <= 1.2 * 1024 * 1024
    manifest = {'baseline': BASELINE, 'status': 'reviewed',
                'approvedExceptions': [{'scanId': 'c2n5_child_scan', 'reason': 'Author approved original pediatric machine-only scene until an age/protocol-verified child CT series is available.'}],
                'scope': 'Acquisition presentation only. Original diagnostic observation images, voices, rewards and saved state unchanged.',
                'totalBytes': total, 'sources': sources, 'sequences': sequences}
    (root / 'docs/ch2-ct-sequences-assets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    notice = ['Midnight Radiology: Chapter 2 CT presentation sources',
              'These independent third-party assets retain the following source licenses.',
              'Changes: selected same-series slices, display windows/fixed crops where applicable, aspect-preserving resize, lossy WebP for a 3-second teaching presentation.',
              'Motion/dental artifact versions are simulations, not real clinical before/after acquisitions. See repository docs/ch2-ct-sequences-assets.json for methods and hashes.',
              'Future commercial release: replace all ImageCAS derivatives or obtain separate applicable permission. Project ownership does not waive third-party NC restrictions.\n']
    for source in sources:
        authors = '; '.join(source['authors']) if isinstance(source['authors'], list) else source['authors']
        notice.extend([source['title'], f'Authors: {authors}', source['url'],
                       f"License: {source['license']} — {source['licenseUrl']}",
                       f"Restrictions/limitations: {source['commercialRestriction']}. {source['limitations']}",
                       'Derived files: ' + ', '.join(item['asset'] for item in sequences if item['sourceId'] == source['id']), ''])
    (root / 'app/public/ct-sequences-sources.txt').write_text('\n'.join(notice) + '\n', encoding='utf-8')
    print(json.dumps({'atlases': len(sequences), 'scanEntrances': sum(len(row['scanIds']) for row in sequences), 'totalBytes': total}))


if __name__ == '__main__':
    main()
