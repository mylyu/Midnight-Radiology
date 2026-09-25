# Detail-polish source boundary

Baseline: `5a2b494ed3d0eaaadaeb374ef1536166cbd43b41`.

This round adds an outer exact inverse; it does **not** rewrite any previous
source-delta ledger, media manifest, reviewed media hash, or historical baseline.

## Reviewed production scope

- Six edited files: `App.tsx`, `Ch2Shop.tsx`, `ch2-pacing.ts`, `ch2-payoffs.ts`,
  `ch2.ts`, and `types.ts`, at their existing paths under `app/src`.
- Six new files: `components/StatFeedback.tsx`, `components/StatFeedback.css`,
  `game/ch2-stat-interactions.ts`, `game/input-gate.ts`,
  `game/interaction-transactions.ts`, and `game/stat-feedback.ts`.
- No media additions/replacements, production build-script changes, dependencies,
  DR/DSA content changes, or changes to the story-bus document.

`ch2-detail-polish-source-deltas.json` records each exact before/after hunk,
the original and live source hashes, and the six new source hashes.
`ch2-detail-polish-review.json` pins that reviewed ledger separately.

The new LIVE freeze compares 139 existing source/configuration/previous record
files, verifies all 306 public files, rejects unnamed production additions, and
requires each approved live edit to exist. Binary media are compared byte for
byte. Text comparisons normalize only checkout line endings and final whitespace,
consistent with the older source-boundary tests.

`beforeGameDeliverySource` invokes the new inverse first. The existing CT,
case-reading, rewards, image-polish, check-in, payoffs, dawn, mystery, loop, and
pacing layers then retain their own original checks. `priorSourcePaths` removes
the six new paths from historical inventories only after their live hashes pass.
It does not ignore arbitrary new modules.

## Recording and validation

Only after the production source is frozen and its diff is reviewed:

```powershell
node scripts/record_ch2_detail_polish_deltas.mjs --record-reviewed
node app/tests/ch2-detail-polish-projection.mjs
node app/tests/ch2-detail-polish-freeze.mjs
```

The recorder is never called by tests or build. Source mutation after recording
must fail until the additional change is reviewed. The inverse test rejects
99 in-hunk, outside-hunk, and appended-source mutation probes.

The regression run stores individual stdout/stderr logs and JSON results outside
the repository in `../ch2-detail-polish-review/static/`. Browser fixtures likewise
use isolated contexts and write to `../ch2-detail-polish-review/payoffs/`,
`gift-gallery/`, and `case-reading/`; they do not read the player's profile.

The old live-story tests permit “陆舟” only in the exact approved named-contact
introduction at `c2am_lowdose_teaser0`; all other deferred-plot bans remain.
The model demonstration expectation adds exactly the approved first `teaching`
wealth receipt, not an arbitrary metric tolerance. Browser reveal/advance gestures
wait 310 ms for the approved 300 ms input guard and keep exact target assertions.

## Final recorded checks (2026-09-25)

- All 64 selected non-browser regression entry points passed against the final
  recorded production source; this includes the legacy static-summary batch.
- New inverse: 99 unauthorized-source probes rejected. LIVE boundary: all
  139 source/configuration/previous-record checks and 306 public-file checks passed.
- Fixed production preview `http://127.0.0.1:8805/`: payoffs 8 seeded fixtures,
  gift-gallery 11 seeded scenarios, and case-reading 26 seeded scenarios passed.
  These browser fixtures are not described as complete chapter playthroughs.
- The three browser suites used the fixed production build immediately preceding
  the final toast-merging-only adjustment. The parent task verifies that final
  toast adjustment separately; these fixtures verify story/media/receipt behavior.
- No browser runtime errors or failed gift-image requests were recorded. Existing
  layout, storage/reload, reading-link, reward, and exact image-path/hash assertions
  remain in place. No previous source ledger or media pin was modified.
