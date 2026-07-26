import table12 from "./table12.json";
import hero8 from "./hero8.json";
import cycle12 from "./cycle12.json";

export type FixtureName = "table12" | "hero8" | "cycle12";
export type Row12 = { label: string; value: number; delta: number };
export type Hero8Row = { label: string; size: number; distance: number; color: string };
export type Cycle12Point = { index: number; label: string; value: number; delta: number };

export type Fixture = {
  name: FixtureName;
  source: string;
  fetched: string;
  baseline: number;
  unit: string;
  rows: Row12[] | Hero8Row[] | Cycle12Point[];
};

const FIXTURES: Record<FixtureName, Fixture> = {
  table12: table12 as Fixture,
  hero8: hero8 as Fixture,
  cycle12: cycle12 as Fixture,
};

export function loadFixture(name: FixtureName): Fixture {
  const f = FIXTURES[name];
  if (!f) throw new Error(`unknown fixture: ${name}`);
  return f;
}

export const FIXTURE_NAMES = Object.keys(FIXTURES) as FixtureName[];
