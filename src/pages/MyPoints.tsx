import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Loader2, Gift, Coins, Upload, ShoppingBag, ArrowLeft, LogOut,
  ShieldCheck, Star, CheckCircle2, Clock, ExternalLink, Copy, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import logo from '@/assets/logo.gif';

interface GiftItem {
  id: string;
  name: string;
  description: string;
  point_price: number;
  stock: string[];
}

interface PointTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const MyPoints = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [giftItems, setGiftItems] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shop' | 'earn' | 'history'>('shop');
  const [vouchScreenshot, setVouchScreenshot] = useState<File | null>(null);
  const [vouchPlatform, setVouchPlatform] = useState('myvouch');
  const [submitting, setSubmitting] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !discordUsername) return;

    const fetchData = async () => {
      setLoading(true);
      const [pointsRes, txRes, giftRes] = await Promise.all([
        supabase.from('user_points').select('points').eq('discord_username', discordUsername).single(),
        supabase.from('point_transactions').select('*').eq('discord_username', discordUsername).order('created_at', { ascending: false }).limit(50),
        supabase.from('gift_items').select('*').order('point_price', { ascending: true }),
      ]);

      setPoints(pointsRes.data?.points ?? 0);
      setTransactions(txRes.data ?? []);
      setGiftItems((giftRes.data ?? []).filter((g: any) => g.stock && g.stock.length > 0));
      setLoading(false);
    };

    fetchData();
  }, [isLoggedIn, discordUsername]);

  const handlePurchase = async (item: GiftItem) => {
    if (!discordUsername || points < item.point_price || item.stock.length === 0) return;
    setPurchasing(item.id);

    try {
      // Get the first stock item
      const deliveredItem = item.stock[0];
      const newStock = item.stock.slice(1);

      // Update gift item stock
      await supabase.from('gift_items').update({ stock: newStock }).eq('id', item.id);

      // Deduct points
      const newPoints = points - item.point_price;
      await supabase.from('user_points').update({ points: newPoints, updated_at: new Date().toISOString() }).eq('discord_username', discordUsername);

      // Record transaction
      await supabase.from('point_transactions').insert({
        discord_username: discordUsername,
        amount: -item.point_price,
        type: 'purchase',
        description: `Purchased ${item.name}`,
      });

      setPoints(newPoints);
      setGiftItems(prev => prev.map(g => g.id === item.id ? { ...g, stock: newStock } : g).filter(g => g.stock.length > 0));

      // Show the item
      toast.success(`🎉 You got: ${deliveredItem}`, { duration: 10000 });
      navigator.clipboard.writeText(deliveredItem);
      toast.info('Copied to clipboard!');
    } catch {
      toast.error('Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  const handleVouchSubmit = async () => {
    if (!vouchScreenshot || !discordUsername) return;
    setSubmitting(true);

    try {
      const ext = vouchScreenshot.name.split('.').pop();
      const path = `vouches/${discordUsername}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('screenshots').upload(path, vouchScreenshot);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(path);

      await supabase.from('vouch_submissions').insert({
        discord_username: discordUsername,
        screenshot_url: urlData.publicUrl,
        platform: vouchPlatform,
      });

      toast.success('Vouch submitted! Awaiting approval (3 points per vouch).');
      setVouchScreenshot(null);
    } catch {
      toast.error('Failed to submit vouch');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full bg-accent/3 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full bg-primary/3 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border glass">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="The Nox" className="w-9 h-9 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold nox-gradient-text">My Points</span>
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card/50 rounded-full px-3 py-1.5 border border-border">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-foreground font-medium">@{discordUsername}</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {!isLoggedIn ? (
          <div className="mt-16 max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-extrabold text-foreground mb-2">Free Products</h1>
              <p className="text-muted-foreground">Login with Discord to earn points and get free products.</p>
            </div>
            <DiscordLoginPanel />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your points...</p>
          </div>
        ) : (
          <>
            {/* Points balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="nox-surface rounded-2xl border border-border p-8 mb-8 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <div className="relative z-10">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Balance</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Coins className="w-8 h-8 text-primary" />
                  <span className="text-5xl font-extrabold nox-gradient-text">{points}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  1 point ≈ <span className="text-foreground font-medium">$0.10</span> store credit
                </p>
              </div>
            </motion.div>

            {/* How to earn info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8 flex items-start gap-3"
            >
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="text-foreground font-medium mb-1">How to earn points:</p>
                <ul className="space-y-1">
                  <li>🎟️ <strong>Redeem a key</strong> — Random bonus of 0-8 points per redeem</li>
                  <li>📨 <strong>Invite friends</strong> to Discord — 1 point per invite (auto-checked on login)</li>
                  <li>⭐ <strong>Post a vouch</strong> on SellAuth / MyVouch.es / Discord — 3 points per approved vouch</li>
                </ul>
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-secondary/50 rounded-xl p-1">
              {[
                { key: 'shop', label: 'Free Shop', icon: ShoppingBag },
                { key: 'casino', label: '🎰 Casino', icon: Coins },
                { key: 'earn', label: 'Earn Points', icon: Star },
                { key: 'history', label: 'History', icon: Clock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'casino') {
                      window.location.href = '/casino';
                      return;
                    }
                    setActiveTab(key as any);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === key ? 'nox-surface text-foreground nox-glow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-1.5" />{label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'shop' && (
                <motion.div key="shop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {giftItems.length === 0 ? (
                    <div className="text-center py-16">
                      <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-semibold text-foreground mb-1">No items available</p>
                      <p className="text-muted-foreground text-sm">Check back later for free products!</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {giftItems.map(item => (
                        <motion.div
                          key={item.id}
                          className="nox-surface rounded-2xl border border-border p-6 hover:border-primary/20 transition-all"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-foreground">{item.name}</h3>
                              {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-1">
                              {item.stock.length} left
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-4 h-4 text-primary" />
                              <span className="font-bold text-primary text-lg">{item.point_price}</span>
                              <span className="text-xs text-muted-foreground">pts</span>
                            </div>
                            <Button
                              variant="nox"
                              size="sm"
                              disabled={points < item.point_price || purchasing === item.id}
                              onClick={() => handlePurchase(item)}
                            >
                              {purchasing === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : points < item.point_price ? (
                                'Not enough'
                              ) : (
                                'Get Free'
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'earn' && (
                <motion.div key="earn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* Vouch submission */}
                  <div className="nox-surface rounded-2xl border border-border p-6">
                    <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" /> Submit a Vouch
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Post a positive review on SellAuth, MyVouch.es, or in our Discord and upload a screenshot.
                      Each approved vouch earns you <span className="text-primary font-bold">3 points</span>.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
                        <select
                          value={vouchPlatform}
                          onChange={(e) => setVouchPlatform(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                        >
                          <option value="myvouch">MyVouch.es</option>
                          <option value="sellauth">SellAuth</option>
                          <option value="discord">Discord Server</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Screenshot Proof</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setVouchScreenshot(e.target.files?.[0] ?? null)}
                          className="w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium file:cursor-pointer"
                        />
                      </div>

                      <Button
                        variant="nox"
                        className="w-full"
                        disabled={!vouchScreenshot || submitting}
                        onClick={handleVouchSubmit}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        Submit Vouch for Review
                      </Button>
                    </div>
                  </div>

                  {/* Other ways */}
                  <div className="nox-surface rounded-2xl border border-border p-6">
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-accent" /> Other Ways to Earn
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-background rounded-xl p-4 border border-border">
                        <p className="text-sm text-foreground font-medium">🎟️ Redeem Keys</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Every time you redeem a key, you get a random bonus of 0-8 points. 
                          The more you purchase, the higher the chance of bonus points!
                        </p>
                      </div>
                      <div className="bg-background rounded-xl p-4 border border-border">
                        <p className="text-sm text-foreground font-medium">📨 Invite Friends</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Each friend you invite to our Discord earns you 1 point. 
                          Points are automatically added when you log in.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {transactions.length === 0 ? (
                    <div className="text-center py-16">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-semibold text-foreground mb-1">No transactions yet</p>
                      <p className="text-muted-foreground text-sm">Start earning points to see your history.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map(tx => (
                        <div key={tx.id} className="nox-surface rounded-xl border border-border p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-foreground">{tx.description || tx.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                          </div>
                          <span className={`font-mono font-bold text-sm ${tx.amount >= 0 ? 'text-green-400' : 'text-destructive'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default MyPoints;
