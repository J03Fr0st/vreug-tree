import { useState, useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberNode } from "../components/MemberNode.js";
import { MemberSidebar } from "../components/MemberSidebar.js";
import { MemberForm } from "../components/MemberForm.js";
import { useSession } from "../lib/auth.js";

const nodeTypes = { member: MemberNode };

type Member = {
  id: string; firstName: string; lastName: string;
  birthDate: string | null; deathDate: string | null;
  photoUrl: string | null; bio: string | null;
};
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

export function TreePage() {
  const { data: session } = useSession();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data, refetch } = useQuery<{ members: Member[]; relationships: Relationship[] }>({
    queryKey: ["tree"],
    queryFn: () => apiFetch("/members"),
  });

  const [, , onNodesChange] = useNodesState([]);
  const [, , onEdgesChange] = useEdgesState([]);

  const flowNodes = useMemo(() => {
    if (!data) return [];
    return data.members.map((m, i) => ({
      id: m.id,
      type: "member",
      position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 160 },
      data: {
        ...m,
        onClick: () => setSelectedMemberId(m.id),
      },
    }));
  }, [data]);

  const flowEdges = useMemo(() => {
    if (!data) return [];
    return data.relationships.map((r) => ({
      id: r.id,
      source: r.memberId,
      target: r.relatedMemberId,
      label: r.type === "SPOUSE" ? "spouse" : undefined,
      type: r.type === "SPOUSE" ? "straight" : "smoothstep",
    }));
  }, [data]);

  const selectedMember = data?.members.find((m) => m.id === selectedMemberId) ?? null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
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
          style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 24px", background: "#333", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
          onClick={() => setSelectedMemberId("__new__")}
        >
          + Add Member
        </button>
      )}
    </div>
  );
}
