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
  const initials = `${data.firstName[0] ?? ""}${data.lastName[0] ?? ""}`.toUpperCase();
  const deceased = !!data.deathDate;

  return (
    <div
      onClick={data.onClick}
      style={{
        padding: "12px 16px",
        border: `2px solid ${deceased ? "#D4D4D8" : "var(--color-accent)"}`,
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-md)",
        cursor: "pointer",
        minWidth: 160,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        transition: "box-shadow 180ms ease, border-color 180ms ease",
        opacity: deceased ? 0.75 : 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)";
        (e.currentTarget as HTMLDivElement).style.borderColor = deceased ? "#A1A1AA" : "#1D4ED8";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLDivElement).style.borderColor = deceased ? "#D4D4D8" : "var(--color-accent)";
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "var(--color-accent)", border: "none", width: 8, height: 8 }} />

      {data.photoUrl ? (
        <img
          src={data.photoUrl}
          alt=""
          style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-border)" }}
        />
      ) : (
        <div style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--color-surface-2)",
          border: "2px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--color-text-muted)",
        }}>
          {initials}
        </div>
      )}

      <div style={{
        fontWeight: 700,
        fontSize: 14,
        color: "var(--color-text)",
        textAlign: "center",
        fontFamily: "var(--font-body)",
        lineHeight: 1.3,
      }}>
        {data.firstName}<br />{data.lastName}
      </div>

      {data.birthDate && (
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>
          {data.birthDate.slice(0, 4)}
          {data.deathDate ? ` – ${data.deathDate.slice(0, 4)}` : ""}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: "var(--color-accent)", border: "none", width: 8, height: 8 }} />
    </div>
  );
}
