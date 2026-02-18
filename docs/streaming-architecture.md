# Live Streaming Architecture (Self-Hosted LiveKit)

## Goal
Provide YouTube-style 1 -> Many live streaming for coaching center.

- 1 Teacher publishes video
- Up to ~1000 students subscribe
- Low latency (WebRTC)
- No student publishing
- Backend controlled access

---

## System Components

### 1. Classroom Web App (Next.js)
- Teacher dashboard
- Student viewer page
- Connects to LiveKit using access token

### 2. Backend (Node.js)
- Auth verification
- Role validation
- Generates LiveKit access tokens
- Creates room metadata
- Tracks session history

### 3. LiveKit Server (Self-Hosted)
- WebRTC SFU
- Handles media forwarding
- ICE negotiation
- TURN/STUN routing
- Encrypted DTLS/SRTP streams

---

## Data Flow

Teacher -> WebRTC -> LiveKit SFU -> Students (WebRTC)

Backend is NOT in media path.
Backend only issues secure access tokens.

---

## Scaling Strategy

- Teacher uploads ~2-3 Mbps
- LiveKit forwards stream to viewers
- Bandwidth heavy on LiveKit server
- Backend load minimal

---

## Design Decision

We use:
- Self-hosted LiveKit
- Separate web app for streaming
- Strict role-based publish permissions
