import { useState } from 'react';
import { motion } from 'framer-motion';
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

export default function LimboGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const [targetMult, setTargetMult] = useState(2.0);
  const [resultMult, setResultMult] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [animating, setAnimating] = useState(false);
  const [lockedBet, setLockedBet] = useState(0);

  const handlePlay = async () => {
    setAnimating(true);
    setResultMult(null);
    setWon(null);
    setLockedBet(betAmount);

    await onDeduct();

    // Pre-determine outcome
    let result: number;
    if (discordUsername) {
      const { shouldWin } = await getRiggedOutcome({ betAmount, currentPoints: points, discordUsername });
      if (shouldWin) {
        // Generate result >= target
        result = targetMult + Math.random() * 3;
      } else {
        // Generate result below target
        result = 1 + Math.random() * Math.max(0.1, targetMult - 1.1);
      }
    } else {
      result = 1 + Math.random() * 8;
    }
    result = parseFloat(result.toFixed(2));

    await new Promise(r => setTimeout(r, 800));
    setResultMult(result);
    const isWin = result >= targetMult;
    setWon(isWin);
    setAnimating(false);

    const payout = isWin ? Math.floor(betAmount * targetMult) : 0;
    await onComplete(isWin, payout);
  };

  const presets = [1, 5, 10, 25, 50];
  const targetPresets = [1.5, 2, 3, 5, 10];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center justify-center min-h-[500px]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Limbo</h2>
        <p className="text-xs text-muted-foreground mb-12">Set your target, beat the multiplier</p>

        <motion.div
          animate={animating ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className={`text-8xl font-black mb-8 ${
            won === true ? 'text-green-400' :
            won === false ? 'text-destructive' :
            animating ? 'text-primary' : 'text-muted-foreground/30'
          }`}
        >
          {animating ? '...' : resultMult !== null ? `${resultMult}x` : '?.??x'}
        </motion.div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase">Target</p>
            <p className="text-lg font-bold text-primary">{targetMult}x</p>
          </div>
          {resultMult !== null && (
            <>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase">Result</p>
                <p className={`text-lg font-bold ${won ? 'text-green-400' : 'text-destructive'}`}>{resultMult}x</p>
              </div>
            </>
          )}
        </div>

        {won !== null && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-6 text-xl font-black ${won ? 'text-green-400' : 'text-destructive'}`}>
            {won ? `WIN! +${Math.floor(lockedBet * targetMult)}` : `MISS! -${lockedBet}`}
          </motion.p>
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
            <input type="number" min={1} max={points} value={betAmount}
              onChange={(e) => setBetAmount(Math.max(1, Math.min(points, parseInt(e.target.value) || 1)))}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors" />
            <div className="flex gap-1.5 mt-3">
              {presets.map(p => (
                <button key={p} onClick={() => setBetAmount(Math.min(p, points))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    betAmount === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Target Multiplier</label>
            <input type="number" min={1.1} max={100} step={0.1} value={targetMult}
              onChange={(e) => setTargetMult(Math.max(1.1, parseFloat(e.target.value) || 1.1))}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors" />
            <div className="flex gap-1.5 mt-3">
              {targetPresets.map(p => (
                <button key={p} onClick={() => setTargetMult(p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    targetMult === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}>{p}x</button>
              ))}
            </div>
          </div>

          <Button variant="nox" className="w-full h-14 text-lg font-bold"
            disabled={playing || animating || betAmount < 1 || betAmount > points || points === 0}
            onClick={handlePlay}>
            {animating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'PLAY'}
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
