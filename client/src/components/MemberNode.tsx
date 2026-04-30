type Member = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  deathDate: string | null;
  place: string | null;
  photoUrl: string | null;
};

const IconPin = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
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

type Props = {
  member: Member;
  x: number;
  y: number;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
};

export function MemberNode({ member, x, y, selected, dimmed, onClick }: Props) {
  const deceased = !!member.deathDate;
  return (
    <div
      className={`node${selected ? " selected" : ""}${dimmed ? " dimmed" : ""}${deceased ? " deceased" : ""}`}
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="node-photo">
        {member.photoUrl ? <img src={member.photoUrl} alt="" /> : initials(member)}
        <div className="node-status" />
      </div>
      <div className="node-name">{member.firstName} {member.lastName}</div>
      <div className="node-meta">{lifespan(member)}</div>
      {member.place && (
        <div className="node-place"><IconPin />{member.place}</div>
      )}
    </div>
  );
}
