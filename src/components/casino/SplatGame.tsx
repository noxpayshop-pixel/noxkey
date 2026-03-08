import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onPlay: () => Promise<{ won: boolean; payout: number; winStreak: number }>;
  playing: boolean;
}

const COLORS = [
  { bg: 'bg-purple-500', text: 'text-purple-500', glow: 'shadow-purple-500/30', label: 'Purple', mult: 2 },
  { bg: 'bg-blue-500', text: 'text-blue-500', glow: 'shadow-blue-500/30', label: 'Blue', mult: 3 },
  { bg: 'bg-green-500', text: 'text-green-500', glow: 'shadow-green-500/30', label: 'Green', mult: 5 },
  { bg: 'bg-yellow-500', text: 'text-yellow-500', glow: 'shadow-yellow-500/30', label: 'Gold', mult: 10 },
];

export default function SplatGame({ points, betAmount, setBetAmount, onPlay, playing }: Props) {
  const [chosenColor, setChosenColor] = useState(0);
  const [splatResult, setSplatResult] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [splatPositions, setSplatPositions] = useState<Array<{ x: number; y: number; color: number; size: number }>>([]);

  const handlePlay = async () => {
    setAnimating(true);
    setSplatResult(null);
    setWon(null);

    // Generate random splat positions for animation
    const positions = Array.from({ length: 12 }, () => ({
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      color: Math.floor(Math.random() * COLORS.length),
      size: 30 + Math.random() * 50,
    }));
    setSplatPositions(positions);

    await new Promise(r => setTimeout(r, 1200));

    // Determine winning color (weighted: purple most likely, gold least)
    const weights = [50, 30, 15, 5]; // Purple, Blue, Green, Gold
    const totalWeight = weights.reduce((a, b) => a + b);
    let rand = Math.random() * totalWeight;
    let resultColor = 0;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { resultColor = i; break; }
    }

    setSplatResult(resultColor);
    const isWin = resultColor === chosenColor;
    setWon(isWin);
    setAnimating(false);
    await onPlay();
  };

  const presets = [1, 5, 10, 25, 50];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center min-h-[500px]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary" /> Splat
        </h2>
        <p className="text-xs text-muted-foreground mb-8">Pick a color, watch the splat</p>

        {/* Splat arena */}
        <div className="relative w-full max-w-[400px] aspect-square rounded-2xl bg-background border border-border overflow-hidden">
          <AnimatePresence>
            {animating && splatPositions.map((pos, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.7 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3, ease: 'easeOut' }}
                className={`absolute rounded-full ${COLORS[pos.color].bg} blur-sm`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  width: pos.size,
                  height: pos.size,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </AnimatePresence>

          {/* Result splat */}
          {splatResult !== null && !animating && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className={`w-48 h-48 rounded-full ${COLORS[splatResult].bg} opacity-30 blur-xl absolute`} />
              <div className="text-center relative z-10">
                <div className={`w-24 h-24 rounded-full ${COLORS[splatResult].bg} mx-auto mb-4 flex items-center justify-center shadow-lg ${COLORS[splatResult].glow}`}>
                  <Droplets className="w-10 h-10 text-white" />
                </div>
                <p className={`text-2xl font-black ${COLORS[splatResult].text}`}>{COLORS[splatResult].label}</p>
                <p className="text-sm font-bold text-muted-foreground">{COLORS[splatResult].mult}x</p>
              </div>
            </motion.div>
          )}

          {splatResult === null && !animating && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
              <Droplets className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Result message */}
        {won !== null && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-6 text-xl font-black ${won ? 'text-green-400' : 'text-destructive'}`}>
            {won ? `WIN! +${betAmount * COLORS[chosenColor].mult} ✨` : `MISS! -${betAmount}`}
          </motion.p>
        )}
      </div>

      {/* Controls */}
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

          {/* Color picker */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Pick Color</label>
            <div className="grid grid-cols-2 gap-2">
              {COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setChosenColor(i)}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                    chosenColor === i ? `border-current ${c.text} bg-current/5` : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${c.bg}`} />
                  <div className="text-left">
                    <p className="text-xs font-bold">{c.label}</p>
                    <p className="text-[10px] opacity-60">{c.mult}x</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button variant="nox" className="w-full h-14 text-lg font-bold"
            disabled={playing || animating || betAmount < 1 || betAmount > points || points === 0}
            onClick={handlePlay}>
            {animating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SPLAT!'}
          </Button>
        </div>
      </div>
    </div>
  );
}
