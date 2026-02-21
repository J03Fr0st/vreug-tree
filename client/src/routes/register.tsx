import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { authClient } from "../lib/auth.js";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Registration failed");
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 56px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--color-bg)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1.5px solid var(--color-border)",
        boxShadow: "var(--shadow-lg)",
        padding: 36,
      }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 6,
          color: "var(--color-primary)",
        }}>Create account</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 28 }}>
          Start building your family tree today
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>Your Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" />
          </div>
          {error && (
            <div style={{
              padding: "10px 14px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-danger)",
              fontSize: 13,
              fontWeight: 500,
            }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 0",
              background: "var(--color-accent)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              fontSize: 15,
              marginTop: 4,
            }}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "var(--color-text-muted)" }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--color-accent)", fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
