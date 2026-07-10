# Honesty as a Competitive Edge: Abstention & Invalidation for Agent Memory on LongMemEval

> **Status: private draft / priority marker.** This is an honest, reproducible write-up of two
> focused experiments on [LongMemEval](https://github.com/xiaowu0162/LongMemEval) (ICLR 2025).
> It does **not** claim to top the overall leaderboard. It documents a measured, differentiated
> edge on the two axes where a *honest-by-design* memory agent should be strong — and a
> methodological finding that matters for anyone benchmarking with an LLM judge.
>
> Draft dated 2026-07-10. Not yet published.

## TL;DR

An agent ("JARVIS") built around one discipline — **never fabricate; say what you don't know;
supersede stale facts** — shows two measurable advantages on LongMemEval's two hardest axes:

| Axis | Condition | Result |
|---|---|---|
| **Abstention** (false-premise questions; must decline) | GPT-4o, neutral prompt | 63% (19/30) |
| | GPT-4o + honesty discipline | **97% (29/30)** |
| **Knowledge-update** (a fact changes; answer with the current one), *bounded/unordered memory* | naive vector-store (keep all, no order) | 60% (18/30) |
| | keep-first (cap-1, no supersede) | 7% (2/30) |
| | **supersede-on-write (JARVIS)** | **77% (23/30)** |

And a methodological caveat for the whole field: **judging multiple candidate answers in one LLM
call masks real differences** — it reported a false 100% for every condition on knowledge-update
until we switched to per-response judging.

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

**Result.** Baseline **63%**, JARVIS discipline **97%** — **+34 points from the discipline alone**,
same model, same context. The baseline fabricated answers to 11/30 false-premise questions.

**Reading.** On the axis the field is weakest at, the honesty discipline is a large, measurable
differentiator. This isolates the *discipline* (the retrieval is oracle-given), which is precisely
where the honesty design is the lever.

## Experiment 2 — Knowledge-update (the invalidation axis)

**Setup.** 30 `knowledge-update` questions. We extract one fact per session (identical extraction
for all conditions), then answer under three memory policies:

- *naive-hard*: all extracted facts, **shuffled**, no dates/order/labels (a vector store with no
  recency signal).
- *keep-first*: capacity-1 memory that keeps the first fact (for an update, the stale one).
- *supersede-on-write (JARVIS)*: facts written in session order; same-topic writes supersede the
  previous; only the active (latest) fact is shown, unlabeled.

Per-response GPT-4o grading against the gold (updated) answer.

**Result.** keep-first **7%**, naive-hard **60%**, supersede-on-write **77%**. The fair comparison —
against a realistic naive vector store (naive-hard) — is **+17 points**; against keep-first, +70.

**Reading.** When memory is *bounded or unordered* — the realistic regime, since no agent keeps full
raw history — supersede-on-write's write-order truth gives a real edge. On the *oracle full-history*
setting the task saturates (a strong model reasons recency by itself), so the advantage only appears
under honest, memory-constrained conditions.

**Two intensities (honest double-framing).** Measured in the full system with per-response judging,
the same axis shows a *moderate* effect on the unrealistic oracle-full-history setting and a *strong*
effect under bounded/unordered memory:

| Setting | naive baseline | supersede-on-write (JARVIS) | edge |
|---|---|---|---|
| oracle, full raw history | 90% (baseline) / 87% (fact bag) | 93% | +3 / +6 |
| **hardened: bounded/unordered memory** | 60% (shuffled bag) / 7% (keep-first) | **77%** | **+17 / +70** |

The honest claim is the second row: supersede-on-write matters when the task actually requires
*compressed memory with invalidation*, not plain reading of the full history.

## Methodological finding (useful beyond this project)

Our first knowledge-update runs reported **100% for every condition**, suggesting the task was
saturated. It was not. The cause was the **judge**: grading three candidate answers in a single LLM
call, GPT-4o marked plainly stale answers as correct (e.g. `27:12` graded correct against gold
`25:50`). The same judge, given one answer at a time, graded it correctly. **Batch LLM-judging masks
real differences.** Per-response judging revealed the true 7% / 60% / 77% spread. Anyone benchmarking
memory or QA with an LLM judge should grade one candidate per call.

## Limitations (read this)

1. **Scope.** Experiment 1 tests the honesty *discipline* with oracle retrieval; Experiment 2 tests
   *supersede-on-write* with question-conditioned per-session extraction. Neither is a full
   end-to-end retrieval pipeline over 40–500 sessions.
2. **We do not claim a leaderboard position.** The overall LongMemEval leaderboard is dense at
   94–96%; we have not built the scale retrieval to compete there.
3. **n = 30** per axis (the full `_abs` set; a 30-item knowledge-update subset). Small.
4. **LLM judge** (GPT-4o), with the batch-vs-per-response caveat above; per-response reduces but does
   not eliminate judge noise.
5. Experiment 2's baselines (keep-first especially) are constructed; the fair one is naive-hard.

## Honest positioning

We are not the best at *remembering*. We appear to be — measurably — among the more honest at
*declining when we shouldn't answer* and at *not carrying stale facts forward*, on a real ICLR
benchmark. In a field prone to fabrication, that is a small but distinct niche, and it is backed by
numbers rather than claims.

## Reproduce

```bash
# 1. dataset (once) — LongMemEval oracle split, ~15 MB
curl -L -o oracle.json \
  https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_oracle.json

# 2. your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env

# 3. run
node abstention-bench.mjs 30          # Experiment 1 (honesty / abstention)
node knowledge-update-hard.mjs --limit=30   # Experiment 2 (invalidation / supersede-on-write)
```

Deterministic prompts (temperature 0); GPT-4o answerer and **per-response** GPT-4o judge.
`supersede.mjs` is a minimal, self-contained extraction of the supersede-on-write policy — you do
not need the full agent to reproduce the result. No dataset or secrets are committed to this repo.
