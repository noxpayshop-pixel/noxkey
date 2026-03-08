import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import ReplacementRequestForm from '@/components/ReplacementRequestForm';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Loader2, Package, CheckCircle2, Copy, LogOut, ArrowLeft, Sparkles, RefreshCw,
  Clock, ShieldCheck, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.gif';

interface Claim {
  id: string;
  code: string;
  product_id: string;
  product_name: string;
  product_description: string | null;
  delivered_item: string | null;
  created_at: string;
}

const MyClaims = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showReplacement, setShowReplacement] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'replace'>('items');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nox_seen_claims');
      if (stored) setSeenIds(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !discordUsername) return;

    const fetchClaims = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('redemptions')
        .select('*, products(name, description)')
        .eq('discord', discordUsername)
        .order('created_at', { ascending: false });

      setClaims((data ?? []).map((d: any) => ({
        id: d.id,
        code: d.code,
        product_id: d.product_id,
        product_name: d.products?.name ?? 'Unknown',
        product_description: d.products?.description ?? null,
        delivered_item: d.delivered_item,
        created_at: d.created_at,
      })));
      setLoading(false);
    };

    fetchClaims();

    const channel = supabase
      .channel('my-claims')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions', filter: `discord=eq.${discordUsername}` }, () => fetchClaims())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLoggedIn, discordUsername]);

  const markSeen = (id: string) => {
    const newSeen = new Set(seenIds);
    newSeen.add(id);
    setSeenIds(newSeen);
    localStorage.setItem('nox_seen_claims', JSON.stringify([...newSeen]));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    markSeen(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const deliveredClaims = claims.filter(c => c.delivered_item);
  const pendingClaims = claims.filter(c => !c.delivered_item);
  const newCount = claims.filter(c => c.delivered_item && !seenIds.has(c.id)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/3 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border glass">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="The Nox" className="w-9 h-9 group-hover:scale-110 transition-transform" />
            <div>
              <span className="text-lg font-bold nox-gradient-text">My Items</span>
              {newCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" /> {newCount} new
                </span>
              )}
            </div>
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
              <div className="w-16 h-16 rounded-2xl nox-gradient flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-extrabold text-foreground mb-2">Access Your Items</h1>
              <p className="text-muted-foreground">Login with your Discord account to view your claimed deliverables.</p>
            </div>
            <DiscordLoginPanel />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your items...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No items yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Redeem a key on the homepage to see your deliverables here.
            </p>
            <Link to="/">
              <Button variant="nox" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" /> Go to Redeem Page
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="nox-surface rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{claims.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Claims</p>
              </div>
              <div className="nox-surface rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{deliveredClaims.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Delivered</p>
              </div>
              <div className="nox-surface rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{pendingClaims.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-secondary/50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('items')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'items' ? 'nox-surface text-foreground nox-glow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Package className="w-4 h-4 inline mr-1.5" />My Items
              </button>
              <button
                onClick={() => setActiveTab('replace')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'replace' ? 'nox-surface text-foreground nox-glow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <RefreshCw className="w-4 h-4 inline mr-1.5" />Replacement
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'items' && (
                <motion.div key="items" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Pending claims first */}
                  {pendingClaims.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Delivery
                      </p>
                      <div className="space-y-3">
                        {pendingClaims.map(claim => (
                          <motion.div
                            key={claim.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="nox-surface rounded-2xl border border-yellow-400/20 p-5"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-foreground">{claim.product_name}</span>
                              <span className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="font-mono text-xs text-muted-foreground mb-3">{claim.code}</div>
                            <div className="flex items-center gap-3 bg-yellow-400/5 rounded-xl p-4 border border-yellow-400/10">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full border-2 border-yellow-400/30 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-foreground font-medium">Awaiting delivery</p>
                                <p className="text-xs text-muted-foreground">You'll get a Discord notification when ready</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivered claims */}
                  {deliveredClaims.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                      </p>
                      <div className="space-y-3">
                        {deliveredClaims.map(claim => {
                          const isNew = !seenIds.has(claim.id);
                          return (
                            <motion.div
                              key={claim.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`nox-surface rounded-2xl border p-5 transition-all cursor-pointer ${
                                isNew ? 'border-primary nox-glow animate-pulse-glow' : 'border-border hover:border-primary/20'
                              }`}
                              onClick={() => isNew && markSeen(claim.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{claim.product_name}</span>
                                  {isNew && (
                                    <span className="flex items-center gap-1 text-xs nox-gradient text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                                      <Sparkles className="w-3 h-3" /> NEW
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="font-mono text-xs text-muted-foreground mb-3">{claim.code}</div>

                              <div className="bg-background rounded-xl p-4 border border-border space-y-2">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Deliverable</p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 font-mono text-sm text-primary break-all bg-primary/5 rounded-lg p-2.5">{claim.delivered_item}</code>
                                  <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); handleCopy(claim.delivered_item!, claim.id); }}>
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                                {copiedId === claim.id && (
                                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Copied to clipboard
                                  </motion.p>
                                )}
                              </div>

                              {claim.product_description && (
                                <details className="mt-3 group">
                                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> How to use
                                  </summary>
                                  <div className="mt-2 bg-background rounded-xl p-3 border border-border">
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{claim.product_description}</p>
                                  </div>
                                </details>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'replace' && (
                <motion.div key="replace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ReplacementRequestForm onSuccess={() => setActiveTab('items')} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default MyClaims;
