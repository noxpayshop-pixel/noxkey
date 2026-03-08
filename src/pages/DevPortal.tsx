import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  getProducts, saveProducts, getSettings, saveSettings, generateCodes,
  type Product,
} from '@/lib/store';
import {
  Package, Plus, Trash2, Copy, ChevronLeft, Settings, Users, KeyRound, LogOut, BarChart3,
} from 'lucide-react';

const DEV_USER = 'TheNox';
const DEV_PASS = 'aohgiehxlsda9bg0eeh0s0peh';

const DevPortal = () => {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === DEV_USER && password === DEV_PASS) {
      setAuthed(true);
      setError('');
    } else {
      setError('Invalid credentials');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          className="nox-surface rounded-2xl border border-border p-8 w-full max-w-sm nox-glow"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center nox-gradient-text">Dev Portal</h2>
          <div className="space-y-4">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button variant="nox" className="w-full" onClick={handleLogin}>Login</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <DevDashboard onLogout={() => setAuthed(false)} />;
};

function DevDashboard({ onLogout }: { onLogout: () => void }) {
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [settings, setSettingsState] = useState(getSettings());
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [tab, setTab] = useState<'products' | 'settings' | 'claims'>('products');
  const [newName, setNewName] = useState('');

  const refresh = () => setProducts(getProducts());

  const addProduct = () => {
    if (!newName.trim()) return;
    const p: Product = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: '',
      stock: [],
      codes: [],
      redeemedCodes: {},
      waitlist: [],
    };
    const updated = [...products, p];
    saveProducts(updated);
    setProducts(updated);
    setNewName('');
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    saveProducts(updated);
    setProducts(updated);
    if (selectedProduct === id) setSelectedProduct(null);
  };

  const selected = products.find(p => p.id === selectedProduct);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold nox-gradient-text">The Nox — Dev Portal</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTab('products')} className={tab === 'products' ? 'text-primary' : 'text-muted-foreground'}>
            <Package className="w-4 h-4 mr-1" /> Products
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTab('claims')} className={tab === 'claims' ? 'text-primary' : 'text-muted-foreground'}>
            <Users className="w-4 h-4 mr-1" /> Claims
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTab('settings')} className={tab === 'settings' ? 'text-primary' : 'text-muted-foreground'}>
            <Settings className="w-4 h-4 mr-1" /> Settings
          </Button>
          <Button variant="ghost" size="icon" onClick={onLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'products' && !selectedProduct && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-3 mb-6">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New product name..."
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && addProduct()}
                />
                <Button variant="nox" onClick={addProduct}><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </div>
              <div className="grid gap-3">
                {products.map(p => (
                  <div
                    key={p.id}
                    className="nox-surface rounded-xl border border-border p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setSelectedProduct(p.id)}
                  >
                    <div>
                      <p className="font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.stock.length} stock · {p.codes.length} codes · {Object.keys(p.redeemedCodes).length} redeemed
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteProduct(p.id); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-muted-foreground text-center py-12">No products yet. Create your first one above.</p>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'products' && selected && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProductDetail product={selected} onBack={() => { refresh(); setSelectedProduct(null); }} />
            </motion.div>
          )}

          {tab === 'claims' && (
            <motion.div key="claims" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ClaimsView products={products} />
            </motion.div>
          )}

          {tab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-w-md">
              <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">MyVouch.es URL</label>
                <Input
                  value={settings.vouchUrl}
                  onChange={(e) => {
                    const s = { ...settings, vouchUrl: e.target.value };
                    setSettingsState(s);
                    saveSettings(s);
                  }}
                  placeholder="https://myvouch.es/thenox"
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Discord Bot Token</label>
                <Input
                  value={settings.discordBotToken}
                  onChange={(e) => {
                    const s = { ...settings, discordBotToken: e.target.value };
                    setSettingsState(s);
                    saveSettings(s);
                  }}
                  placeholder="Bot token for restock notifications"
                  type="password"
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Discord Invite Link</label>
                <Input
                  value={settings.discordInvite}
                  onChange={(e) => {
                    const s = { ...settings, discordInvite: e.target.value };
                    setSettingsState(s);
                    saveSettings(s);
                  }}
                  placeholder="https://discord.gg/thenox"
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProductDetail({ product, onBack }: { product: Product; onBack: () => void }) {
  const [p, setP] = useState<Product>({ ...product });
  const [stockInput, setStockInput] = useState(product.stock.join('\n'));
  const [codeCount, setCodeCount] = useState('10');
  const [copied, setCopied] = useState(false);

  const save = (updated: Product) => {
    const all = getProducts().map(x => x.id === updated.id ? updated : x);
    saveProducts(all);
    setP(updated);
  };

  const handleStockSave = () => {
    const items = stockInput.split('\n').map(s => s.trim()).filter(Boolean);
    save({ ...p, stock: items });
  };

  const handleGenCodes = () => {
    const count = parseInt(codeCount) || 0;
    if (count <= 0) return;
    const newCodes = generateCodes(count);
    const updated = { ...p, codes: [...p.codes, ...newCodes] };
    save(updated);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(p.codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Products
      </Button>

      <h2 className="text-2xl font-bold text-foreground">{p.name}</h2>

      {/* Description */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Product Description (How to Use)</label>
        <Textarea
          value={p.description}
          onChange={(e) => {
            const updated = { ...p, description: e.target.value };
            save(updated);
          }}
          placeholder="Explain how to use the product after redeeming..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[100px]"
        />
      </div>

      {/* Stock */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Stock (one item per line)</label>
        <Textarea
          value={stockInput}
          onChange={(e) => setStockInput(e.target.value)}
          placeholder="Enter deliverable items, one per line..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[120px] font-mono text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{stockInput.split('\n').filter(s => s.trim()).length} items</p>
          <Button variant="noxOutline" size="sm" onClick={handleStockSave}>Save Stock</Button>
        </div>
      </div>

      {/* Code Generation */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Generate Redeem Codes</label>
        <div className="flex gap-3">
          <Input
            value={codeCount}
            onChange={(e) => setCodeCount(e.target.value)}
            type="number"
            min="1"
            className="w-24 bg-card border-border text-foreground"
          />
          <Button variant="nox" onClick={handleGenCodes}><KeyRound className="w-4 h-4 mr-1" /> Generate</Button>
        </div>
      </div>

      {/* Codes Display */}
      {p.codes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">Active Codes ({p.codes.length})</label>
            <Button variant="ghost" size="sm" onClick={copyAll}>
              <Copy className="w-4 h-4 mr-1" /> {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 max-h-60 overflow-y-auto">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-all">
              {p.codes.join('\n')}
            </pre>
          </div>
        </div>
      )}

      {/* Waitlist */}
      {p.waitlist.length > 0 && (
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Waitlist ({p.waitlist.length})</label>
          <div className="space-y-2">
            {p.waitlist.map((w, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3 text-sm">
                <span className="text-foreground">{w.discord}</span>
                <span className="text-muted-foreground"> · {w.email}</span>
                <span className="text-muted-foreground/50 text-xs ml-2">{new Date(w.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimsView({ products }: { products: Product[] }) {
  const allClaims = products.flatMap(p =>
    Object.entries(p.redeemedCodes).map(([code, data]) => ({
      code,
      product: p.name,
      ...data,
    }))
  ).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> All Claims ({allClaims.length})
      </h2>
      {allClaims.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No claims yet.</p>
      ) : (
        <div className="space-y-2">
          {allClaims.map(c => (
            <div key={c.code} className="nox-surface border border-border rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-primary text-xs">{c.code}</span>
                <span className="text-muted-foreground/50 text-xs">{new Date(c.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-foreground">
                <span className="text-muted-foreground">Product:</span> {c.product} ·{' '}
                <span className="text-muted-foreground">Discord:</span> {c.discord} ·{' '}
                <span className="text-muted-foreground">Email:</span> {c.email}
              </p>
              {c.deliveredItem ? (
                <p className="text-xs text-green-400 mt-1">Delivered: {c.deliveredItem}</p>
              ) : (
                <p className="text-xs text-yellow-400 mt-1">Out of stock — on waitlist</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DevPortal;
