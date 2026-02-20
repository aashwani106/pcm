"use client";

import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signInWithPassword } from "../../../lib/auth";
import { connectToRoom } from "../../../lib/livekit";

type Mode = "student" | "teacher";
type JoinStatus = "idle" | "pending" | "approved" | "rejected";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

type SessionState = {
  sessionId: string;
  roomName: string;
  status: "live" | "ended";
  capacity: number;
  approvedCount: number;
  expiresAt: string;
};

type JoinRequestRow = {
  id: string;
  displayName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

function clearNode(node: HTMLDivElement | null) {
  if (!node) return;
  try {
    node.replaceChildren();
  } catch {
    node.innerHTML = "";
  }
}

function attachRemoteTeacherVideo(room: Room, container: HTMLDivElement | null) {
  if (!container) return false;
  clearNode(container);
  for (const participant of room.remoteParticipants.values()) {
    for (const publication of participant.trackPublications.values()) {
      if (publication.track?.kind === Track.Kind.Video) {
        container.appendChild(publication.track.attach());
        return true;
      }
    }
  }
  return false;
}

function mapUiError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("session not found")) return "This session is no longer active.";
  if (normalized.includes("not live")) return "This session is no longer active.";
  if (normalized.includes("capacity")) return "Session capacity reached. Please try again later.";
  if (normalized.includes("rejected")) return "You were not admitted to this session.";
  return "Unable to complete this action right now.";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function LiveSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(modeParam === "teacher" ? "teacher" : "student");

  const sessionId = typeof params?.sessionId === "string" ? params.sessionId : "";

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");

  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherToken, setTeacherToken] = useState("");
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [roomState, setRoomState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [participantCount, setParticipantCount] = useState(0);
  const [copyToast, setCopyToast] = useState(false);
  const [latestRequestId, setLatestRequestId] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [admittedNotice, setAdmittedNotice] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [endedOverlayVisible, setEndedOverlayVisible] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [cameraLive, setCameraLive] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [stageVideoReady, setStageVideoReady] = useState(false);
  const [fadingRequestIds, setFadingRequestIds] = useState<string[]>([]);

  const roomRef = useRef<Room | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageMediaRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const sessionEndTriggeredRef = useRef(false);
  const prevSessionStatusRef = useRef<"live" | "ended" | null>(null);

  const isSessionLive = sessionState?.status === "live";
  const expiresAtMs = sessionState?.expiresAt ? new Date(sessionState.expiresAt).getTime() : null;
  const remainingMs = expiresAtMs ? Math.max(0, expiresAtMs - nowTs) : 0;
  const warningSoon = mode === "teacher" && isSessionLive && remainingMs > 0 && remainingMs <= 10 * 60 * 1000;

  const remainingLabel = useMemo(() => {
    if (!isSessionLive || !expiresAtMs) return "--";
    const totalMinutes = Math.ceil(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }, [expiresAtMs, isSessionLive, remainingMs]);
  useEffect(() => {
    if (!sessionId) {
      setShareUrl("");
      return;
    }
    setShareUrl(`${window.location.origin}/live/${sessionId}`);
  }, [sessionId]);

  const disconnectRoom = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setRoomState(ConnectionState.Disconnected);
    setParticipantCount(0);
    setCameraLive(false);
    setMicLive(false);
    setStageVideoReady(false);
    setAdmittedNotice(false);
    clearNode(stageMediaRef.current);
    clearNode(localRef.current);
  }, []);

  const endSessionFromTeacher = useCallback(async () => {
    if (!teacherToken || !sessionId || sessionEndTriggeredRef.current) return;
    sessionEndTriggeredRef.current = true;

    try {
      await fetch(`/api/live-sessions/${sessionId}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });
    } catch {
      // Best effort only.
    }
  }, [sessionId, teacherToken]);

  const connectWithLiveKit = useCallback(
    async (token: string, publishAsTeacher: boolean) => {
      disconnectRoom();
      const room = await connectToRoom(token);
      roomRef.current = room;
      setRoomState(room.state);
      setParticipantCount(room.remoteParticipants.size + 1);
      setStageVideoReady(false);

      const updateLocalIndicators = () => {
        const publications = Array.from(room.localParticipant.trackPublications.values());
        const cameraPublication = publications.find((pub) => pub.track?.kind === Track.Kind.Video);
        const microphonePublication = publications.find((pub) => pub.track?.kind === Track.Kind.Audio);
        setCameraLive(Boolean(cameraPublication?.track && !cameraPublication.isMuted));
        setMicLive(Boolean(microphonePublication?.track && !microphonePublication.isMuted));
      };

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setRoomState(state);
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setParticipantCount(room.remoteParticipants.size + 1);
        if (!publishAsTeacher) {
          const attached = attachRemoteTeacherVideo(room, stageMediaRef.current);
          setStageVideoReady(attached);
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setParticipantCount(room.remoteParticipants.size + 1);
        if (!publishAsTeacher) {
          const attached = attachRemoteTeacherVideo(room, stageMediaRef.current);
          setStageVideoReady(attached);
        }
      });

      room.on(RoomEvent.TrackSubscribed, () => {
        if (!publishAsTeacher) {
          const attached = attachRemoteTeacherVideo(room, stageMediaRef.current);
          setStageVideoReady(attached);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, () => {
        if (!publishAsTeacher) {
          const attached = attachRemoteTeacherVideo(room, stageMediaRef.current);
          setStageVideoReady(attached);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setRoomState(ConnectionState.Disconnected);
        setParticipantCount(0);
        setCameraLive(false);
        setMicLive(false);
        setStageVideoReady(false);
      });

      room.on(RoomEvent.LocalTrackPublished, updateLocalIndicators);
      room.on(RoomEvent.LocalTrackUnpublished, updateLocalIndicators);
      room.on(RoomEvent.TrackMuted, updateLocalIndicators);
      room.on(RoomEvent.TrackUnmuted, updateLocalIndicators);

      if (publishAsTeacher) {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        clearNode(stageMediaRef.current);
        const pubs = Array.from(room.localParticipant.trackPublications.values());
        const cameraPub = pubs.find((pub) => pub.track?.kind === Track.Kind.Video);
        if (cameraPub?.track && stageMediaRef.current) {
          stageMediaRef.current.appendChild(cameraPub.track.attach());
          setStageVideoReady(true);
        }
        updateLocalIndicators();
      } else {
        const attached = attachRemoteTeacherVideo(room, stageMediaRef.current);
        setStageVideoReady(attached);
      }
    },
    [disconnectRoom]
  );

  const fetchSessionState = useCallback(async () => {
    setLoadingState(true);
    setError(null);

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/state`);
      const payload = (await res.json()) as ApiResponse<SessionState>;
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load session");
      }
      setSessionState(payload.data);
    } catch (e) {
      setError(mapUiError(e instanceof Error ? e.message : "Failed to load session"));
      setSessionState(null);
    } finally {
      setLoadingState(false);
    }
  }, [sessionId]);

  const fetchJoinRequests = useCallback(async () => {
    if (!teacherToken) return;
    setLoadingRequests(true);

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/requests`, {
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });
      const payload = (await res.json()) as ApiResponse<JoinRequestRow[]>;
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load requests");
      }
      setRequests(payload.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoadingRequests(false);
    }
  }, [sessionId, teacherToken]);

  useEffect(() => {
    void fetchSessionState();
  }, [fetchSessionState]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(() => {
      void fetchSessionState();
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchSessionState, sessionId]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentStatus = sessionState?.status ?? null;
    const previousStatus = prevSessionStatusRef.current;
    if (
      mode === "student" &&
      previousStatus === "live" &&
      currentStatus === "ended" &&
      roomRef.current
    ) {
      setEndedOverlayVisible(true);
      setTimeout(() => {
        disconnectRoom();
      }, 420);
    }
    prevSessionStatusRef.current = currentStatus;
  }, [disconnectRoom, mode, sessionState?.status]);

  useEffect(() => {
    if (mode !== "student" || sessionState?.status === "live") {
      setEndedOverlayVisible(false);
    }
  }, [mode, sessionState?.status]);

  useEffect(() => {
    const nextMode = modeParam === "teacher" ? "teacher" : "student";
    setMode(nextMode);
  }, [modeParam]);

  useEffect(() => {
    if (mode !== "student") return;
    if (joinStatus === "pending" && sessionState?.status === "ended") {
      setJoinStatus("rejected");
      setError("Session has ended.");
    }
  }, [joinStatus, mode, sessionState?.status]);

  useEffect(() => {
    if (mode !== "teacher" || !sessionId || !teacherToken) return;

    const source = new EventSource(
      `/api/live-sessions/${sessionId}/requests/stream?access_token=${encodeURIComponent(teacherToken)}`
    );

    source.addEventListener("request", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as
        | {
            type: "created";
            request: { id: string; displayName: string; status: "pending" | "approved" | "rejected"; createdAt: string };
          }
        | {
            type: "updated";
            request: { id: string; status: "pending" | "approved" | "rejected" };
          };

      if (payload.type === "created") {
        setRequests((prev) => {
          if (prev.some((r) => r.id === payload.request.id)) return prev;
          return [...prev, payload.request];
        });
        setLatestRequestId(payload.request.id);
        setTimeout(() => {
          document.getElementById(`request-${payload.request.id}`)?.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }, 80);
        return;
      }

      setRequests((prev) =>
        prev.map((request) =>
          request.id === payload.request.id
            ? {
                ...request,
                status: payload.request.status
              }
            : request
        )
      );
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [mode, sessionId, teacherToken]);

  useEffect(() => {
    if (mode !== "student" || !requestId) return;

    const source = new EventSource(`/api/live-sessions/${sessionId}/requests/${requestId}/stream`);
    source.addEventListener("request", async (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        type: "updated";
        request: { status: "pending" | "approved" | "rejected"; token?: string | null };
      };

      if (payload.request.status === "approved" && payload.request.token) {
        setJoiningRoom(true);
        setAdmittedNotice(true);
        setJoinStatus("approved");
        setError(null);
        setTimeout(async () => {
          await connectWithLiveKit(payload.request.token as string, false);
          setJoiningRoom(false);
        }, 300);
        source.close();
        return;
      }

      if (payload.request.status === "rejected") {
        setJoinStatus("rejected");
        setError("You were not admitted to this session.");
        source.close();
      }
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [connectWithLiveKit, mode, requestId, sessionId]);

  useEffect(() => {
    if (mode !== "teacher") return;

    const onUnload = () => {
      if (!teacherToken || !sessionId) return;
      const baseUrl = window.location.origin;
      navigator.sendBeacon(
        `${baseUrl}/api/live-sessions/${sessionId}/end?access_token=${encodeURIComponent(teacherToken)}`,
        new Blob([], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [mode, sessionId, teacherToken]);

  useEffect(() => {
    if (!copyToast) return;
    const timer = setTimeout(() => setCopyToast(false), 1600);
    return () => clearTimeout(timer);
  }, [copyToast]);

  useEffect(() => {
    if (!admittedNotice) return;
    const timer = setTimeout(() => setAdmittedNotice(false), 900);
    return () => clearTimeout(timer);
  }, [admittedNotice]);

  useEffect(() => {
    return () => {
      disconnectRoom();
      void endSessionFromTeacher();
    };
  }, [disconnectRoom, endSessionFromTeacher]);

  async function handleTeacherLogin() {
    setError(null);
    try {
      const auth = await signInWithPassword({
        email: teacherEmail.trim(),
        password: teacherPassword.trim()
      });
      setTeacherToken(auth.accessToken);
    } catch (e) {
      setError(mapUiError(e instanceof Error ? e.message : "Teacher login failed"));
    }
  }

  async function handleTeacherConnect() {
    if (!teacherToken) return;
    setError(null);

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/join-teacher`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });
      const payload = (await res.json()) as ApiResponse<{ token: string }>;
      if (!res.ok || !payload.success || !payload.data?.token) {
        throw new Error(payload.message || "Failed to join as teacher");
      }

      await connectWithLiveKit(payload.data.token, true);
      await fetchJoinRequests();
    } catch (e) {
      setError(mapUiError(e instanceof Error ? e.message : "Failed to connect as teacher"));
    }
  }

  async function handleRequestJoin() {
    if (!studentName.trim() || !sessionId || !isSessionLive) return;
    setError(null);

    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ displayName: studentName.trim() })
      });

      const payload = (await res.json()) as ApiResponse<{ requestId: string; status: JoinStatus }>;
      if (!res.ok || !payload.success || !payload.data?.requestId) {
        throw new Error(payload.message || "Failed to create join request");
      }

      setRequestId(payload.data.requestId);
      setJoinStatus("pending");
    } catch (e) {
      setError(mapUiError(e instanceof Error ? e.message : "Failed to request join"));
    }
  }

  async function handleDecision(requestIdValue: string, action: "approve" | "reject") {
    if (!teacherToken) return;

    setError(null);
    try {
      const res = await fetch(`/api/live-sessions/${sessionId}/requests/${requestIdValue}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      });

      const payload = (await res.json()) as ApiResponse<{ id: string; status: JoinStatus }>;
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || `Failed to ${action} request`);
      }

      if (action === "approve") {
        setFadingRequestIds((prev) => [...prev, requestIdValue]);
        setTimeout(() => {
          setRequests((prev) => prev.filter((request) => request.id !== requestIdValue));
          setFadingRequestIds((prev) => prev.filter((id) => id !== requestIdValue));
        }, 320);
      } else {
        setRequests((prev) =>
          prev.map((request) =>
            request.id === requestIdValue
              ? {
                  ...request,
                  status: "rejected"
                }
              : request
          )
        );
      }
    } catch (e) {
      setError(mapUiError(e instanceof Error ? e.message : `Failed to ${action} request`));
    }
  }

  async function handleTeacherEndSession() {
    if (!teacherToken) return;
    setError(null);

    try {
      await endSessionFromTeacher();
      disconnectRoom();
      await fetchSessionState();
    } catch (e) {
      setError(mapUiError(e instanceof Error ? e.message : "Failed to end session"));
    }
  }

  async function handleToggleCamera() {
    const room = roomRef.current;
    if (!room || mode !== "teacher") return;
    await room.localParticipant.setCameraEnabled(!cameraLive);
  }

  async function handleToggleMic() {
    const room = roomRef.current;
    if (!room || mode !== "teacher") return;
    await room.localParticipant.setMicrophoneEnabled(!micLive);
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopyToast(true);
  }

  const connectionLabel =
    roomState === ConnectionState.Connected
      ? "Connected"
      : roomState === ConnectionState.Reconnecting
        ? "Reconnecting"
        : roomState === ConnectionState.Connecting
          ? "Connecting"
          : "Disconnected";

  const pendingRequests = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const approvedRequests = useMemo(
    () => requests.filter((request) => request.status === "approved").length,
    [requests]
  );
  const liveApprovedCount =
    mode === "teacher" && teacherToken && !loadingRequests
      ? approvedRequests
      : (sessionState?.approvedCount ?? 0);
  const liveCapacity = sessionState?.capacity ?? 100;

  return (
    <main className="live-shell">
      <section className="live-card live-room-card">
        <header className="live-header">
          <div>
            <h1>Instant Session {sessionId}</h1>
            <p>
              Status: <strong>{loadingState ? "loading" : sessionState?.status ?? "unknown"}</strong>
            </p>
            {mode === "teacher" && isSessionLive ? (
              <p className="live-expiry-line">Session ends in {remainingLabel}</p>
            ) : null}
            {warningSoon ? (
              <p className="live-warning-banner">Session will automatically end in 10 minutes.</p>
            ) : null}
          </div>
          <div className="live-row live-header-actions">
            <span className={`live-badge ${isSessionLive ? "live-badge-live" : "live-badge-off"}`}>
              {isSessionLive ? "Session Live" : "Session Ended"}
            </span>
            {mode === "teacher" && isSessionLive ? (
              <div className="live-presence-chip">
                <span className="live-presence-dot" />
                <span className="live-presence-live">LIVE</span>
                <span className="live-presence-divider" />
                <span>Room: {liveApprovedCount} / {liveCapacity}</span>
                <span className="live-presence-divider" />
                <span>Time Left: {remainingLabel}</span>
              </div>
            ) : null}
            {mode === "teacher" && !cameraLive ? (
              <span className="live-status-alert">Camera Off</span>
            ) : null}
            {mode === "teacher" && !micLive ? (
              <span className="live-status-alert live-status-alert-danger">Mic Muted</span>
            ) : null}
            <button onClick={handleCopyLink} disabled={!shareUrl}>
              Copy Link
            </button>
            {copyToast ? <span className="live-copy-toast">Link copied ✓</span> : null}
            <button onClick={() => setMode("student")} className={mode === "student" ? "is-active" : ""}>
              Student
            </button>
            <button onClick={() => setMode("teacher")} className={mode === "teacher" ? "is-active" : ""}>
              Teacher
            </button>
          </div>
        </header>

        {mode === "student" ? (
          <section className="live-panel">
            <h3>Student Join Flow</h3>
            <p>Enter your name. You will join automatically after teacher approval.</p>

            <label>
              Display Name
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Rahul Sharma"
                disabled={joinStatus !== "idle" && joinStatus !== "rejected"}
              />
            </label>

            <button
              onClick={handleRequestJoin}
              disabled={!isSessionLive || !studentName.trim() || joinStatus === "pending" || joinStatus === "approved"}
            >
              {joinStatus === "pending" ? "Waiting for approval..." : "Request to Join"}
            </button>

            {joinStatus === "pending" && (
              <div className="live-waiting-card">
                <div className="live-waiting-pulse" />
                <div>
                  <strong>Waiting for teacher approval...</strong>
                  <p>You will join automatically once admitted.</p>
                </div>
              </div>
            )}

            {joiningRoom ? (
              <div className="live-waiting-card">
                <div className="live-waiting-pulse" />
                <div>
                  <strong>{admittedNotice ? "Admitted to session" : "Joining classroom..."}</strong>
                </div>
              </div>
            ) : null}

            {!isSessionLive && joinStatus !== "approved" ? (
              <p className="live-error">Session has ended.</p>
            ) : null}

            {joinStatus === "rejected" ? <p className="live-error">You were not admitted to this session.</p> : null}
            {joinStatus === "approved" && !joiningRoom ? <p className="live-success">Approved. Connected.</p> : null}
          </section>
        ) : null}

        {mode === "teacher" ? (
          <div className="live-teacher-layout">
            <section className="live-stage-wrap">
              <div className="live-stage-meta">
                <span>Connection: {connectionLabel}</span>
                <span>Participants: {participantCount}</span>
              </div>
              <div className={`live-stage ${stageVideoReady ? "live-stage-video-ready" : ""}`} ref={stageRef}>
                <div className="live-stage-media" ref={stageMediaRef} />
                {!stageVideoReady ? <div className="live-stage-placeholder">Waiting for teacher video...</div> : null}
              </div>
            </section>
            <aside className="live-panel live-teacher-panel">
              <h3>Teacher Console</h3>
              <p>Realtime join requests update instantly without refresh.</p>

              <div className="live-grid-2">
                <label>
                  Email
                  <input
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="teacher@gmail.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
              </div>

              <div className="live-row">
                <button onClick={handleTeacherLogin} disabled={!teacherEmail || !teacherPassword}>
                  Login
                </button>
                <button onClick={handleTeacherConnect} disabled={!teacherToken || !isSessionLive}>
                  Connect & Publish
                </button>
                <button
                  onClick={handleToggleCamera}
                  disabled={roomState !== ConnectionState.Connected && roomState !== ConnectionState.Reconnecting}
                >
                  {cameraLive ? "Camera On" : "Camera Off"}
                </button>
                <button
                  onClick={handleToggleMic}
                  disabled={roomState !== ConnectionState.Connected && roomState !== ConnectionState.Reconnecting}
                >
                  {micLive ? "Mic On" : "Mic Off"}
                </button>
                <button onClick={handleTeacherEndSession} disabled={!teacherToken || !isSessionLive}>
                  End Session
                </button>
              </div>

              <div className="live-requests live-waiting-room">
                <div className="live-row live-requests-head">
                  <h4>Waiting Room ({pendingRequests.length})</h4>
                  <span className="live-capacity-chip">
                    Live: {liveApprovedCount} / {liveCapacity}
                  </span>
                  <button onClick={fetchJoinRequests} disabled={!teacherToken || loadingRequests}>
                    {loadingRequests ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {requests.length === 0 ? <p>No requests yet.</p> : null}
                {requests.map((request) => (
                <div
                  key={request.id}
                  id={`request-${request.id}`}
                  className={`live-request-row ${latestRequestId === request.id ? "live-request-new" : ""} ${
                    fadingRequestIds.includes(request.id) ? "live-request-fade-out" : ""
                  }`}
                >
                    <div>
                      <strong>{request.displayName}</strong>
                      <p>
                        {request.status} • requested {timeAgo(request.createdAt)}
                      </p>
                    </div>
                    {request.status === "pending" ? (
                      <div className="live-row live-request-actions">
                        <button
                          className="live-approve-btn"
                          onClick={() => handleDecision(request.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          className="live-reject-btn"
                          onClick={() => handleDecision(request.id, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`live-status-tag live-status-${request.status}`}>{request.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <section className="live-stage-wrap">
            <div className="live-stage-meta">
              <span>Connection: {connectionLabel}</span>
              <span>Participants: {participantCount}</span>
            </div>
            <div className="live-row live-student-controls">
              <button
                onClick={disconnectRoom}
                disabled={roomState !== ConnectionState.Connected && roomState !== ConnectionState.Reconnecting}
              >
                Leave Session
              </button>
            </div>
            <div
              className={`live-stage ${stageVideoReady ? "live-stage-video-ready" : ""} ${
                endedOverlayVisible ? "live-stage-fade" : ""
              }`}
              ref={stageRef}
            >
              <div className="live-stage-media" ref={stageMediaRef} />
              {!stageVideoReady && !endedOverlayVisible ? (
                <div className="live-stage-placeholder">Waiting for teacher video...</div>
              ) : null}
              {endedOverlayVisible ? (
                <div className="live-stage-ended-overlay">
                  <strong>Session has ended by the teacher.</strong>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {error ? <p className="live-error">{error}</p> : null}
      </section>
    </main>
  );
}
