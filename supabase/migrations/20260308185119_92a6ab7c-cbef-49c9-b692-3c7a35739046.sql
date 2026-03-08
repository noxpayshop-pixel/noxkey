
CREATE TABLE public.casino_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  game text NOT NULL,
  bet_amount integer NOT NULL,
  won boolean NOT NULL DEFAULT false,
  payout integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.casino_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on casino_bets" ON public.casino_bets FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.casino_bets;
