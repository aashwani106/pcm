ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS profiles_email_idx
ON public.profiles (email);
