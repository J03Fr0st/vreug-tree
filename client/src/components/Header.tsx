import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { authClient, useSession } from "../lib/auth.js";

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

type Props = {
  members?: Member[];
  onSelectMember?: (id: string) => void;
  onAddMember?: () => void;
};

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
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
function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export function Header({ members, onSelectMember, onAddMember }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!members || !q.trim()) return [];
    const ql = q.toLowerCase();
    return members.filter(m =>
      m.firstName.toLowerCase().includes(ql) ||
      m.lastName.toLowerCase().includes(ql) ||
      (m.maidenName || "").toLowerCase().includes(ql) ||
      (m.place || "").toLowerCase().includes(ql) ||
      (m.bio || "").toLowerCase().includes(ql)
    ).slice(0, 8);
  }, [q, members]);

  async function handleSignOut() {
    await authClient.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="header">
      <a className="brand" href="/">
        <span className="brand-mark" />
        Vreugdenburg
      </a>
      <div className="header-divider" />

      {members && onSelectMember ? (
        <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
          <div className="search">
            <IconSearch />
            <input
              ref={inputRef}
              placeholder="Search the family…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {!q && <kbd>⌘K</kbd>}
          </div>
          {open && q && (
            <div className="search-results">
              {results.length === 0 ? (
                <div className="search-empty">No one matches "{q}"</div>
              ) : (
                results.map(m => (
                  <div
                    key={m.id}
                    className="search-row"
                    onMouseDown={() => { onSelectMember(m.id); setOpen(false); setQ(""); }}
                  >
                    <div className="search-row-avatar">
                      {m.photoUrl ? <img src={m.photoUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials(m)}
                    </div>
                    <div className="search-row-info">
                      <div className="search-row-name">
                        {highlight(`${m.firstName} ${m.lastName}`, q)}
                      </div>
                      <div className="search-row-meta">
                        {lifespan(m) || "—"}{m.place ? ` · ${m.place}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      <div className="header-spacer" />

      {session ? (
        <>
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{session.user.name}</span>
          {onAddMember && (
            <button className="btn btn-primary" onClick={onAddMember}><IconPlus /> Add member</button>
          )}
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
        </>
      ) : (
        <a href="/login"><button className="btn btn-primary">Sign in</button></a>
      )}
    </header>
  );
}
