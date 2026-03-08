import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import { MessageCircle, Loader2, ShieldCheck } from 'lucide-react';

interface DiscordLoginPanelProps {
  onSuccess?: () => void;
  embedded?: boolean;
}

const DiscordLoginPanel = ({ onSuccess, embedded = false }: DiscordLoginPanelProps) => {
  const { login } = useDiscordAuth();
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'username' | 'otp'>('username');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/discord-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ action: 'send_otp', discord_username: username.trim().toLowerCase() }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'Failed to send OTP. Make sure you are in the Discord server.');
        return;
      }

      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError('');

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/discord-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ action: 'verify_otp', discord_username: username.trim(), otp: otp.trim() }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
        return;
      }

      login(username.trim(), data.session_token);
      onSuccess?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <AnimatePresence mode="wait">
      {step === 'username' && (
        <motion.div key="username" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl nox-gradient flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Verify Your Discord</h2>
              <p className="text-sm text-muted-foreground">We'll send a code to your DMs</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Discord Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="nox" className="w-full" onClick={sendOtp} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
            Send Verification Code
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Make sure you have DMs enabled from server members.
          </p>
        </motion.div>
      )}

      {step === 'otp' && (
        <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="flex items-start gap-3 bg-card rounded-xl p-4 border border-border">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground">Check your Discord DMs!</p>
              <p className="text-xs text-muted-foreground mt-1">We sent a 6-digit code to <span className="text-primary font-medium">{username}</span>. It expires in 5 minutes.</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Verification Code</label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground font-mono text-center text-2xl tracking-[0.5em]"
              maxLength={6}
              onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setStep('username'); setOtp(''); setError(''); }}>Back</Button>
            <Button variant="nox" className="flex-1" onClick={verifyOtp} disabled={loading || otp.length !== 6}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Verify
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (embedded) return content;

  return (
    <motion.div
      className="nox-surface rounded-2xl border border-border p-8 nox-glow w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {content}
    </motion.div>
  );
};

export default DiscordLoginPanel;
