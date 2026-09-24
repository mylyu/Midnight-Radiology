# Canonical delivery migration guard

The fixed baseline is `c4215b080ec7d5052a86c23cf03b6bd2aa3b980a`.
The author explicitly approved image re-encoding across Chapter 1, DR, DSA and
Chapter 2, not changes to story, answers, stats, rewards, save semantics or window
pixels. Earlier baselines and their source-delta records stay unchanged.

`game-delivery-freeze.mjs` is the new LIVE boundary. The only edited production
files are `prepare-images.mjs`, `App.tsx`, `SceneBackground.tsx` and `image-assets.ts`.
The App change is solely removal of the retired development audition anchor;
the complete remaining App and game modules are protected. Two named catalogs
are allowed, not arbitrary new runtime source.

After review, `node scripts/record_game_delivery_deltas.mjs --record-reviewed`
records exact inverse hunks and separately pins the media manifest and source
ledger in `game-delivery-review.json`. It is not run automatically by tests or
builds. Mutations inside and outside approved hunks fail. Older protection layers
first validate the LIVE layer, then reverse only these exact reviewed changes.

All 197 logical image IDs remain valid. Historical tests retain their independent
source hashes and observation `assetVersion` identities. A migration adapter
checks the actual current delivery file against its separately reviewed hash
before comparing the old source identity. It never supplies Git bytes as a
pretend current PNG. Historical additions lists are mapped by verified logical
identity against each check's own fixed baseline.

`game-delivery-data.mjs` decodes all actual delivery files. Git PNG bytes are used
only as explicitly historical reference data for source identity, dimensions,
alpha and numerical comparisons. Every image preserves dimensions and every
alpha pixel. Three numerical inputs (`ct_head_hema`, `ct_lung`,
`ct_wrist_simulated`) retain original bytes and RGBA. The small-text
`ch2_needle_record_v1` uses lossless WebP with exact visible RGB; the other 193 use
reviewed lossy WebP. Lossy RGB is measured, never described as pixel-identical.
Transparent hidden RGB is not a visual requirement. The original observation
and gameplay assertions remain active.

Each replacement is at most 600 KiB and no larger than its source. The complete
197-image set is at most 30 MiB and actual `public` inventory at most 40 MiB.
All 12 CT atlases and all audio bytes remain frozen. Background inline previews
must derive from the correct delivered scene. Removed large originals are
individually mapped; additional removal entries are restricted to audited static
preview pages, auditions, and stale optimized cache. No public audio deletion is
authorized. Unexpected files, missing assets, unreviewed catalogs and mismatched
review pins fail rather than quietly updating expected values.

## Test adaptation scope

The ten media-hash loops in `ch1-freeze-loop`, `ch1-freeze-pacing`,
`ch2-mystery-freeze`, `ch2-dawn-freeze`, `ch2-payoffs-freeze`,
`ch2-checkin-freeze`, `image-polish-freeze`, `ch2-rewards-round-freeze`,
`ch2-case-reading-freeze` and `ch2-ct-sequences-freeze` retain their fixed original
hashes. `ch1-voice-revision` and `ch2-colleague-stories` allow only the precise
reviewed encoding migrations in old no-overwrite/additions checks. The CT source
projection is the single entry to the new inverse. Loop/pacing negative probes
also recognize the exact new-layer rejection message; the mutation still must
throw.

PNG header/existence checks in covered-CR, CT-motion, loop-observation,
continuity, rewards, scan-registry, mystery-assets, pacing-media, patients,
visuals and image-polish tests now inspect real canonical files. The old PNG-only
PowerShell portrait contact-sheet audit uses pinned Sharp to decode WebP and
still reports actual dimensions, sampled alpha and SHA. Browser path adapters
resolve the exact catalog URL; decoded background blobs require the matching
scene ID and the exact canonical resource request, never an inline preview as
proof of full-image readiness. Failed-image routes use the real delivery URL.

The retired static mystery/pacing previews are explicitly reported as retired,
not as successful browser fixtures. Historical voice preview metadata and the
approved Kai B audition may still be read from the fixed Git baseline as clearly
named historical references, pinned to reviewed removal hashes. The actual
in-game Kai B MP3 must remain byte-for-byte equal to that reference. No reference
function is used by current-image reads, HTTP checks or runtime fallback.

`image-delivery-data` retains the old corrupt-cache behavior check through the
validated source inverse and checks the actual new generated compatibility map
and report. Its former broad non-background lossless policy is superseded only
for the exact 193 reviewed lossy images; it is not silently presented as an exact
RGBA pass. New data audits also reject a tampered byte in each of the 197 images,
an extra catalog key, a removed key and a swapped background mapping without
writing any mutation to disk.
