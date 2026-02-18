"use client";

import { motion } from "framer-motion";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signInWithPassword } from "../../lib/auth";
import { connectToRoom } from "../../lib/livekit";

type Role = "teacher" | "student" | "admin";
type ClassStatus = "scheduled" | "live" | "ended";

type ClassStatePayload = {
  id: string;
  status: ClassStatus;
  livekit_room_name: string;
  started_at?: string | null;
  ended_at?: string | null;
  message?: string;
};

function detachVideoElements(container: HTMLDivElement | null) {
  if (!container) return;
  const videos = container.querySelectorAll("video");
  videos.forEach((video) => video.remove());
  container.innerHTML = "";
}

export default function ClassroomPage() {
  const [classId, setClassId] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [joining, setJoining] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Idle");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [cameraLive, setCameraLive] = useState(false);
  const [classStatus, setClassStatus] = useState<ClassStatus | null>(null);
  const [classStatusLoading, setClassStatusLoading] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const localVideoWrapRef = useRef<HTMLDivElement>(null);
  const remoteVideoWrapRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = Boolean(authUserEmail && accessToken);

  const isClassScheduled = classStatus === "scheduled";
  const isClassLive = classStatus === "live";

  const canSubmitJoin = useMemo(
    () =>
      classId.trim().length > 0 &&
      accessToken.trim().length > 0 &&
      !joining &&
      !connected &&
      isClassLive,
    [classId, accessToken, joining, connected, isClassLive]
  );

  const canStart =
    isLoggedIn &&
    role === "teacher" &&
    classId.trim().length > 0 &&
    !starting &&
    !connected &&
    isClassScheduled;

  const canEnd =
    isLoggedIn &&
    (role === "teacher" || role === "admin") &&
    classId.trim().length > 0 &&
    !ending &&
    isClassLive;

  const canDisconnect = connected;

  const statusTone = error
    ? "error"
    : connected
      ? "success"
      : joining || starting || ending || authLoading || classStatusLoading
        ? "busy"
        : "idle";

  const updateParticipantCount = useCallback((room: Room) => {
    setParticipantCount(room.remoteParticipants.size + 1);
  }, []);

  const updateCameraIndicator = useCallback((room: Room) => {
    const publications = Array.from(room.localParticipant.trackPublications.values());
    const hasLiveCamera = publications.some(
      (pub) => pub.track?.kind === Track.Kind.Video && !pub.isMuted
    );
    setCameraLive(hasLiveCamera);
  }, []);

  const refreshClassState = useCallback(
    async (silent = false) => {
      if (!classId.trim() || !accessToken.trim()) {
        setClassStatus(null);
        setRoomName("");
        return;
      }

      if (!silent) {
        setClassStatusLoading(true);
      }

      try {
        const res = await fetch(`/api/classes/${classId.trim()}/state`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken.trim()}`
          }
        });

        const payload = (await res.json()) as ClassStatePayload;
        if (!res.ok) {
          throw new Error(payload?.message || "Failed to fetch class state.");
        }

        setClassStatus(payload.status);
        setRoomName(payload.livekit_room_name ?? "");
      } catch (e) {
        setClassStatus(null);
        setRoomName("");
        setError(e instanceof Error ? e.message : "Failed to fetch class state.");
      } finally {
        if (!silent) {
          setClassStatusLoading(false);
        }
      }
    },
    [accessToken, classId]
  );

  useEffect(() => {
    refreshClassState();
  }, [refreshClassState]);

  useEffect(() => {
    if (!isLoggedIn || !classId.trim()) return;
    const interval = setInterval(() => {
      void refreshClassState(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, classId, refreshClassState]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
      detachVideoElements(localVideoWrapRef.current);
      detachVideoElements(remoteVideoWrapRef.current);
    };
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setAuthLoading(true);

    try {
      const auth = await signInWithPassword({ email: email.trim(), password: password.trim() });
      setAccessToken(auth.accessToken);
      setAuthUserEmail(auth.email);
      setStatus("Logged in. Ready for class actions.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setStatus("Auth failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogoutAuth() {
    handleDisconnect();
    setAccessToken("");
    setAuthUserEmail(null);
    setPassword("");
    setClassStatus(null);
    setRoomName("");
    setStatus("Logged out");
  }

  async function handleJoin() {
    if (!canSubmitJoin) return;

    setError(null);
    setJoining(true);
    setStatus("Requesting class join token...");

    try {
      const res = await fetch(`/api/classes/${classId.trim()}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`
        }
      });
      const payload = (await res.json()) as { roomName?: string; token?: string; message?: string };
      if (!res.ok || !payload?.token || !payload?.roomName) {
        throw new Error(payload?.message || "Failed to join class.");
      }

      const room = await connectToRoom(payload.token);
      roomRef.current = room;
      setConnected(true);
      setRoomName(payload.roomName);
      setConnectionState(room.state);
      updateParticipantCount(room);
      updateCameraIndicator(room);

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant joined:", participant.identity);
        updateParticipantCount(room);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant left:", participant.identity);
        updateParticipantCount(room);
      });

      room.on(RoomEvent.ConnectionStateChanged, (nextState) => {
        setConnectionState(nextState);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("Room disconnected");
        setConnected(false);
        setConnectionState(ConnectionState.Disconnected);
        setParticipantCount(0);
        setCameraLive(false);
        setStatus("Disconnected");
        detachVideoElements(localVideoWrapRef.current);
        detachVideoElements(remoteVideoWrapRef.current);
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Video || !remoteVideoWrapRef.current) return;
        detachVideoElements(remoteVideoWrapRef.current);
        remoteVideoWrapRef.current.appendChild(track.attach());
      });

      room.on(RoomEvent.LocalTrackPublished, () => {
        updateCameraIndicator(room);
      });

      room.on(RoomEvent.LocalTrackUnpublished, () => {
        updateCameraIndicator(room);
      });

      room.on(RoomEvent.TrackMuted, () => {
        updateCameraIndicator(room);
      });

      room.on(RoomEvent.TrackUnmuted, () => {
        updateCameraIndicator(room);
      });

      if (role === "teacher") {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        const pubs = Array.from(room.localParticipant.trackPublications.values());
        const cameraPub = pubs.find((pub) => pub.track?.kind === Track.Kind.Video);
        if (cameraPub?.track && localVideoWrapRef.current) {
          detachVideoElements(localVideoWrapRef.current);
          localVideoWrapRef.current.appendChild(cameraPub.track.attach());
        }
        updateCameraIndicator(room);
      }

      setStatus(role === "teacher" ? "Live as teacher" : "Connected as viewer");
      await refreshClassState(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect room.");
      setStatus("Join failed");
    } finally {
      setJoining(false);
    }
  }

  async function handleStartClass() {
    if (!canStart) return;

    setError(null);
    setStarting(true);
    setStatus("Starting class...");

    try {
      const res = await fetch(`/api/classes/${classId.trim()}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`
        }
      });
      const payload = (await res.json()) as { message?: string; status?: string };
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to start class.");
      }

      setStatus(`Class started (${payload?.status ?? "live"})`);
      await refreshClassState(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start class.");
      setStatus("Start failed");
    } finally {
      setStarting(false);
    }
  }

  async function handleEndClass() {
    if (!canEnd) return;

    setError(null);
    setEnding(true);
    setStatus("Ending class...");

    try {
      const res = await fetch(`/api/classes/${classId.trim()}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`
        }
      });
      const payload = (await res.json()) as { message?: string; status?: string };
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to end class.");
      }

      setStatus(`Class ended (${payload?.status ?? "ended"})`);
      handleDisconnect();
      await refreshClassState(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end class.");
      setStatus("End failed");
    } finally {
      setEnding(false);
    }
  }

  function handleDisconnect() {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
    setConnectionState(ConnectionState.Disconnected);
    setParticipantCount(0);
    setCameraLive(false);
    setStatus("Disconnected");
    detachVideoElements(localVideoWrapRef.current);
    detachVideoElements(remoteVideoWrapRef.current);
  }

  const connectionLabel =
    connectionState === ConnectionState.Connected
      ? "Connected"
      : connectionState === ConnectionState.Connecting
        ? "Connecting..."
        : connectionState === ConnectionState.Reconnecting
          ? "Reconnecting..."
          : "Disconnected";

  const classLabel = classStatusLoading ? "loading" : classStatus ?? "unknown";

  return (
    <main className="classroom-shell">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="classroom-card"
      >
        <header className="classroom-header polished">
          <div>
            <h1>Live Classroom</h1>
            <p>Join securely using backend-issued LiveKit token.</p>
          </div>
          <div className="state-badges">
            <span className={`status-pill status-${statusTone}`}>{status}</span>
            <span className="role-pill">{role.toUpperCase()}</span>
            <span className={`class-pill class-${classStatus ?? "unknown"}`}>Class: {classLabel}</span>
            <span className="connection-pill">{connectionLabel}</span>
          </div>
        </header>

        <div className="control-grid">
          <section className="control-section">
            <div className="section-head">
              <h3>Authentication</h3>
              <p>Sign in once and continue with role-based actions.</p>
            </div>
            <div className="form-grid">
              <label>
                Login Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@domain.com"
                />
              </label>

              <label>
                Login Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
            </div>
          </section>

          <section className="control-section">
            <div className="section-head">
              <h3>Class Controls</h3>
              <p>Actions are locked to backend lifecycle state.</p>
            </div>
            <div className="form-grid">
              <label>
                Class ID
                <input
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="e.g. ba2f09b1-fede..."
                />
              </label>

              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        <details className="token-details">
          <summary>Advanced: Backend Access Token</summary>
          <div className="token-panel">
            <input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Supabase access token"
            />
          </div>
        </details>

        <div className="action-row polished">
          {!authUserEmail ? (
            <button
              className="btn btn-secondary"
              disabled={authLoading || !email || !password}
              onClick={handleLogin}
            >
              {authLoading ? "Logging in..." : "Login"}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleLogoutAuth}>
              Logout ({authUserEmail})
            </button>
          )}
          <button className="btn btn-secondary" disabled={!canStart} onClick={handleStartClass}>
            {starting ? "Starting..." : "Start Class"}
          </button>
          <button className="btn btn-primary glow" disabled={!canSubmitJoin} onClick={handleJoin}>
            {joining ? "Requesting..." : "Join Class"}
          </button>
          <button className="btn btn-secondary" disabled={!canEnd} onClick={handleEndClass}>
            {ending ? "Ending..." : "End Class"}
          </button>
          <button className="btn btn-muted" disabled={!canDisconnect} onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>

        <div className="status-row polished">
          <span>Session: {isLoggedIn ? "Authenticated" : "Not logged in"}</span>
          <span>Room: {roomName || "-"}</span>
          <span>Participants: {participantCount}</span>
          <span>LiveKit URL: {process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880"}</span>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </motion.section>

      <section className="video-grid">
        <article className="video-card polished">
          <div className="video-card-head">
            <h2>Teacher / Local Feed</h2>
            <span>{role === "teacher" ? (cameraLive ? "Camera Live" : "Camera Off") : "Viewer mode"}</span>
          </div>
          <div className="video-stage" ref={localVideoWrapRef} />
        </article>

        <article className="video-card polished">
          <div className="video-card-head">
            <h2>Remote Stream</h2>
            <span>Teacher broadcast</span>
          </div>
          <div className="video-stage" ref={remoteVideoWrapRef} />
        </article>
      </section>
    </main>
  );
}
