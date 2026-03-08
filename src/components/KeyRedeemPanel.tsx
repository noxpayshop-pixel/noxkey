import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { redeemCode } from '@/lib/store';
import { KeyRound, CheckCircle2, XCircle, AlertTriangle, Copy } from 'lucide-react';

const KeyRedeemPanel = () => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [discord, setDiscord] = useState('');
  const [step, setStep] = useState<'code' | 'info' | 'result'>('code');
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
    setStep('info');
  };

  const handleRedeem = () => {
    if (!email.trim() || !discord.trim()) return;
    const res = redeemCode(code.trim(), email.trim(), discord.trim());
    setResult(res);
    setStep('result');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setCode('');
    setEmail('');
    setDiscord('');
    setStep('code');
    setResult(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
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

          {step === 'info' && (
            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-muted-foreground">Please provide your contact details to proceed.</p>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                type="email"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="Your Discord username"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep('code')}>Back</Button>
                <Button variant="nox" onClick={handleRedeem} className="flex-1">Claim Deliverables</Button>
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
                </div>
              ) : result.outOfStock ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-lg font-semibold">Out of Stock</span>
                  </div>
                  <p className="text-muted-foreground">
                    Sorry, we are currently out of stock for <span className="text-foreground font-semibold">{result.productName}</span>.
                    Your Discord username and email have been saved — you'll automatically receive your deliverables when we restock!
                  </p>
                  <a
                    href="https://discord.gg/thenox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-primary hover:text-accent transition-colors underline"
                  >
                    Join our Discord for updates →
                  </a>
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
