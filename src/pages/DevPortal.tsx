import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  getProducts, createProduct, deleteProduct, updateProductDescription,
  getStock, setStock, getCodes, generateCodes, getAllClaims, getWaitlist,
  getSettings, saveSettings, triggerAutoDelivery,
  type ProductDetail, type NoxSettings, type Redemption, type WaitlistEntry,
} from '@/lib/store';
import {
  Package, Plus, Trash2, Copy, ChevronLeft, Settings, Users, KeyRound, LogOut, BarChart3, Send, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

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
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
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
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [settings, setSettingsState] = useState<NoxSettings>(getSettings());
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [tab, setTab] = useState<'products' | 'settings' | 'claims'>('products');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addProduct = async () => {
    if (!newName.trim()) return;
    await createProduct(newName.trim());
    setNewName('');
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    if (selectedProduct === id) setSelectedProduct(null);
    refresh();
  };

  const selected = products.find(p => p.id === selectedProduct);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold nox-gradient-text">The Nox — Dev Portal</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setTab('products'); setSelectedProduct(null); }}
            className={tab === 'products' ? 'text-primary' : 'text-muted-foreground'}>
            <Package className="w-4 h-4 mr-1" /> Products
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTab('claims')}
            className={tab === 'claims' ? 'text-primary' : 'text-muted-foreground'}>
            <Users className="w-4 h-4 mr-1" /> Claims
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setTab('settings')}
            className={tab === 'settings' ? 'text-primary' : 'text-muted-foreground'}>
            <Settings className="w-4 h-4 mr-1" /> Settings
          </Button>
          <Button variant="ghost" size="icon" onClick={onLogout}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {loading && tab === 'products' && !selectedProduct ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'products' && !selectedProduct && (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex gap-3 mb-6">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New product name..."
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && addProduct()} />
                  <Button variant="nox" onClick={addProduct}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                </div>
                <div className="grid gap-3">
                  {products.map(p => (
                    <div key={p.id}
                      className="nox-surface rounded-xl border border-border p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setSelectedProduct(p.id)}>
                      <div>
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.stockCount} stock · {p.codeCount} codes · {p.redeemedCount} redeemed · {p.waitlistCount} waitlist
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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
                <ProductDetailView product={selected} onBack={() => { refresh(); setSelectedProduct(null); }} />
              </motion.div>
            )}

            {tab === 'claims' && (
              <motion.div key="claims" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ClaimsView />
              </motion.div>
            )}

            {tab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-w-md">
                <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">MyVouch.es URL</label>
                  <Input value={settings.vouchUrl}
                    onChange={(e) => { const s = { ...settings, vouchUrl: e.target.value }; setSettingsState(s); saveSettings(s); }}
                    placeholder="https://myvouch.es/thenox"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Discord Invite Link</label>
                  <Input value={settings.discordInvite}
                    onChange={(e) => { const s = { ...settings, discordInvite: e.target.value }; setSettingsState(s); saveSettings(s); }}
                    placeholder="https://discord.gg/thenox"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Discord Bot Token und Guild ID sind sicher als Backend-Secrets gespeichert.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ProductDetailView({ product, onBack }: { product: ProductDetail; onBack: () => void }) {
  const [description, setDescription] = useState(product.description);
  const [stockInput, setStockInput] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [waitlist, setWaitlistState] = useState<WaitlistEntry[]>([]);
  const [codeCount, setCodeCount] = useState('10');
  const [copied, setCopied] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    (async () => {
      const [stockItems, codeList, wl] = await Promise.all([
        getStock(product.id),
        getCodes(product.id),
        getWaitlist(product.id),
      ]);
      setStockInput(stockItems.map(s => s.item).join('\n'));
      setCodes(codeList);
      setWaitlistState(wl);
      setLoadingStock(false);
    })();
  }, [product.id]);

  const handleDescSave = async () => {
    await updateProductDescription(product.id, description);
    toast.success('Description saved');
  };

  const handleStockSave = async () => {
    const items = stockInput.split('\n').map(s => s.trim()).filter(Boolean);
    await setStock(product.id, items);
    toast.success(`${items.length} stock items saved`);
  };

  const handleGenCodes = async () => {
    const count = parseInt(codeCount) || 0;
    if (count <= 0) return;
    const newCodes = await generateCodes(product.id, count);
    setCodes(prev => [...prev, ...newCodes]);
    toast.success(`${count} codes generated`);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoDeliver = async () => {
    setDelivering(true);
    try {
      const result = await triggerAutoDelivery(product.id);
      if (result.delivered > 0) {
        toast.success(`${result.delivered} items delivered via Discord DM!`);
        const wl = await getWaitlist(product.id);
        setWaitlistState(wl);
      } else {
        toast.info(result.message || 'Nothing to deliver');
      }
    } catch {
      toast.error('Auto-delivery failed');
    } finally {
      setDelivering(false);
    }
  };

  if (loadingStock) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Products
      </Button>

      <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>

      {/* Description */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Product Description (How to Use)</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Explain how to use the product after redeeming..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[100px]" />
        <div className="flex justify-end mt-2">
          <Button variant="noxOutline" size="sm" onClick={handleDescSave}>Save Description</Button>
        </div>
      </div>

      {/* Stock */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Stock (one item per line)</label>
        <Textarea value={stockInput} onChange={(e) => setStockInput(e.target.value)}
          placeholder="Enter deliverable items, one per line..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[120px] font-mono text-sm" />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{stockInput.split('\n').filter(s => s.trim()).length} items</p>
          <Button variant="noxOutline" size="sm" onClick={handleStockSave}>Save Stock</Button>
        </div>
      </div>

      {/* Code Generation */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Generate Redeem Codes</label>
        <div className="flex gap-3">
          <Input value={codeCount} onChange={(e) => setCodeCount(e.target.value)} type="number" min="1"
            className="w-24 bg-card border-border text-foreground" />
          <Button variant="nox" onClick={handleGenCodes}><KeyRound className="w-4 h-4 mr-1" /> Generate</Button>
        </div>
      </div>

      {/* Codes Display */}
      {codes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">Active Codes ({codes.length})</label>
            <Button variant="ghost" size="sm" onClick={copyAll}>
              <Copy className="w-4 h-4 mr-1" /> {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 max-h-60 overflow-y-auto">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-all">{codes.join('\n')}</pre>
          </div>
        </div>
      )}

      {/* Waitlist + Auto-Delivery */}
      {waitlist.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">Waitlist ({waitlist.length})</label>
            <Button variant="nox" size="sm" onClick={handleAutoDeliver} disabled={delivering}>
              {delivering ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Auto-Deliver via Discord
            </Button>
          </div>
          <div className="space-y-2">
            {waitlist.map(w => (
              <div key={w.id} className="bg-card border border-border rounded-lg p-3 text-sm">
                <span className="text-foreground">{w.discord}</span>
                <span className="text-muted-foreground"> · {w.email}</span>
                <span className="text-muted-foreground/50 text-xs ml-2">{new Date(w.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimsView() {
  const [claims, setClaims] = useState<Array<Redemption & { product_name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getAllClaims();
      setClaims(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" /> All Claims ({claims.length})
      </h2>
      {claims.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No claims yet.</p>
      ) : (
        <div className="space-y-2">
          {claims.map(c => (
            <div key={c.id} className="nox-surface border border-border rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-primary text-xs">{c.code}</span>
                <span className="text-muted-foreground/50 text-xs">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-foreground">
                <span className="text-muted-foreground">Product:</span> {c.product_name} ·{' '}
                <span className="text-muted-foreground">Discord:</span> {c.discord} ·{' '}
                <span className="text-muted-foreground">Email:</span> {c.email}
              </p>
              {c.delivered_item ? (
                <p className="text-xs text-green-400 mt-1">Delivered: {c.delivered_item}</p>
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
