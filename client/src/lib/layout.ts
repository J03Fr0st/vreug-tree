// Couple-aware tidy tree layout.
// 1. Build "units": a couple (two spouses + joint kids) or a single person + kids.
// 2. Recursively size subtrees, place children left-to-right, center parent over kids.
// 3. Emit absolute node positions and orthogonal connector edges.

export const NODE_W = 168;
export const NODE_H = 132;
const COUPLE_GAP = 36;
const SIBLING_GAP = 28;
const SUBTREE_GAP = 40;
const RANK_GAP = 32;

export type LayoutMember = {
  id: string;
  birthDate?: string | null;
};

export type LayoutRel = {
  // PARENT_CHILD: a is parent, b is child. SPOUSE: a/b are spouses (order irrelevant).
  a: string;
  b: string;
  type: "PARENT_CHILD" | "SPOUSE";
};

export type LayoutEdge = {
  type: "spouse" | "parent-trunk" | "child-bus" | "child-drop";
  x1: number; y1: number; x2: number; y2: number;
  unitId: string;
  childId?: string;
};

export type LayoutResult = {
  nodePositions: Record<string, { x: number; y: number }>;
  generations: Record<string, number>;
  edges: LayoutEdge[];
  width: number;
  height: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

type Unit = {
  id: string;
  members: string[];
  childUnits: Unit[];
  subtreeWidth: number;
  parentOffsetX: number;
  layoutLeft: number;
};

export function layout(members: LayoutMember[], rels: LayoutRel[]): LayoutResult {
  const parentOf: Record<string, string[]> = {};
  const childrenOf: Record<string, string[]> = {};
  const spouseOf: Record<string, string[]> = {};
  for (const m of members) { parentOf[m.id] = []; childrenOf[m.id] = []; spouseOf[m.id] = []; }
  for (const r of rels) {
    if (r.type === "PARENT_CHILD") {
      childrenOf[r.a]?.push(r.b);
      parentOf[r.b]?.push(r.a);
    } else if (r.type === "SPOUSE") {
      spouseOf[r.a]?.push(r.b);
      spouseOf[r.b]?.push(r.a);
    }
  }

  function jointChildren(aId: string, bId: string): string[] {
    const aKids = new Set(childrenOf[aId] || []);
    return (childrenOf[bId] || []).filter(c => aKids.has(c));
  }

  const claimed = new Set<string>();

  function buildUnit(memberId: string): Unit | null {
    if (claimed.has(memberId)) return null;
    claimed.add(memberId);

    const spouses = spouseOf[memberId] || [];
    let partner: string | null = null;
    for (const s of spouses) {
      if (!claimed.has(s)) { partner = s; claimed.add(s); break; }
    }

    const unit: Unit = {
      id: partner ? `${memberId}+${partner}` : memberId,
      members: partner ? [memberId, partner] : [memberId],
      childUnits: [],
      subtreeWidth: 0,
      parentOffsetX: 0,
      layoutLeft: 0,
    };

    const kids = partner
      ? jointChildren(memberId, partner)
      : (childrenOf[memberId] || []).filter(c => !claimed.has(c));

    for (const kidId of kids) {
      const cu = buildUnit(kidId);
      if (cu) unit.childUnits.push(cu);
    }
    return unit;
  }

  const roots = members
    .filter(m => parentOf[m.id].length === 0)
    .sort((a, b) => (a.birthDate || "").localeCompare(b.birthDate || ""));

  const rootUnits: Unit[] = [];
  for (const r of roots) {
    const u = buildUnit(r.id);
    if (u) rootUnits.push(u);
  }
  for (const m of members) {
    if (!claimed.has(m.id)) {
      const u = buildUnit(m.id);
      if (u) rootUnits.push(u);
    }
  }

  const unitParentWidth = (u: Unit) => u.members.length === 2 ? NODE_W * 2 + COUPLE_GAP : NODE_W;

  function layoutSubtree(u: Unit): number {
    const myWidth = unitParentWidth(u);
    if (u.childUnits.length === 0) {
      u.subtreeWidth = myWidth;
      u.parentOffsetX = 0;
      return u.subtreeWidth;
    }
    let cursor = 0;
    for (let i = 0; i < u.childUnits.length; i++) {
      const c = u.childUnits[i];
      layoutSubtree(c);
      c.layoutLeft = cursor;
      cursor += c.subtreeWidth;
      if (i < u.childUnits.length - 1) cursor += SIBLING_GAP;
    }
    const childrenSpan = cursor;
    const first = u.childUnits[0];
    const last = u.childUnits[u.childUnits.length - 1];
    const childCenter = (
      (first.layoutLeft + first.parentOffsetX + unitParentWidth(first) / 2) +
      (last.layoutLeft + last.parentOffsetX + unitParentWidth(last) / 2)
    ) / 2;

    let parentOffset = childCenter - myWidth / 2;
    const subtreeLeft = Math.min(0, parentOffset);
    const subtreeRight = Math.max(childrenSpan, parentOffset + myWidth);
    const shift = -subtreeLeft;
    parentOffset += shift;
    for (const c of u.childUnits) c.layoutLeft += shift;

    u.parentOffsetX = parentOffset;
    u.subtreeWidth = subtreeRight - subtreeLeft;
    return u.subtreeWidth;
  }

  for (const ru of rootUnits) layoutSubtree(ru);

  const nodePositions: Record<string, { x: number; y: number }> = {};
  const generations: Record<string, number> = {};

  function placeUnit(u: Unit, originX: number, originY: number, gen: number) {
    const px = originX + u.parentOffsetX;
    const py = originY;
    if (u.members.length === 2) {
      nodePositions[u.members[0]] = { x: px, y: py };
      nodePositions[u.members[1]] = { x: px + NODE_W + COUPLE_GAP, y: py };
    } else {
      nodePositions[u.members[0]] = { x: px, y: py };
    }
    for (const m of u.members) generations[m] = gen;

    const childY = py + NODE_H + RANK_GAP;
    for (const c of u.childUnits) placeUnit(c, originX + c.layoutLeft, childY, gen + 1);
  }

  let xCursor = 0;
  for (const ru of rootUnits) {
    placeUnit(ru, xCursor, 0, 1);
    xCursor += ru.subtreeWidth + SUBTREE_GAP * 2;
  }

  const edges: LayoutEdge[] = [];
  function walkEdges(u: Unit) {
    if (u.members.length === 2) {
      const pa = nodePositions[u.members[0]];
      const pb = nodePositions[u.members[1]];
      edges.push({
        type: "spouse",
        x1: pa.x + NODE_W, y1: pa.y + NODE_H / 2,
        x2: pb.x, y2: pb.y + NODE_H / 2,
        unitId: u.id,
      });
    }
    if (u.childUnits.length > 0) {
      let parentCenterX: number, parentCenterY: number;
      if (u.members.length === 2) {
        const pa = nodePositions[u.members[0]];
        parentCenterX = pa.x + NODE_W + COUPLE_GAP / 2;
        parentCenterY = pa.y + NODE_H / 2;
      } else {
        const pa = nodePositions[u.members[0]];
        parentCenterX = pa.x + NODE_W / 2;
        parentCenterY = pa.y + NODE_H;
      }
      const trunkY = parentCenterY + (u.members.length === 2 ? NODE_H / 2 + RANK_GAP / 2 : RANK_GAP / 2);
      edges.push({
        type: "parent-trunk",
        x1: parentCenterX, y1: parentCenterY,
        x2: parentCenterX, y2: trunkY,
        unitId: u.id,
      });

      const childCenters = u.childUnits.map(c => {
        const cp = nodePositions[c.members[0]];
        return {
          id: c.members[0],
          x: cp.x + NODE_W / 2,
          y: cp.y,
        };
      });
      if (childCenters.length > 1 || childCenters[0]?.x !== parentCenterX) {
        const xs = [...childCenters.map(c => c.x), parentCenterX];
        edges.push({
          type: "child-bus",
          x1: Math.min(...xs), y1: trunkY,
          x2: Math.max(...xs), y2: trunkY,
          unitId: u.id,
        });
      }
      for (const cc of childCenters) {
        edges.push({
          type: "child-drop",
          x1: cc.x, y1: trunkY,
          x2: cc.x, y2: cc.y,
          unitId: u.id,
          childId: cc.id,
        });
      }
    }
    for (const c of u.childUnits) walkEdges(c);
  }
  for (const ru of rootUnits) walkEdges(ru);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id of Object.keys(nodePositions)) {
    const p = nodePositions[id];
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + NODE_W);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  if (!isFinite(minX)) { minX = 0; maxX = 0; minY = 0; maxY = 0; }

  return {
    nodePositions,
    generations,
    edges,
    width: maxX - minX,
    height: maxY - minY,
    bounds: { minX, maxX, minY, maxY },
  };
}
