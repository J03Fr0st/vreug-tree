import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";

type Member = { id: string; firstName: string; lastName: string; birthDate: string | null; deathDate: string | null; photoUrl: string | null; bio: string | null };

type Props = {
  member?: Member;
  onDone: () => void;
  onCancel: () => void;
};

export function MemberForm({ member, onDone, onCancel }: Props) {
  const [firstName, setFirstName] = useState(member?.firstName ?? "");
  const [lastName, setLastName] = useState(member?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(member?.birthDate?.slice(0, 10) ?? "");
  const [deathDate, setDeathDate] = useState(member?.deathDate?.slice(0, 10) ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      let photoUrl = member?.photoUrl;
      if (photoFile) {
        const form = new FormData();
        form.append("file", photoFile);
        const upload = await fetch("/api/upload", { method: "POST", credentials: "include", body: form });
        const data = await upload.json();
        photoUrl = data.url;
      }
      const body = { firstName, lastName, birthDate: birthDate || null, deathDate: deathDate || null, bio: bio || null, photoUrl };
      if (member) {
        return apiFetch(`/members/${member.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        return apiFetch("/members", { method: "POST", body: JSON.stringify(body) });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tree"] }); onDone(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div style={{
      width: 300,
      borderLeft: "1.5px solid var(--color-border)",
      background: "var(--color-surface)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 16px",
        borderBottom: "1.5px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
          {member ? "Edit Member" : "Add Member"}
        </h2>
        <button
          onClick={onCancel}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--color-surface-2)", color: "var(--color-text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}
        >×</button>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label>First Name *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Jane" />
          </div>
          <div>
            <label>Last Name *</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Smith" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label>Birth Date</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div>
            <label>Death Date</label>
            <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="A short biography…" style={{ resize: "vertical" }} />
        </div>
        <div>
          <label>Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            style={{ padding: "6px 10px" }}
          />
        </div>

        {error && (
          <div style={{
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-danger)",
            fontSize: 13, fontWeight: 500,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="submit"
            disabled={mutation.isPending}
            style={{
              flex: 1, padding: "9px 0",
              background: "var(--color-accent)", color: "#fff",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: "9px 0",
              background: "var(--color-surface-2)", color: "var(--color-text)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
