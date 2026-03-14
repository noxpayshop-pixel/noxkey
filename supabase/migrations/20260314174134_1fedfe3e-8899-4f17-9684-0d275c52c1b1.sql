
CREATE TABLE public.gateway_bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghost_ping_enabled boolean DEFAULT true,
  ghost_ping_channel_id text DEFAULT '',
  ghost_ping_message text DEFAULT 'Hello {user} Check this out.',
  dmall_embed_title text DEFAULT '',
  dmall_embed_description text DEFAULT '',
  dmall_embed_color text DEFAULT '#7c3aed',
  dmall_embed_image_url text DEFAULT NULL,
  dmall_embed_footer_text text DEFAULT 'The Nox — We Care About YOU ✦',
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gateway_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.gateway_bot_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public update" ON public.gateway_bot_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.gateway_bot_config (ghost_ping_enabled, ghost_ping_channel_id, ghost_ping_message) VALUES (true, '', 'Hello {user} Check this out.');
