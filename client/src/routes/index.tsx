import { useState, useMemo, useEffect } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberNode } from "../components/MemberNode.js";
import { MemberSidebar } from "../components/MemberSidebar.js";
import { MemberForm } from "../components/MemberForm.js";
import { useSession } from "../lib/auth.js";

const nodeTypes = { member: MemberNode };

const NODE_W = 180;
const NODE_H = 120;

type Member = {
  id: string; firstName: string; lastName: string;
  birthDate: string | null; deathDate: string | null;
  photoUrl: string | null; bio: string | null;
};
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

function getLayoutedNodes(
  members: Member[],
  relationships: Relationship[],
  onClickMember: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  // Build dagre graph — only parent-child edges drive the hierarchy
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 60, marginx: 40, marginy: 40 });

  for (const m of members) {
    g.setNode(m.id, { width: NODE_W, height: NODE_H });
  }

  for (const r of relationships) {
    if (r.type === "PARENT_CHILD") {
      g.setEdge(r.memberId, r.relatedMemberId);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = members.map((m) => {
    const pos = g.node(m.id);
    return {
      id: m.id,
      type: "member",
      position: {
        x: pos ? pos.x - NODE_W / 2 : 0,
        y: pos ? pos.y - NODE_H / 2 : 0,
      },
      data: { ...m, onClick: () => onClickMember(m.id) },
    };
  });

  const edges: Edge[] = relationships.map((r) => {
    const isSpouse = r.type === "SPOUSE";
    return {
      id: r.id,
      source: r.memberId,
      target: r.relatedMemberId,
      type: isSpouse ? "straight" : "smoothstep",
      label: isSpouse ? "♥" : undefined,
      style: isSpouse
        ? { stroke: "#F43F5E", strokeWidth: 2, strokeDasharray: "5 4" }
        : { stroke: "#2563EB", strokeWidth: 2 },
      labelStyle: isSpouse ? { fill: "#F43F5E", fontWeight: 700 } : undefined,
      labelBgStyle: isSpouse ? { fill: "#fff", fillOpacity: 0.85 } : undefined,
    };
  });

  return { nodes, edges };
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

  const layout = useMemo(() => {
    if (!data) return null;
    return getLayoutedNodes(data.members, data.relationships, setSelectedMemberId);
  }, [data]);

  useEffect(() => {
    if (!layout) return;
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

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
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.15}
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

        {data && data.members.length === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌳</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--color-text-muted)" }}>
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
