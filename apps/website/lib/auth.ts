const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}

export async function signInWithPassword(input: { email: string; password: string }) {
  assertConfig();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password
    })
  });

  const payload = (await res.json()) as {
    access_token?: string;
    user?: { email?: string | null };
    error_description?: string;
    msg?: string;
  };

  if (!res.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.msg || "Login failed");
  }

  return {
    accessToken: payload.access_token,
    email: payload.user?.email ?? null
  };
}
