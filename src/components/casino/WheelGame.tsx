import { useState, useRef } from 'react';
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

interface Segment {
  label: string;
  amount: number; // fixed point payout (0 = lose)
  color: string;
  textColor: string;
}

const SEGMENTS: Segment[] = [
  { label: '0', amount: 0, color: 'hsl(var(--destructive))', textColor: '#fff' },
  { label: '+3', amount: 3, color: 'hsl(var(--primary))', textColor: '#fff' },
  { label: '0', amount: 0, color: 'hsl(var(--destructive))', textColor: '#fff' },
  { label: '+1', amount: 1, color: 'hsl(var(--muted))', textColor: '#fff' },
  { label: '+8', amount: 8, color: '#22c55e', textColor: '#fff' },
  { label: '0', amount: 0, color: 'hsl(var(--destructive))', textColor: '#fff' },
  { label: '+2', amount: 2, color: 'hsl(var(--accent))', textColor: '#fff' },
  { label: '+15', amount: 15, color: '#eab308', textColor: '#000' },
  { label: '0', amount: 0, color: 'hsl(var(--destructive))', textColor: '#fff' },
  { label: '+1', amount: 1, color: 'hsl(var(--muted))', textColor: '#fff' },
  { label: '+25', amount: 25, color: '#f59e0b', textColor: '#000' },
  { label: '0', amount: 0, color: 'hsl(var(--destructive))', textColor: '#fff' },
];

export default function WheelGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ won: boolean; payout: number; amount: number } | null>(null);
  const [lockedBet, setLockedBet] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const BET_OPTIONS = [5, 10];

  const drawWheel = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;
    const segAngle = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillText(seg.label, radius * 0.65, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fill();
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleSpin = async () => {
    if (spinning || playing) return;
    setResult(null);
    setSpinning(true);
    setLockedBet(betAmount);

    await onDeduct();

    // Determine outcome
    let targetIdx: number;
    if (discordUsername) {
      const { shouldWin } = await getRiggedOutcome({ betAmount, currentPoints: points, discordUsername });
      if (!shouldWin) {
        const zeroIndices = SEGMENTS.map((s, i) => s.amount === 0 ? i : -1).filter(i => i >= 0);
        targetIdx = zeroIndices[Math.floor(Math.random() * zeroIndices.length)];
      } else {
        const winIndices = SEGMENTS.map((s, i) => s.amount > 0 ? i : -1).filter(i => i >= 0);
        targetIdx = winIndices[Math.floor(Math.random() * winIndices.length)];
      }
    } else {
      targetIdx = Math.floor(Math.random() * SEGMENTS.length);
    }

    const segAngle = 360 / SEGMENTS.length;
    const targetAngle = 360 - (targetIdx * segAngle + segAngle / 2);
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + spins * 360 + targetAngle - (rotation % 360);

    setRotation(finalRotation);

    await new Promise(r => setTimeout(r, 4000));

    const seg = SEGMENTS[targetIdx];
    const payout = seg.amount;
    const won = payout > 0;
    setResult({ won, payout, amount: seg.amount });
    setSpinning(false);
    await onComplete(won, payout);
  };

  // Draw wheel on mount
  const canvasCallback = (canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      (canvasRef as any).current = canvas;
      drawWheel(canvas);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Game area */}
      <div className="nox-surface rounded-2xl border border-border p-8 flex flex-col items-center justify-center min-h-[600px]">
        <h2 className="text-lg font-black uppercase tracking-wider text-foreground mb-1">🎡 Lucky Wheel</h2>
        <p className="text-xs text-muted-foreground mb-10">Spin to win up to 5x your bet!</p>

        <div className="relative">
          {/* Pointer */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />

          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: [0.2, 0.8, 0.3, 1] }}
            className="relative"
          >
            <canvas
              ref={canvasCallback}
              width={280}
              height={280}
              className="rounded-full border-4 border-border shadow-2xl"
            />
          </motion.div>

          {/* Glow */}
          <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-40 h-8 rounded-full blur-xl transition-colors ${
            !result ? 'bg-primary/10' : result.won ? 'bg-green-500/20' : 'bg-destructive/20'
          }`} />
        </div>

        {result && !spinning && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
            <p className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-destructive'}`}>
              {result.multiplier === 0 ? 'BUST!' : `${result.multiplier}x — YOU WIN!`}
            </p>
            <p className={`text-sm font-bold mt-1 ${result.won ? 'text-green-400' : 'text-destructive'}`}>
              {result.won ? `+${result.payout} points` : `-${lockedBet} points`}
            </p>
          </motion.div>
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
            <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Bet Amount</label>
            <div className="grid grid-cols-2 gap-2">
              {BET_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setBetAmount(opt)}
                  className={`py-4 rounded-xl border text-center transition-all ${
                    betAmount === opt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <span className="text-xl font-black block">{opt}</span>
                  <span className="text-[10px] text-muted-foreground">points</span>
                </button>
              ))}
            </div>
          </div>

          <Button variant="nox" className="w-full h-14 text-lg font-bold"
            disabled={spinning || playing || betAmount < 5 || betAmount > points || points === 0 || !BET_OPTIONS.includes(betAmount)}
            onClick={handleSpin}>
            {spinning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SPIN'}
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
