"use client";

import { useMemo, useState } from "react";
import { signInWithPassword } from "../../lib/auth";

type StartSessionData = {
  sessionId: string;
  roomName: string;
  sharePath: string;
  teacherToken: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

export default function LiveStartPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StartSessionData | null>(null);

  const shareUrl = useMemo(() => {
    if (!session?.sharePath || typeof window === "undefined") return "";
    return `${window.location.origin}${session.sharePath}`;
  }, [session?.sharePath]);

  async function handleLogin() {
    setError(null);
    try {
      const auth = await signInWithPassword({ email: email.trim(), password: password.trim() });
      setAccessToken(auth.accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function handleStartSession() {
    if (!accessToken) return;

    setStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/live-sessions/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const payload = (await res.json()) as ApiResponse<StartSessionData>;
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to start session");
      }

      setSession(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="live-shell">
      <section className="live-card">
        <h1>Instant Live Session</h1>
        <p>Teacher starts a session and shares link. Students request to join, teacher approves in realtime.</p>

        <label>
          Teacher Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@gmail.com" />
        </label>

        <label>
          Teacher Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <div className="live-row">
          <button onClick={handleLogin} disabled={!email || !password}>
            Login
          </button>
          <button onClick={handleStartSession} disabled={!accessToken || starting}>
            {starting ? "Starting..." : "Start Instant Class"}
          </button>
        </div>

        {error && <p className="live-error">{error}</p>}

        {session && (
          <div className="live-result">
            <p>
              Session ID: <strong>{session.sessionId}</strong>
            </p>
            <p>
              Share Link: <a href={shareUrl}>{shareUrl}</a>
            </p>
            <p>
              Teacher Console: <a href={`/live/${session.sessionId}?mode=teacher`}>Open</a>
            </p>
            <p>
              Student Join: <a href={`/live/${session.sessionId}`}>Open</a>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
