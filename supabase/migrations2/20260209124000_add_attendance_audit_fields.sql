ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS marked_by text NOT NULL DEFAULT 'student'
  CHECK (marked_by IN ('student', 'admin'));

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS remark text;
