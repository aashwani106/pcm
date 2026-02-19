"use client";

import { motion } from "framer-motion";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signInWithPassword } from "../../lib/auth";
import { connectToRoom } from "../../lib/livekit";

type Role = "teacher" | "student" | "admin";
type ClassStatus = "scheduled" | "live" | "ended";
type RoomState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

const SESSION_STORAGE_KEY = "pcm_classroom_session_v1";

type ClassStatePayload = {
  id: string;
  status: ClassStatus;
  teacher_id: string;
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

function attachRemoteTrack(room: Room, container: HTMLDivElement | null) {
  if (!container) return;
  detachVideoElements(container);

  for (const participant of room.remoteParticipants.values()) {
    for (const pub of participant.trackPublications.values()) {
      if (pub.track?.kind === Track.Kind.Video) {
        container.appendChild(pub.track.attach());
        return;
      }
    }
  }
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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Idle");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [roomState, setRoomState] = useState<RoomState>("idle");
  const [cameraLive, setCameraLive] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [teacherLeft, setTeacherLeft] = useState(false);
  const [teacherJoinedNotice, setTeacherJoinedNotice] = useState(false);
  const [classTeacherId, setClassTeacherId] = useState<string | null>(null);
  const [classStatus, setClassStatus] = useState<ClassStatus | null>(null);
  const [classStatusLoading, setClassStatusLoading] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const mainVideoWrapRef = useRef<HTMLDivElement>(null);
  const localPreviewWrapRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = Boolean(authUserEmail && accessToken);
  const isJoinableRoomState = roomState === "idle" || roomState === "disconnected";
  const isConnected = roomState === "connected" || roomState === "reconnecting";
  const isTeacherLike = role === "teacher" || role === "admin";

  const isClassScheduled = classStatus === "scheduled";
  const isClassLive = classStatus === "live";

  const canSubmitJoin = useMemo(
    () =>
      classId.trim().length > 0 &&
      accessToken.trim().length > 0 &&
      !joining &&
      isClassLive &&
      isJoinableRoomState,
    [classId, accessToken, joining, isClassLive, isJoinableRoomState]
  );

  const canStart =
    isLoggedIn &&
    role === "teacher" &&
    classId.trim().length > 0 &&
    !starting &&
    isJoinableRoomState &&
    isClassScheduled;

  const canEnd =
    isLoggedIn &&
    (role === "teacher" || role === "admin") &&
    classId.trim().length > 0 &&
    !ending &&
    isClassLive;

  const canDisconnect = roomState !== "idle" && roomState !== "disconnected";

  const statusTone = error
    ? "error"
    : isConnected
      ? "success"
      : joining || starting || ending || authLoading || classStatusLoading
        ? "busy"
        : "idle";

  const updateParticipantCount = useCallback((room: Room) => {
    setParticipantCount(room.remoteParticipants.size + 1);
  }, []);

  const updateLocalIndicators = useCallback((room: Room) => {
    const publications = Array.from(room.localParticipant.trackPublications.values());
    const cameraPublication = publications.find((pub) => pub.track?.kind === Track.Kind.Video);
    const microphonePublication = publications.find((pub) => pub.track?.kind === Track.Kind.Audio);
    setCameraLive(Boolean(cameraPublication && !cameraPublication.isMuted));
    setMicLive(Boolean(microphonePublication && !microphonePublication.isMuted));
  }, []);

  const attachLocalPreview = useCallback((room: Room) => {
    if (!localPreviewWrapRef.current) return;
    detachVideoElements(localPreviewWrapRef.current);

    const pubs = Array.from(room.localParticipant.trackPublications.values());
    const cameraPub = pubs.find((pub) => pub.track?.kind === Track.Kind.Video);
    if (cameraPub?.track) {
      localPreviewWrapRef.current.appendChild(cameraPub.track.attach());
    }
  }, []);

  const renderMainStage = useCallback(
    (room: Room) => {
      if (!mainVideoWrapRef.current) return;
      if (role === "teacher") {
        detachVideoElements(mainVideoWrapRef.current);
        const pubs = Array.from(room.localParticipant.trackPublications.values());
        const cameraPub = pubs.find((pub) => pub.track?.kind === Track.Kind.Video);
        if (cameraPub?.track) {
          mainVideoWrapRef.current.appendChild(cameraPub.track.attach());
        }
        return;
      }
      attachRemoteTrack(room, mainVideoWrapRef.current);
    },
    [role]
  );

  const refreshClassState = useCallback(
    async (silent = false) => {
      if (!classId.trim() || !accessToken.trim()) {
        setClassStatus(null);
        setClassTeacherId(null);
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
        setClassTeacherId(payload.teacher_id ?? null);
        setRoomName(payload.livekit_room_name ?? "");
      } catch (e) {
        setClassStatus(null);
        setClassTeacherId(null);
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
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        classId?: string;
        role?: Role;
        accessToken?: string;
        authUserEmail?: string;
        email?: string;
      };
      if (parsed.classId) setClassId(parsed.classId);
      if (parsed.role) setRole(parsed.role);
      if (parsed.accessToken) setAccessToken(parsed.accessToken);
      if (parsed.authUserEmail) setAuthUserEmail(parsed.authUserEmail);
      if (parsed.email) setEmail(parsed.email);
      if (parsed.accessToken && parsed.authUserEmail) {
        setStatus("Session restored");
      }
    } catch {
      // Ignore invalid local storage payload.
    }
  }, []);

  useEffect(() => {
    try {
      const payload = {
        classId,
        role,
        accessToken,
        authUserEmail,
        email,
      };
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore local storage failures.
    }
  }, [classId, role, accessToken, authUserEmail, email]);

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
      detachVideoElements(mainVideoWrapRef.current);
      detachVideoElements(localPreviewWrapRef.current);
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => {
      roomRef.current?.disconnect();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!teacherJoinedNotice) return;
    const timeout = setTimeout(() => setTeacherJoinedNotice(false), 2500);
    return () => clearTimeout(timeout);
  }, [teacherJoinedNotice]);

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
    setClassTeacherId(null);
    setRoomName("");
    setRoomState("idle");
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setStatus("Logged out");
  }

  async function handleJoin() {
    if (!canSubmitJoin) return;

    setError(null);
    setJoining(true);
    setRoomState("connecting");
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

      roomRef.current?.disconnect();
      const room = await connectToRoom(payload.token);
      roomRef.current = room;
      setRoomState(room.state === ConnectionState.Connected ? "connected" : "connecting");
      setTeacherLeft(false);
      setRoomName(payload.roomName);
      setConnectionState(room.state);
      updateParticipantCount(room);
      updateLocalIndicators(room);
      renderMainStage(room);
      attachLocalPreview(room);

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("Participant joined:", participant.identity);
        if (role === "student" && classTeacherId && participant.identity === classTeacherId) {
          setTeacherLeft(false);
          setTeacherJoinedNotice(true);
          setStatus("Teacher joined");
        }
        updateParticipantCount(room);
        renderMainStage(room);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("Participant left:", participant.identity);
        if (role === "student" && classTeacherId && participant.identity === classTeacherId) {
          setTeacherLeft(true);
          setStatus("Teacher has left the session");
        }
        updateParticipantCount(room);
        renderMainStage(room);
      });

      room.on(RoomEvent.ConnectionStateChanged, (nextState) => {
        setConnectionState(nextState);
        switch (nextState) {
          case ConnectionState.Connecting:
            setRoomState("connecting");
            break;
          case ConnectionState.Connected:
            setRoomState("connected");
            break;
          case ConnectionState.Reconnecting:
            setRoomState("reconnecting");
            break;
          case ConnectionState.Disconnected:
            setRoomState("disconnected");
            break;
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("Room disconnected");
        setRoomState("disconnected");
        setConnectionState(ConnectionState.Disconnected);
        setParticipantCount(0);
        setCameraLive(false);
        setMicLive(false);
        setStatus("Disconnected");
        detachVideoElements(mainVideoWrapRef.current);
        detachVideoElements(localPreviewWrapRef.current);
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Video) return;
        renderMainStage(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        renderMainStage(room);
      });

      room.on(RoomEvent.LocalTrackPublished, () => {
        updateLocalIndicators(room);
        attachLocalPreview(room);
        renderMainStage(room);
      });

      room.on(RoomEvent.LocalTrackUnpublished, () => {
        updateLocalIndicators(room);
        attachLocalPreview(room);
        renderMainStage(room);
      });

      room.on(RoomEvent.TrackMuted, () => {
        updateLocalIndicators(room);
      });

      room.on(RoomEvent.TrackUnmuted, () => {
        updateLocalIndicators(room);
      });

      if (role === "teacher") {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        updateLocalIndicators(room);
        attachLocalPreview(room);
        renderMainStage(room);
      }

      setStatus(role === "teacher" ? "Live as teacher" : "Connected as viewer");
      await refreshClassState(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect room.");
      setRoomState("disconnected");
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
    setRoomState("disconnected");
    setConnectionState(ConnectionState.Disconnected);
    setParticipantCount(0);
    setCameraLive(false);
    setMicLive(false);
    setStatus("Disconnected");
    detachVideoElements(mainVideoWrapRef.current);
    detachVideoElements(localPreviewWrapRef.current);
  }

  async function handleToggleCamera() {
    const room = roomRef.current;
    if (!room || role !== "teacher") return;
    await room.localParticipant.setCameraEnabled(!cameraLive);
    updateLocalIndicators(room);
    renderMainStage(room);
    attachLocalPreview(room);
  }

  async function handleToggleMic() {
    const room = roomRef.current;
    if (!room || role !== "teacher") return;
    await room.localParticipant.setMicrophoneEnabled(!micLive);
    updateLocalIndicators(room);
  }

  const connectionLabel =
    connectionState === ConnectionState.Connected
      ? "Connected"
      : connectionState === ConnectionState.Connecting
        ? "Connecting"
        : connectionState === ConnectionState.Reconnecting
          ? "Reconnecting"
          : "Disconnected";

  const classLabel = classStatusLoading ? "loading" : classStatus ?? "unknown";

  return (
    <main className="classroom-shell coaching-shell">
      {!isConnected ? (
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
          </div>

          <div className="status-row polished">
            <span>Session: {isLoggedIn ? "Authenticated" : "Not logged in"}</span>
            <span>Room: {roomName || "-"}</span>
            <span>Participants: {participantCount}</span>
            <span>LiveKit URL: {process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880"}</span>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
        </motion.section>
      ) : (
        <section className="coaching-room-wrap">
          <header className="coaching-status-bar">
            <div className="coaching-status-left">
              <span className="live-dot" />
              <span className="live-label">LIVE</span>
              <span className="status-title">PCM - {roomName || classId || "Classroom"}</span>
            </div>
            <div className="coaching-status-right">
              <span>{participantCount} Students</span>
              <span>{connectionLabel}</span>
              <span className="secure-pill">Secure Connection</span>
              <span className="record-pill">REC</span>
            </div>
          </header>

          {teacherJoinedNotice ? <div className="trust-toast">Teacher joined</div> : null}
          {teacherLeft ? <div className="trust-toast warn">Teacher disconnected</div> : null}

          <section className="stage-shell">
            <div className="stage-main" ref={mainVideoWrapRef}>
              {!isTeacherLike ? (
                <span className="stage-empty-label">Teacher Stream</span>
              ) : (
                <span className="stage-empty-label">Your Live Feed</span>
              )}
            </div>

            <div className="stage-preview">
              <div className="stage-preview-video" ref={localPreviewWrapRef}>
              </div>
              <div className="stage-preview-meta">
                <span>{authUserEmail ?? role}</span>
                <span>{cameraLive ? "Camera Live" : "Camera Off"}</span>
              </div>
            </div>
          </section>

          <footer className="control-dock">
            <button className="dock-btn" onClick={handleToggleCamera} disabled={role !== "teacher"}>
              {cameraLive ? "🎥" : "🚫🎥"}
            </button>
            <button className="dock-btn" onClick={handleToggleMic} disabled={role !== "teacher"}>
              {micLive ? "🎤" : "🔇"}
            </button>
            <button className="dock-btn" disabled>
              👥 {participantCount}
            </button>
            <button className="dock-btn leave" onClick={handleDisconnect} disabled={!canDisconnect}>
              🚪 Leave
            </button>
            {(role === "teacher" || role === "admin") ? (
              <button className="dock-btn end" onClick={handleEndClass} disabled={!canEnd}>
                ⛔ End Class
              </button>
            ) : null}
          </footer>
        </section>
      )}
    </main>
  );
}
