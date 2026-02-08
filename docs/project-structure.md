# Project Structure

This document describes the complete folder and code organization of the Coaching Institute App.
The structure is designed to be **professional, scalable, and open-source friendly**, with a clear
separation of concerns and easy onboarding for contributors.

---

## Repository Overview

The project follows a **monorepo structure**, separating mobile, backend, and service layers.

pcm-app/
│
├── apps/
│ ├── mobile/ # React Native (Expo) mobile application
│ └── backend/ # Node.js API server
│
├── services/
│ └── face-recognition/ # Face embedding & comparison service
│
├── packages/
│ └── shared/ # Shared types, constants, utilities
│
├── docs/ # Project documentation
│
├── .env.example # Environment variable template
├── README.md # Project overview
├── requirements.md # Functional & technical requirements
├── hld.md # High-level design
├── project-structure.md # Project & folder structure (this file)
└── package.json # Root dependencies & scripts


---

## Mobile Application (`apps/mobile`)

apps/mobile/
│
├── assets/ # Images, icons, fonts
│
├── src/
│ ├── components/ # Reusable UI components
│ │ ├── buttons/
│ │ ├── cards/
│ │ └── inputs/
│ │
│ ├── screens/ # App screens (role-based)
│ │ ├── auth/
│ │ │ ├── LoginScreen.tsx
│ │ │ └── RegisterScreen.tsx
│ │ │
│ │ ├── student/
│ │ │ ├── AttendanceScreen.tsx
│ │ │ ├── QuizScreen.tsx
│ │ │ └── DownloadsScreen.tsx
│ │ │
│ │ ├── parent/
│ │ │ └── DashboardScreen.tsx
│ │ │
│ │ └── admin/
│ │ ├── DashboardScreen.tsx
│ │ ├── QuizManagerScreen.tsx
│ │ └── StudentsScreen.tsx
│ │
│ ├── navigation/ # Navigation configuration
│ │ ├── AppNavigator.tsx
│ │ └── AuthNavigator.tsx
│ │
│ ├── services/ # API & external service handlers
│ │ ├── supabase.ts
│ │ ├── attendance.service.ts
│ │ └── notification.service.ts
│ │
│ ├── hooks/ # Custom React hooks
│ │ └── useLocation.ts
│ │
│ ├── utils/ # Helper utilities
│ │ └── date.ts
│ │
│ ├── constants/ # App-wide constants
│ │ └── roles.ts
│ │
│ └── theme/ # Design system
│ ├── colors.ts # Beige & green color palette
│ └── typography.ts
│
├── app.config.js # Expo configuration
├── package.json
└── tsconfig.json


### Design Guidelines
- Minimal UI
- Beige shades for backgrounds
- Green shades for actions and success states
- Role-based navigation (Admin / Student / Parent)

---

## Backend Application (`apps/backend`)

apps/backend/
│
├── src/
│ ├── modules/ # Feature-based modules
│ │ ├── auth/
│ │ │ ├── auth.controller.ts
│ │ │ └── auth.service.ts
│ │ │
│ │ ├── attendance/
│ │ │ ├── attendance.controller.ts
│ │ │ └── attendance.service.ts
│ │ │
│ │ ├── quiz/
│ │ │ ├── quiz.controller.ts
│ │ │ └── quiz.service.ts
│ │ │
│ │ └── notifications/
│ │ └── notification.service.ts
│ │
│ ├── config/ # Configuration files
│ │ └── supabase.ts
│ │
│ ├── middlewares/ # Express middlewares
│ │ └── auth.middleware.ts
│ │
│ ├── utils/ # Backend utilities
│ │ └── geo.ts
│ │
│ └── index.ts # Server entry point
│
├── package.json
├── tsconfig.json
└── nodemon.json


### Backend Responsibilities
- Business logic
- Attendance validation
- Quiz evaluation
- Parent notification triggers
- Communication with face recognition service

---

## Face Recognition Service (`services/face-recognition`)

services/face-recognition/
│
├── src/
│ ├── embedder.py # Face embedding generation
│ ├── matcher.py # Embedding comparison logic
│ └── api.py # HTTP API interface
│
├── models/ # Open-source ML models
├── requirements.txt
└── README.md


### Notes
- Uses open-source models only
- Stores **no raw images permanently**
- Returns numeric embeddings
- Easily replaceable with paid APIs in future

---

## Shared Package (`packages/shared`)


packages/shared/
│
├── types/ # Shared TypeScript types
│ ├── user.ts
│ └── attendance.ts
│
├── constants/
│ └── roles.ts
│
└── index.ts

Used by both frontend and backend to ensure consistency.

---

## Documentation (`docs/`)


docs/
├── api.md # API contracts
├── setup.md # Local setup instructions
└── contribution.md # Contribution guidelines


---

## Best Practices Followed

- Monorepo architecture
- Feature-based modularization
- Clear role separation
- Environment-based configuration
- Documentation-first approach
- Designed for future SaaS scalability

