import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import ReplacementRequestForm from '@/components/ReplacementRequestForm';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Loader2, Package, CheckCircle2, Copy, LogOut, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
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

      const mapped: Claim[] = (data ?? []).map((d: any) => ({
        id: d.id,
        code: d.code,
        product_id: d.product_id,
        product_name: d.products?.name ?? 'Unknown',
        product_description: d.products?.description ?? null,
        delivered_item: d.delivered_item,
        created_at: d.created_at,
      }));

      setClaims(mapped);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="The Nox" className="w-8 h-8" />
          <span className="text-lg font-bold nox-gradient-text">My Claims</span>
        </Link>
        {isLoggedIn && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">@{discordUsername}</span>
            <Button variant="ghost" size="icon" onClick={logout}><LogOut className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {!isLoggedIn ? (
          <div className="mt-12">
            <p className="text-center text-muted-foreground mb-8">
              Login with your Discord account to view your claimed deliverables.
            </p>
            <DiscordLoginPanel />
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {claims.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-foreground font-medium">No claims yet</p>
                <p className="text-muted-foreground mt-1">Redeem a key on the homepage to see your deliverables here.</p>
                <Link to="/">
                  <Button variant="noxOutline" className="mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go to Redeem Page
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {claims.map((claim) => {
                  const isNew = claim.delivered_item && !seenIds.has(claim.id);
                  return (
                    <motion.div
                      key={claim.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`nox-surface rounded-2xl border p-5 transition-all ${
                        isNew ? 'border-primary nox-glow animate-pulse-glow' : 'border-border'
                      }`}
                      onClick={() => isNew && markSeen(claim.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">{claim.product_name}</span>
                          {isNew && (
                            <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              <Sparkles className="w-3 h-3" /> New
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(claim.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="font-mono text-xs text-muted-foreground mb-3">Key: {claim.code}</div>

                      {claim.delivered_item ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">Delivered</span>
                          </div>
                          <div className="flex items-center gap-2 bg-background rounded-xl p-3 border border-border">
                            <code className="flex-1 font-mono text-sm text-primary break-all">{claim.delivered_item}</code>
                            <Button variant="ghost" size="icon" onClick={() => handleCopy(claim.delivered_item!, claim.id)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          {copiedId === claim.id && <p className="text-xs text-green-400">Copied!</p>}
                          {claim.product_description && (
                            <div className="bg-background rounded-xl p-3 border border-border">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">How to Use</p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{claim.product_description}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border">
                          <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
                          <div>
                            <p className="text-sm text-foreground font-medium">Claim not completed yet</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              We're currently out of stock. You'll receive a Discord notification when your item is ready!
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Replacement Request Section */}
            {claims.length > 0 && (
              <div className="mt-8">
                {!showReplacement ? (
                  <Button variant="noxOutline" className="w-full" onClick={() => setShowReplacement(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Request Automated Replacement
                  </Button>
                ) : (
                  <ReplacementRequestForm onSuccess={() => setShowReplacement(false)} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyClaims;
