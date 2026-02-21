import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberForm } from "./MemberForm.js";
import { RelationshipForm } from "./RelationshipForm.js";

type Member = { id: string; firstName: string; lastName: string; birthDate: string | null; deathDate: string | null; photoUrl: string | null; bio: string | null };
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

type Props = {
  member: Member;
  members: Member[];
  relationships: Relationship[];
  isAuthenticated: boolean;
  onClose: () => void;
  onRefetch: () => void;
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  marginBottom: 8,
};

export function MemberSidebar({ member, members, relationships, isAuthenticated, onClose, onRefetch }: Props) {
  const [editing, setEditing] = useState(false);
  const [addingRelationship, setAddingRelationship] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/members/${member.id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tree"] }); onClose(); },
  });

  const deleteRelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/relationships/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tree"] }),
  });

  const memberRelationships = relationships.filter(
    (r) => r.memberId === member.id || r.relatedMemberId === member.id
  );

  function getRelatedMember(r: Relationship) {
    const relatedId = r.memberId === member.id ? r.relatedMemberId : r.memberId;
    return members.find((m) => m.id === relatedId);
  }

  function relLabel(r: Relationship) {
    if (r.type === "SPOUSE") return "Spouse";
    return r.memberId === member.id ? "Child" : "Parent";
  }

  if (editing) {
    return <MemberForm member={member} onDone={() => { setEditing(false); onRefetch(); }} onCancel={() => setEditing(false)} />;
  }

  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div style={{
      width: 300,
      borderLeft: "1.5px solid var(--color-border)",
      background: "var(--color-surface)",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1.5px solid var(--color-border)",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}>
        {member.photoUrl ? (
          <img src={member.photoUrl} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--color-border)" }} />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
            background: "var(--color-surface-2)", border: "2px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text-muted)",
          }}>{initials}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: "var(--color-text)" }}>
            {member.firstName} {member.lastName}
          </h2>
          {(member.birthDate || member.deathDate) && (
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 3 }}>
              {member.birthDate ? member.birthDate.slice(0, 10) : "?"} {member.deathDate ? `→ ${member.deathDate.slice(0, 10)}` : ""}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: "var(--color-surface-2)", color: "var(--color-text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Bio */}
        {member.bio && (
          <div>
            <div style={sectionLabel}>About</div>
            <p style={{ fontSize: 14, color: "var(--color-text)", lineHeight: 1.6 }}>{member.bio}</p>
          </div>
        )}

        {/* Relationships */}
        <div>
          <div style={sectionLabel}>Relationships</div>
          {memberRelationships.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic" }}>No relationships added yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {memberRelationships.map((r) => {
                const related = getRelatedMember(r);
                return (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                  }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {relLabel(r)}
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                        {related?.firstName} {related?.lastName}
                      </div>
                    </div>
                    {isAuthenticated && (
                      <button
                        onClick={() => deleteRelMutation.mutate(r.id)}
                        style={{ background: "none", color: "var(--color-text-muted)", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                        title="Remove relationship"
                      >×</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isAuthenticated && !addingRelationship && (
            <button
              onClick={() => setAddingRelationship(true)}
              style={{
                marginTop: 10, width: "100%", padding: "7px 0",
                background: "none", border: "1.5px dashed var(--color-border)",
                color: "var(--color-text-muted)", borderRadius: "var(--radius-sm)",
                fontSize: 13,
              }}
            >
              + Add Relationship
            </button>
          )}

          {addingRelationship && (
            <div style={{ marginTop: 10 }}>
              <RelationshipForm
                memberId={member.id}
                members={members}
                onDone={() => { setAddingRelationship(false); onRefetch(); }}
                onCancel={() => setAddingRelationship(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAuthenticated && (
        <div style={{
          padding: "12px 20px 20px",
          borderTop: "1.5px solid var(--color-border)",
          display: "flex",
          gap: 8,
        }}>
          <button
            onClick={() => setEditing(true)}
            style={{
              flex: 1, padding: "8px 0",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => { if (confirm(`Delete ${member.firstName} ${member.lastName}?`)) deleteMutation.mutate(); }}
            style={{
              flex: 1, padding: "8px 0",
              background: "#FEF2F2",
              color: "var(--color-danger)",
              border: "1.5px solid #FECACA",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
