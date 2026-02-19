"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signInWithPassword } from "../../../lib/auth";
import { connectToRoom } from "../../../lib/livekit";

type Role = "teacher" | "student" | "admin";
type ClassStatus = "scheduled" | "live" | "ended";
type RoomState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

type ClassStatePayload = {
  id: string;
  status: ClassStatus;
  teacher_id: string;
  livekit_room_name: string;
  message?: string;
};

function clearNode(node: HTMLDivElement | null) {
  if (!node) return;
  node.innerHTML = "";
}

function attachTeacherVideo(room: Room, container: HTMLDivElement | null) {
  if (!container) return;
  clearNode(container);
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      if (pub.track?.kind === Track.Kind.Video) {
        container.appendChild(pub.track.attach());
        return;
      }
    }
  }
}

export default function ClassroomByIdPage() {
  const params = useParams<{ id: string }>();
  const classId = typeof params?.id === "string" ? params.id : "";

  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [classStatus, setClassStatus] = useState<ClassStatus | null>(null);
  const [classTeacherId, setClassTeacherId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [roomState, setRoomState] = useState<RoomState>("idle");
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [teacherLeft, setTeacherLeft] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [micLive, setMicLive] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const mainVideoRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = Boolean(authUserEmail && accessToken);
  const isConnected = roomState === "connected" || roomState === "reconnecting";
  const canJoinRoomState = roomState === "idle" || roomState === "disconnected";
  const canStart = isLoggedIn && role === "teacher" && classStatus === "scheduled" && canJoinRoomState && !starting;
  const canJoin = isLoggedIn && classStatus === "live" && canJoinRoomState && !joining;
  const canEnd = isLoggedIn && (role === "teacher" || role === "admin") && classStatus === "live" && !ending;
  const canLeave = roomState !== "idle" && roomState !== "disconnected";

  const roomStateLabel =
    connectionState === ConnectionState.Connected
      ? "Connected"
      : connectionState === ConnectionState.Reconnecting
        ? "Reconnecting"
        : connectionState === ConnectionState.Connecting
          ? "Connecting"
          : "Disconnected";
  const connectionToneClass =
    roomStateLabel === "Connected"
      ? "connection-good"
      : roomStateLabel === "Reconnecting"
        ? "connection-warn"
        : "connection-off";

  const refreshState = useCallback(async () => {
    if (!classId || !accessToken) {
      setClassStatus(null);
      return;
    }

    try {
      const res = await fetch(`/api/classes/${classId}/state`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await res.json()) as ClassStatePayload;
      if (!res.ok) throw new Error(payload?.message || "Failed to load class state");
      setClassStatus(payload.status);
      setClassTeacherId(payload.teacher_id ?? null);
      setRoomName(payload.livekit_room_name ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load class state");
    }
  }, [accessToken, classId]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = setInterval(() => {
      void refreshState();
    }, 10000);
    return () => clearInterval(timer);
  }, [isLoggedIn, refreshState]);

  useEffect(() => {
    const onBeforeUnload = () => roomRef.current?.disconnect();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const updateLocalIndicators = useCallback((room: Room) => {
    const pubs = Array.from(room.localParticipant.trackPublications.values());
    const cam = pubs.find((p) => p.track?.kind === Track.Kind.Video);
    const mic = pubs.find((p) => p.track?.kind === Track.Kind.Audio);
    setCameraLive(Boolean(cam && !cam.isMuted));
    setMicLive(Boolean(mic && !mic.isMuted));
  }, []);

  const attachLocalPreview = useCallback((room: Room) => {
    clearNode(previewRef.current);
    const pubs = Array.from(room.localParticipant.trackPublications.values());
    const camera = pubs.find((p) => p.track?.kind === Track.Kind.Video);
    if (camera?.track && previewRef.current) {
      previewRef.current.appendChild(camera.track.attach());
    }
  }, []);

  const renderMain = useCallback(
    (room: Room) => {
      if (!mainVideoRef.current) return;
      clearNode(mainVideoRef.current);
      if (role === "teacher") {
        const pubs = Array.from(room.localParticipant.trackPublications.values());
        const camera = pubs.find((p) => p.track?.kind === Track.Kind.Video);
        if (camera?.track) {
          mainVideoRef.current.appendChild(camera.track.attach());
        }
        return;
      }
      attachTeacherVideo(room, mainVideoRef.current);
    },
    [role]
  );

  async function handleLogin() {
    if (!email || !password) return;
    setError(null);
    setAuthLoading(true);
    try {
      const auth = await signInWithPassword({ email, password });
      setAccessToken(auth.accessToken);
      setAuthUserEmail(auth.email);
      setStatus("Authenticated");
    } catch (e) {
      setStatus("Auth failed");
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function disconnectRoom() {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setRoomState("disconnected");
    setConnectionState(ConnectionState.Disconnected);
    setParticipantCount(0);
    setCameraLive(false);
    setMicLive(false);
    setStatus("Disconnected");
    clearNode(mainVideoRef.current);
    clearNode(previewRef.current);
  }

  async function handleStartClass() {
    if (!canStart) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message || "Failed to start class");
      setStatus("Class started");
      await refreshState();
    } catch (e) {
      setStatus("Start failed");
      setError(e instanceof Error ? e.message : "Failed to start class");
    } finally {
      setStarting(false);
    }
  }

  async function handleJoinClass() {
    if (!canJoin) return;
    setJoining(true);
    setRoomState("connecting");
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await res.json()) as { roomName?: string; token?: string; message?: string };
      if (!res.ok || !payload.token || !payload.roomName) {
        throw new Error(payload.message || "Failed to join class");
      }

      roomRef.current?.disconnect();
      const room = await connectToRoom(payload.token);
      roomRef.current = room;
      setRoomName(payload.roomName);
      setConnectionState(room.state);
      setRoomState(room.state === ConnectionState.Connected ? "connected" : "connecting");
      setTeacherLeft(false);

      const updateCount = () => setParticipantCount(room.remoteParticipants.size + 1);
      updateCount();
      renderMain(room);
      attachLocalPreview(room);
      updateLocalIndicators(room);

      room.on(RoomEvent.ParticipantConnected, (p) => {
        updateCount();
        if (role === "student" && classTeacherId && p.identity === classTeacherId) {
          setTeacherLeft(false);
          setStatus("Teacher joined");
        }
        renderMain(room);
      });

      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        updateCount();
        if (role === "student" && classTeacherId && p.identity === classTeacherId) {
          setTeacherLeft(true);
          setStatus("Teacher has left the session");
        }
        renderMain(room);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
        if (state === ConnectionState.Connected) setRoomState("connected");
        if (state === ConnectionState.Connecting) setRoomState("connecting");
        if (state === ConnectionState.Reconnecting) setRoomState("reconnecting");
        if (state === ConnectionState.Disconnected) setRoomState("disconnected");
      });

      room.on(RoomEvent.Disconnected, () => {
        setRoomState("disconnected");
        setConnectionState(ConnectionState.Disconnected);
        setParticipantCount(0);
        setStatus("Disconnected");
        clearNode(mainVideoRef.current);
        clearNode(previewRef.current);
      });

      room.on(RoomEvent.TrackSubscribed, () => renderMain(room));
      room.on(RoomEvent.TrackUnsubscribed, () => renderMain(room));
      room.on(RoomEvent.LocalTrackPublished, () => {
        attachLocalPreview(room);
        renderMain(room);
        updateLocalIndicators(room);
      });
      room.on(RoomEvent.LocalTrackUnpublished, () => {
        attachLocalPreview(room);
        renderMain(room);
        updateLocalIndicators(room);
      });
      room.on(RoomEvent.TrackMuted, () => updateLocalIndicators(room));
      room.on(RoomEvent.TrackUnmuted, () => updateLocalIndicators(room));

      if (role === "teacher") {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        updateLocalIndicators(room);
        attachLocalPreview(room);
        renderMain(room);
      }

      setStatus(role === "teacher" ? "Live as teacher" : "Connected as viewer");
      await refreshState();
    } catch (e) {
      setRoomState("disconnected");
      setStatus("Join failed");
      setError(e instanceof Error ? e.message : "Failed to join class");
    } finally {
      setJoining(false);
    }
  }

  async function handleEndClass() {
    if (!canEnd) return;
    setEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message || "Failed to end class");
      disconnectRoom();
      setStatus("Class ended");
      await refreshState();
    } catch (e) {
      setStatus("End failed");
      setError(e instanceof Error ? e.message : "Failed to end class");
    } finally {
      setEnding(false);
    }
  }

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room || role !== "teacher") return;
    await room.localParticipant.setCameraEnabled(!cameraLive);
    updateLocalIndicators(room);
    attachLocalPreview(room);
    renderMain(room);
  }

  async function toggleMic() {
    const room = roomRef.current;
    if (!room || role !== "teacher") return;
    await room.localParticipant.setMicrophoneEnabled(!micLive);
    updateLocalIndicators(room);
  }

  return (
    <div className="immersive-classroom">
      <header className="immersive-topbar">
        <div className="immersive-topbar-left">
          <span className="live-badge">
            <span className="live-dot" />
            <span className="live-label">LIVE</span>
          </span>
          <span className="status-title">PCM - {roomName || classId}</span>
        </div>
        <div className="immersive-topbar-right">
          <span>{Math.max(participantCount - 1, 0)} Students</span>
          <span className={`connection-pill ${connectionToneClass}`}>{roomStateLabel}</span>
          <span className="secure-pill">Secure connection</span>
        </div>
      </header>

      <main className="immersive-video-canvas">
        <div className="stage-main" ref={mainVideoRef} />
        <div className="stage-preview">
          <div className="stage-preview-video" ref={previewRef} />
          <div className="stage-preview-meta">
            <span>{authUserEmail ?? role}</span>
            <span>{cameraLive ? "Camera Live" : "Camera Off"}</span>
          </div>
        </div>

        <AnimatePresence>
          {roomState === "connecting" ? (
            <motion.div
              className="room-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              Joining class...
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {roomState === "reconnecting" ? (
            <motion.div
              className="room-overlay dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              Reconnecting...
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {teacherLeft ? (
            <motion.div
              className="room-overlay notice"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              Teacher has left the session
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!isLoggedIn ? (
          <motion.section className="auth-overlay-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2>Join Classroom</h2>
            <p>Class: {classId}</p>
            <div className="auth-fields">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Login email" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary" onClick={handleLogin} disabled={authLoading || !email || !password}>
                {authLoading ? "Logging in..." : "Login"}
              </button>
            </div>
          </motion.section>
        ) : null}
      </main>

      <motion.footer
        className="immersive-bottom-controls"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button className="dock-btn" onClick={toggleCamera} disabled={role !== "teacher" || !isConnected}>
          {cameraLive ? "🎥" : "📷"}
        </button>
        <button className="dock-btn" onClick={toggleMic} disabled={role !== "teacher" || !isConnected}>
          {micLive ? "🎤" : "🔇"}
        </button>
        <button className="dock-btn" disabled={!canStart} onClick={handleStartClass}>
          {starting ? "Starting" : "Start"}
        </button>
        <button className="dock-btn" disabled={!canJoin} onClick={handleJoinClass}>
          {joining ? "Joining" : "Join"}
        </button>
        <button className="dock-btn leave" disabled={!canLeave} onClick={disconnectRoom}>
          Leave
        </button>
        {(role === "teacher" || role === "admin") ? (
          <button className="dock-btn end" disabled={!canEnd} onClick={handleEndClass}>
            {ending ? "Ending" : "End"}
          </button>
        ) : null}
      </motion.footer>

      <div className="immersive-footer-meta">
        <span>Status: {status}</span>
        <span>Class: {classStatus ?? "unknown"}</span>
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </div>
  );
}
