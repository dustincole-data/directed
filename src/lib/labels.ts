// src/lib/labels.ts
export type Method = { kind: "default" | "skill" | "tool"; name: string; args?: string };

// The arm letter is a position in the row, not a method. src/rows.json declares
// 6 Arm C cells as skills and 5 Arm B cells as tools, so deriving the caption
// from the letter printed "C · with a tool" over cells whose own recorded
// method.kind is `skill` — 11 of the 107 declared cells, 3 of them live. The
// letter stays as the positional identifier; what the cell was made with comes
// from the cell's own record.
const KIND_PHRASE: Record<Method["kind"], string> = {
  default: "Claude default",
  skill: "with a skill",
  tool: "with a tool",
};

export function armLabel(arm: "A" | "B" | "C", kind: Method["kind"]): string {
  return `${arm} · ${KIND_PHRASE[kind]}`;
}

export function methodChip(m: Method): string {
  return m.args ? `${m.name} (${m.args})` : m.name;
}

export function modeBadge(mode: "refine" | "from-scratch"): string {
  return mode === "refine"
    ? "refine — the treated arms ran on the default arm's output, so the only difference is the lever"
    : "from-scratch — each arm generated independently from the same brief";
}
