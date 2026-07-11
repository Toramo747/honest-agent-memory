// ─────────────────────────────────────────────────────────────────────────────
// LONGMEMEVAL · knowledge-update — versione INASPRITA (verifica di parte terza).
//
// Codex ha trovato che su `oracle` tutti fanno 100%: il modello vede tutta la storia
// (o un bag in ORDINE di sessione) e usa la recency-di-posizione per vincere — quindi
// il supersede-on-write di JARVIS non emerge. Questo runner rende la prova onesta e dura:
//
//  - NAIVE-HARD: i fatti estratti vengono MESCOLATI e presentati piatti, senza date,
//    senza ordine, senza etichette. Il modello NON puo' piu' usare la recency: davanti
//    a un fatto vecchio e uno aggiornato sullo stesso tema, non ha modo legittimo di
//    sapere quale sia attuale. (È lo scenario reale di una memoria non-ordinata.)
//  - JARVIS-SUPERSEDE: i fatti vengono scritti in ORDINE di sessione con writeSemantic;
//    supersede-on-write tiene solo l'ULTIMO per tema. Si mostra SOLO il fatto attivo,
//    senza etichette [active]/[superseded] (nessun aiuto). Vince perche' CONOSCE l'ordine.
//
// Isola esattamente il valore del supersede-on-write: preservare la verita' dell'ordine
// di scrittura quando la superficie del testo ha perso ogni indizio temporale.
// Giudice GPT-4o (come il benchmark). Estrazione identica per entrambe le condizioni.
// ─────────────────────────────────────────────────────────────────────────────
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";


import { makeMemory } from "./supersede.mjs";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of (await readFile(resolve(here, ".env"), "utf8")).split(/\r?\n/)) {
  const i = line.indexOf("="); if (i > 0) { const k = line.slice(0, i).trim(); if (!(k in process.env)) process.env[k] = line.slice(i + 1).trim(); }
}
const KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4o";

async function chat(system, user, { maxTokens = 140 } = {}) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, temperature: 0, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 100)}`);
  return String((await r.json()).choices?.[0]?.message?.content ?? "").trim();
}
function parseJson(t) { try { return JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] ?? t); } catch { return {}; } }
function formatSession(turns, date) {
  return `${date ? `[${date}] ` : ""}` + (Array.isArray(turns) ? turns : []).map((t) => `${t.role}: ${t.content}`).join("\n");
}
// Shuffle SEEDATO per riproducibilità: il baseline naive-hard è stocastico (l'ordine del
// bag cambia il risultato). Senza seed, naive-hard oscilla (51–58% su due run). Con seed
// fisso la run è deterministica. Cambia l'ordine con --seed=N.
const SEED = Number(process.argv.find((a) => a.startsWith("--seed="))?.split("=")[1] ?? 42);
function mulberry32(s) { return function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = mulberry32(SEED);
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// Estrazione identica per entrambe le condizioni (nessun vantaggio nell'estrazione).
async function extractFact(item, turns, date, i) {
  const sys = "You extract only the fact, count, place, preference, or state directly relevant to the target question, from THIS single session. If the session lacks it, has_fact=false. Return JSON {has_fact, fact}. Do not add dates or ordinal words to the fact.";
  const raw = await chat(sys, `Target question: ${item.question}\nSession:\n${formatSession(turns, date)}`, { maxTokens: 100 });
  const p = parseJson(raw);
  return p.has_fact ? String(p.fact ?? "").trim() : null;
}

// NAIVE-HARD: fatti MESCOLATI, piatti, senza date/ordine/etichette.
async function answerNaiveHard(item, facts) {
  const bag = shuffle(facts).map((f) => `- ${f}`).join("\n") || "- none";
  const sys = "You answer ONLY from the unordered set of facts below. The facts are in no particular order and carry no dates. Some may be outdated and some updated. Answer the question with a single best answer.";
  return chat(sys, `Facts:\n${bag}\n\nQuestion: ${item.question}`);
}
// JARVIS: solo il fatto ATTIVO dopo supersede-on-write (nessuna etichetta, nessun aiuto).
async function answerJarvis(item, activeFacts) {
  const bag = activeFacts.map((f) => `- ${f}`).join("\n") || "- none";
  const sys = "You answer ONLY from the current memory below. Answer the question with a single best answer.";
  return chat(sys, `Current memory:\n${bag}\n\nQuestion: ${item.question}`);
}
// NAIVE-BOUNDED: memoria a capacità 1 che tiene il PRIMO fatto e rifiuta gli aggiornamenti
// (design ingenuo senza supersede). Per un knowledge-update il primo fatto è lo STALE.
async function answerNaiveBounded(item, facts) {
  const bag = facts.length ? `- ${facts[0]}` : "- none";
  const sys = "You answer ONLY from the memory below. Answer the question with a single best answer.";
  return chat(sys, `Memory:\n${bag}\n\nQuestion: ${item.question}`);
}

// Giudizio PER-RISPOSTA (una alla volta): giudicare piu' risposte insieme confonde il
// giudice e maschera le differenze reali (verificato). Una risposta = un giudizio pulito.
async function judgeOne(item, response) {
  const sys = "You are a strict grader for a knowledge-update question. The GOLD answer is the latest updated state. Reply with exactly one word: CORRECT if the response matches the gold updated fact (lenient on wording, strict on the actual value/place/count/state), or INCORRECT otherwise (including if it gives an outdated value).";
  const raw = await chat(sys, `QUESTION: ${item.question}\nGOLD ANSWER: ${item.answer}\nRESPONSE: ${response}`, { maxTokens: 5 });
  return /correct/i.test(raw) && !/incorrect/i.test(raw) ? 1 : 0;
}

// ── run ──
const data = JSON.parse(await readFile(resolve(here, "oracle.json"), "utf8"));
const ku = data.filter((x) => x.question_type === "knowledge-update" && !String(x.question_id).endsWith("_abs"));
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 25);
const subset = ku.slice(0, LIMIT);
console.log(`LongMemEval · knowledge-update INASPRITO: ${subset.length}/${ku.length} domande · ${MODEL}\n`);

let naiveOk = 0, boundedOk = 0, jarvisOk = 0, done = 0;
for (const item of subset) {
  try {
    // estrazione per-sessione (in ordine reale)
    const facts = [];
    for (let i = 0; i < item.haystack_sessions.length; i++) {
      const f = await extractFact(item, item.haystack_sessions[i], item.haystack_dates?.[i], i);
      if (f) facts.push(f);
    }
    if (facts.length === 0) { console.log("[skip] nessun fatto estratto"); continue; }
    // JARVIS: facts written in session ORDER -> supersede-on-write (same topic) -> active only
    const memory = makeMemory();
    const topic = `lme:${item.question_id}`;
    for (const f of facts) memory.write(topic, f);
    const active = memory.active(topic);
    // risposte + giudizio PER-RISPOSTA (pulito, una alla volta)
    const [naive, bounded, jarvis] = await Promise.all([answerNaiveHard(item, facts), answerNaiveBounded(item, facts), answerJarvis(item, active)]);
    const [gn, gb, gj] = await Promise.all([judgeOne(item, naive), judgeOne(item, bounded), judgeOne(item, jarvis)]);
    naiveOk += gn; boundedOk += gb; jarvisOk += gj; done++;
    console.log(`[${done}/${subset.length}] naive:${gn ? "✓" : "✗"} bounded-1st:${gb ? "✓" : "✗"} jarvis:${gj ? "✓" : "✗"}  (${facts.length}f→${active.length}a)  ${item.question.slice(0, 40)}`);
  } catch (e) { console.log(`[skip] ${e.message}`); }
}
const pct = (n) => `${((n / done) * 100).toFixed(0)}%`;
console.log("\n══════════════════════════════════════════════");
console.log(" KNOWLEDGE-UPDATE INASPRITO (bag mescolato, senza indizi temporali)");
console.log("══════════════════════════════════════════════");
console.log(` valutate: ${done}`);
console.log(` NAIVE-HARD (bag mescolato, tiene tutto):   ${pct(naiveOk)}  (${naiveOk}/${done})`);
console.log(` NAIVE-BOUNDED (cap-1, tiene il primo):     ${pct(boundedOk)}  (${boundedOk}/${done})`);
console.log(` JARVIS (supersede-on-write, tiene ultimo): ${pct(jarvisOk)}  (${jarvisOk}/${done})`);
console.log(` vantaggio supersede vs bounded-ingenuo:   +${(((jarvisOk - boundedOk) / done) * 100).toFixed(0)} punti`);
