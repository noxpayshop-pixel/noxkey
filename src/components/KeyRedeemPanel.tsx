import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { redeemCode } from '@/lib/store';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import { getSettings } from '@/lib/store';
import {
  KeyRound, CheckCircle2, XCircle, AlertTriangle, Copy, LogOut, User,
  MessageCircle, ArrowRight, ExternalLink, CheckCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const KeyRedeemPanel = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'code' | 'discord' | 'login' | 'email' | 'result'>('code');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    item?: string;
    productName?: string;
    description?: string;
    outOfStock?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const settings = getSettings();

  const handleCodeSubmit = () => {
    if (!code.trim()) return;
    if (isLoggedIn) {
      // Already logged in, skip to email
      setStep('email');
    } else {
      // Show discord join step
      setStep('discord');
    }
  };

  const handleConfirmJoined = () => {
    setStep('login');
  };

  const handleLoginSuccess = () => {
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

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Logged in indicator */}
      {isLoggedIn && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            Logged in as <span className="text-primary font-medium">@{discordUsername}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/myclaims">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                My Items
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={logout}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <motion.div
        className="nox-surface rounded-2xl border border-border p-8 nox-glow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Key', 'Discord', 'Login', 'Claim'].map((label, i) => {
            const stepIndex = step === 'code' ? 0 : step === 'discord' ? 1 : step === 'login' ? 2 : step === 'email' ? 3 : 4;
            const isActive = i <= stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all ${
                  isCurrent ? 'nox-gradient text-primary-foreground' :
                  isActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
                {i < 3 && <div className={`flex-1 h-px ${isActive ? 'bg-primary/30' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Enter Key */}
          {step === 'code' && (
            <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl nox-gradient flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Enter Your Key</h2>
                  <p className="text-sm text-muted-foreground">Paste the product key you received</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="NOX-XXXXXXXX"
                  className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                />
                <Button variant="nox" onClick={handleCodeSubmit}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Join Discord */}
          {step === 'discord' && (
            <motion.div key="discord" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Join Our Discord</h2>
                  <p className="text-sm text-muted-foreground">You must be in our Discord server to claim</p>
                </div>
              </div>

              <div className="bg-card rounded-xl p-5 border border-border space-y-4">
                <p className="text-sm text-foreground">
                  To redeem your key, you need to be a member of our Discord server. This is where you'll receive notifications and support.
                </p>
                <a
                  href={settings.discordInvite || 'https://discord.gg/thenox'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[hsl(235,86%,65%)] hover:bg-[hsl(235,86%,60%)] text-foreground font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Join Discord Server
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep('code')}>Back</Button>
                <Button variant="nox" className="flex-1" onClick={handleConfirmJoined}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  I've Joined — Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Login with Discord OTP */}
          {step === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <DiscordLoginPanel onSuccess={handleLoginSuccess} embedded />
            </motion.div>
          )}

          {/* Step 4: Email + Claim */}
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl nox-gradient flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Almost There!</h2>
                  <p className="text-sm text-muted-foreground">Enter your email to complete the claim</p>
                </div>
              </div>

              <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm text-primary">{code}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">@{discordUsername}</span>
              </div>

              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                type="email"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
              <Button variant="nox" onClick={handleRedeem} className="w-full" disabled={loading}>
                {loading ? 'Claiming...' : 'Claim Deliverables'}
              </Button>
            </motion.div>
          )}

          {/* Result */}
          {step === 'result' && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {result.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-lg font-semibold">Key Redeemed Successfully!</span>
                  </div>
                  <div className="bg-background rounded-xl p-4 border border-border space-y-3">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Your Deliverables:</p>
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
                    <Button variant="noxOutline" className="w-full mt-2">View All My Items</Button>
                  </Link>
                </div>
              ) : result.outOfStock ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-lg font-semibold">Out of Stock</span>
                  </div>
                  <p className="text-muted-foreground">
                    Sorry, <span className="text-foreground font-semibold">{result.productName}</span> is currently out of stock.
                    You'll receive a Discord notification when ready. Track it in <Link to="/myclaims" className="text-primary hover:underline">My Items</Link>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="w-6 h-6" />
                    <span className="text-lg font-semibold">Invalid Key</span>
                  </div>
                  <p className="text-muted-foreground">This key is invalid or has already been used.</p>
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
