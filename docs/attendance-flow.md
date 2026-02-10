# Attendance Flow

## 1. Student Mark Attendance (Photo Required)

### Sequence

1. Student app checks authoritative state: `GET /attendance/state`
2. If `can_mark=true`, student taps mark attendance
3. App requests upload URL: `POST /attendance/photo-upload-url`
4. App uploads photo to Supabase Storage signed URL
5. App finalizes attendance: `POST /attendance/mark` with `photoUrl` and `accuracyMeters`
6. Backend inserts:
   - `attendance`
   - `attendance_photos`
7. Backend updates `students.last_attendance_at`

### Guarantees

- No attendance without photo
- No photo path spoofing (path validated for student)
- No duplicate daily mark
- Backend enforces student active/enabled state

## 2. Attendance Lock Reasons

Backend provides explicit lock state with code and message:

- `student_not_found`
- `student_inactive`
- `attendance_disabled`
- `window_not_started`
- `window_closed`
- `holiday`
- `already_marked`
- `none` (allowed)

Student UI rule: backend blocks, UI explains.

## 3. Admin Manual Override

Endpoint: `POST /admin/attendance/manual`

Required payload:

- `student_id`
- `date`
- `status` (`present` or `absent`)
- `remark` (mandatory)

Result:

- writes/updates attendance row
- `marked_by='admin'`
- reason retained in `remark`

## 4. Attendance Review (Human Verification)

Endpoint: `POST /attendance/review`

Roles allowed:

- admin
- parent (only for linked child)

Actions:

- `accepted`
- `flagged`

Review metadata is stored on attendance row (`review_status`, notes, reviewer role/time).

## 5. Calendar Read Flows

- Student: `GET /calendar/student?month=YYYY-MM`
- Parent: `GET /calendar/parent?month=YYYY-MM[&student_id=...]`
- Admin: `GET /admin/students/:studentId/attendance-calendar?month=YYYY-MM`

Calendar includes:

- day-level attendance map
- holidays
- latest photo metadata
- review status
- student lock context (for blocked-day clarity)

## 6. Parent Notification Flow

Current support:

- Admin-trigger endpoint: `POST /notifications/admin/absent/run?date=YYYY-MM-DD`
- Parent fetch/read:
  - `GET /notifications/parent`
  - `PATCH /notifications/parent/:id/read`

Future:

- schedule daily cron for unattended absentees
