import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRiggedOutcome } from '@/lib/casino';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';

interface Props {
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onDeduct: () => Promise<void>;
  onComplete: (won: boolean, payout: number) => Promise<void>;
  playing: boolean;
  sessionHistory: Array<{ won: boolean; amount: number }>;
}

export default function CoinFlipGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const [result, setResult] = useState<{ won: boolean; payout: number } | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [chosenSide, setChosenSide] = useState<'heads' | 'tails'>('heads');
  const [lockedBet, setLockedBet] = useState(0);

  const handlePlay = async () => {
    setResult(null);
    setFlipping(true);
    setLockedBet(betAmount);

    await onDeduct();

    // Determine outcome via house edge
    let won = Math.random() < 0.5;
    if (discordUsername) {
      const outcome = await getRiggedOutcome({ betAmount, currentPoints: points, discordUsername });
      won = outcome.shouldWin;
    }

    await new Promise(r => setTimeout(r, 600));
    setSide(won ? chosenSide : (chosenSide === 'heads' ? 'tails' : 'heads'));
    setFlipping(false);

    const payout = won ? betAmount * 2 : 0;
    setResult({ won, payout });
    await onComplete(won, payout);
  };

  const presets = [1, 5, 10, 25, 50];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="nox-surface rounded-2xl border border-border p-8 flex flex-col items-center justify-center min-h-[500px]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Coin Flip</h2>
        <p className="text-xs text-muted-foreground mb-12">Pick a side, double your bet</p>

        <div className="relative mb-12">
          <motion.div
            animate={flipping ? { rotateY: [0, 1800], scale: [1, 1.3, 1] } : { rotateY: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-full flex items-center justify-center relative"
            style={{ perspective: 1000 }}
          >
            <div className={`w-full h-full rounded-full flex items-center justify-center text-4xl font-black border-4 ${
              !result ? 'border-border bg-card text-muted-foreground' :
              result.won ? 'border-green-400 bg-green-500/10 text-green-400' : 'border-destructive bg-destructive/10 text-destructive'
            }`}>
              {flipping ? '?' : side === 'heads' ? '👑' : '🛡️'}
            </div>
          </motion.div>
          {!result && !flipping && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full bg-primary/10 blur-md" />
          )}
        </div>

        <AnimatePresence>
          {result && !flipping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center ${result.won ? 'text-green-400' : 'text-destructive'}`}
            >
              <p className="text-2xl font-black">{result.won ? 'YOU WIN!' : 'YOU LOSE'}</p>
              <p className="text-sm font-bold mt-1">
                {result.won ? `+${result.payout} points` : `-${lockedBet} points`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!flipping && !playing && (
          <div className="flex gap-4 mt-8">
            {(['heads', 'tails'] as const).map(s => (
              <button
                key={s}
                onClick={() => setChosenSide(s)}
                className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                  chosenSide === s
                    ? 'border-primary bg-primary/10 text-primary scale-105'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">{s === 'heads' ? '👑' : '🛡️'}</span>
                <span className="text-xs font-bold uppercase">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="nox-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current Balance</p>
          <p className="text-2xl font-black text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" /> {points}
          </p>
        </div>

        <div className="nox-surface rounded-2xl border border-border p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Bet Amount</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={points} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Math.min(points, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors" />
              <button onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
                className="px-3 py-3 rounded-xl border border-border text-muted-foreground hover:border-primary/30 text-sm font-bold">½</button>
              <button onClick={() => setBetAmount(Math.min(betAmount * 2, points))}
                className="px-3 py-3 rounded-xl border border-border text-muted-foreground hover:border-primary/30 text-sm font-bold">2x</button>
              <button onClick={() => setBetAmount(points)}
                className="px-3 py-3 rounded-xl border border-primary/50 text-primary hover:bg-primary/10 text-sm font-bold">Max</button>
            </div>
            <div className="flex gap-1.5 mt-3">
              {presets.map(p => (
                <button key={p} onClick={() => setBetAmount(Math.min(p, points))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    betAmount === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          <Button variant="nox" className="w-full h-14 text-lg font-bold"
            disabled={playing || flipping || betAmount < 1 || betAmount > points || points === 0}
            onClick={handlePlay}>
            {playing || flipping ? <Loader2 className="w-5 h-5 animate-spin" /> : 'FLIP'}
          </Button>
        </div>

        <div className="nox-surface rounded-2xl border border-border p-5">
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Session History</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {sessionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground/50 text-center py-4">No history yet</p>
            ) : (
              sessionHistory.map((h, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  h.won ? 'bg-green-500/5 text-green-400' : 'bg-destructive/5 text-destructive'
                }`}>
                  <span className="font-medium">{h.won ? 'Win' : 'Loss'}</span>
                  <span className="font-bold">{h.won ? '+' : ''}{h.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
