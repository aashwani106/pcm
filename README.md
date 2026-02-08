# PCM (Coaching Institute Management) - Mobile App

A professional, minimal, and secure mobile application designed for local coaching institutes to manage attendance, student performance, and parent communication effectively.

## 🚀 Overview
The PCM app is built to solve the challenges of proxy attendance and fragmented communication in small-to-medium educational centers. It leverages **GPS Geofencing** and **Facial Recognition** to ensure high-integrity attendance records without expensive hardware.

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

---

## 🛠 Tech Stack

### Frontend (Mobile)
*   **Framework:** React Native (Expo)
*   **Animation:** Lottie (for premium splash & micro-interactions), Reanimated
*   **Styling:** Minimalist Design System (Beige & Green palette)

### Backend & Infrastructure
*   **Platform:** Supabase (Postgres, Auth, Storage, Edge Functions)
*   **API Layer:** Node.js (Business logic & Attendance processing)
*   **Biometrics:** Python-based Face Recognition Service (processing embeddings only)

---

## 📂 Project Structure

This project follows a **Monorepo** architecture to keep the mobile app, backend, and shared logic in one place.

```text
pcm-app/
├── apps/
│   ├── mobile/           # React Native Expo App
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

2.  **Setup Mobile App**
    ```bash
    cd apps/mobile
    npm install
    npx expo start
    ```

3.  **Environment Variables**
    Create a `.env` in `apps/mobile/` with:
    ```bash
    EXPO_PUBLIC_SUPABASE_URL=your_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
    ```

---

## 📄 Documentation
For more detailed technical information, refer to:
*   [Requirements](./requirement.md)
*   [High-Level Design](./hld.md)
*   [Project Structure](./project-structure.md)
