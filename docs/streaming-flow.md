# Live Streaming Flow

## Teacher Flow

1. Teacher logs in.
2. Clicks "Start Live Class".
3. Backend verifies teacher role.
4. Backend generates LiveKit token with publish permissions.
5. Teacher connects to LiveKit room.
6. Teacher publishes camera stream.

---

## Student Flow

1. Student clicks "Join Live Class".
2. Backend verifies student role.
3. Backend generates LiveKit token (subscribe only).
4. Student connects to room.
5. Student subscribes to teacher track.

---

## Session End

Teacher ends session.
All participants disconnected.
Session metadata stored in backend.
