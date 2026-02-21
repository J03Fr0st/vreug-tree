type Member = { id: string; firstName: string; lastName: string; birthDate: string | null; deathDate: string | null; photoUrl: string | null; bio: string | null };

type Props = {
  member?: Member;
  onDone: () => void;
  onCancel: () => void;
};

export function MemberForm({ onCancel }: Props) {
  return <div style={{ width: 300, borderLeft: "1px solid #eee", padding: 24 }}><button onClick={onCancel}>Cancel</button></div>;
}
