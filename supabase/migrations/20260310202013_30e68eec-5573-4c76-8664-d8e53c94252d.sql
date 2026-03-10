CREATE TABLE public.vouches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating integer NOT NULL DEFAULT 5,
  message text,
  display_date timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on vouches" ON public.vouches FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.vouches;