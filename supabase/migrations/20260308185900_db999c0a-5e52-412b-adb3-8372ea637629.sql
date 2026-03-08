
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS casino_chance_modifier numeric NOT NULL DEFAULT 0;
