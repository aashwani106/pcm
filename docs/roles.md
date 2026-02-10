# Roles and Access Matrix

## 1. Roles

- `admin`: coaching owner/tutor operator
- `student`: marks own attendance and views own records
- `parent`: read-only monitor for linked child attendance (plus review action)

Role source of truth: `profiles.role`.

## 2. Route Protection Model

- `requireAuth`: validates Supabase JWT and attaches `req.user.id`
- `requireRole('admin'|'student'|'parent')`: role gate from DB profile

No privileged endpoint should rely on client-side role claims.

## 3. Access Matrix

| Capability | Admin | Student | Parent |
|---|---|---|---|
| View admin attendance summary | Yes | No | No |
| View student list/detail | Yes | No | No |
| Edit student profile/status/attendance_enabled | Yes | No | No |
| Manual attendance override | Yes | No | No |
| Mark own attendance | No | Yes | No |
| Upload attendance photo (signed URL flow) | No | Yes | No |
| View own calendar | No | Yes | No |
| View child calendar | No | No | Yes |
| Review attendance (accept/flag) | Yes | No | Yes (linked child only) |
| Trigger absent notifications run | Yes | No | No |
| Read parent notifications | No | No | Yes |

## 4. Critical Role Constraints

- Student attendance operations require student mapping in `students.user_id`
- Parent calendar/review requires `students.parent_id = req.user.id`
- Admin-only changes must never be exposed through student/parent screens

## 5. Password Change Enforcement

Managed users can be created with `must_change_password=true`.

Expected behavior:

- Login allowed
- Immediate redirect to force-change screen
- No dashboard access until completed
- Flag cleared via backend endpoint after successful password update
