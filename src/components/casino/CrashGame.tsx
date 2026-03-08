import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onPlay: () => Promise<{ won: boolean; payout: number; winStreak: number }>;
  playing: boolean;
  sessionHistory: Array<{ won: boolean; amount: number }>;
}

export default function CrashGame({ points, betAmount, setBetAmount, onPlay, playing, sessionHistory }: Props) {
  const [gameState, setGameState] = useState<'idle' | 'running' | 'crashed' | 'cashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [cashoutMult, setCashoutMult] = useState(0);
  const [payout, setPayout] = useState(0);
  const intervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);

  const startGame = async () => {
    const crash = 1 + Math.random() * 4;
    setCrashPoint(crash);
    setMultiplier(1.0);
    setGameState('running');
    setCashoutMult(0);
    setPayout(0);
    dataRef.current = [1.0];

    let mult = 1.0;
    intervalRef.current = setInterval(() => {
      mult += 0.02 + Math.random() * 0.03;
      mult = parseFloat(mult.toFixed(2));
      dataRef.current.push(mult);
      setMultiplier(mult);

      if (mult >= crash) {
        clearInterval(intervalRef.current);
        setGameState('crashed');
        onPlay();
      }
    }, 80);
  };

  const handleCashout = async () => {
    if (gameState !== 'running') return;
    clearInterval(intervalRef.current);
    setCashoutMult(multiplier);
    setPayout(Math.floor(betAmount * multiplier));
    setGameState('cashed');
    await onPlay();
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const data = dataRef.current;
    if (data.length < 2) return;
    const maxMult = Math.max(...data, 2);
    ctx.beginPath();
    ctx.strokeStyle = gameState === 'crashed' ? 'hsl(0, 72%, 51%)' : gameState === 'cashed' ? 'hsl(142, 76%, 36%)' : 'hsl(270, 80%, 65%)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    data.forEach((val, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - ((val - 1) / (maxMult - 1)) * h * 0.85 - h * 0.05;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gameState === 'crashed' ? 'hsla(0, 72%, 51%, 0.05)' : 'hsla(270, 80%, 65%, 0.05)';
    ctx.fill();
  }, [multiplier, gameState]);

  const presets = [1, 5, 10, 25, 50];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center min-h-[500px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📈</span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Crash</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">Cash out before the rocket crashes!</p>

        <motion.div
          animate={{ scale: gameState === 'running' ? [1, 1.02, 1] : 1 }}
          transition={{ repeat: gameState === 'running' ? Infinity : 0, duration: 0.5 }}
          className={`text-6xl font-black mb-6 ${
            gameState === 'crashed' ? 'text-destructive' :
            gameState === 'cashed' ? 'text-green-400' : 'text-foreground'
          }`}
        >
          {multiplier.toFixed(2)}x
        </motion.div>

        {gameState === 'crashed' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive font-bold text-lg mb-4">
            CRASHED! 💥
          </motion.p>
        )}
        {gameState === 'cashed' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 font-bold text-lg mb-4">
            Cashed out at {cashoutMult.toFixed(2)}x — +{payout} ✨
          </motion.p>
        )}

        <div className="w-full flex-1 min-h-[200px] relative rounded-xl bg-background border border-border overflow-hidden">
          <canvas ref={canvasRef} width={600} height={300} className="w-full h-full" />
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl font-black">1.00x</span>
              <span className="text-xs uppercase tracking-wider mt-2">Waiting for bet...</span>
            </div>
          )}
        </div>
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
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors"
                disabled={gameState === 'running'} />
              <button onClick={() => setBetAmount(points)}
                className="px-3 py-3 rounded-xl border border-primary/50 text-primary hover:bg-primary/10 text-sm font-bold"
                disabled={gameState === 'running'}>Max</button>
            </div>
            <div className="flex gap-1.5 mt-3">
              {presets.map(p => (
                <button key={p} onClick={() => setBetAmount(Math.min(p, points))}
                  disabled={gameState === 'running'}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    betAmount === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}>{p}</button>
              ))}
            </div>
          </div>

          {gameState === 'running' ? (
            <Button variant="nox" className="w-full h-14 text-lg font-bold" onClick={handleCashout}>
              CASHOUT ({Math.floor(betAmount * multiplier)})
            </Button>
          ) : (
            <Button variant="nox" className="w-full h-14 text-lg font-bold"
              disabled={betAmount < 1 || betAmount > points || points === 0}
              onClick={startGame}>
              {gameState === 'idle' ? 'JOIN GAME' : 'PLAY AGAIN'}
            </Button>
          )}
        </div>

        {/* Session History */}
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
