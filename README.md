# Honesty as a Competitive Edge: Abstention & Invalidation for Agent Memory on LongMemEval

> An honest, reproducible write-up of two focused experiments on
> [LongMemEval](https://github.com/xiaowu0162/LongMemEval) (ICLR 2025). It does **not** claim to top
> the overall leaderboard. It documents a measured, differentiated edge on the two axes where a
> *honest-by-design* memory agent should be strong — and a methodological finding that matters for
> anyone benchmarking with an LLM judge.
>
> Dated 2026-07-10. Numbers are early and narrow by design — read the *Limitations* section.

## TL;DR

An agent ("JARVIS") built around one discipline — **never fabricate; say what you don't know;
supersede stale facts** — shows two measurable advantages on LongMemEval's two hardest axes:

Numbers carry **Wilson 95% confidence intervals**; paired comparisons use **McNemar's
exact test** (same questions, so the correct test is paired, not independent-samples).

| Axis | Condition | Result (95% CI) |
|---|---|---|
| **Abstention** (false-premise questions; must decline) | GPT-4o, neutral prompt | 63% [46–78%] (19/30) |
| | GPT-4o + honesty discipline | **97% [83–99%] (29/30)** — vs baseline **p=0.002** |
| **Knowledge-update**, *oracle full history* (n=78) | GPT-4o baseline on full history | 90% [81–95%] (70/78) |
| | extracted-fact bag | 79% [69–87%] (62/78) |
| | **supersede-on-write (JARVIS)** | **91% [83–96%] (71/78)** — vs baseline p=1.0 (tie) |
| **Knowledge-update**, *bounded/unordered memory* (n=72) | naive vector-store (keep all, no order) | 58% [47–69%] (42/72) |
| | keep-first (cap-1, no supersede) | 17% [10–27%] (12/72) |
| | **supersede-on-write (JARVIS)** | **81% [70–88%] (58/72)** — vs naive **+22, p=0.0025** |
| **Knowledge-update**, *vs real deployed system* (n=72) | Mem0 (v2.0.11, automatic memory) | 67% [55–76%] (48/72) |
| | **supersede-on-write (JARVIS)** | **81%** — vs Mem0 **+14, p=0.076 (trend, not yet significant)** |

And a methodological caveat for the whole field: **judging multiple candidate answers in one LLM
call masks real differences** — it reported a false 100% for every condition on knowledge-update
until we switched to per-response judging.

**Update 2026-07-11.** Public numbers are now aligned to the conservative canonical run:
- bounded knowledge-update is reported as `81% vs 58%` (`+22`, `p=0.0025`), not the earlier lucky `+31`
- `JARVIS vs Mem0` is reported as a **trend, not yet significant** (`81% vs 67%`, `p=0.076`)
- oracle knowledge-update remains framed as a **statistical tie**, not a win

## Positioning

What this repo **does** support:

- JARVIS shows a **strong abstention / honesty advantage** on a LongMemEval slice.
- JARVIS shows a **real bounded-memory knowledge-update advantage** when stale-fact invalidation
  actually matters.
- JARVIS appears to lead a deployed memory system (Mem0) on the current 72-item slice, **but that
  lead is not yet statistically significant**.

What this repo **does not** support:

- "JARVIS wins LongMemEval."
- "JARVIS is the best memory system in the world."
- "JARVIS has definitively beaten Mem0."

Short version: this is a repository about **honest memory behavior**, not a generic leaderboard
claim.

Supporting documents:
- [WORLD-POSITIONING.md](C:\ai\publish\honest-agent-memory\WORLD-POSITIONING.md)
- [FAQ.md](C:\ai\publish\honest-agent-memory\FAQ.md)

## Motivation

The 2026 agent-memory literature repeatedly names the same open problems: curation (what *not* to
remember), honest calibration, and invalidation of stale facts. LongMemEval operationalizes two of
these as scored categories:

- **Abstention** — questions whose premise never occurred in the history; the system is correct
  only if it *declines* instead of fabricating an answer.
- **Knowledge-update** — a fact is updated across sessions; the system must answer with the current
  state, not a stale one.

These are exactly the axes an *honest-by-design* agent should win. We test whether that design
translates into measured advantage.

## Experiment 1 — Abstention (the honesty axis)

**Setup.** All 30 `_abs` questions from `longmemeval_oracle.json`. Each has a false premise. We give
the same GPT-4o answerer the oracle context and compare two prompts:

- *baseline*: a neutral helpful-assistant prompt.
- *JARVIS discipline*: "answer only from the history; if it doesn't contain the information — e.g.
  an event never mentioned — you must say so and not fabricate; better to abstain than invent."

Grading with GPT-4o (as in the official benchmark): did the response correctly abstain?

**Result.** Baseline **63% [46–78%]**, JARVIS discipline **97% [83–99%]** — **+34 points from
the discipline alone** (McNemar p=0.002; 10 questions flip to correct abstention, 0 against),
same model, same context. The baseline fabricated answers to 11/30 false-premise questions.
This is our strongest, cleanest result: statistically significant on the paired test.

**Reading.** On the axis the field is weakest at, the honesty discipline is a large, measurable
differentiator. This isolates the *discipline* (the retrieval is oracle-given), which is precisely
where the honesty design is the lever.

## Experiment 2 — Knowledge-update (the invalidation axis)

We measure this axis in two regimes; identical per-session fact extraction feeds all conditions.

**Base / oracle regime (n = 78).** Three conditions: *baseline* (GPT-4o on the full oracle history),
*bag* (extracted facts as a plain bag), *supersede-on-write* (facts written in session order,
same-topic writes supersede the previous, only the active/latest fact shown).

**Result.** baseline **90% [81–95%] (70/78)**, bag **79% [69–87%] (62/78)**, supersede-on-write
**91% [83–96%] (71/78)** — **+1 vs full-history baseline (McNemar p=1.0 — a statistical tie),
+12 vs the compressed bag (p=0.02).** A frontier model almost saturates the task by reasoning over
recency directly from the raw transcript, so here supersede-on-write is *not* distinguishable from
the full-history baseline. We say so plainly: the edge lives in the bounded regime, not this one.

**Hardened / bounded-memory regime (n = 72).** Three stricter policies: *naive-hard* (all facts,
**shuffled**, no dates/order — a vector store with no recency signal), *keep-first* (capacity-1,
keeps the first/stale fact), *supersede-on-write* (keeps the latest, unlabeled).

**Result.** keep-first **17% (12/72)** [10–27%], naive-hard **58% (42/72)** [47–69%],
supersede-on-write **81% (58/72)** [70–88%] — **+22 vs a realistic naive vector store
(McNemar p=0.0025, paired; 21 questions flip to JARVIS, 5 against), +64 vs keep-first
(p<0.001).**

**A note on our own number (we corrected it down).** An earlier *unseeded* run reported +31
(naive-hard 51%). The naive baseline is **stochastic** — the shuffled bag order changes its
score — and across two runs it scored 51–58%. We now report the run where the baseline did
its *best* (58%), i.e. the *hardest* case for supersede-on-write; the +22 edge is still
significant at p=0.0025. The shuffle is now **seeded** (`--seed`, default 42) for
reproducibility. supersede-on-write is deterministic (81–82% across runs). We prefer the
smaller, harder-earned number to the larger lucky one.

**Reading.** When memory is *bounded or unordered* — the realistic regime, since no deployed agent
re-reads full raw history for every answer — supersede-on-write's write-order truth gives a real
edge. This is where the architectural claim is strongest.

### Real-system baseline: Mem0

The naive-hard and keep-first baselines are *constructed*. To check them against a **deployed**
system, we ran [Mem0](https://github.com/mem0ai/mem0) (v2.0.11, GPT-4o LLM + `text-embedding-3-small`)
on the same 72 knowledge-update items: Mem0 ingests each session with its own automatic fact
extraction and add/update logic, we query it, and answer + judge identically to the other conditions.

**Result.** Mem0 **67% [55–76%] (48/72)** — *above* the naive strawman (58%), *below*
supersede-on-write (81%). supersede-on-write leads Mem0 by **+14 points, but this is a trend, not yet
statistically significant** at n=72 (McNemar p=0.076; 18 items favor supersede, 8 favor Mem0). Two
honest caveats: (a) Mem0's score is somewhat run-dependent — its add/update decisions call an LLM;
(b) supersede-on-write also uses *question-conditioned* extraction, so the +14 is **not purely an
invalidation effect** — better extraction contributes too.

**Reading.** Against the real system we *lead but have not proven it*. This cuts both ways honestly:
it shows the strawman wasn't rigged (a deployed system clears it by 9 points), and it keeps us honest
about the true size of our edge over production memory. **Next step (declared):** measure on many more
knowledge-update items (the non-oracle LongMemEval split has far more) to test whether the +14 reaches
significance, and isolate the extraction confound.

## Methodological finding (useful beyond this project)

Our first knowledge-update runs reported **100% for every condition**, suggesting the task was
saturated. It was not. The cause was the **judge**: grading three candidate answers in a single LLM
call, GPT-4o marked plainly stale answers as correct (e.g. `27:12` graded correct against gold
`25:50`). The same judge, given one answer at a time, graded it correctly. **Batch LLM-judging masks
real differences.** Per-response judging revealed the true spread: a modest `90 / 79 / 91` in oracle
conditions and a clear `17 / 58 / 81` under bounded memory. Anyone benchmarking memory or QA with
an LLM judge should grade one candidate per call.

## Limitations (read this)

1. **Scope.** Experiment 1 tests the honesty *discipline* with oracle retrieval; Experiment 2 tests
   *supersede-on-write* with question-conditioned per-session extraction. Neither is a full
   end-to-end retrieval pipeline over 40–500 sessions.
2. **We do not claim a leaderboard position.** The overall LongMemEval leaderboard is dense at
   94–96%; we have not built the scale retrieval to compete there.
3. **Moderate sample sizes.** Abstention: all 30 `_abs` items. Knowledge-update: n=78 (base/oracle),
   n=72 (bounded/hard). Below leaderboard scale.
4. **LLM judge** (GPT-4o), with the batch-vs-per-response caveat above; per-response reduces but does
   not eliminate judge noise. A single judge model; we have not yet measured inter-judge agreement.
5. Experiment 2's baselines (keep-first especially) are constructed; the fair one is naive-hard,
   which is **stochastic** (shuffled memory: 51–58% over two runs). We report its best run (58%,
   hardest for JARVIS) and seed the shuffle (`--seed`) for reproducibility.
6. **Statistics.** Intervals are Wilson 95%; paired comparisons use McNemar's exact test. n is
   moderate, so intervals are wide — read the CI, not just the point estimate.
7. **Real-system comparison so far only on knowledge-update.** supersede-on-write leads a deployed
   Mem0 by +14 but not yet significantly (p=0.076, n=72); a larger-n run is the declared next step.
   We have not compared against Mem0 on abstention, nor against Zep.

## Honest positioning

We are not the best at *remembering*. We appear to be — measurably — among the more honest at
*declining when we shouldn't answer* and at *not carrying stale facts forward*, on a real ICLR
benchmark. In a field prone to fabrication, that is a small but distinct niche, and it is backed by
numbers rather than claims.

If you care about:

- refusal instead of fabrication,
- stale-fact invalidation,
- bounded-memory behavior that can be audited,

then this repository is relevant.

If you want:

- a top overall LongMemEval leaderboard system,
- a full production retrieval stack,
- a universal "better than every memory library" claim,

this repository is not claiming that.

## Reproduce

```bash
# 1. dataset (once) — LongMemEval oracle split, ~15 MB
curl -L -o oracle.json \
  https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_oracle.json

# 2. your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env

# 3. run
node abstention-bench.mjs 30                       # Experiment 1 (honesty / abstention)
node knowledge-update-hard.mjs --limit=72 --seed=42 # Experiment 2, bounded/hard (seeded shuffle)
```

Deterministic prompts (temperature 0); GPT-4o answerer and **per-response** GPT-4o judge.
`supersede.mjs` is a minimal, self-contained extraction of the supersede-on-write policy — you do
not need the full agent to reproduce the hardened result. The base/oracle numbers were measured in
the full system. No dataset or secrets are committed to this repo.
