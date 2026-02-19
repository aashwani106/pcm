# PCM (Coaching Institute Management) - End-to-End Platform

A professional, minimal, and secure end-to-end platform for coaching institutes: attendance integrity, live classes, academic workflows, and parent communication in one system.

## 🚀 Overview
PCM is built to solve proxy attendance, fragmented communication, and disconnected live-class operations in coaching institutes.  

It combines:
- Mobile workflows for students, parents, and admins
- Web classroom and conversion website
- Secure backend APIs with role-based controls
- Real-time live streaming via LiveKit

The result is a single operational stack for **attendance + communication + academics + live delivery**.

---

## ✨ Key Features

### 1. High-Integrity Attendance
*   **GPS Geofencing:** Attendance can only be marked within a 30-50m radius of the coaching premises.
*   **Anti-Proxy Facial Recognition:** Uses open-source face embedding models (FaceNet) to verify student identity during attendance.
*   **Time Windows:** Attendance is only allowed during specific institute hours.

### 2. Communication & Automation
*   **Parent Notifications:** Automated push notifications sent to parents if a student is absent after the cutoff time.
*   **Admin Reminders:** Instant or scheduled notifications to specific batches or individual students.
*   **Holiday Management:** Automated blocking of attendance on declared holidays.

### 3. Academic Tools
*   **Quizzes & Tests:** Create and attempt quizzes with time limits and auto-submission.
*   **Study Materials:** Secure access to PDFs, notes, and question sheets uploaded by tutors.

### 4. Live Classes
*   **Low-Latency Classroom Streaming:** Teacher-to-student live classes powered by LiveKit (WebRTC SFU).
*   **Role-Based Access:** Only teachers can publish; students join as subscribers.
*   **Class Lifecycle Controls:** Start, join, and end controls with secure token issuance from backend.
*   **Live Session UX:** Connection state, participant count, reconnect handling, and teacher presence indicators.

### 5. Operations & Admin Controls
*   **Admin Dashboard:** Date-wise attendance overview with present/absent summary.
*   **Student Lifecycle Controls:** Status-based controls (active/paused/left) and attendance enable/disable.
*   **Attendance Overrides:** Manual admin marking with reason and audit fields.
*   **Calendar Visibility:** Student/parent/admin attendance calendars with status context.

---

## 🛠 Tech Stack

### Frontend (Mobile)
*   **Framework:** React Native (Expo)
*   **Animation:** Lottie (for premium splash & micro-interactions), Reanimated
*   **Styling:** Minimalist Design System (Beige & Green palette)

### Frontend (Web)
*   **Framework:** Next.js (App Router)
*   **Animation:** Framer Motion
*   **Use Cases:** Landing page, pricing conversion, course discovery, and live class web classroom

### Backend & Infrastructure
*   **Platform:** Supabase (Postgres, Auth, Storage, Edge Functions)
*   **API Layer:** Node.js (Business logic & Attendance processing)
*   **Biometrics:** Python-based Face Recognition Service (processing embeddings only)
*   **Live Streaming:** Self-hosted LiveKit (WebRTC SFU) for one-to-many classroom broadcasting

---

## 📂 Project Structure

This project follows a Monorepo architecture to keep the mobile app, backend, and shared logic in one place.

```text
pcm-v2/
├── apps/
│   ├── mobile/           # React Native Expo App
│   ├── website/          # Next.js Web App (courses + live classes)
│   └── backend/          # Node.js API Server
├── services/
│   └── face-recognition/ # Python Face Embedding Service
├── packages/
│   └── shared/           # Common types, constants, and utils
├── docs/                 # Detailed API and setup documentation
└── README.md
```

---

## 🎨 Design System
The app follows a **Premium Minimalist** aesthetic to ensure ease of use for parents and teachers alike:
*   **Palette:** Warm Beige (`#F5F1EA`), Soft Green (`#4CAF50`), Charcoal (`#2D2926`)
*   **Experience:** Fluid glassmorphism, organic animations, and pill-shaped UI elements for a modern feel.

---

## 🔐 Security & Privacy
*   **No Raw Biometrics:** We do not store raw photos of students. Only mathematical embeddings are stored and compared for verification.
*   **Role-Based Access (RLS):** Supabase Row Level Security ensures students and parents only access data relevant to them.

---

## 🛠 Getting Started

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/aashwani106/pcm.git
    cd pcm
    ```

2.  **Install Dependencies (Monorepo Root)**
    ```bash
    npm install
    ```

3.  **Setup Backend**
    ```bash
    npm --workspace apps/backend run dev
    ```

4.  **Setup Mobile App**
    ```bash
    npm --workspace apps/mobile run start
    ```

5.  **Setup Website**
    ```bash
    npm --workspace apps/website run dev
    ```

6.  **Environment Variables**
    Create required `.env` files (mobile/backend/website).  
    Example for `apps/mobile/.env`:
    ```bash
    EXPO_PUBLIC_SUPABASE_URL=your_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
    ```

    Example for `apps/backend/.env` (partial):
    ```bash
    SUPABASE_URL=your_url
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    LIVEKIT_API_KEY=your_livekit_key
    LIVEKIT_API_SECRET=your_livekit_secret
    LIVEKIT_URL=ws://localhost:7880
    ```

---

## 📄 Documentation
For more detailed technical information, refer to:
*   [Requirements](./docs/requirement.md)
*   [High-Level Design](./docs/hld.md)
*   [Project Structure](./docs/project-structure.md)
*   [Streaming Architecture](./docs/streaming-architecture.md)
*   [Streaming Flow](./docs/streaming-flow.md)
*   [Streaming Roles](./docs/streaming-roles.md)
*   [Streaming Infrastructure](./docs/streaming-infrastructure.md)

---

## 🧪 Local Streaming Test Accounts
Development-only accounts used for local live-class testing:

- Student: `studentnew@gmail.com` / `student`
- Teacher: `teacher@gmail.com` / `test@teacher`

Use these only in local/dev environments. Rotate or remove before any shared/staging/production use.
