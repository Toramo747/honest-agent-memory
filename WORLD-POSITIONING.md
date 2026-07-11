# World Positioning

Reference date: `2026-07-11`

This file states the current public position of JARVIS as narrowly and honestly as possible.

## What We Can Say

JARVIS currently has two externally meaningful strengths:

1. `abstention / honesty`
2. `knowledge-update` under `bounded / unordered memory`

These are real benchmarked signals, not internal-only scores.

## Current Numbers

### Abstention

- GPT-4o neutral baseline: `19/30 = 63%`
- GPT-4o + JARVIS honesty discipline: `29/30 = 97%`
- paired McNemar: `p=0.002`

Interpretation:
- strong and statistically significant
- best current public differentiator

### Knowledge-update, oracle full history

- baseline: `70/78 = 90%`
- JARVIS: `71/78 = 91%`
- paired McNemar: `p=1.0`

Interpretation:
- statistical tie
- we do **not** claim a real win here

### Knowledge-update, bounded / unordered memory

- naive-hard baseline: `42/72 = 58%`
- keep-first baseline: `12/72 = 17%`
- JARVIS: `58/72 = 81%`
- paired McNemar vs naive-hard: `p=0.0025`

Interpretation:
- real and defensible advantage
- this is where the `supersede-on-write` design matters

### Real-system comparison: Mem0

- Mem0: `48/72 = 67%`
- JARVIS: `58/72 = 81%`
- delta: `+14`
- paired McNemar: `p=0.076`

Interpretation:
- promising lead
- not yet statistically significant
- not a closed competitive verdict

## What We Cannot Say

We cannot honestly say:

- `JARVIS wins LongMemEval`
- `JARVIS is #1 on agent memory`
- `JARVIS has definitively beaten Mem0`

## Practical Position

Today JARVIS is best framed as:

- an `honest agent memory layer`
- an `invalidation-aware bounded-memory policy`
- a `benchmark-backed niche system`, not a universal winner

## Best Public Claim

"JARVIS shows a strong abstention advantage and a real bounded-memory knowledge-update advantage on LongMemEval-style evaluation, while avoiding broader leaderboard claims."
