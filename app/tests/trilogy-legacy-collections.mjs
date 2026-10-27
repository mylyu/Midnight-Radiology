// Run after the ordinary media manifest generation, no browser/playthrough needed.
// node --import tsx tests/trilogy-legacy-collections.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ownedTrilogyHistory } from '../src/game/trilogy-collections.ts'
import { chapterSaveAssets } from '../src/game/chapter-save-assets.ts'
import { TRILOGY } from '../src/game/trilogy-registry.ts'
import { freshState } from '../src/game/store.ts'

const chapter = TRILOGY.ch3
const state = freshState('f')
const before = structuredClone(state)
assert.deepEqual(ownedTrilogyHistory(chapter, state), { cards: [], badges: [] }, 'New saves have no retired goals')
for (const id of ['ch4', 'ch5']) {
  assert.deepEqual(ownedTrilogyHistory(TRILOGY[id], state), { cards: [], badges: [] }, 'Unconfigured chapters keep their current collections')
}
assert.deepEqual(state, before, 'Reading history never changes a save')

assert.deepEqual(Object.keys(chapter.legacyCards).sort(), ['c3_bedside', 'c3_mirror'])
assert.deepEqual(Object.keys(chapter.legacyBadges).sort(), ['c3_cart_ready', 'c3_gel_account', 'c3_second_angle'])
for (const id of Object.keys(chapter.legacyCards)) assert(!chapter.cards[id], `${id}: not an active card goal`)
for (const id of Object.keys(chapter.legacyBadges)) assert(!chapter.badges[id], `${id}: not an active badge goal`)
const old = { ...state, cards: ['c3_mirror'], badges: ['c3_second_angle'] }
const history = ownedTrilogyHistory(chapter, old)
assert.deepEqual(history.cards.map(([id]) => id), ['c3_mirror'])
assert.deepEqual(history.badges.map(([id]) => id), ['c3_second_angle'])
assert(!history.cards.some(([id]) => id === 'c3_bedside'), 'Do not reveal unearned retired cards')

const manifest = JSON.parse(readFileSync(new URL('../src/lib/media-manifest.generated.json', import.meta.url), 'utf8'))
const catalog = JSON.parse(readFileSync(new URL('../src/lib/image-assets.catalog.json', import.meta.url), 'utf8'))
assert.equal(manifest.legacyCardImages.c3_mirror, 'us_mirror')
const mirrorPath = `assets/${catalog.us_mirror}`
assert(manifest.assets[mirrorPath], 'Historical art retains verified download metadata')
assert(!manifest.chapters.ch3.includes(mirrorPath), 'Do not download retired case art for all new players')
assert(!chapterSaveAssets(state).includes('us_mirror'))
assert(chapterSaveAssets(old).includes('us_mirror'), 'Owned legacy art is included before entering offline play')
assert.deepEqual(old.cards, ['c3_mirror'], 'Asset lookup does not rewrite old rewards')
console.log('PASS trilogy legacy collections: owned-only history, active targets, saved-only media')
