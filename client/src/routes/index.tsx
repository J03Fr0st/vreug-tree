import { useState, useMemo, useEffect } from "react";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberNode } from "../components/MemberNode.js";
import { MemberSidebar } from "../components/MemberSidebar.js";
import { MemberForm } from "../components/MemberForm.js";
import { useSession } from "../lib/auth.js";

const nodeTypes = { member: MemberNode };

const NODE_W = 180;
const NODE_H = 140;
const H_GAP = 40;   // horizontal gap between nodes in same generation
const V_GAP = 80;   // vertical gap between generations

type Member = {
  id: string; firstName: string; lastName: string;
  birthDate: string | null; deathDate: string | null;
  photoUrl: string | null; bio: string | null;
};
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

/**
 * Assigns each member a generation (row) based on parent-child relationships,
 * then lays them out left-to-right within each generation, centred overall.
 */
function computeLayout(
  members: Member[],
  relationships: Relationship[]
): Map<string, { x: number; y: number }> {
  if (members.length === 0) return new Map();

  // Build child → parents and parent → children maps
  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type !== "PARENT_CHILD") continue;
    const parentId = r.memberId;
    const childId = r.relatedMemberId;
    if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
    parentToChildren.get(parentId)!.push(childId);
    if (!childToParents.has(childId)) childToParents.set(childId, []);
    childToParents.get(childId)!.push(parentId);
  }

  // BFS from roots (members with no parents)
  const gen = new Map<string, number>();
  const roots = members.filter(m => !childToParents.has(m.id) || childToParents.get(m.id)!.length === 0);
  const startIds = roots.length > 0 ? roots.map(m => m.id) : [members[0].id];

  const queue: string[] = [];
  for (const id of startIds) {
    gen.set(id, 0);
    queue.push(id);
  }

  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    for (const childId of parentToChildren.get(id) ?? []) {
      if (!gen.has(childId)) {
        gen.set(childId, gen.get(id)! + 1);
        queue.push(childId);
      }
    }
  }

  // Any member not reachable from roots gets generation 0
  for (const m of members) {
    if (!gen.has(m.id)) gen.set(m.id, 0);
  }

  // Group members by generation
  const byGen = new Map<number, string[]>();
  for (const m of members) {
    const g = gen.get(m.id)!;
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g)!.push(m.id);
  }

  // Assign positions: centre each generation horizontally
  const positions = new Map<string, { x: number; y: number }>();
  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);

  for (const g of sortedGens) {
    const ids = byGen.get(g)!;
    const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = -totalW / 2;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_W + H_GAP),
        y: g * (NODE_H + V_GAP),
      });
    });
  }

  return positions;
}

export function TreePage() {
  const { data: session } = useSession();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data, refetch } = useQuery<{ members: Member[]; relationships: Relationship[] }>({
    queryKey: ["tree"],
    queryFn: () => apiFetch("/members"),
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Recompute layout whenever data changes
  const computedNodes = useMemo<Node[]>(() => {
    if (!data) return [];
    const positions = computeLayout(data.members, data.relationships);
    return data.members.map((m) => ({
      id: m.id,
      type: "member",
      position: positions.get(m.id) ?? { x: 0, y: 0 },
      data: { ...m, onClick: () => setSelectedMemberId(m.id) },
    }));
  }, [data]);

  const computedEdges = useMemo(() => {
    if (!data) return [];
    return data.relationships.map((r) => ({
      id: r.id,
      source: r.memberId,
      target: r.relatedMemberId,
      type: r.type === "SPOUSE" ? "straight" : "smoothstep",
      label: r.type === "SPOUSE" ? "♥" : undefined,
      style: r.type === "SPOUSE"
        ? { stroke: "#F43F5E", strokeWidth: 2, strokeDasharray: "5 3" }
        : { stroke: "#2563EB", strokeWidth: 2 },
      labelStyle: { fill: "#F43F5E", fontWeight: 700, fontSize: 12 },
    }));
  }, [data]);

  // Sync into ReactFlow state when data changes (preserves drag positions until next refetch)
  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes, setNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges, setEdges]);

  const selectedMember = data?.members.find((m) => m.id === selectedMemberId) ?? null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="#E4E4E7" gap={24} />
          <Controls />
          <MiniMap
            nodeColor={() => "#2563EB"}
            maskColor="rgba(250,250,250,0.7)"
            style={{ border: "1.5px solid var(--color-border)", borderRadius: 8 }}
          />
        </ReactFlow>

        {/* Empty state */}
        {data && data.members.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌳</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-text-muted)" }}>
              Your family tree is empty
            </p>
            {session && (
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 6 }}>
                Click "+ Add Member" to get started
              </p>
            )}
          </div>
        )}
      </div>

      {selectedMemberId === "__new__" ? (
        <MemberForm
          onDone={() => { setSelectedMemberId(null); refetch(); }}
          onCancel={() => setSelectedMemberId(null)}
        />
      ) : selectedMember ? (
        <MemberSidebar
          member={selectedMember}
          relationships={data?.relationships ?? []}
          members={data?.members ?? []}
          isAuthenticated={!!session}
          onClose={() => setSelectedMemberId(null)}
          onRefetch={refetch}
        />
      ) : null}

      {session && (
        <button
          onClick={() => setSelectedMemberId("__new__")}
          style={{
            position: "fixed", bottom: 24, right: 24,
            padding: "12px 22px",
            background: "var(--color-accent)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            fontSize: 15,
            zIndex: 10,
          }}
        >
          + Add Member
        </button>
      )}
    </div>
  );
}
