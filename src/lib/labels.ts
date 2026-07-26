// src/lib/labels.ts
export type Method = { kind: "default" | "skill" | "tool"; name: string; args?: string };

export function armLabel(arm: "A" | "B" | "C"): string {
  return { A: "A · Claude default", B: "B · with a skill", C: "C · with a tool" }[arm];
}

export function methodChip(m: Method): string {
  return m.args ? `${m.name} (${m.args})` : m.name;
}

export function modeBadge(mode: "refine" | "from-scratch"): string {
  return mode === "refine"
    ? "refine — the treated arms ran on the default arm's output, so the only difference is the lever"
    : "from-scratch — each arm generated independently from the same brief";
}
