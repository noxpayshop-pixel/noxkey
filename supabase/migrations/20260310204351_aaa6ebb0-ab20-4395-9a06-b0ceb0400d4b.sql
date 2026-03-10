
-- IP logs table to track user logins
CREATE TABLE public.ip_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  ip_address text NOT NULL,
  country text,
  country_code text,
  city text,
  action text NOT NULL DEFAULT 'login',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on ip_logs" ON public.ip_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- IP blacklist
CREATE TABLE public.ip_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on ip_blacklist" ON public.ip_blacklist FOR ALL TO public USING (true) WITH CHECK (true);

-- Discord account blacklist
CREATE TABLE public.discord_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL UNIQUE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on discord_blacklist" ON public.discord_blacklist FOR ALL TO public USING (true) WITH CHECK (true);

-- Page visits / traffic tracking
CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL DEFAULT '/',
  ip_address text,
  country text,
  country_code text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on page_visits" ON public.page_visits FOR ALL TO public USING (true) WITH CHECK (true);
