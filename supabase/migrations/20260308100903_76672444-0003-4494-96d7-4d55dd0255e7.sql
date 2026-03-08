
-- Points system tables

-- User points balance
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL UNIQUE,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on user_points" ON public.user_points FOR ALL USING (true) WITH CHECK (true);

-- Point transactions history
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL, -- 'invite', 'vouch', 'redeem_bonus', 'purchase', 'gift'
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on point_transactions" ON public.point_transactions FOR ALL USING (true) WITH CHECK (true);

-- Gift items (free products purchasable with points)
CREATE TABLE public.gift_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  point_price integer NOT NULL DEFAULT 10,
  stock text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.gift_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on gift_items" ON public.gift_items FOR ALL USING (true) WITH CHECK (true);

-- Vouch submissions (screenshot proof for points)
CREATE TABLE public.vouch_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  screenshot_url text NOT NULL,
  platform text NOT NULL, -- 'sellauth', 'myvouch', 'discord'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  admin_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.vouch_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on vouch_submissions" ON public.vouch_submissions FOR ALL USING (true) WITH CHECK (true);

-- Add max_bonus_points to products for random bonus on redeem
ALTER TABLE public.products ADD COLUMN max_bonus_points integer DEFAULT 5;
