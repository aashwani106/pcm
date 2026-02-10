# QA Checklist

## 1. Auth and Routing

- Login works for admin, student, parent
- Session persists on app reload
- Logout works for all roles
- `must_change_password=true` forces change-password flow and blocks dashboard

## 2. Student Attendance

- `GET /attendance/state` returns expected reason and `can_mark`
- Mark button disabled when blocked
- Camera permission denied path is handled
- Photo upload URL generation works
- Photo upload succeeds
- Attendance mark succeeds once per day
- Duplicate mark shows clear message

## 3. Admin Dashboard

- Daily summary loads for selected date
- Student list loads with expected fields
- Student detail updates persist:
  - status
  - attendance_enabled
  - parent snapshot
  - core fields
- Manual override requires remark and saves correctly

## 4. Calendar and Review

- Student calendar loads monthly data
- Parent calendar loads linked children
- Blocked reason appears on absent/blocked context
- Attendance detail shows marked time/by/remark
- Photo view URL loads for present records
- Review accept/flag updates status

## 5. Notifications

- Admin run endpoint creates absent notifications
- Parent sees notifications list
- Mark-as-read updates state

## 6. Data Integrity

- Attendance insert blocked when student is paused/left
- Attendance insert blocked when `attendance_enabled=false`
- Attendance insert blocked on holiday
- `students.last_attendance_at` updates after successful mark

## 7. Regression Smoke

- `/health` is healthy
- All protected endpoints enforce role correctly
- Error responses follow standard `ApiResponse` envelope
