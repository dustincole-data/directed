// Technique: annotation adjacency. Place text on or beside the mark it describes;
// short uncrossed leaders only when adjacency is impossible; legend last.
//   Rahman, Lange, Quadri, Rosen (2026) https://arxiv.org/html/2604.07691v1
//   "Nine practitioners prioritized placing annotation text adjacent to target
//    elements to reduce association effort."
//
// NOT a full label-placement solver. Deliberately small: greedy, first-fit,
// input order preserved, four candidate offsets per anchor.
export type Anchor = { x: number; y: number; text: string; markRadius?: number };

export type Placed = {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  leader: null | { x1: number; y1: number; x2: number; y2: number };
};

export type PlaceOpts = { width: number; height: number; pad?: number; gap?: number };

const CHAR_W = 6.2; // approximate advance width at the gallery's label size
const LINE_H = 12;

export function placeAnnotations(anchors: Anchor[], opts: PlaceOpts): Placed[] {
  const pad = opts.pad ?? 4;
  const gap = opts.gap ?? 10;
  const taken: { x: number; y: number; w: number; h: number }[] = [];
  const out: Placed[] = [];

  for (const a of anchors) {
    const r = (a.markRadius ?? 0) + gap;
    const w = a.text.length * CHAR_W;
    // Adjacent candidates first: right, left, above, below.
    const candidates: { x: number; y: number; anchor: Placed["anchor"] }[] = [
      { x: a.x + r, y: a.y + LINE_H / 3, anchor: "start" },
      { x: a.x - r, y: a.y + LINE_H / 3, anchor: "end" },
      { x: a.x, y: a.y - r, anchor: "middle" },
      { x: a.x, y: a.y + r + LINE_H, anchor: "middle" },
    ];

    let chosen: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      const left = c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
      const box = { x: left, y: c.y - LINE_H, w, h: LINE_H };
      const inside =
        box.x >= pad && box.x + box.w <= opts.width - pad &&
        box.y >= pad && box.y + box.h <= opts.height - pad;
      // Reuse `gap` as the minimum clearance between labels too, not just
      // between a mark and its own label: two non-touching boxes that sit
      // closer than `gap` still read as crowded, and near-coincident anchors
      // (e.g. two marks a couple px apart) must not both claim bare-adjacent
      // slots just because their text boxes happen not to literally overlap.
      const clear = !taken.some((t) => overlaps(t, box, gap));
      if (inside && clear) {
        chosen = c;
        taken.push(box);
        break;
      }
    }

    if (chosen) {
      out.push({ text: a.text, x: chosen.x, y: chosen.y, anchor: chosen.anchor, leader: null });
      continue;
    }

    // Adjacency impossible: offset by one short leader, kept to <= gap * 4 and
    // aimed away from the crowded side so leaders do not cross.
    const dx = a.x < opts.width / 2 ? gap * 3 : -gap * 3;
    const dy = -gap * 2;
    const lx = clamp(a.x + dx, pad + w / 2, opts.width - pad - w / 2);
    const ly = clamp(a.y + dy, pad + LINE_H, opts.height - pad);
    taken.push({ x: lx - w / 2, y: ly - LINE_H, w, h: LINE_H });
    out.push({
      text: a.text,
      x: lx,
      y: ly,
      anchor: "middle",
      leader: { x1: a.x, y1: a.y, x2: lx, y2: ly + 2 },
    });
  }

  return out;
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  margin = 0,
): boolean {
  return (
    a.x - margin < b.x + b.w + margin &&
    a.x + a.w + margin > b.x - margin &&
    a.y - margin < b.y + b.h + margin &&
    a.y + a.h + margin > b.y - margin
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
