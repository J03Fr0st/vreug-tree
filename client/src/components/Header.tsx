import { useRouter } from "@tanstack/react-router";
import { authClient, useSession } from "../lib/auth.js";

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header style={{
      height: 56,
      padding: "0 24px",
      borderBottom: "1.5px solid var(--color-border)",
      background: "var(--color-surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "var(--shadow-sm)",
      position: "relative",
      zIndex: 20,
    }}>
      <a href="/" style={{
        fontFamily: "var(--font-display)",
        fontSize: 26,
        fontWeight: 700,
        color: "var(--color-primary)",
        letterSpacing: "-0.01em",
      }}>
        🌳 Vreugdenburg
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {session ? (
          <>
            <span style={{ fontSize: 14, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {session.user.name}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                padding: "6px 14px",
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                border: "1.5px solid var(--color-border)",
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <a href="/login">
            <button style={{
              padding: "6px 16px",
              background: "var(--color-accent)",
              color: "#fff",
            }}>
              Sign In
            </button>
          </a>
        )}
      </div>
    </header>
  );
}
