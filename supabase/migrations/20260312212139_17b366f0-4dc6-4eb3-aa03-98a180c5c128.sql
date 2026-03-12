CREATE TABLE public.bot_embed_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_type text NOT NULL UNIQUE,
  embed_title text DEFAULT '',
  embed_description text DEFAULT '',
  embed_color text DEFAULT '#7c3aed',
  embed_image_url text DEFAULT NULL,
  embed_footer_text text DEFAULT 'The Nox — We Care About YOU ✦ Premium Digital Delivery',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_embed_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.bot_embed_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public update" ON public.bot_embed_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.bot_embed_config (bot_type, embed_title, embed_description, embed_color, embed_image_url, embed_footer_text) VALUES
  ('otp', '🔐 The Nox — Verification Code', 'Your one-time verification code is:\n\n# `{code}`\n\nThis code expires in **5 minutes**.\nDo not share this code with anyone.', '#7c3aed', 'https://noxkey.lovable.app/images/otp-banner.png', 'The Nox — We Care About YOU ✦ Premium Digital Delivery'),
  ('product', '📦 Your {product} is ready!', 'Your item from the waitlist is now available!\n\n🔗 **Pick it up here:**\nhttps://noxkey.lovable.app/myclaims\n\nLog in with your Discord to view your deliverables.', '#22c55e', 'https://noxkey.lovable.app/images/products-banner.png', 'The Nox — We Care About YOU ✦ Premium Digital Delivery');