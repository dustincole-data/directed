import type { FixtureName } from "./fixtures";
import rowsData from "./rows.json";

export type Arm = "A" | "B" | "C";
export type Mode = "refine" | "from-scratch";
export type MethodKind = "default" | "skill" | "tool";

export type ArmDecl = { arm: Arm; kind: MethodKind; method: string };
export type RowDecl = {
  id: string;
  family: string;
  title: string;
  mode: Mode;
  fixture: FixtureName;
  phase: 1 | 2 | 3;
  arms: ArmDecl[];
  gap?: string;
};

// Row data lives in ./rows.json (checked in, plain data) so the build never
// depends on stripping TypeScript out of this file at runtime. This module's
// job is just to type it and freeze it. JSON.parse gives every row's arms
// fresh objects (no accidental cross-row sharing). We freeze each arm object,
// the arms array itself (so push/splice/sort/reverse can't resize or reorder
// it), and the row object, so mutating one row's arm list can never be
// observed anywhere else — matching the guarantee the previous
// shared-frozen-A constant provided.
export const ROWS: RowDecl[] = (rowsData as RowDecl[]).map((r) =>
  Object.freeze({ ...r, arms: Object.freeze(r.arms.map((a) => Object.freeze({ ...a }))) }),
);

export const FAMILIES = [...new Set(ROWS.map((r) => r.family))];

export function rowsForPhase(phase: 1 | 2 | 3): RowDecl[] {
  return ROWS.filter((r) => r.phase === phase);
}

export function getRow(id: string): RowDecl {
  const r = ROWS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown row: ${id}`);
  return r;
}
