# API Contract (Current)

Base URL is from `EXPO_PUBLIC_BACKEND_URL` for mobile, backend listens on configured port.

## Response Envelope

All responses follow:

```json
{
  "success": true,
  "data": {},
  "message": "Human readable message",
  "errors": null
}
```

On failures:

```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "errors": {}
}
```

## Auth

All protected endpoints require:

- `Authorization: Bearer <supabase_access_token>`

## Attendance Endpoints

- `GET /attendance/state` (student)
- `POST /attendance/photo-upload-url` (student)
- `POST /attendance/mark` (student)
- `POST /attendance/review` (admin/parent)
- `GET /attendance/:attendanceId/photo-view-url` (authorized owner/admin/parent)

## Admin Endpoints

- `GET /admin/attendance?date=YYYY-MM-DD`
- `GET /admin/students`
- `GET /admin/students/:studentId`
- `PATCH /admin/students/:studentId`
- `POST /admin/attendance/manual`
- `GET /admin/students/:studentId/attendance-calendar?month=YYYY-MM`
- `GET /admin/students/:studentId/attendance-history?date=YYYY-MM-DD`

## Calendar Endpoints

- `GET /calendar/student?month=YYYY-MM`
- `GET /calendar/parent?month=YYYY-MM`
- `GET /calendar/parent?month=YYYY-MM&student_id=<id>`

## User Management Endpoints

- `GET /api/users` (admin)
- `POST /api/users` (admin create student/parent)
- `POST /api/users/me/complete-password-change` (authenticated)

## Notification Endpoints

- `POST /notifications/admin/absent/run?date=YYYY-MM-DD`
- `GET /notifications/parent`
- `PATCH /notifications/parent/:id/read`

## Health

- `GET /health`
