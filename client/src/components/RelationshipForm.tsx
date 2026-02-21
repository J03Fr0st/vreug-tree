type Member = { id: string; firstName: string; lastName: string };

type Props = {
  memberId: string;
  members: Member[];
  onDone: () => void;
  onCancel: () => void;
};

export function RelationshipForm({ onCancel }: Props) {
  return <div><button onClick={onCancel}>Cancel</button></div>;
}
