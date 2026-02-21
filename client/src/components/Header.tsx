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
    <header style={{ padding: "12px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <a href="/" style={{ fontWeight: "bold", textDecoration: "none" }}>Family Tree</a>
      <div>
        {session ? (
          <>
            <span style={{ marginRight: 12 }}>Hello, {session.user.name}</span>
            <button onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <a href="/login">Sign In</a>
        )}
      </div>
    </header>
  );
}
