// localStorage-based data store for The Nox

export interface Product {
  id: string;
  name: string;
  description: string;
  stock: string[]; // items to deliver
  codes: string[]; // redeemable keys
  redeemedCodes: Record<string, { email: string; discord: string; deliveredItem: string | null; timestamp: number }>;
  waitlist: { email: string; discord: string; timestamp: number }[];
}

export interface NoxSettings {
  vouchUrl: string;
  discordBotToken: string;
  discordInvite: string;
}

const PRODUCTS_KEY = 'nox_products';
const SETTINGS_KEY = 'nox_settings';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getProducts(): Product[] {
  return load<Product[]>(PRODUCTS_KEY, []);
}

export function saveProducts(products: Product[]) {
  save(PRODUCTS_KEY, products);
}

export function getSettings(): NoxSettings {
  return load<NoxSettings>(SETTINGS_KEY, {
    vouchUrl: '',
    discordBotToken: '',
    discordInvite: 'https://discord.gg/thenox',
  });
}

export function saveSettings(settings: NoxSettings) {
  save(SETTINGS_KEY, settings);
}

export function generateCodes(count: number, prefix = 'NOX'): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(`${prefix}-${rand}`);
  }
  return codes;
}

export function redeemCode(code: string, email: string, discord: string): { success: boolean; item?: string; productName?: string; description?: string; outOfStock?: boolean } {
  const products = getProducts();
  
  for (const product of products) {
    const codeIndex = product.codes.indexOf(code);
    if (codeIndex === -1) continue;
    
    if (product.stock.length === 0) {
      // Out of stock - add to waitlist
      product.waitlist.push({ email, discord, timestamp: Date.now() });
      product.codes.splice(codeIndex, 1);
      product.redeemedCodes[code] = { email, discord, deliveredItem: null, timestamp: Date.now() };
      saveProducts(products);
      return { success: false, outOfStock: true, productName: product.name };
    }
    
    const item = product.stock.shift()!;
    product.codes.splice(codeIndex, 1);
    product.redeemedCodes[code] = { email, discord, deliveredItem: item, timestamp: Date.now() };
    saveProducts(products);
    return { success: true, item, productName: product.name, description: product.description };
  }
  
  return { success: false };
}
