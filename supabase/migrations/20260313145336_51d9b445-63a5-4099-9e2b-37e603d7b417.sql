
-- Table for saved embed templates
CREATE TABLE public.embed_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message_content TEXT DEFAULT '',
  embed_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.embed_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on embed_templates" ON public.embed_templates
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Table for sticky messages
CREATE TABLE public.sticky_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  message_id TEXT,
  message_content TEXT DEFAULT '',
  embed_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sticky_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on sticky_messages" ON public.sticky_messages
  FOR ALL TO public USING (true) WITH CHECK (true);
