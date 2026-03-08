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

    let won = Math.random() < 0.5;
    if (discordUsername) {
      const outcome = await getRiggedOutcome({ betAmount, currentPoints: points, discordUsername });
      won = outcome.shouldWin;
    }

    await new Promise(r => setTimeout(r, 1200));
    setSide(won ? chosenSide : (chosenSide === 'heads' ? 'tails' : 'heads'));
    setFlipping(false);

    const payout = won ? betAmount * 2 : 0;
    setResult({ won, payout });
    await onComplete(won, payout);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Game area */}
      <div className="nox-surface rounded-2xl border border-border p-8 flex flex-col items-center justify-center min-h-[600px]">
        <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-1">Double or Nothing</h2>
        <p className="text-xs text-muted-foreground mb-16">Predict the flip to double your money</p>

        {/* Coin */}
        <div className="relative mb-16">
          <motion.div
            animate={flipping ? { rotateY: [0, 1800], scale: [1, 1.2, 1] } : { rotateY: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{ perspective: 1000 }}
          >
            <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${
              !result
                ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 border-4 border-yellow-500/50'
                : result.won
                  ? 'bg-gradient-to-br from-green-300 via-green-400 to-green-600 border-4 border-green-500/50'
                  : 'bg-gradient-to-br from-red-300 via-red-400 to-red-600 border-4 border-red-500/50'
            }`}>
              {flipping ? (
                <span className="text-4xl font-black text-yellow-900/60">?</span>
              ) : (
                <>
                  <span className="text-3xl">{side === 'heads' ? '💰' : '🛡️'}</span>
                  <span className="text-xs font-black uppercase mt-1 text-yellow-900/80">
                    {side === 'heads' ? 'HEADS' : 'TAILS'}
                  </span>
                </>
              )}
            </div>
          </motion.div>
          {/* Glow */}
          <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-6 rounded-full blur-xl transition-colors ${
            !result ? 'bg-yellow-500/20' : result.won ? 'bg-green-500/20' : 'bg-red-500/20'
          }`} />
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && !flipping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center mb-8 ${result.won ? 'text-green-400' : 'text-destructive'}`}
            >
              <p className="text-2xl font-black">{result.won ? 'YOU WIN!' : 'YOU LOSE'}</p>
              <p className="text-sm font-bold mt-1">
                {result.won ? `+${result.payout} points` : `-${lockedBet} points`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side selection */}
        {!flipping && !playing && (
          <div className="flex gap-4">
            {(['heads', 'tails'] as const).map(s => (
              <button
                key={s}
                onClick={() => setChosenSide(s)}
                className={`w-36 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                  chosenSide === s
                    ? 'border-primary bg-primary/10 text-primary scale-105'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                }`}
              >
                <span className="text-sm font-black uppercase">{s}</span>
                <span className="text-[10px] text-muted-foreground">x2 Payout</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="nox-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current Balance</p>
          <p className="text-2xl font-black text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" /> {points}
          </p>
        </div>

        <div className="nox-surface rounded-2xl border border-border p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Bet Amount ($)</label>
            <div className="flex items-center gap-1.5">
              <input type="number" min={1} max={points} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Math.min(points, parseInt(e.target.value) || 1)))}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors" />
              <button onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
                className="px-3 py-3 rounded-xl border border-border text-muted-foreground hover:border-primary/30 text-sm font-bold">½</button>
              <button onClick={() => setBetAmount(Math.min(betAmount * 2, points))}
                className="px-3 py-3 rounded-xl border border-border text-muted-foreground hover:border-primary/30 text-sm font-bold">2x</button>
              <button onClick={() => setBetAmount(points)}
                className="px-3 py-3 rounded-xl border border-primary/50 text-primary hover:bg-primary/10 text-sm font-bold">Max</button>
            </div>
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

          <Button variant="nox" className="w-full h-14 text-lg font-bold"
            disabled={playing || flipping || betAmount < 1 || betAmount > points || points === 0}
            onClick={handlePlay}>
            {playing || flipping ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SELECT SIDE'}
          </Button>
        </div>
      </div>
    </div>
  );
}
