# Live Streaming Roles & Permissions

## Roles

### Teacher
- Can publish video
- Can publish audio
- Can screen share
- Can end session
- Can moderate chat (future)

### Student
- Can subscribe to stream
- Cannot publish video
- Cannot publish audio
- Can send chat messages (future)

---

## Enforcement

Permissions are enforced at token generation level.

Backend generates LiveKit tokens with:
- publish permission = true (teacher only)
- subscribe permission = true (all participants)

Students NEVER receive publish permission.
