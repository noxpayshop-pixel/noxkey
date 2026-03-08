// Supabase-based data store for The Nox
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

export interface ProductDetail extends Product {
  stockCount: number;
  codeCount: number;
  redeemedCount: number;
  waitlistCount: number;
}

export interface StockItem {
  id: string;
  product_id: string;
  item: string;
  is_claimed: boolean;
}

export interface RedeemCode {
  id: string;
  product_id: string;
  code: string;
  is_redeemed: boolean;
}

export interface Redemption {
  id: string;
  product_id: string;
  code: string;
  email: string;
  discord: string;
  delivered_item: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  product_id: string;
  email: string;
  discord: string;
  is_fulfilled: boolean;
  fulfilled_item: string | null;
  created_at: string;
}

// ---- Products ----

export async function getProducts(): Promise<ProductDetail[]> {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (!products) return [];

  const details: ProductDetail[] = [];

  for (const p of products) {
    const [stockRes, codeRes, redeemedRes, waitlistRes] = await Promise.all([
      supabase.from('stock_items').select('id', { count: 'exact', head: true }).eq('product_id', p.id).eq('is_claimed', false),
      supabase.from('redeem_codes').select('id', { count: 'exact', head: true }).eq('product_id', p.id).eq('is_redeemed', false),
      supabase.from('redemptions').select('id', { count: 'exact', head: true }).eq('product_id', p.id),
      supabase.from('waitlist').select('id', { count: 'exact', head: true }).eq('product_id', p.id).eq('is_fulfilled', false),
    ]);

    details.push({
      ...p,
      stockCount: stockRes.count ?? 0,
      codeCount: codeRes.count ?? 0,
      redeemedCount: redeemedRes.count ?? 0,
      waitlistCount: waitlistRes.count ?? 0,
    });
  }

  return details;
}

export async function createProduct(name: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert({ name, description: '' })
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function deleteProduct(id: string) {
  await supabase.from('products').delete().eq('id', id);
}

export async function updateProductDescription(id: string, description: string) {
  await supabase.from('products').update({ description }).eq('id', id);
}

// ---- Stock ----

export async function getStock(productId: string): Promise<StockItem[]> {
  const { data } = await supabase
    .from('stock_items')
    .select('*')
    .eq('product_id', productId)
    .eq('is_claimed', false)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function setStock(productId: string, items: string[]) {
  // Delete all unclaimed stock, then insert new
  await supabase.from('stock_items').delete().eq('product_id', productId).eq('is_claimed', false);
  if (items.length > 0) {
    await supabase.from('stock_items').insert(
      items.map(item => ({ product_id: productId, item }))
    );
  }
}

// ---- Codes ----

export async function getCodes(productId: string): Promise<string[]> {
  const { data } = await supabase
    .from('redeem_codes')
    .select('code')
    .eq('product_id', productId)
    .eq('is_redeemed', false)
    .order('created_at', { ascending: true });
  return (data ?? []).map(d => d.code);
}

function generateCodeStrings(count: number, prefix = 'NOX'): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(`${prefix}-${rand}`);
  }
  return codes;
}

export async function generateCodes(productId: string, count: number): Promise<string[]> {
  const codes = generateCodeStrings(count);
  await supabase.from('redeem_codes').insert(
    codes.map(code => ({ product_id: productId, code }))
  );
  return codes;
}

// ---- Redemption ----

export async function redeemCode(
  code: string,
  email: string,
  discord: string
): Promise<{ success: boolean; item?: string; productName?: string; description?: string; outOfStock?: boolean }> {
  // Find the code
  const { data: codeRow } = await supabase
    .from('redeem_codes')
    .select('*, products(id, name, description)')
    .eq('code', code)
    .eq('is_redeemed', false)
    .single();

  if (!codeRow) return { success: false };

  const product = (codeRow as any).products;
  const productId = product.id;

  // Mark code as redeemed
  await supabase.from('redeem_codes').update({ is_redeemed: true }).eq('id', codeRow.id);

  // Try to get a stock item
  const { data: stockItem } = await supabase
    .from('stock_items')
    .select('*')
    .eq('product_id', productId)
    .eq('is_claimed', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!stockItem) {
    // Out of stock — add to waitlist
    await supabase.from('waitlist').insert({ product_id: productId, email, discord });
    await supabase.from('redemptions').insert({
      product_id: productId, code, email, discord, delivered_item: null,
    });
    return { success: false, outOfStock: true, productName: product.name };
  }

  // Claim stock item
  await supabase.from('stock_items').update({ is_claimed: true }).eq('id', stockItem.id);

  // Record redemption
  await supabase.from('redemptions').insert({
    product_id: productId, code, email, discord, delivered_item: stockItem.item,
  });

  return { success: true, item: stockItem.item, productName: product.name, description: product.description };
}

// ---- Claims / Waitlist ----

export async function getAllClaims(): Promise<Array<Redemption & { product_name: string }>> {
  const { data } = await supabase
    .from('redemptions')
    .select('*, products(name)')
    .order('created_at', { ascending: false });

  return (data ?? []).map((d: any) => ({
    ...d,
    product_name: d.products?.name ?? 'Unknown',
  }));
}

export async function getWaitlist(productId: string): Promise<WaitlistEntry[]> {
  const { data } = await supabase
    .from('waitlist')
    .select('*')
    .eq('product_id', productId)
    .eq('is_fulfilled', false)
    .order('created_at', { ascending: true });
  return data ?? [];
}

// ---- Auto-Delivery (calls edge function) ----

export async function triggerAutoDelivery(productId: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/discord-notify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ product_id: productId }),
    }
  );

  return res.json();
}

// ---- Settings (kept in localStorage for simplicity) ----

export interface NoxSettings {
  vouchUrl: string;
  discordInvite: string;
}

export function getSettings(): NoxSettings {
  try {
    const raw = localStorage.getItem('nox_settings');
    return raw ? JSON.parse(raw) : { vouchUrl: '', discordInvite: 'https://discord.gg/thenox' };
  } catch { return { vouchUrl: '', discordInvite: 'https://discord.gg/thenox' }; }
}

export function saveSettings(settings: NoxSettings) {
  localStorage.setItem('nox_settings', JSON.stringify(settings));
}
