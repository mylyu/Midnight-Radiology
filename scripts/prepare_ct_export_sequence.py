"""Pack an author's ordered same-examination CT exports, never repeat a single still.

These are pre-windowed PNG exports, not original HU or detector measurements.
Crop the source viewer's scout/controls once for all frames. Do not change the
window or claim to reconstruct a new clinical series from these exports.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--start', type=int, required=True)
    parser.add_argument('--count', type=int, required=True)
    parser.add_argument('--step', type=int, default=1)
    parser.add_argument('--crop', nargs=4, type=int, required=True, metavar=('LEFT', 'TOP', 'RIGHT', 'BOTTOM'))
    parser.add_argument('--size', type=int, default=256)
    parser.add_argument('--columns', type=int, default=4)
    args = parser.parse_args()
    indices = [args.start + index * args.step for index in range(args.count)]
    if args.count < 2 or args.step == 0:
        raise ValueError('A sequence requires distinct ordered original exports')
    source_audit = json.loads((args.source / 'source-audit.json').read_text(encoding='utf-8'))
    audited = {record['index']: record for record in source_audit['files']}
    frames, originals = [], []
    for index in indices:
        record = audited[index]
        path = args.source / record['filename']
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        assert sha == record['sha256']
        source = Image.open(path).convert('L')
        left, top, right, bottom = args.crop
        if not 0 <= left < right <= source.width or not 0 <= top < bottom <= source.height:
            raise ValueError('Fixed crop must be inside every original image')
        frame = ImageOps.pad(source.crop(args.crop), (args.size, args.size),
                             method=Image.Resampling.LANCZOS, color=0)
        frames.append(frame)
        originals.append({'file': path.name, 'sha256': sha, 'source': record['source']})
    rows = math.ceil(len(frames) / args.columns)
    atlas = Image.new('L', (args.columns * args.size, rows * args.size), 0)
    contact = Image.new('RGB', (args.columns * args.size, rows * (args.size + 24)), '#15202a')
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(frames):
        x, y = index % args.columns * args.size, index // args.columns
        atlas.paste(frame, (x, y * args.size))
        contact.paste(frame, (x, y * (args.size + 24)))
        draw.text((x + 4, y * (args.size + 24) + args.size + 4), f'export {indices[index]}', fill='white')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.output, 'WEBP', lossless=True, method=4)
    contact.save(args.output.with_suffix('.review.png'))
    provenance = {'sourceFiles': originals, 'indices': indices, 'fixedCropLTRB': args.crop,
                  'frameCount': len(frames), 'columns': args.columns, 'rows': rows,
                  'frameWidth': args.size, 'frameHeight': args.size,
                  'atlasSha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
                  'atlasBytes': args.output.stat().st_size,
                  'processing': 'Same-exam source exports, fixed removal of viewer side panel, unchanged source window, aspect-preserving resize, lossless WebP',
                  'limitation': 'Already windowed PNG, not HU/DICOM; no claimed quantitative reconstruction'}
    args.output.with_suffix('.provenance.json').write_text(json.dumps(provenance, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in provenance.items() if key != 'sourceFiles'}, indent=2))


if __name__ == '__main__':
    main()
