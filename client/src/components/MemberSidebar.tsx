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

export function MemberSidebar({ onClose }: Props) {
  return <div style={{ width: 300, borderLeft: "1px solid #eee", padding: 24 }}><button onClick={onClose}>✕</button></div>;
}
