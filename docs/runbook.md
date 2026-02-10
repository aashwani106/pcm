# Runbook

## 1. Local Development

From repo root:

1. Backend:
   - `npm --workspace apps/backend install`
   - `npm --workspace apps/backend run dev`
2. Mobile:
   - `cd apps/mobile`
   - `npm install`
   - `npx expo start`

## 2. Required Environment

Mobile (`apps/mobile/.env`):

- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Backend (`apps/backend/.env`):

- Supabase URL
- Supabase service role key
- attendance window envs (`ATTENDANCE_START_HOUR`, `ATTENDANCE_END_HOUR`, etc.)

## 3. Database Migration Workflow

Use canonical migration folder only: `supabase/migrations`.

Steps:

1. `supabase login`
2. `supabase link --project-ref <your-project-ref>`
3. `supabase db push`

If push fails:

- verify token (`supabase login`)
- verify linked project
- ensure SQL files are in timestamp order and syntactically valid

## 4. Reset / Seed Strategy

Preferred approach:

- Never manually edit production tables directly without a migration
- For local reset, use SQL scripts or Supabase reset workflow in non-production
- Keep seed SQL versioned when test data is required repeatedly

## 5. Common Troubleshooting

- `Route not found`: check backend route registration in `apps/backend/src/app.ts`
- `Forbidden`: verify `profiles.role` and middleware route gate
- `Student record not found`: ensure `students.user_id` links to auth user id
- Mark attendance fails with FK: ensure `students` row exists before attendance write
- Expo bundling issues:
  - clear cache (`npx expo start -c`)
  - validate babel/metro config compatibility with Expo SDK

## 6. Release Checklist (Minimal)

1. Apply migrations to target env
2. Backend build passes
3. Mobile bundle/export passes
4. Login and role routing smoke test
5. Student attendance photo flow smoke test
6. Admin manual override smoke test
7. Parent calendar/photo review smoke test
