# Coaching Institute Mobile App – Requirements
    name - PCM 
## Overview
A mobile application for a local coaching institute (~200 students) to manage:
- Attendance (anti-proxy)
- Parent communication
- Quizzes & study material
- Basic academic tracking

The app will be built using **free-tier resources only** and designed for scalability.

---

## User Roles

### 1. Admin (Tutor)
- Full access
- Manages students, parents, attendance, quizzes, and content

### 2. Student
- Marks attendance
- Attempts quizzes
- Downloads study material
- Receives reminders

### 3. Parent
- View-only access
- Receives attendance & reminder notifications
- Views student performance summary

---

## Core Features

### 1. Location-Based Attendance
- Attendance can be marked **only within coaching premises**
- GPS-based geofencing (30–50m radius)
- Attendance allowed only within a **fixed time window**
- One attendance per student per day
- Attendance blocked on declared holidays

Student opens Attendance screen
        ↓
App checks GPS location
        ↓
Inside allowed radius?
   ├─ No → show error
   └─ Yes
        ↓
Check: already marked today?
   ├─ Yes → block
   └─ No
        ↓
Insert attendance record


---

### 2. Facial Recognition (Anti-Proxy)
- Mandatory selfie capture during attendance
- Face registered once during onboarding
- Face embeddings stored (not raw images)
- Attendance accepted only if face matches registered data
- No gallery uploads allowed

---

### 3. Automatic Parent Notifications
- If student fails to mark attendance before cutoff time:
  - Push notification sent to parent
- Notifications skipped on holidays
- Optional SMS fallback (future scope)

---

### 4. Admin Reminders
- Admin can send reminders to:
  - All students
  - Selected batch
  - Parents of absent students
- Reminders can be instant or scheduled

---

### 5. Quizzes & Tests
- Admin can create quizzes with:
  - Start & end time
  - Time limit
- Students can attempt quizzes from home
- Auto-submit on timeout
- Basic scoring & result storage

---

### 6. Question Sheets & Study Material
- Admin uploads PDFs/images
- Students can download material
- Download tracking (optional)
- Simple access control (student-only)

---

### 7. Holiday & Batch Management
- Admin can mark holidays
- Attendance disabled automatically on holidays
- Students grouped into batches/classes

---

## Design Requirements

- **Minimal UI**
- Primary colors:
  - Beige shades (backgrounds)
  - Green shades (actions, success, highlights)
- Clean typography
- No cluttered screens
- Focus on readability for parents & tutors

---

## Non-Functional Requirements

- Works on Android (primary), iOS (secondary)
- Secure role-based access
- Free-tier friendly
- Scalable for future SaaS conversion
- Privacy-first (especially biometric data)

---

## Tech Stack

### Frontend
- React Native
- Expo
- Expo Camera
- Expo Location
- Expo Notifications

### Backend
- Node.js (lightweight API layer)
- REST APIs

### Database & Backend Services
- Supabase Postgres (primary database)
- Supabase Auth (authentication & roles)
- Supabase Storage (images, PDFs)

### Facial Recognition (Free Resources)
- Open-source face embedding models (FaceNet / face-api.js)
- Python or Node-based processing service
- Store only embeddings, not raw images

---

## Constraints

- Zero paid services
- Only free-tier tools
- Simple & reliable implementation preferred over advanced ML
