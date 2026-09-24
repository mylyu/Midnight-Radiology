import assert from 'node:assert/strict';
import { reviewedMediaChanges } from './game-delivery-media.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// The completed voice-only publication retains its exact original scope;
// later Chapter 2 revisions are separately checked against live shared code
// and every original media hash, not silently ignored by an old Git snapshot.
import './ch2-mystery-freeze.mjs';
const root = path.resolve(import.meta.dirname, '../..');
const git = (...args) => execFileSync('git', args, {cwd:root});
const changed = git('diff','--name-only','2d629e8','05889fa','--','app/src','app/public/audio','app/public/assets').toString().trim().split('\n');
assert.deepEqual(changed, [
  'app/public/audio/vox_ch1_fan_mature_20260923.mp3',
  'app/public/audio/vox_ch1_thin_breathless_20260923.mp3',
  'app/public/audio/vox_ch1_worker_bass_20260923.mp3',
  'app/src/game/store.ts',
]);
assert.deepEqual(reviewedMediaChanges(git('diff','--no-renames','--name-only','--diff-filter=MDR','2d629e8','--','app/public/audio','app/public/assets').toString().trim().split('\n').filter(Boolean)), []);
const source = fs.readFileSync(path.join(root,'app/src/game/store.ts'),'utf8');
const old = git('show','2d629e8:app/src/game/store.ts').toString();
const unpatched = source.replace(/    \/\/ Chapter 1 voice-only revision:[\s\S]*?    const src = `[^\n]+\n/, '    const src = `${import.meta.env.BASE_URL}audio/${name}.mp3?v=2`\n');
assert.equal(unpatched.replaceAll('\r',''),old.replaceAll('\r',''));
const record = JSON.parse(fs.readFileSync(path.join(root,'docs/ch1-voices-20260923.json')));
assert.equal(record.takes.length,3);
for(const row of record.takes){
  assert.equal(row.reference_audio_used,false);
  assert(!row.argv.includes('--audio') && !row.argv.includes('--ref_text'));
  const bytes=fs.readFileSync(path.join(root,row.output));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  execFileSync('ffmpeg',['-v','error','-i',path.join(root,row.output),'-f','null','-']);
}
console.log('PASS: three no-reference voices decode and match provenance; original audio/images and story unchanged; only three playback filenames remapped, all old playback behavior preserved.');
