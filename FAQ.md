# FAQ

## What is the main claim of this repo?

The claim is narrow:

- JARVIS shows a strong `abstention / honesty` advantage
- JARVIS shows a real `knowledge-update` advantage under `bounded / unordered memory`

This repo does **not** claim that JARVIS wins LongMemEval overall or that it is the best memory
system in the world.

## Is JARVIS a general long-context leaderboard winner?

No.

On `knowledge-update` with full oracle history, JARVIS is effectively tied with the frontier
baseline:

- baseline: `70/78 = 90%`
- JARVIS: `71/78 = 91%`
- paired McNemar: `p=1.0`

That is not a leaderboard-style win, and we do not present it as one.

## Then what is JARVIS actually good at?

JARVIS is strongest where memory needs governance, not just storage:

- declining false-premise questions instead of fabricating
- keeping the active fact instead of carrying stale facts forward
- behaving better when memory is bounded and order matters

Short version: JARVIS is not framed as "best at remembering everything", but as "more honest about
what it does not know, and stricter about what is obsolete."

## Why focus on bounded memory?

Because that is where update policy becomes structural.

If a frontier model can reread the full raw history, it can often recover recency directly from the
transcript. That makes the task much easier and hides the benefit of an explicit invalidation policy.

Under bounded or unordered memory:

- naive-hard: `42/72 = 58%`
- JARVIS: `58/72 = 81%`
- paired McNemar: `p=0.0025`

That is the strongest externally meaningful result in this repository after abstention.

## Did JARVIS beat Mem0?

Not conclusively. The honest answer is:

- Mem0: `48/72 = 67%`
- JARVIS: `58/72 = 81%`
- delta: `+14`
- paired McNemar: `p=0.076`

So JARVIS currently **leads as a point estimate**, but the result is **not yet statistically
significant** on the current slice.

The correct wording is:

- "JARVIS appears ahead of Mem0 on the current bounded knowledge-update slice."

The incorrect wording is:

- "JARVIS has definitively beaten Mem0."

## Why is there a section about judging one answer per call?

Because it changed the result materially.

Early runs judged multiple candidate answers in a single LLM-judge call and falsely reported 100%
for every condition on knowledge-update. Per-response judging revealed the real spread.

This methodological finding is useful beyond JARVIS itself:

- batch LLM-judging can mask real differences
- per-response judging is safer for this kind of benchmark

## Why did the bounded-memory gain change from +31 to +22?

Because we corrected our own number down.

The naive-hard baseline is stochastic: shuffled memory order changes its score. An earlier run gave
the strawman a weaker score and made the gap look larger. We reran it, took the stronger naive
baseline, and kept the smaller claim:

- earlier lucky gap: `+31`
- conservative canonical gap: `+22`

That is intentional. We prefer a smaller number we can defend over a larger number we got lucky on.

## Is this a full production memory stack?

No.

This repository is about:

- benchmarked memory behavior
- invalidation policy
- honesty / abstention discipline

It is not yet a full end-to-end industrial retrieval stack over very large histories.

## What is the right way to describe JARVIS publicly?

Good descriptions:

- `an honest agent memory layer`
- `an invalidation-aware bounded-memory policy`
- `a benchmark-backed niche system for abstention and stale-fact control`

Bad descriptions:

- `LongMemEval winner`
- `best memory system in the world`
- `definitively superior to Mem0`

## What is the next benchmark that matters most?

The next decisive step is a larger `non-oracle` comparison against Mem0.

That is the cleanest way to test whether the current `+14` lead can move from:

- promising trend

to:

- statistically supported external claim
