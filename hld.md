# High-Level Design (HLD)

## System Architecture (High Level)

React Native Expo App
        |
Supabase Auth (Users & Roles)
        |
Supabase Postgres (Core Data)
        |
Supabase Storage (Files)
        |
Node.js API (Business Logic)
        |
Face Recognition Service (Open Source)

---

## Authentication & Roles

- Supabase Auth handles login/signup
- Each user has a role:
  - admin
  - student
  - parent
- Role-based access enforced using Supabase Row Level Security (RLS)

---

## Attendance Flow (Location + Face)

1. Student opens "Mark Attendance"
2. App checks:
   - Current time within allowed window
   - GPS location inside geofence
3. Camera opens → live selfie captured
4. Image sent to backend
5. Backend:
   - Generates face embedding
   - Compares with stored embedding
6. If match:
   - Attendance marked as PRESENT
7. If not:
   - Attendance rejected

---

## Facial Recognition Approach (Free)

### Face Registration (One Time)
- Capture 3–5 selfies
- Generate embeddings using open-source model
- Store embeddings in Supabase Postgres
- Delete raw images after processing

### Face Verification
- Capture live image
- Generate embedding
- Compare using cosine distance
- Threshold-based match decision

---

## Parent Notification Logic

Scheduled job (cron-like):
- Runs after attendance cutoff time
- Finds students with no attendance
- Excludes holidays
- Sends push notification to parent

---

## Quiz System Approach

- Admin creates quiz (questions + timing)
- Quiz stored in DB
- Student attempts quiz within time window
- Timer enforced on frontend
- Auto-submit on timeout
- Backend evaluates & stores score

---

## Study Material Handling

- Admin uploads files to Supabase Storage
- File metadata stored in DB
- Students download via signed URLs
- Access controlled by role

---

## Holiday Management

- Holidays stored in DB
- Attendance logic checks holiday table
- Notifications & attendance skipped automatically

---

## Security & Privacy

- No raw face images stored permanently
- Face embeddings encrypted at rest
- RLS ensures:
  - Students see only their data
  - Parents see only their child’s data
- Admin-only write access for sensitive actions

---

## Scalability Notes (Future)

- Multi-coaching support via `organization_id`
- Paid facial recognition APIs can be plugged later
- Payment & fee module can be added without redesign
