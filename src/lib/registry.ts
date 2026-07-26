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
  phase: number;
  gap: string | null;
  declaredArms: { arm: "A" | "B" | "C"; kind: "default" | "skill" | "tool"; method: string }[];
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
