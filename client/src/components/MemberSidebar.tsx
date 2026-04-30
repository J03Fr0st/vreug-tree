import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { MemberForm } from "./MemberForm.js";
import { RelationshipForm } from "./RelationshipForm.js";

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
type Relationship = { id: string; memberId: string; relatedMemberId: string; type: string };

type Props = {
  member: Member;
  members: Member[];
  relationships: Relationship[];
  generation?: number;
  isAuthenticated: boolean;
  onClose: () => void;
  onRefetch: () => void;
  onSelectMember: (id: string) => void;
};

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);
const IconArrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>
);

function initials(m: Member) {
  return ((m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "")).toUpperCase();
}
function yr(d: string | null) { return d ? d.slice(0, 4) : ""; }
function lifespan(m: Member) {
  const b = yr(m.birthDate), d = yr(m.deathDate);
  if (b && d) return `${b}–${d}`;
  if (b) return `b. ${b}`;
  return "";
}
function age(m: Member) {
  if (!m.birthDate) return null;
  const start = new Date(m.birthDate);
  const end = m.deathDate ? new Date(m.deathDate) : new Date();
  let a = end.getFullYear() - start.getFullYear();
  const md = end.getMonth() - start.getMonth();
  if (md < 0 || (md === 0 && end.getDate() < start.getDate())) a--;
  return a;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}
function romanize(n: number) {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] ?? String(n);
}

export function MemberSidebar({ member, members, relationships, generation, isAuthenticated, onClose, onRefetch, onSelectMember }: Props) {
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

  if (editing) {
    return <MemberForm member={member} onDone={() => { setEditing(false); onRefetch(); }} onCancel={() => setEditing(false)} />;
  }

  const deceased = !!member.deathDate;
  const a = age(member);

  const rels = relationships
    .filter(r => r.memberId === member.id || r.relatedMemberId === member.id)
    .map(r => {
      const otherId = r.memberId === member.id ? r.relatedMemberId : r.memberId;
      const other = members.find(m => m.id === otherId);
      let label: "Parent" | "Spouse" | "Child";
      if (r.type === "SPOUSE") label = "Spouse";
      else label = r.memberId === member.id ? "Child" : "Parent";
      return { id: r.id, label, other };
    })
    .filter((r): r is { id: string; label: "Parent" | "Spouse" | "Child"; other: Member } => !!r.other);

  const order: Record<string, number> = { Parent: 0, Spouse: 1, Child: 2 };
  rels.sort((x, y) => (order[x.label] - order[y.label]) || (x.other.birthDate || "").localeCompare(y.other.birthDate || ""));

  return (
    <aside className="sidebar">
      <div className="sb-header">
        <button className="sb-close" onClick={onClose}><IconX /></button>
        <div className="sb-photo">
          {member.photoUrl ? <img src={member.photoUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials(member)}
          <div className="node-status" style={{ background: deceased ? "var(--ink-4)" : "var(--living)" }} />
        </div>
        <h2 className="sb-name">
          {member.firstName} {member.lastName}
          {member.maidenName && member.maidenName !== member.lastName && (
            <em>  née {member.maidenName}</em>
          )}
        </h2>
        <div className="sb-tags">
          <span className={`tag ${deceased ? "deceased" : "living"}`}>{deceased ? "In memoriam" : "Living"}</span>
          {generation && <span className="tag">Gen {romanize(generation)}</span>}
          {a !== null && <span className="tag">{deceased ? `${a} years` : `Age ${a}`}</span>}
        </div>
      </div>

      <div className="sb-body">
        <section>
          <div className="sb-section-label">Life</div>
          <div className="sb-fact-grid">
            <div className="sb-fact-key">Born</div>
            <div className="sb-fact-val">{fmtDate(member.birthDate)}</div>
            {member.deathDate && (<>
              <div className="sb-fact-key">Died</div>
              <div className="sb-fact-val">{fmtDate(member.deathDate)}</div>
            </>)}
            {member.place && (<>
              <div className="sb-fact-key">Place</div>
              <div className="sb-fact-val">{member.place}</div>
            </>)}
          </div>
        </section>

        {member.bio && (
          <section>
            <div className="sb-section-label">About</div>
            <p className="sb-bio">"{member.bio}"</p>
          </section>
        )}

        <section>
          <div className="sb-section-label">Relationships · {rels.length}</div>
          {rels.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic" }}>No relationships yet</p>
          ) : (
            <div className="sb-rel-list">
              {rels.map(r => (
                <div key={r.id} className="sb-rel" onClick={() => onSelectMember(r.other.id)}>
                  <div className="sb-rel-avatar">
                    {r.other.photoUrl ? <img src={r.other.photoUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials(r.other)}
                  </div>
                  <div className="sb-rel-info">
                    <div className="sb-rel-name">{r.other.firstName} {r.other.lastName}</div>
                    <div className="sb-rel-type">{r.label} · {lifespan(r.other) || "—"}</div>
                  </div>
                  {isAuthenticated && (
                    <button
                      className="sb-rel-arrow"
                      onClick={(e) => { e.stopPropagation(); deleteRelMutation.mutate(r.id); }}
                      title="Remove relationship"
                      style={{ width: 24, height: 24, display: "grid", placeItems: "center" }}
                    ><IconX /></button>
                  )}
                  {!isAuthenticated && <span className="sb-rel-arrow"><IconArrow /></span>}
                </div>
              ))}
            </div>
          )}

          {isAuthenticated && !addingRelationship && (
            <button
              onClick={() => setAddingRelationship(true)}
              style={{
                marginTop: 10, width: "100%", padding: "8px 0",
                background: "transparent", border: "1px dashed var(--hairline)",
                color: "var(--ink-3)", borderRadius: "var(--r-sm)", fontSize: 12.5,
              }}
            >+ Add relationship</button>
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
        </section>
      </div>

      {isAuthenticated && (
        <div className="sb-actions">
          <button className="btn" onClick={() => setEditing(true)}><IconEdit /> Edit</button>
          <button
            className="btn"
            onClick={() => { if (confirm(`Delete ${member.firstName} ${member.lastName}?`)) deleteMutation.mutate(); }}
          ><IconPlus /> Delete</button>
        </div>
      )}
    </aside>
  );
}
