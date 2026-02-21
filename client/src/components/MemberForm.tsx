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
    <div style={{ width: 300, borderLeft: "1px solid #eee", padding: 24 }}>
      <h2>{member ? "Edit Member" : "Add Member"}</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div><label>First Name *<br /><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label></div>
        <div><label>Last Name *<br /><input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></label></div>
        <div><label>Birth Date<br /><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label></div>
        <div><label>Death Date<br /><input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} /></label></div>
        <div><label>Bio<br /><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></label></div>
        <div><label>Photo<br /><input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} /></label></div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</button>
          <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
