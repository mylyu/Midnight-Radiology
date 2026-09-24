// Run with node --import tsx tests/ch2-all-badges-browser.mjs.
// Uses the real fresh Chapter 1 -> Chapter 2 driver. No edited save/flags/AP,
// seeded prizes, skipped scans or test-only gameplay APIs.
// CHAIN_CH2_ONLY=1 instead starts a new character and unlocks Chapter 2 via its
// real lobby: no inherited items, achievements or endgame money. The same route
// buys toolbox 150 before the first clinic, dosimeter 200 after shift 1, and key
// 120 + snack 40 after shift 2. Night 3 spends its 3 AP on Xiao He, Wen and Lei;
// night 5 uses its 3 AP on colleagues/meal/terminal (cabinet costs no AP).
process.env.CHAIN_ALL_BADGES = '1'
process.env.CHAIN_VARIANT = 'female-curious'
process.env.CHAIN_OUTPUT ??= '../../ch2-all-badges-review'
await import('./ch1-ch2-continuous.mjs')
