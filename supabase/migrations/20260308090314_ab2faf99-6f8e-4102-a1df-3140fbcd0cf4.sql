
-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Stock items (one per line deliverable)
CREATE TABLE stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  item text NOT NULL,
  is_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Redeemable codes
CREATE TABLE redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  is_redeemed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Successful redemptions
CREATE TABLE redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  email text NOT NULL,
  discord text NOT NULL,
  delivered_item text,
  created_at timestamptz DEFAULT now()
);

-- Waitlist for out-of-stock redemptions
CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  discord text NOT NULL,
  is_fulfilled boolean DEFAULT false,
  fulfilled_item text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Permissive policies (app uses hardcoded admin login, no Supabase auth)
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stock_items" ON stock_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on redeem_codes" ON redeem_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on redemptions" ON redemptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on waitlist" ON waitlist FOR ALL USING (true) WITH CHECK (true);
