// Minimal, self-contained supersede-on-write — the exact policy JARVIS uses.
// When a new fact is written under an existing topic with different content, the
// previous fact for that topic is marked `superseded`. Only the latest survives as active.
// (Faithful extraction of runtime/memory.js `writeSemantic` supersede logic.)
export function makeMemory() {
  const items = [];
  return {
    write(topic, content) {
      const c = String(content ?? "").trim();
      for (const it of items) {
        if (!it.superseded && it.topic === topic && it.content !== c) it.superseded = true;
      }
      items.push({ topic, content: c, superseded: false });
    },
    active(topic) {
      return items.filter((i) => i.topic === topic && !i.superseded).map((i) => i.content);
    },
  };
}
