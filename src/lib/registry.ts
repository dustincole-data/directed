// src/lib/registry.ts
import registryJson from "../generated/registry.json";

export type RegistryCell = {
  id: string;
  arm: "A" | "B" | "C";
  method: { kind: "default" | "skill" | "tool"; name: string; args?: string; ranOn?: string | null };
  prompt: string;
  runs: number;
  shipped: string;
  generated: string;
  svg: string;
};
export type RegistryRow = {
  id: string;
  title: string;
  family: string;
  mode: "refine" | "from-scratch";
  fixture: string;
  /** Probe id the gate checks this row's treated arms against; null until declared. */
  premise: string | null;
  phase: number;
  gap: string | null;
  declaredArms: {
    arm: "A" | "B" | "C";
    kind: "default" | "skill" | "tool";
    method: string;
    nullResult?: string;
  }[];
  cells: RegistryCell[];
};
export type Registry = { built: string; families: { family: string; rows: string[] }[]; rows: RegistryRow[] };

const REAL_REGISTRY = registryJson as Registry;

export function getRegistry(): Registry {
  return REAL_REGISTRY;
}

export function allCells(reg: Registry = getRegistry()): { cell: RegistryCell; row: RegistryRow }[] {
  return reg.rows.flatMap((row) => row.cells.map((cell) => ({ cell, row })));
}

export function findCell(
  id: string,
  reg: Registry = getRegistry(),
): { cell: RegistryCell; row: RegistryRow } | null {
  return allCells(reg).find(({ cell }) => cell.id === id) ?? null;
}

/**
 * The row's declared reason that this arm's premise probe came back identical to
 * its baseline's — the lever the row exists to demonstrate never moved.
 *
 * The gate (check 12) will not let a probe-identical cell ship without one, and
 * will not let a cell that *did* move its premise carry one, so this is the
 * disclosure a reader is owed wherever the render appears. Returns null for an
 * arm that engaged its premise, and for Arm A, which is what nulls are measured
 * against rather than a candidate for one.
 */
export function nullResultFor(cell: RegistryCell, row: RegistryRow): string | null {
  if (cell.arm === "A") return null;
  return row.declaredArms.find((a) => a.arm === cell.arm)?.nullResult ?? null;
}

/** Coarse structural diff: which SVG element types the treated arm added or dropped. */
export function diffAgainstBaseline(
  cell: RegistryCell,
  row: RegistryRow,
): { added: string[]; removed: string[] } | null {
  if (cell.arm === "A") return null;
  const base = row.cells.find((c) => c.arm === "A");
  if (!base) return null;
  const tags = (svg: string) => new Set((svg.match(/<([a-zA-Z]+)/g) ?? []).map((t) => t.slice(1)));
  const b = tags(base.svg);
  const t = tags(cell.svg);
  return {
    added: [...t].filter((x) => !b.has(x)).sort(),
    removed: [...b].filter((x) => !t.has(x)).sort(),
  };
}
