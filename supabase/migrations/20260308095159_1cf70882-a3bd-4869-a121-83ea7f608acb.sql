
-- Replacement requests table
CREATE TABLE public.replacement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  redeem_code text NOT NULL,
  problem_description text NOT NULL,
  problem_screenshot_url text,
  vouch_screenshot_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.replacement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on replacement_requests" ON public.replacement_requests
  FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);

-- Allow public read on screenshots
CREATE POLICY "Public read screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'screenshots');

-- Allow anonymous insert on screenshots
CREATE POLICY "Allow upload screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'screenshots');
