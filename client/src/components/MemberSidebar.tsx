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

  if (editing) {
    return <MemberForm member={member} onDone={() => { setEditing(false); onRefetch(); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div style={{ width: 300, borderLeft: "1px solid #eee", padding: 24, overflowY: "auto" }}>
      <button onClick={onClose} style={{ float: "right" }}>✕</button>
      {member.photoUrl && <img src={member.photoUrl} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />}
      <h2>{member.firstName} {member.lastName}</h2>
      {member.birthDate && <p>Born: {member.birthDate.slice(0, 10)}</p>}
      {member.deathDate && <p>Died: {member.deathDate.slice(0, 10)}</p>}
      {member.bio && <p>{member.bio}</p>}

      <h3>Relationships</h3>
      {memberRelationships.length === 0 && <p style={{ color: "#888" }}>None</p>}
      {memberRelationships.map((r) => {
        const related = getRelatedMember(r);
        return (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>
              {r.type === "SPOUSE" ? "Spouse" : r.memberId === member.id ? "Child" : "Parent"}: {related?.firstName} {related?.lastName}
            </span>
            {isAuthenticated && (
              <button onClick={() => deleteRelMutation.mutate(r.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            )}
          </div>
        );
      })}

      {isAuthenticated && (
        <div style={{ marginTop: 16 }}>
          {addingRelationship ? (
            <RelationshipForm
              memberId={member.id}
              members={members}
              onDone={() => { setAddingRelationship(false); onRefetch(); }}
              onCancel={() => setAddingRelationship(false)}
            />
          ) : (
            <button onClick={() => setAddingRelationship(true)}>+ Add Relationship</button>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setEditing(true)}>Edit Member</button>
            <button
              onClick={() => { if (confirm("Delete this member?")) deleteMutation.mutate(); }}
              style={{ marginLeft: 8, color: "red" }}
            >
              Delete Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
