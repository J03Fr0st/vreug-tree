import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

type Member = { id: string; firstName: string; lastName: string };

type Props = {
  memberId: string;
  members: Member[];
  onDone: () => void;
  onCancel: () => void;
};

export function RelationshipForm({ memberId, members, onDone, onCancel }: Props) {
  const [relatedMemberId, setRelatedMemberId] = useState("");
  const [type, setType] = useState("PARENT_CHILD");
  const [direction, setDirection] = useState<"parent" | "child">("child");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const isParentChild = type === "PARENT_CHILD";
      const body = isParentChild
        ? {
            memberId: direction === "parent" ? relatedMemberId : memberId,
            relatedMemberId: direction === "parent" ? memberId : relatedMemberId,
            type,
          }
        : { memberId, relatedMemberId, type };
      return apiFetch("/relationships", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tree"] }); onDone(); },
    onError: (e: Error) => setError(e.message),
  });

  const otherMembers = members.filter((m) => m.id !== memberId);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      style={{
        background: "var(--color-surface-2)",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div>
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="PARENT_CHILD">Parent / Child</option>
          <option value="SPOUSE">Spouse</option>
        </select>
      </div>

      {type === "PARENT_CHILD" && (
        <div>
          <label>This member is the</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value as "parent" | "child")}>
            <option value="child">Child of selected</option>
            <option value="parent">Parent of selected</option>
          </select>
        </div>
      )}

      <div>
        <label>Related Member</label>
        <select value={relatedMemberId} onChange={(e) => setRelatedMemberId(e.target.value)} required>
          <option value="">— select —</option>
          {otherMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ color: "var(--color-danger)", fontSize: 12, fontWeight: 500 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={!relatedMemberId}
          style={{
            flex: 1, padding: "7px 0",
            background: "var(--color-accent)", color: "#fff",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: "7px 0",
            background: "var(--color-surface)", color: "var(--color-text)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
