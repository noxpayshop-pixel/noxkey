import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { redeemCode } from '@/lib/store';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import { KeyRound, CheckCircle2, XCircle, AlertTriangle, Copy, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const KeyRedeemPanel = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'code' | 'email' | 'result'>('code');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    item?: string;
    productName?: string;
    description?: string;
    outOfStock?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCodeSubmit = () => {
    if (!code.trim()) return;
    setStep('email');
  };

  const handleRedeem = async () => {
    if (!email.trim() || !discordUsername) return;
    setLoading(true);
    try {
      const res = await redeemCode(code.trim(), email.trim(), discordUsername);
      setResult(res);
      setStep('result');
    } catch {
      setResult({ success: false });
      setStep('result');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setCode('');
    setEmail('');
    setStep('code');
    setResult(null);
  };

  if (authLoading) return null;

  // Not logged in → show login
  if (!isLoggedIn) {
    return <DiscordLoginPanel />;
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Logged in indicator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          Logged in as <span className="text-primary font-medium">@{discordUsername}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/myclaims">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              My Claims
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={logout}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <motion.div
        className="nox-surface rounded-2xl border border-border p-8 nox-glow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl nox-gradient flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Redeem Your Key</h2>
        </div>

        <AnimatePresence mode="wait">
          {step === 'code' && (
            <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-muted-foreground mb-4">Enter your product key to claim your deliverables.</p>
              <div className="flex gap-3">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="NOX-XXXXXXXX"
                  className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                />
                <Button variant="nox" onClick={handleCodeSubmit}>Redeem</Button>
              </div>
            </motion.div>
          )}

          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-muted-foreground">Please provide your email to proceed. Your Discord is already linked.</p>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                type="email"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep('code')}>Back</Button>
                <Button variant="nox" onClick={handleRedeem} className="flex-1" disabled={loading}>
                  {loading ? 'Claiming...' : 'Claim Deliverables'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'result' && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {result.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-lg font-semibold">Key Redeemed Successfully!</span>
                  </div>
                  <div className="bg-background rounded-xl p-4 border border-border space-y-3">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Here are your Deliverables:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm text-primary bg-secondary/50 rounded-lg p-3 break-all">{result.item}</code>
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(result.item!)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {copied && <p className="text-xs text-green-400">Copied!</p>}
                  </div>
                  {result.description && (
                    <div className="bg-background rounded-xl p-4 border border-border">
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">How to Use — {result.productName}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{result.description}</p>
                    </div>
                  )}
                  <Link to="/myclaims">
                    <Button variant="noxOutline" className="w-full mt-2">View All My Claims</Button>
                  </Link>
                </div>
              ) : result.outOfStock ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-lg font-semibold">Out of Stock</span>
                  </div>
                  <p className="text-muted-foreground">
                    Sorry, we are currently out of stock for <span className="text-foreground font-semibold">{result.productName}</span>.
                    You'll receive a Discord notification when your item is ready. Track it in your <Link to="/myclaims" className="text-primary hover:underline">Claims</Link>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-6 h-6" />
                    <span className="text-lg font-semibold">Invalid Key</span>
                  </div>
                  <p className="text-muted-foreground">This key is invalid or has already been used. Please check and try again.</p>
                </div>
              )}
              <Button variant="noxOutline" onClick={reset} className="mt-6 w-full">Redeem Another Key</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default KeyRedeemPanel;
