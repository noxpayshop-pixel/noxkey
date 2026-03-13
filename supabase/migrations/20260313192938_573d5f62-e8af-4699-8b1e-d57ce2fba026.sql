
-- Config table for join DM system (role to check, enabled state)
CREATE TABLE public.join_dm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT true,
  required_role_id TEXT DEFAULT '',
  required_role_name TEXT DEFAULT '',
  check_after_hours INTEGER DEFAULT 24,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.join_dm_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on join_dm_config" ON public.join_dm_config FOR ALL TO public USING (true) WITH CHECK (true);

-- Track member joins for 24h reminder check
CREATE TABLE public.member_joins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  welcome_sent BOOLEAN DEFAULT false,
  reminder_checked BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  has_role BOOLEAN DEFAULT false
);

ALTER TABLE public.member_joins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on member_joins" ON public.member_joins FOR ALL TO public USING (true) WITH CHECK (true);
