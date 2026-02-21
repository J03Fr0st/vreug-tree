import { Handle, Position } from "reactflow";

export type MemberNodeData = {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  onClick: () => void;
};

export function MemberNode({ data }: { data: MemberNodeData }) {
  return (
    <div
      onClick={data.onClick}
      style={{
        padding: 12,
        border: "2px solid #ccc",
        borderRadius: 8,
        background: "white",
        cursor: "pointer",
        minWidth: 140,
        textAlign: "center",
      }}
    >
      <Handle type="target" position={Position.Top} />
      {data.photoUrl && (
        <img src={data.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
      )}
      <div style={{ fontWeight: "bold" }}>{data.firstName} {data.lastName}</div>
      {data.birthDate && (
        <div style={{ fontSize: 11, color: "#888" }}>
          {data.birthDate.slice(0, 4)}{data.deathDate ? `–${data.deathDate.slice(0, 4)}` : ""}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
