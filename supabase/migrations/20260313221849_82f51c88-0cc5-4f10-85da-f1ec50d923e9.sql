
-- Giveaways table
CREATE TABLE public.giveaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL,
  message_id text,
  title text NOT NULL DEFAULT 'Giveaway',
  description text DEFAULT '',
  prize text NOT NULL DEFAULT '',
  winner_count integer NOT NULL DEFAULT 1,
  ends_at timestamp with time zone NOT NULL,
  ended boolean NOT NULL DEFAULT false,
  rigged_user_id text,
  rigged_username text,
  entries text[] NOT NULL DEFAULT '{}',
  winner_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on giveaways" ON public.giveaways FOR ALL TO public USING (true) WITH CHECK (true);

-- Add giveaway embed configs
INSERT INTO public.bot_embed_config (bot_type, embed_title, embed_description, embed_color, embed_footer_text)
VALUES 
  ('giveaway', '🎉 GIVEAWAY 🎉', '**{prize}**\n\nReact with 🎉 to enter!\n\n⏰ Ends: {ends_at}\n👥 Winners: {winner_count}', '#7c3aed', 'The Nox — We Care About YOU ✦'),
  ('giveaway_winner', '🎉 Congratulations! 🎉', 'You won **{prize}** in **The Nox**!\n\nPlease open a ticket to claim your prize.', '#22c55e', 'The Nox — We Care About YOU ✦');
