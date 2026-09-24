"""Create a bounded-size delivery atlas from a reviewed lossless CT preview master.

Only for the three-second acquisition presentation, never for observation images
or HU/windowing data. Original pixels, volume and lossless review stay outside the
game package. Each frame is resized independently to avoid neighboring-tile bleed.
"""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('master', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--max-bytes', type=int, default=102400)
    args = parser.parse_args()
    if args.master.resolve() == args.output.resolve():
        raise ValueError('Never overwrite the lossless review master')
    meta = json.loads(args.master.with_suffix('.provenance.json').read_text(encoding='utf-8'))
    original = Image.open(args.master).convert('L')
    columns, rows, count = meta['columns'], meta['rows'], meta['frameCount']
    width, height = meta['frameWidth'], meta['frameHeight']
    assert original.size == (columns * width, rows * height)
    assert width == height, 'This delivery profile currently admits square letterboxed frames only'
    source_sha = hashlib.sha256(args.master.read_bytes()).hexdigest()
    assert source_sha == meta['atlasSha256']
    result = None
    for size, quality in [(192, 45), (192, 38), (192, 30), (160, 45), (160, 38), (160, 30)]:
        atlas = Image.new('L', (columns * size, rows * size), 0)
        for index in range(count):
            x, y = index % columns * width, index // columns * height
            tile = original.crop((x, y, x + width, y + height))
            tile = tile.resize((size, size), Image.Resampling.LANCZOS)
            atlas.paste(tile, (index % columns * size, index // columns * size))
        buffer = io.BytesIO()
        atlas.save(buffer, 'WEBP', quality=quality, lossless=False, method=6)
        content = buffer.getvalue()
        if len(content) <= args.max_bytes:
            result = (size, quality, content)
            break
    if result is None:
        raise ValueError('Atlas exceeds delivery budget; review frame selection instead of silently shipping a large file')
    size, quality, content = result
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(content)
    first = Image.open(io.BytesIO(content)).crop((0, 0, size, size)).resize((64, 64), Image.Resampling.LANCZOS)
    preview_buffer = io.BytesIO()
    first.save(preview_buffer, 'WEBP', quality=18, method=6)
    preview_bytes = preview_buffer.getvalue()
    delivery = {'masterSha256': source_sha, 'masterBytes': args.master.stat().st_size,
                'frameWidth': size, 'frameHeight': size, 'columns': columns, 'rows': rows,
                'frameCount': count, 'format': 'static WebP atlas', 'lossless': False,
                'quality': quality, 'method': 6, 'bytes': len(content),
                'sha256': hashlib.sha256(content).hexdigest(),
                'preview': 'data:image/webp;base64,' + base64.b64encode(preview_bytes).decode('ascii'),
                'previewBytes': len(preview_bytes),
                'maxBytes': args.max_bytes,
                'purpose': 'brief acquisition presentation only; not diagnostic observation or HU data'}
    # Keep the delivery receipt alongside the outside-repo master, not as a second game request.
    args.master.with_suffix('.delivery.json').write_text(json.dumps(delivery, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in delivery.items() if key != 'preview'}, indent=2))


if __name__ == '__main__':
    main()
