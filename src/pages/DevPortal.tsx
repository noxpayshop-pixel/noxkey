import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import {
  getProducts, createProduct, deleteProduct, updateProductDescription,
  getStock, setStock, getCodes, generateCodes, getAllClaims, getWaitlist,
  getSettings, saveSettings, triggerAutoDelivery,
  type ProductDetail, type NoxSettings, type Redemption, type WaitlistEntry,
} from '@/lib/store';
import {
  Package, Plus, Trash2, Copy, ChevronLeft, Settings, Users, KeyRound, LogOut,
  BarChart3, Send, Loader2, RefreshCw, CheckCircle2, XCircle, Eye, ArrowRight,
  User, ImageIcon, Gift, Star, Coins, Activity, Shield, Menu, X,
} from 'lucide-react';
import { toast } from 'sonner';
import TrafficView from '@/components/TrafficView';
import logo from '@/assets/logo.gif';

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
      <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 nox-grid-pattern opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
        
        <motion.div
          className="relative nox-surface rounded-2xl border border-border/60 p-10 w-full max-w-[420px] nox-card-shine"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="The Nox" className="w-12 h-12 mb-4 rounded-full" />
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Dev Portal</h2>
            <p className="text-sm text-muted-foreground mt-1">Admin-Bereich</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username"
                className="bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 h-11" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" type="password"
                className="bg-background/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            {error && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm text-center bg-destructive/10 rounded-lg py-2">{error}</motion.p>
            )}
            <Button variant="nox" className="w-full h-11 text-sm font-semibold" onClick={handleLogin}>Sign In</Button>
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
  const [tab, setTab] = useState<'products' | 'settings' | 'claims' | 'requests' | 'accounts' | 'vouches' | 'gifts' | 'casino' | 'traffic'>('products');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'claims', label: 'Claims', icon: BarChart3 },
    { id: 'requests', label: 'Requests', icon: RefreshCw },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'vouches', label: 'Vouches', icon: Star },
    { id: 'gifts', label: 'Gifts', icon: Gift },
    { id: 'casino', label: 'Casino', icon: Coins },
    { id: 'traffic', label: 'Traffic', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-[60px]'}`}
        initial={false}
      >
        {/* Sidebar header */}
        <div className={`flex items-center border-b border-border/40 h-14 ${sidebarOpen ? 'px-4 gap-3' : 'justify-center px-0'}`}>
          <img src={logo} alt="The Nox" className="w-7 h-7 rounded-full shrink-0" />
          {sidebarOpen && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold nox-gradient-text whitespace-nowrap">
              Dev Portal
            </motion.span>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-muted-foreground hover:text-foreground transition-colors ${sidebarOpen ? 'ml-auto' : 'hidden'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => { setTab(id as any); if (id !== 'products') setSelectedProduct(null); }}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className={`border-t border-border/40 p-2 ${sidebarOpen ? '' : 'flex justify-center'}`}>
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200
              ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-[60px]'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 h-14 border-b border-border/40 glass-strong flex items-center px-6 gap-4">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-sm font-semibold text-foreground capitalize">{tab}</h1>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Online</span>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto">
        {loading && tab === 'products' && !selectedProduct ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'products' && !selectedProduct && (
              <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="flex gap-3 mb-6">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New product name..."
                    className="bg-card/50 border-border/60 text-foreground placeholder:text-muted-foreground/50"
                    onKeyDown={(e) => e.key === 'Enter' && addProduct()} />
                  <Button variant="nox" onClick={addProduct}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                </div>
                <div className="grid gap-2">
                  {products.map(p => (
                    <div key={p.id}
                      className="nox-surface rounded-xl border border-border/50 p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 hover:bg-card/60 transition-all duration-200"
                      onClick={() => setSelectedProduct(p.id)}>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.stockCount} stock · {p.codeCount} codes · {p.redeemedCount} redeemed · {p.waitlistCount} waitlist
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
                          <Trash2 className="w-4 h-4 text-destructive/70" />
                        </Button>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <p className="text-muted-foreground text-center py-16 text-sm">No products yet. Create your first one above.</p>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'products' && selected && (
              <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <ProductDetailView product={selected} onBack={() => { refresh(); setSelectedProduct(null); }} />
              </motion.div>
            )}

            {tab === 'claims' && (
              <motion.div key="claims" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <ClaimsView />
              </motion.div>
            )}

            {tab === 'requests' && (
              <motion.div key="requests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <RequestsView />
              </motion.div>
            )}

            {tab === 'accounts' && (
              <motion.div key="accounts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <AccountsView />
              </motion.div>
            )}

            {tab === 'vouches' && (
              <motion.div key="vouches" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <VouchesView />
              </motion.div>
            )}

            {tab === 'gifts' && (
              <motion.div key="gifts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <GiftsView />
              </motion.div>
            )}

            {tab === 'casino' && (
              <motion.div key="casino" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <CasinoAdminView />
              </motion.div>
            )}

            {tab === 'traffic' && (
              <motion.div key="traffic" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <TrafficView />
              </motion.div>
            )}

            {tab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6 max-w-2xl">
                <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Discord Invite Link</label>
                  <Input value={settings.discordInvite}
                    onChange={(e) => { const s = { ...settings, discordInvite: e.target.value }; setSettingsState(s); saveSettings(s); }}
                    placeholder="https://discord.gg/thenox"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                </div>

                {/* Vouch Platforms */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Vouch Platforms (shown on homepage)</label>
                  <div className="space-y-2">
                    {(settings.vouchPlatforms || []).map((platform, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={platform.name}
                          onChange={(e) => {
                            const platforms = [...(settings.vouchPlatforms || [])];
                            platforms[i] = { ...platforms[i], name: e.target.value };
                            const s = { ...settings, vouchPlatforms: platforms };
                            setSettingsState(s); saveSettings(s);
                          }}
                          placeholder="Platform name (e.g. Sellauth)"
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground w-1/3"
                        />
                        <Input
                          value={platform.url}
                          onChange={(e) => {
                            const platforms = [...(settings.vouchPlatforms || [])];
                            platforms[i] = { ...platforms[i], url: e.target.value };
                            const s = { ...settings, vouchPlatforms: platforms };
                            setSettingsState(s); saveSettings(s);
                          }}
                          placeholder="https://..."
                          className="bg-card border-border text-foreground placeholder:text-muted-foreground flex-1"
                        />
                        <Button variant="ghost" size="icon" onClick={() => {
                          const platforms = (settings.vouchPlatforms || []).filter((_, idx) => idx !== i);
                          const s = { ...settings, vouchPlatforms: platforms };
                          setSettingsState(s); saveSettings(s);
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="noxOutline" size="sm" onClick={() => {
                      const platforms = [...(settings.vouchPlatforms || []), { name: '', url: '' }];
                      const s = { ...settings, vouchPlatforms: platforms };
                      setSettingsState(s); saveSettings(s);
                    }}>
                      <Plus className="w-4 h-4 mr-1" /> Add Platform
                    </Button>
                  </div>
                </div>

                {/* SellAuth Feedback URL */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">SellAuth Feedback URL</label>
                  <Input value={settings.sellAuthFeedbackUrl || ''}
                    onChange={(e) => { const s = { ...settings, sellAuthFeedbackUrl: e.target.value }; setSettingsState(s); saveSettings(s); }}
                    placeholder="https://thenox.mysellauth.com/feedback"
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                </div>

                {/* Discord Vouch Channel URL */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Discord Vouch Channel URL</label>
                  <Input value={settings.discordVouchChannelUrl || ''}
                    onChange={(e) => { const s = { ...settings, discordVouchChannelUrl: e.target.value }; setSettingsState(s); saveSettings(s); }}
                    placeholder="https://discord.com/channels/..."
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                </div>

                {/* Discord Vouch Images */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Discord Vouch Images (manually managed, shown on homepage)</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(settings.discordVouchImages || []).map((url, i) => (
                        url && (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="w-full h-24 rounded-lg object-cover border border-border" />
                            <Button variant="ghost" size="icon"
                              className="absolute top-1 right-1 w-6 h-6 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const imgs = (settings.discordVouchImages || []).filter((_, idx) => idx !== i);
                                const s = { ...settings, discordVouchImages: imgs };
                                setSettingsState(s); saveSettings(s);
                              }}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        )
                      ))}
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          const newUrls: string[] = [];
                          for (const file of Array.from(files)) {
                            const path = `feedback/${Date.now()}-${file.name}`;
                            const { error } = await supabase.storage.from('screenshots').upload(path, file);
                            if (error) { toast.error(`Upload failed: ${file.name}`); continue; }
                            const { data } = supabase.storage.from('screenshots').getPublicUrl(path);
                            newUrls.push(data.publicUrl);
                          }
                          if (newUrls.length > 0) {
                            const imgs = [...(settings.discordVouchImages || []), ...newUrls];
                            const s = { ...settings, discordVouchImages: imgs };
                            setSettingsState(s); saveSettings(s);
                            toast.success(`${newUrls.length} image(s) uploaded`);
                          }
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent transition-colors cursor-pointer border border-border rounded-lg px-4 py-2">
                        <ImageIcon className="w-4 h-4" /> Upload Discord Vouches
                      </span>
                    </label>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Discord Bot Token und Guild ID sind sicher als Backend-Secrets gespeichert.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      </main>
    </div>
  );
}

function ProductDetailView({ product, onBack }: { product: ProductDetail; onBack: () => void }) {
  const [description, setDescription] = useState(product.description);
  const [maxBonus, setMaxBonus] = useState(String((product as any).max_bonus_points ?? 5));
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
        getStock(product.id), getCodes(product.id), getWaitlist(product.id),
      ]);
      setStockInput(stockItems.map(s => s.item).join('\n'));
      setCodes(codeList);
      setWaitlistState(wl);
      setLoadingStock(false);
    })();
  }, [product.id]);

  const handleDescSave = async () => {
    await updateProductDescription(product.id, description);
    await supabase.from('products').update({ max_bonus_points: parseInt(maxBonus) || 5 }).eq('id', product.id);
    toast.success('Settings saved');
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
  const copyAll = () => { navigator.clipboard.writeText(codes.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleAutoDeliver = async () => {
    setDelivering(true);
    try {
      const result = await triggerAutoDelivery(product.id);
      if (result.delivered > 0) {
        toast.success(`${result.delivered} notifications sent via Discord!`);
        const wl = await getWaitlist(product.id);
        setWaitlistState(wl);
      } else { toast.info(result.message || 'Nothing to deliver'); }
    } catch { toast.error('Auto-delivery failed'); }
    finally { setDelivering(false); }
  };

  if (loadingStock) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-1" /> Back to Products</Button>
      <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Product Description (How to Use)</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain how to use the product after redeeming..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[100px]" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Max Bonus Points on Redeem (0 = no bonus)</label>
        <div className="flex items-center gap-2">
          <Input value={maxBonus} onChange={(e) => setMaxBonus(e.target.value)} type="number" min="0"
            className="w-32 bg-card border-border text-foreground" />
          <span className="text-xs text-muted-foreground">Users get 0–{maxBonus || '5'} random points when redeeming</span>
        </div>
      </div>
      <div className="flex justify-end"><Button variant="noxOutline" size="sm" onClick={handleDescSave}>Save Settings</Button></div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Stock (one item per line)</label>
        <Textarea value={stockInput} onChange={(e) => setStockInput(e.target.value)} placeholder="Enter deliverable items, one per line..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[120px] font-mono text-sm" />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{stockInput.split('\n').filter(s => s.trim()).length} items</p>
          <Button variant="noxOutline" size="sm" onClick={handleStockSave}>Save Stock</Button>
        </div>
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Generate Redeem Codes</label>
        <div className="flex gap-3">
          <Input value={codeCount} onChange={(e) => setCodeCount(e.target.value)} type="number" min="1" className="w-24 bg-card border-border text-foreground" />
          <Button variant="nox" onClick={handleGenCodes}><KeyRound className="w-4 h-4 mr-1" /> Generate</Button>
        </div>
      </div>
      {codes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">Active Codes ({codes.length})</label>
            <Button variant="ghost" size="sm" onClick={copyAll}><Copy className="w-4 h-4 mr-1" /> {copied ? 'Copied!' : 'Copy All'}</Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 max-h-60 overflow-y-auto">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-all">{codes.join('\n')}</pre>
          </div>
        </div>
      )}
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

  useEffect(() => { (async () => { setClaims(await getAllClaims()); setLoading(false); })(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

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

interface ReplacementRequest {
  id: string;
  discord_username: string;
  product_id: string;
  redeem_code: string;
  problem_description: string;
  problem_screenshot_url: string | null;
  vouch_screenshot_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  product_name?: string;
}

function RequestsView() {
  const [requests, setRequests] = useState<ReplacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ReplacementRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('replacement_requests')
      .select('*, products(name)')
      .order('created_at', { ascending: true });

    setRequests((data ?? []).map((d: any) => ({
      ...d,
      product_name: d.products?.name ?? 'Unknown',
    })));
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleDecision = async (id: string, status: 'approved' | 'denied') => {
    setProcessing(true);
    await supabase.from('replacement_requests').update({
      status,
      admin_note: adminNote || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);

    toast.success(`Request ${status}`);
    setSelectedReq(null);
    setAdminNote('');
    fetchRequests();
    setProcessing(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  if (selectedReq) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedReq(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Requests
        </Button>

        <div className="nox-surface rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">{selectedReq.product_name}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${
              selectedReq.status === 'pending' ? 'bg-yellow-400/20 text-yellow-400' :
              selectedReq.status === 'approved' ? 'bg-green-400/20 text-green-400' :
              'bg-destructive/20 text-destructive'
            }`}>{selectedReq.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Discord:</span> <span className="text-foreground">{selectedReq.discord_username}</span></div>
            <div><span className="text-muted-foreground">Key:</span> <span className="font-mono text-primary text-xs">{selectedReq.redeem_code}</span></div>
            <div><span className="text-muted-foreground">Submitted:</span> <span className="text-foreground">{new Date(selectedReq.created_at).toLocaleString()}</span></div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Problem Description</p>
            <p className="text-sm text-foreground bg-background rounded-xl p-3 border border-border">{selectedReq.problem_description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {selectedReq.problem_screenshot_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Problem Screenshot</p>
                <a href={selectedReq.problem_screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={selectedReq.problem_screenshot_url} alt="Problem" className="rounded-xl border border-border max-h-60 object-contain w-full hover:opacity-80 transition-opacity" />
                </a>
              </div>
            )}
            {selectedReq.vouch_screenshot_url && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vouch Screenshot</p>
                <a href={selectedReq.vouch_screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={selectedReq.vouch_screenshot_url} alt="Vouch" className="rounded-xl border border-border max-h-60 object-contain w-full hover:opacity-80 transition-opacity" />
                </a>
              </div>
            )}
          </div>

          {selectedReq.status === 'pending' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Optional admin note..."
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex gap-3">
                <Button variant="nox" className="flex-1" onClick={() => handleDecision(selectedReq.id, 'approved')} disabled={processing}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleDecision(selectedReq.id, 'denied')} disabled={processing}>
                  <XCircle className="w-4 h-4 mr-1" /> Deny
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-primary" /> Replacement Requests
      </h2>

      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Pending ({pending.length})</p>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id}
                className="nox-surface border border-primary/30 rounded-xl p-4 text-sm cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedReq(r)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">{r.discord_username}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{r.product_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.problem_description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && <p className="text-muted-foreground text-center py-8 mb-6">No pending requests.</p>}

      {resolved.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Resolved ({resolved.length})</p>
          <div className="space-y-2">
            {resolved.map(r => (
              <div key={r.id}
                className="nox-surface border border-border rounded-xl p-4 text-sm cursor-pointer hover:border-border/80 transition-colors opacity-60"
                onClick={() => setSelectedReq(r)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={r.status === 'approved' ? 'text-green-400' : 'text-destructive'}>{r.status}</span>
                    <span className="text-foreground">{r.discord_username}</span>
                    <span className="text-muted-foreground">· {r.product_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface UserAccount {
  discord_username: string;
  claimCount: number;
  requestCount: number;
  points: number;
  claims: Array<Redemption & { product_name: string }>;
}

function AccountsView() {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      // Get all discord users
      const { data: users } = await supabase.from('discord_users').select('discord_username').order('created_at', { ascending: false });
      if (!users) { setLoading(false); return; }

      const accs: UserAccount[] = [];
      for (const u of users) {
        const [claimRes, reqRes, pointsRes] = await Promise.all([
          supabase.from('redemptions').select('id', { count: 'exact', head: true }).eq('discord', u.discord_username),
          supabase.from('replacement_requests').select('id', { count: 'exact', head: true }).eq('discord_username', u.discord_username),
          supabase.from('user_points').select('points').eq('discord_username', u.discord_username).single(),
        ]);
        accs.push({
          discord_username: u.discord_username,
          claimCount: claimRes.count ?? 0,
          requestCount: reqRes.count ?? 0,
          points: pointsRes.data?.points ?? 0,
          claims: [],
        });
      }
      setAccounts(accs);
      setLoading(false);
    })();
  }, []);

  const loadUserDetail = async (username: string) => {
    const { data: claims } = await supabase
      .from('redemptions')
      .select('*, products(name)')
      .eq('discord', username)
      .order('created_at', { ascending: false });

    const mapped = (claims ?? []).map((d: any) => ({ ...d, product_name: d.products?.name ?? 'Unknown' }));

    setAccounts(prev => prev.map(a => a.discord_username === username ? { ...a, claims: mapped } : a));
    setSelectedUser(username);
  };

  const [givePointsAmount, setGivePointsAmount] = useState('');

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const handleGivePoints = async (username: string, amount: number) => {
    if (amount === 0) return;
    const { data: existing } = await supabase.from('user_points').select('points').eq('discord_username', username).single();
    if (existing) {
      await supabase.from('user_points').update({ points: existing.points + amount, updated_at: new Date().toISOString() }).eq('discord_username', username);
    } else {
      await supabase.from('user_points').insert({ discord_username: username, points: Math.max(0, amount) });
    }
    await supabase.from('point_transactions').insert({
      discord_username: username, amount, type: 'admin',
      description: `Admin ${amount > 0 ? 'gave' : 'removed'} points`,
    });
    setAccounts(prev => prev.map(a => a.discord_username === username ? { ...a, points: (existing?.points ?? 0) + amount } : a));
    toast.success(`${amount > 0 ? 'Gave' : 'Removed'} ${Math.abs(amount)} points ${amount > 0 ? 'to' : 'from'} @${username}`);
    setGivePointsAmount('');
  };

  const selectedAccount = accounts.find(a => a.discord_username === selectedUser);

  if (selectedAccount && selectedUser) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Accounts
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full nox-gradient flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">@{selectedUser}</h3>
            <p className="text-xs text-muted-foreground">{selectedAccount.claimCount} claims · {selectedAccount.requestCount} requests · <span className="text-primary font-medium">{selectedAccount.points} pts</span></p>
          </div>
        </div>

        {/* Give Points */}
        <div className="nox-surface rounded-xl border border-border p-4 flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary shrink-0" />
          <Input
            type="number"
            value={givePointsAmount}
            onChange={(e) => setGivePointsAmount(e.target.value)}
            placeholder="Points (negative to remove)"
            className="bg-background border-border text-foreground placeholder:text-muted-foreground flex-1"
          />
          <Button variant="nox" size="sm" onClick={() => handleGivePoints(selectedUser!, parseInt(givePointsAmount) || 0)} disabled={!givePointsAmount || parseInt(givePointsAmount) === 0}>
            Give
          </Button>
        </div>

        <div className="space-y-2">
          {selectedAccount.claims.map(c => (
            <div key={c.id} className="nox-surface border border-border rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-primary text-xs">{c.code}</span>
                <span className="text-muted-foreground/50 text-xs">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-foreground">
                <span className="text-muted-foreground">Product:</span> {c.product_name}
              </p>
              {c.delivered_item ? (
                <p className="text-xs text-green-400 mt-1">Delivered: {c.delivered_item}</p>
              ) : (
                <p className="text-xs text-yellow-400 mt-1">Pending delivery</p>
              )}
            </div>
          ))}
          {selectedAccount.claims.length === 0 && <p className="text-muted-foreground text-center py-8">No claims found.</p>}
        </div>
      </div>
    );
  }

  const filtered = searchQuery
    ? accounts.filter(a => a.discord_username.toLowerCase().includes(searchQuery.toLowerCase()))
    : accounts;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" /> User Accounts ({accounts.length})
      </h2>

      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by Discord username..."
        className="bg-card border-border text-foreground placeholder:text-muted-foreground mb-4"
      />

      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.discord_username}
            className="nox-surface border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => loadUserDetail(a.discord_username)}>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-foreground font-medium">@{a.discord_username}</p>
                <p className="text-xs text-muted-foreground">{a.claimCount} claims · {a.requestCount} requests · <span className="text-primary">{a.points} pts</span></p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">No accounts found.</p>}
      </div>
    </div>
  );
}

// ---- Vouches View ----
function VouchesView() {
  const [vouches, setVouches] = useState<any[]>([]);
  const [displayVouches, setDisplayVouches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editingVouch, setEditingVouch] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVouch, setNewVouch] = useState({ rating: 5, message: '', display_date: new Date().toISOString().slice(0, 16) });
  const [section, setSection] = useState<'approvals' | 'manage'>('manage');

  const fetchVouches = async () => {
    setLoading(true);
    const [{ data: submissions }, { data: display }] = await Promise.all([
      supabase.from('vouch_submissions').select('*').order('created_at', { ascending: true }),
      supabase.from('vouches').select('*').order('display_date', { ascending: false }),
    ]);
    setVouches(submissions ?? []);
    setDisplayVouches(display ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVouches(); }, []);

  const handleDecision = async (id: string, discordUsername: string, status: 'approved' | 'denied') => {
    setProcessing(id);
    await supabase.from('vouch_submissions').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);

    if (status === 'approved') {
      const { data: existing } = await supabase.from('user_points').select('points').eq('discord_username', discordUsername).single();
      if (existing) {
        await supabase.from('user_points').update({ points: existing.points + 3, updated_at: new Date().toISOString() }).eq('discord_username', discordUsername);
      } else {
        await supabase.from('user_points').insert({ discord_username: discordUsername, points: 3 });
      }
      await supabase.from('point_transactions').insert({
        discord_username: discordUsername, amount: 3, type: 'vouch',
        description: 'Approved vouch submission',
      });
    }

    toast.success(`Vouch ${status}`);
    fetchVouches();
    setProcessing(null);
  };

  const importFromSellAuth = async () => {
    setImporting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sellauth-products?path=feedbacks&all=true`,
        { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } }
      );
      const data = await res.json();
      if (res.ok) {
        const items = (data.data ?? []).filter((r: any) => r.status === 'published' && r.rating >= 4);
        // Build set of existing display_dates for dedup
        const existingDates = new Set(displayVouches.filter(v => v.source === 'sellauth').map(v => v.display_date));
        let imported = 0;
        // Batch insert in chunks to avoid overwhelming the DB
        const toInsert = [];
        for (const item of items) {
          const dateStr = item.created_at;
          if (existingDates.has(dateStr)) continue;
          existingDates.add(dateStr); // prevent dupes within same import
          toInsert.push({
            rating: item.rating,
            message: item.message || 'Automatic feedback after 7 days.',
            display_date: dateStr,
            source: 'sellauth',
          });
        }
        // Insert in batches of 50
        for (let i = 0; i < toInsert.length; i += 50) {
          const batch = toInsert.slice(i, i + 50);
          await supabase.from('vouches').insert(batch);
          imported += batch.length;
        }
        toast.success(`${imported} new vouches imported (${items.length - toInsert.length} already exist, ${data.total ?? items.length} total found)`);
        fetchVouches();
      }
    } catch { toast.error('Import fehlgeschlagen'); }
    setImporting(false);
  };

  const getRandomPastDate = () => {
    // Pick a random date from existing vouches schedule, or generate one in the last 12 months
    if (displayVouches.length > 0) {
      const dates = displayVouches.map(v => new Date(v.display_date).getTime()).sort((a, b) => a - b);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const randomTime = minDate + Math.random() * (maxDate - minDate);
      return new Date(randomTime).toISOString().slice(0, 16);
    }
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
    return new Date(oneYearAgo + Math.random() * (now - oneYearAgo)).toISOString().slice(0, 16);
  };

  const addVouch = async () => {
    if (!newVouch.message.trim()) return;
    await supabase.from('vouches').insert({
      rating: newVouch.rating,
      message: newVouch.message,
      display_date: new Date(newVouch.display_date).toISOString(),
      source: 'manual',
    });
    setNewVouch({ rating: 5, message: '', display_date: new Date().toISOString().slice(0, 16) });
    setShowAddForm(false);
    toast.success('Vouch hinzugefügt');
    fetchVouches();
  };

  const updateVouch = async () => {
    if (!editingVouch) return;
    await supabase.from('vouches').update({
      rating: editingVouch.rating,
      message: editingVouch.message,
      display_date: editingVouch.display_date,
    }).eq('id', editingVouch.id);
    setEditingVouch(null);
    toast.success('Vouch aktualisiert');
    fetchVouches();
  };

  const deleteVouch = async (id: string) => {
    await supabase.from('vouches').delete().eq('id', id);
    toast.success('Vouch gelöscht');
    fetchVouches();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const pending = vouches.filter(v => v.status === 'pending');
  const resolved = vouches.filter(v => v.status !== 'pending');

  return (
    <div>
      {/* Section toggle */}
      <div className="flex gap-2 mb-6">
        <Button variant={section === 'manage' ? 'nox' : 'ghost'} size="sm" onClick={() => setSection('manage')}>
          <Star className="w-4 h-4 mr-1" /> Manage Vouches ({displayVouches.length})
        </Button>
        <Button variant={section === 'approvals' ? 'nox' : 'ghost'} size="sm" onClick={() => setSection('approvals')}>
          <CheckCircle2 className="w-4 h-4 mr-1" /> Approvals {pending.length > 0 && `(${pending.length})`}
        </Button>
      </div>

      {section === 'manage' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="noxOutline" size="sm" onClick={importFromSellAuth} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Import from SellAuth
            </Button>
            <Button variant="nox" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-1" /> Add Vouch
            </Button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="nox-surface border border-primary/30 rounded-xl p-4 mb-6 space-y-3">
              <p className="text-sm font-semibold text-foreground">Neuen Vouch hinzufügen</p>
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="text-xs text-muted-foreground block mb-1">Sterne</label>
                  <select
                    value={newVouch.rating}
                    onChange={(e) => setNewVouch({ ...newVouch, rating: Number(e.target.value) })}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Datum</label>
                  <div className="flex gap-2">
                    <Input type="datetime-local" value={newVouch.display_date}
                      onChange={(e) => setNewVouch({ ...newVouch, display_date: e.target.value })}
                      className="bg-card border-border text-foreground flex-1" />
                    <Button variant="noxOutline" size="sm" type="button"
                      onClick={() => setNewVouch({ ...newVouch, display_date: getRandomPastDate() })}>
                      🎲 Random
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nachricht</label>
                <Textarea value={newVouch.message}
                  onChange={(e) => setNewVouch({ ...newVouch, message: e.target.value })}
                  placeholder="Vouch text..."
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button variant="nox" size="sm" onClick={addVouch}>Speichern</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Abbrechen</Button>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editingVouch && (
            <div className="nox-surface border border-accent/30 rounded-xl p-4 mb-6 space-y-3">
              <p className="text-sm font-semibold text-foreground">Vouch bearbeiten</p>
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="text-xs text-muted-foreground block mb-1">Sterne</label>
                  <select
                    value={editingVouch.rating}
                    onChange={(e) => setEditingVouch({ ...editingVouch, rating: Number(e.target.value) })}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Datum</label>
                  <Input type="datetime-local"
                    value={new Date(editingVouch.display_date).toISOString().slice(0, 16)}
                    onChange={(e) => setEditingVouch({ ...editingVouch, display_date: new Date(e.target.value).toISOString() })}
                    className="bg-card border-border text-foreground" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nachricht</label>
                <Textarea value={editingVouch.message || ''}
                  onChange={(e) => setEditingVouch({ ...editingVouch, message: e.target.value })}
                  className="bg-card border-border text-foreground" rows={2} />
              </div>
              <div className="flex gap-2">
                <Button variant="nox" size="sm" onClick={updateVouch}>Speichern</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingVouch(null)}>Abbrechen</Button>
              </div>
            </div>
          )}

          {/* Vouch list */}
          <div className="space-y-2">
            {displayVouches.map(v => (
              <div key={v.id} className="nox-surface border border-border rounded-xl p-3 flex items-center justify-between group hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < v.rating ? 'text-primary fill-primary' : 'text-muted-foreground/20'}`} />
                    ))}
                  </div>
                  <span className="text-sm text-foreground truncate">{v.message || '—'}</span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 uppercase">{v.source}</span>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0">
                    {new Date(v.display_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingVouch(v)}>
                    <Eye className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => deleteVouch(v.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {displayVouches.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Keine Vouches. Importiere von SellAuth oder füge manuell hinzu.</p>
            )}
          </div>
        </div>
      )}

      {section === 'approvals' && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" /> Vouch Approvals
          </h2>

          {pending.length > 0 ? (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">Pending ({pending.length})</p>
              {pending.map(v => (
                <div key={v.id} className="nox-surface border border-primary/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-foreground font-medium">@{v.discord_username}</span>
                      <span className="text-muted-foreground text-sm ml-2">· {v.platform}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                  <a href={v.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img src={v.screenshot_url} alt="Vouch" className="rounded-xl border border-border max-h-48 object-contain w-full hover:opacity-80 transition-opacity" />
                  </a>
                  <div className="flex gap-2">
                    <Button variant="nox" size="sm" className="flex-1" onClick={() => handleDecision(v.id, v.discord_username, 'approved')} disabled={processing === v.id}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve (+3 pts)
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDecision(v.id, v.discord_username, 'denied')} disabled={processing === v.id}>
                      <XCircle className="w-4 h-4 mr-1" /> Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 mb-6">No pending vouches.</p>
          )}

          {resolved.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Resolved ({resolved.length})</p>
              <div className="space-y-2">
                {resolved.map(v => (
                  <div key={v.id} className="nox-surface border border-border rounded-xl p-3 text-sm flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2">
                      <span className={v.status === 'approved' ? 'text-green-400' : 'text-destructive'}>{v.status}</span>
                      <span className="text-foreground">@{v.discord_username}</span>
                      <span className="text-muted-foreground">· {v.platform}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Gifts View ----
function GiftsView() {
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('10');
  const [newDesc, setNewDesc] = useState('');
  const [selectedGift, setSelectedGift] = useState<any | null>(null);
  const [stockInput, setStockInput] = useState('');

  const fetchGifts = async () => {
    setLoading(true);
    const { data } = await supabase.from('gift_items').select('*').order('created_at', { ascending: false });
    setGifts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchGifts(); }, []);

  const addGift = async () => {
    if (!newName.trim()) return;
    await supabase.from('gift_items').insert({ name: newName.trim(), description: newDesc, point_price: parseInt(newPrice) || 10 });
    setNewName(''); setNewDesc(''); setNewPrice('10');
    fetchGifts();
    toast.success('Gift item added');
  };

  const deleteGift = async (id: string) => {
    await supabase.from('gift_items').delete().eq('id', id);
    fetchGifts();
    toast.success('Gift item deleted');
  };

  const saveStock = async () => {
    if (!selectedGift) return;
    const items = stockInput.split('\n').map(s => s.trim()).filter(Boolean);
    await supabase.from('gift_items').update({ stock: items }).eq('id', selectedGift.id);
    toast.success(`${items.length} stock items saved`);
    fetchGifts();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (selectedGift) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedGift(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Gifts
        </Button>
        <h2 className="text-xl font-bold text-foreground">{selectedGift.name}</h2>
        <p className="text-sm text-muted-foreground">Point Price: <span className="text-primary font-bold">{selectedGift.point_price}</span></p>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Gift Stock (one per line)</label>
          <Textarea
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            placeholder="Enter gift items, one per line..."
            className="bg-card border-border text-foreground placeholder:text-muted-foreground min-h-[150px] font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">{stockInput.split('\n').filter(s => s.trim()).length} items</p>
            <Button variant="noxOutline" size="sm" onClick={saveStock}>Save Stock</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" /> Gift Items (Free Products)
      </h2>

      <div className="nox-surface rounded-xl border border-border p-4 mb-6 space-y-3">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Gift name..."
          className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
        <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
          className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" min="1"
              className="w-24 bg-background border-border text-foreground" placeholder="Points" />
          </div>
          <Button variant="nox" onClick={addGift} className="flex-1"><Plus className="w-4 h-4 mr-1" /> Add Gift</Button>
        </div>
      </div>

      <div className="space-y-2">
        {gifts.map(g => (
          <div key={g.id}
            className="nox-surface border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => { setSelectedGift(g); setStockInput((g.stock || []).join('\n')); }}>
            <div>
              <p className="font-semibold text-foreground">{g.name}</p>
              <p className="text-xs text-muted-foreground">
                <Coins className="w-3 h-3 inline mr-1" />{g.point_price} pts · {(g.stock || []).length} in stock
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteGift(g.id); }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        {gifts.length === 0 && <p className="text-muted-foreground text-center py-8">No gift items yet.</p>}
      </div>
    </div>
  );
}

// ---- Casino Admin View ----
const ALL_CASINO_GAMES = [
  { id: 'coinflip', name: 'Coin Flip' },
  { id: 'crash', name: 'Crash' },
  { id: 'mines', name: 'Mines' },
  { id: 'towers', name: 'Towers' },
  { id: 'blackjack', name: 'Blackjack' },
  { id: 'limbo', name: 'Limbo' },
  { id: 'splat', name: 'Splat' },
];

function CasinoAdminView() {
  const [liveBets, setLiveBets] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ discord_username: string; points: number; casino_chance_modifier: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [modifierInputs, setModifierInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledGames, setEnabledGames] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [betsRes, usersRes] = await Promise.all([
      supabase.from('casino_bets').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('user_points').select('discord_username, points, casino_chance_modifier').order('points', { ascending: false }),
    ]);
    setLiveBets(betsRes.data ?? []);
    setUsers(usersRes.data ?? []);
    // Load enabled games from settings
    const settings = getSettings();
    setEnabledGames(settings.enabledCasinoGames || ALL_CASINO_GAMES.map(g => g.id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-casino-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casino_bets' }, (payload) => {
        setLiveBets(prev => [payload.new as any, ...prev].slice(0, 50));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleGame = (gameId: string) => {
    const newEnabled = enabledGames.includes(gameId)
      ? enabledGames.filter(g => g !== gameId)
      : [...enabledGames, gameId];
    setEnabledGames(newEnabled);
    const settings = getSettings();
    saveSettings({ ...settings, enabledCasinoGames: newEnabled });
    toast.success(`Game ${enabledGames.includes(gameId) ? 'disabled' : 'enabled'}`);
  };

  const updateModifier = async (username: string) => {
    const val = parseFloat(modifierInputs[username] ?? '0');
    await supabase.from('user_points').update({ casino_chance_modifier: val }).eq('discord_username', username);
    setUsers(prev => prev.map(u => u.discord_username === username ? { ...u, casino_chance_modifier: val } : u));
    toast.success(`Chance modifier for @${username} set to ${val > 0 ? '+' : ''}${val}%`);
    setModifierInputs(prev => ({ ...prev, [username]: '' }));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const filteredUsers = searchQuery
    ? users.filter(u => u.discord_username.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  const totalWagered = liveBets.reduce((s, b) => s + b.bet_amount, 0);
  const totalPaidOut = liveBets.reduce((s, b) => s + (b.won ? b.payout : 0), 0);
  const houseProfit = totalWagered - totalPaidOut;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Coins className="w-5 h-5 text-primary" /> Casino Management
      </h2>

      {/* Game Enable/Disable */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Games (Enable / Disable)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ALL_CASINO_GAMES.map(g => {
            const enabled = enabledGames.includes(g.id);
            return (
              <button key={g.id} onClick={() => toggleGame(g.id)}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  enabled
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : 'border-border bg-card text-muted-foreground'
                }`}>
                <span className="mr-2">{enabled ? '✅' : '❌'}</span>
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* House stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="nox-surface rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Wagered (last 50)</p>
          <p className="text-xl font-bold text-foreground">{totalWagered}</p>
        </div>
        <div className="nox-surface rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid Out</p>
          <p className="text-xl font-bold text-foreground">{totalPaidOut}</p>
        </div>
        <div className="nox-surface rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">House Profit</p>
          <p className={`text-xl font-bold ${houseProfit >= 0 ? 'text-green-400' : 'text-destructive'}`}>
            {houseProfit >= 0 ? '+' : ''}{houseProfit}
          </p>
        </div>
      </div>

      {/* Live Bets */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Bets
        </h3>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {liveBets.map(bet => (
            <div key={bet.id} className="nox-surface border border-border rounded-lg p-3 text-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${bet.won ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                  {bet.won ? <Star className="w-3.5 h-3.5 text-green-400" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
                </div>
                <div>
                  <span className="text-foreground font-medium">@{bet.discord_username}</span>
                  <span className="text-muted-foreground ml-2 capitalize">{bet.game}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Bet: {bet.bet_amount}</span>
                <span className={bet.won ? 'text-green-400 font-bold' : 'text-destructive font-bold'}>
                  {bet.won ? `+${bet.payout - bet.bet_amount}` : `-${bet.bet_amount}`}
                </span>
                <span className="text-muted-foreground/50">{new Date(bet.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
          {liveBets.length === 0 && <p className="text-muted-foreground text-center py-8">No bets recorded yet.</p>}
        </div>
      </div>

      {/* User Chance Modifiers */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">User Chance Modifiers</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Adjust win chances per user. Positive = more wins, Negative = more losses. Value is % modifier.
        </p>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="bg-card border-border text-foreground placeholder:text-muted-foreground mb-3"
        />
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredUsers.map(u => (
            <div key={u.discord_username} className="nox-surface border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-foreground font-medium text-sm">@{u.discord_username}</p>
                <p className="text-xs text-muted-foreground">
                  {u.points} pts · Modifier: <span className={u.casino_chance_modifier > 0 ? 'text-green-400' : u.casino_chance_modifier < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {u.casino_chance_modifier > 0 ? '+' : ''}{u.casino_chance_modifier}%
                  </span>
                </p>
              </div>
              <Input
                type="number"
                value={modifierInputs[u.discord_username] ?? ''}
                onChange={(e) => setModifierInputs(prev => ({ ...prev, [u.discord_username]: e.target.value }))}
                placeholder={String(u.casino_chance_modifier)}
                className="w-24 bg-background border-border text-foreground text-sm"
              />
              <Button variant="noxOutline" size="sm" onClick={() => updateModifier(u.discord_username)}
                disabled={!modifierInputs[u.discord_username]}>
                Set
              </Button>
            </div>
          ))}
          {filteredUsers.length === 0 && <p className="text-muted-foreground text-center py-4">No users found.</p>}
        </div>
      </div>
    </div>
  );
}

export default DevPortal;
