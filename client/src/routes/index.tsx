import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { Header } from "../components/Header.js";
import { MemberNode } from "../components/MemberNode.js";
import { MemberSidebar } from "../components/MemberSidebar.js";
import { MemberForm } from "../components/MemberForm.js";
import { useSession } from "../lib/auth.js";
import { layout, NODE_W, NODE_H, type LayoutEdge, type LayoutResult } from "../lib/layout.js";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  maidenName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  place: string | null;
  photoUrl: string | null;
  bio: string | null;
};
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: "PARENT_CHILD" | "SPOUSE" };

type Filter = { status: "all" | "living" | "memoriam"; gen: number };

function FilterRail({
  members, generations, filter, setFilter,
}: {
  members: Member[];
  generations: Record<string, number>;
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const counts = useMemo(() => {
    const genCounts: Record<number, number> = {};
    for (const m of members) {
      const g = generations[m.id] ?? 0;
      genCounts[g] = (genCounts[g] || 0) + 1;
    }
    return {
      all: members.length,
      living: members.filter(m => !m.deathDate).length,
      memoriam: members.filter(m => m.deathDate).length,
      gens: genCounts,
    };
  }, [members, generations]);

  const presentGens = Object.keys(counts.gens)
    .map(Number)
    .filter(g => g > 0)
    .sort((a, b) => a - b);

  const roman = (n: number) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ?? String(n);

  return (
    <div className="rail">
      <div className="rail-label">Filter</div>
      <div className="chip-group">
        <button className={`chip ${filter.status === "all" ? "active" : ""}`} onClick={() => setFilter({ ...filter, status: "all" })}>All <span className="count">{counts.all}</span></button>
        <button className={`chip ${filter.status === "living" ? "active" : ""}`} onClick={() => setFilter({ ...filter, status: "living" })}>Living <span className="count">{counts.living}</span></button>
        <button className={`chip ${filter.status === "memoriam" ? "active" : ""}`} onClick={() => setFilter({ ...filter, status: "memoriam" })}>In memoriam <span className="count">{counts.memoriam}</span></button>
      </div>
      {presentGens.length > 0 && (
        <>
          <div className="rail-label" style={{ marginTop: 4 }}>Generation</div>
          <div className="chip-group">
            <button className={`chip ${filter.gen === 0 ? "active" : ""}`} onClick={() => setFilter({ ...filter, gen: 0 })}>All</button>
            {presentGens.map(g => (
              <button
                key={g}
                className={`chip ${filter.gen === g ? "active" : ""}`}
                onClick={() => setFilter({ ...filter, gen: g })}
              >
                {roman(g)} <span className="count">{counts.gens[g]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Edges({ edges, highlightUnitIds, bounds }: {
  edges: LayoutEdge[];
  highlightUnitIds: Set<string>;
  bounds: LayoutResult["bounds"];
}) {
  const w = Math.max(0, bounds.maxX - bounds.minX) + 200;
  const h = Math.max(0, bounds.maxY - bounds.minY) + 200;
  return (
    <svg
      className="edge-svg"
      style={{
        width: w, height: h,
        left: bounds.minX - 100, top: bounds.minY - 100,
        overflow: "visible",
      }}
    >
      <g transform={`translate(${-(bounds.minX - 100)}, ${-(bounds.minY - 100)})`}>
        {edges.map((e, i) => {
          const hi = highlightUnitIds.has(e.unitId);
          const cls = e.type === "spouse" ? "edge-spouse" : "edge-parent";
          return (
            <line
              key={i}
              className={`${cls}${hi ? " edge-highlight" : ""}`}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            />
          );
        })}
      </g>
    </svg>
  );
}

function Canvas({
  children,
  bounds,
  focusOn,
  onBgClick,
}: {
  children: React.ReactNode;
  bounds: LayoutResult["bounds"] | null;
  focusOn: { x: number; y: number; ts: number } | null;
  onBgClick?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || !bounds) return;
    const rect = wrap.getBoundingClientRect();
    const pad = 80;
    const w = bounds.maxX - bounds.minX || 1;
    const h = bounds.maxY - bounds.minY || 1;
    const k = Math.min((rect.width - pad * 2) / w, (rect.height - pad * 2) / h, 1);
    const x = (rect.width - w * k) / 2 - bounds.minX * k;
    const y = (rect.height - h * k) / 2 - bounds.minY * k;
    setTransform({ x, y, k });
  }, [bounds]);

  useEffect(() => {
    fit();
  }, [fit, bounds?.minX, bounds?.maxX, bounds?.minY, bounds?.maxY]);

  useEffect(() => {
    if (!focusOn) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    setTransform(t => {
      const k = Math.max(t.k, 0.9);
      return {
        k,
        x: rect.width / 2 - (focusOn.x + NODE_W / 2) * k,
        y: rect.height / 2 - (focusOn.y + NODE_H / 2) * k,
      };
    });
  }, [focusOn?.x, focusOn?.y, focusOn?.ts]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    setTransform(t => {
      const k1 = Math.min(Math.max(t.k * (1 + delta), 0.2), 2.5);
      const ratio = k1 / t.k;
      return {
        k: k1,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  }
  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y, moved: false };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    setTransform(t => ({ ...t, x: dragRef.current!.tx + dx, y: dragRef.current!.ty + dy }));
  }
  function onMouseUp() {
    if (dragRef.current && !dragRef.current.moved) onBgClick?.();
    dragRef.current = null;
  }
  function zoom(delta: number) {
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    setTransform(t => {
      const k1 = Math.min(Math.max(t.k * (1 + delta), 0.2), 2.5);
      const ratio = k1 / t.k;
      return { k: k1, x: mx - (mx - t.x) * ratio, y: my - (my - t.y) * ratio };
    });
  }

  return (
    <div ref={wrapRef} className="canvas-wrap" onWheel={onWheel}>
      <div
        className="canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { dragRef.current = null; }}
      >
        <div
          className="canvas-inner"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }}
        >
          {children}
        </div>
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => zoom(0.2)}>+</button>
        <div className="zoom-readout">{Math.round(transform.k * 100)}%</div>
        <button className="zoom-btn" onClick={() => zoom(-0.2)}>−</button>
        <button className="zoom-btn" onClick={fit} title="Fit to view">⤢</button>
      </div>
    </div>
  );
}

export function TreePage() {
  const { data: session } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ status: "all", gen: 0 });
  const [focusTarget, setFocusTarget] = useState<{ x: number; y: number; ts: number } | null>(null);

  const { data, refetch } = useQuery<{ members: Member[]; relationships: Relationship[] }>({
    queryKey: ["tree"],
    queryFn: () => apiFetch("/members"),
  });

  const members = data?.members ?? [];
  const relationships = data?.relationships ?? [];

  const layoutData = useMemo(() => {
    if (members.length === 0) return null;
    const rels = relationships.map(r => ({
      a: r.memberId,
      b: r.relatedMemberId,
      type: r.type,
    }));
    return layout(members, rels);
  }, [members, relationships]);

  const visibleIds = useMemo(() => {
    return new Set(
      members
        .filter(m => {
          if (filter.status === "living" && m.deathDate) return false;
          if (filter.status === "memoriam" && !m.deathDate) return false;
          if (filter.gen !== 0 && layoutData?.generations[m.id] !== filter.gen) return false;
          return true;
        })
        .map(m => m.id)
    );
  }, [members, filter, layoutData]);

  const selected = members.find(m => m.id === selectedId) ?? null;

  const highlightUnitIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selected) return ids;
    const sid = selected.id;

    for (const r of relationships) {
      if (r.type === "SPOUSE" && (r.memberId === sid || r.relatedMemberId === sid)) {
        ids.add(`${r.memberId}+${r.relatedMemberId}`);
        ids.add(`${r.relatedMemberId}+${r.memberId}`);
      }
    }
    for (const r of relationships) {
      if (r.type === "PARENT_CHILD" && r.relatedMemberId === sid) {
        const parent = r.memberId;
        ids.add(parent);
        for (const sp of relationships) {
          if (sp.type === "SPOUSE" && (sp.memberId === parent || sp.relatedMemberId === parent)) {
            ids.add(`${sp.memberId}+${sp.relatedMemberId}`);
            ids.add(`${sp.relatedMemberId}+${sp.memberId}`);
          }
        }
      }
    }
    ids.add(sid);
    return ids;
  }, [selected, relationships]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const pos = layoutData?.nodePositions[id];
    if (pos) setFocusTarget({ x: pos.x, y: pos.y, ts: Date.now() });
  }, [layoutData]);

  return (
    <div className="app">
      <Header
        members={members}
        onSelectMember={handleSelect}
        onAddMember={session ? () => setSelectedId("__new__") : undefined}
      />

      <div className="main">
        <Canvas
          bounds={layoutData?.bounds ?? null}
          focusOn={focusTarget}
          onBgClick={() => setSelectedId(null)}
        >
          {layoutData && (
            <Edges
              edges={layoutData.edges}
              highlightUnitIds={highlightUnitIds}
              bounds={layoutData.bounds}
            />
          )}
          {members.map(m => {
            const pos = layoutData?.nodePositions[m.id];
            if (!pos) return null;
            return (
              <MemberNode
                key={m.id}
                member={m}
                x={pos.x}
                y={pos.y}
                selected={selectedId === m.id}
                dimmed={!visibleIds.has(m.id)}
                onClick={() => handleSelect(m.id)}
              />
            );
          })}
        </Canvas>

        {layoutData && (
          <FilterRail
            members={members}
            generations={layoutData.generations}
            filter={filter}
            setFilter={setFilter}
          />
        )}

        <div className="legend">
          <div className="legend-row">
            <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="oklch(0.55 0.008 80)" strokeWidth="1.25" /></svg>
            Parent → child
          </div>
          <div className="legend-row">
            <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="oklch(0.55 0.008 80)" strokeWidth="1.25" strokeDasharray="3 4" /></svg>
            Spouses
          </div>
        </div>

        {data && members.length === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
            fontFamily: "var(--serif)", color: "var(--ink-3)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🌳</div>
            <p style={{ fontSize: 22, fontStyle: "italic" }}>Your family tree is empty</p>
            {session && (
              <p style={{ fontSize: 13, marginTop: 6 }}>Click "Add member" to get started</p>
            )}
          </div>
        )}

        {selectedId === "__new__" ? (
          <MemberForm
            onDone={() => { setSelectedId(null); refetch(); }}
            onCancel={() => setSelectedId(null)}
          />
        ) : selected ? (
          <MemberSidebar
            member={selected}
            members={members}
            relationships={relationships}
            generation={layoutData?.generations[selected.id]}
            isAuthenticated={!!session}
            onClose={() => setSelectedId(null)}
            onRefetch={refetch}
            onSelectMember={handleSelect}
          />
        ) : null}
      </div>
    </div>
  );
}
