
-- Discord users / sessions table
CREATE TABLE public.discord_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL UNIQUE,
  session_token text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on discord_users" ON public.discord_users
  FOR ALL USING (true) WITH CHECK (true);

-- OTP codes table
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on otp_codes" ON public.otp_codes
  FOR ALL USING (true) WITH CHECK (true);
