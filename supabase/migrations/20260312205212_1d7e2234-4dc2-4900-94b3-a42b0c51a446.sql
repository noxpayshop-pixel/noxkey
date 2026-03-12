CREATE TABLE public.ticket_panel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  embed_title TEXT NOT NULL DEFAULT '🎫 Support Panel',
  embed_description TEXT NOT NULL DEFAULT 'Create a support request with **The Nox**.',
  embed_color TEXT NOT NULL DEFAULT '#7c3aed',
  embed_thumbnail_url TEXT,
  embed_image_url TEXT,
  embed_footer_text TEXT DEFAULT '© The Nox • Ticket System',
  dropdown_placeholder TEXT DEFAULT 'Choose your ticket type',
  ticket_types JSONB NOT NULL DEFAULT '[{"label":"Purchase Issue","value":"purchase","emoji":"🛒","description":"Problems with a purchase or order"},{"label":"Replacement","value":"replacement","emoji":"🔄","description":"Request a replacement for your product"},{"label":"General Support","value":"support","emoji":"❓","description":"General questions or help"},{"label":"Bug Report","value":"bug","emoji":"🐛","description":"Report a bug or technical issue"},{"label":"Other","value":"other","emoji":"💬","description":"Anything else"}]'::jsonb,
  welcome_title TEXT DEFAULT '{emoji} {label}',
  welcome_description TEXT DEFAULT 'Hey {user}, welcome to your ticket!\n\n## 📝 Please describe your issue\n\n> • What product or service is this about?\n> • What exactly happened?\n> • Include any screenshots, order IDs, or details.\n\n-# A team member will be with you shortly. Please be patient!',
  welcome_color TEXT DEFAULT '#7c3aed',
  welcome_footer_text TEXT DEFAULT 'The Nox — We Care About YOU ✦ Premium Digital Delivery',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default config
INSERT INTO public.ticket_panel_config (id) VALUES (gen_random_uuid());

-- Allow public read (edge function uses service role anyway, but for devportal)
ALTER TABLE public.ticket_panel_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.ticket_panel_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public update" ON public.ticket_panel_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);