# PCM V2 Architecture

## 1. System Context

PCM V2 is a monorepo with:

- Mobile app: React Native + Expo Router (`apps/mobile`)
- Backend API: Node.js + Express (`apps/backend`)
- Database/Auth/Storage: Supabase (Postgres, Auth, Storage)

Core domain: role-based attendance with admin controls, student photo capture, and parent visibility.

## 2. Monorepo Layout

- `apps/mobile`: role-based client app (`(auth)`, `(force)`, `(admin)`, `(student)`, `(parent)`)
- `apps/backend`: REST API, auth/role middleware, services, controllers
- `supabase/migrations`: source of truth for schema evolution
- `docs`: architecture, flows, contracts, and runbooks

## 3. Backend Layering

Backend follows a standard separation:

- Route layer (`src/routes`): endpoint mapping + middleware composition
- Controller layer (`src/controllers`): request/response parsing and API response shape
- Service layer (`src/services`): business rules and orchestration
- Model layer (`src/models`): table-level data access wrappers
- Middleware (`src/middleware`): auth, role checks, error handling
- Utils (`src/utils`): shared helpers (`ApiError`, `ApiResponse`, date/time helpers)

This keeps HTTP concerns isolated from domain logic and DB access.

## 4. Data Model (High Level)

Key tables used by current features:

- `profiles`: role and account metadata (`admin`, `student`, `parent`), password-change flag
- `students`: mapping + operational fields (`user_id`, `parent_id`, `status`, `attendance_enabled`, metadata)
- `attendance`: one row per student per date (present/absent, who marked, remarks)
- `attendance_photos`: attendance evidence photo + accuracy
- `holidays`: dates where attendance is blocked
- `notifications`: parent absent alerts

Schema changes are tracked in `supabase/migrations`.

## 5. Authentication and Authorization

- Auth source: Supabase Auth JWT
- API auth middleware: `requireAuth` validates bearer token server-side
- Role enforcement: `requireRole`, `requireAdmin`, `requireStudent`, `requireParent`
- Important rule: frontend state is never trusted for attendance eligibility

## 6. Core Request Paths

- Student attendance:
  - `POST /attendance/photo-upload-url`
  - upload to signed URL
  - `POST /attendance/mark`
- Student lock-state:
  - `GET /attendance/state` (authoritative lock reason)
- Admin operations:
  - `GET /admin/attendance`
  - `GET/PATCH /admin/students/:studentId`
  - `POST /admin/attendance/manual`
- Calendar reads:
  - `GET /calendar/student`
  - `GET /calendar/parent`

## 7. Error and Response Contract

All endpoints return a consistent envelope:

- success shape: `ApiResponse(true, data, message, null)`
- failure shape: `ApiResponse(false, null, message, errors)`

Errors are normalized through `errorHandler.middleware.ts`.

## 8. Security Design Notes

- Service-role access only in backend (never in mobile client)
- Signed URL upload for attendance photos
- Access-controlled photo view URL generation
- Student state (`status`, `attendance_enabled`) enforced in backend before attendance write
- Duplicate attendance prevented by date/student checks

## 9. Operational Defaults

- Health check: `GET /health`
- Backend entry: `apps/backend/src/app.ts`
- Mobile role routing gate: `apps/mobile/app/_layout.tsx`

## 10. Near-Term Extension Points

- Add DB-level uniqueness for `(student_id, date)` if not already present
- Add audit log table for admin edits and review actions
- Add cron for absent notifications (currently supports admin-trigger endpoint)
