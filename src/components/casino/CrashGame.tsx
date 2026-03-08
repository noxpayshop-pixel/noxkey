import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateHouseEdge } from '@/lib/casino';
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

export default function CrashGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const [gameState, setGameState] = useState<'idle' | 'running' | 'crashed' | 'cashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [cashoutMult, setCashoutMult] = useState(0);
  const [payout, setPayout] = useState(0);
  const [lockedBet, setLockedBet] = useState(0);
  const intervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);
  const crashRef = useRef(0);
  const gameStateRef = useRef(gameState);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const drawGraph = useCallback((data: number[], state: string, cashoutAt?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    
    ctx.clearRect(0, 0, w, h);
    if (data.length < 2) return;

    const maxMult = Math.max(...data, 2);
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const gw = w - padding.left - padding.right;
    const gh = h - padding.top - padding.bottom;

    // Grid lines
    ctx.strokeStyle = 'hsla(0, 0%, 100%, 0.06)';
    ctx.lineWidth = 1;
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5].filter(s => s <= maxMult + 0.5);
    for (const s of steps) {
      const y = padding.top + gh - ((s - 1) / (maxMult - 1)) * gh;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'hsla(0, 0%, 100%, 0.3)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.toFixed(1)}x`, padding.left - 6, y + 4);
    }

    // Main line
    const getPoint = (i: number, val: number) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * gw,
      y: padding.top + gh - ((val - 1) / (maxMult - 1)) * gh,
    });

    // Fill area
    ctx.beginPath();
    data.forEach((val, i) => {
      const p = getPoint(i, val);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    const lastP = getPoint(data.length - 1, data[data.length - 1]);
    ctx.lineTo(lastP.x, padding.top + gh);
    ctx.lineTo(padding.left, padding.top + gh);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + gh);
    grad.addColorStop(0, state === 'crashed' ? 'hsla(0, 72%, 51%, 0.15)' : 'hsla(142, 76%, 36%, 0.2)');
    grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.strokeStyle = state === 'crashed' ? 'hsl(0, 72%, 51%)' : 'hsl(142, 76%, 36%)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    data.forEach((val, i) => {
      const p = getPoint(i, val);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Dot at end
    const endP = getPoint(data.length - 1, data[data.length - 1]);
    ctx.beginPath();
    ctx.arc(endP.x, endP.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = state === 'crashed' ? 'hsl(0, 72%, 51%)' : 'hsl(142, 76%, 36%)';
    ctx.fill();
    ctx.strokeStyle = 'hsl(0, 0%, 100%)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cashout marker
    if (cashoutAt && state === 'cashed') {
      const cIdx = data.findIndex(d => d >= cashoutAt);
      if (cIdx >= 0) {
        const cp = getPoint(cIdx, cashoutAt);
        // Dashed horizontal line
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'hsla(142, 76%, 36%, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, cp.y);
        ctx.lineTo(w - padding.right, cp.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle = 'hsl(142, 76%, 36%)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${cashoutAt.toFixed(2)}x`, cp.x + 10, cp.y - 8);
        // Circle
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(142, 76%, 36%)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Crash marker
    if (state === 'crashed' || (state === 'cashed' && crashRef.current > 0)) {
      const cPoint = crashRef.current || data[data.length - 1];
      // Dashed vertical red line at crash
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'hsla(0, 72%, 51%, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(endP.x, padding.top);
      ctx.lineTo(endP.x, padding.top + gh);
      ctx.stroke();
      ctx.setLineDash([]);
      if (state === 'crashed') {
        ctx.fillStyle = 'hsl(0, 72%, 51%)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Crashed @ ${cPoint.toFixed(2)}x`, endP.x, endP.y - 14);
      }
    }
  }, []);

  const startGame = async () => {
    try {
      setLockedBet(betAmount);
      await onDeduct();

      // Calculate crash point using house edge
      let crash = 1.1 + Math.random() * 4;
      if (discordUsername) {
        const edge = await calculateHouseEdge({ betAmount, discordUsername });
        // Lower adjusted chance = earlier crash
        crash = 1 + (edge.adjustedWinChance * 5) + Math.random() * 2;
      }
      crash = parseFloat(crash.toFixed(2));
      setCrashPoint(crash);
      crashRef.current = crash;
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
          setMultiplier(crash);
          dataRef.current.push(crash);
          setGameState('crashed');
        }
      }, 80);
    } catch {
      // deduct failed
    }
  };

  // Handle crash → complete as loss
  useEffect(() => {
    if (gameState === 'crashed') {
      onComplete(false, 0);
    }
  }, [gameState === 'crashed']);

  const handleCashout = async () => {
    if (gameStateRef.current !== 'running') return;
    clearInterval(intervalRef.current);
    const cashMult = multiplier;
    const cashPayout = Math.floor(lockedBet * cashMult);
    setCashoutMult(cashMult);
    setPayout(cashPayout);
    setGameState('cashed');
    await onComplete(true, cashPayout);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Redraw graph on every tick
  useEffect(() => {
    drawGraph(dataRef.current, gameState, cashoutMult || undefined);
  }, [multiplier, gameState, drawGraph, cashoutMult]);

  const presets = [
    { label: '1/2', action: () => setBetAmount(Math.max(1, Math.floor(betAmount / 2))) },
    { label: '2x', action: () => setBetAmount(Math.min(points, betAmount * 2)) },
    { label: 'Max', action: () => setBetAmount(points) },
  ];

  const isRunning = gameState === 'running';
  const isIdle = gameState === 'idle' || gameState === 'crashed' || gameState === 'cashed';

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Game Area */}
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col min-h-[550px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📈</span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Crash</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Cash out before the rocket crashes!</p>

        {/* Multiplier Display */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <motion.div
            animate={{ scale: isRunning ? [1, 1.03, 1] : 1 }}
            transition={{ repeat: isRunning ? Infinity : 0, duration: 0.6 }}
            className={`text-7xl font-black tracking-tight ${
              gameState === 'crashed' ? 'text-destructive' :
              gameState === 'cashed' ? 'text-green-400' : 'text-green-400'
            }`}
          >
            {(gameState === 'idle' && cashoutMult === 0) ? '1.00' : multiplier.toFixed(2)}x
          </motion.div>

          {gameState === 'crashed' && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="text-destructive font-bold text-sm uppercase tracking-widest mt-2">
              Crashed @ {crashPoint.toFixed(2)}x 💥
            </motion.p>
          )}
          {gameState === 'cashed' && (
            <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="text-green-400 font-bold text-sm uppercase tracking-widest mt-2">
              Cashed out @ {cashoutMult.toFixed(2)}x — +{payout} ✨
            </motion.p>
          )}
        </div>

        {/* Graph */}
        <div className="w-full h-[200px] relative rounded-xl bg-background/50 border border-border overflow-hidden mt-auto">
          <canvas ref={canvasRef} className="w-full h-full" />
          {gameState === 'idle' && cashoutMult === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40">
              <span className="text-xs uppercase tracking-wider">Waiting for bet...</span>
            </div>
          )}
        </div>
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
            <div className="flex items-center gap-0 rounded-xl border border-border overflow-hidden bg-background">
              <input type="number" min={1} max={points} value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, Math.min(points, parseInt(e.target.value) || 1)))}
                className="flex-1 px-4 py-3 bg-transparent text-foreground text-lg font-bold focus:outline-none"
                disabled={isRunning} />
              {presets.map(p => (
                <button key={p.label} onClick={p.action}
                  disabled={isRunning}
                  className="px-3 py-3 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 border-l border-border transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {isRunning ? (
            <Button variant="nox" className="w-full h-14 text-lg font-bold animate-pulse" onClick={handleCashout}>
              CASHOUT ({Math.floor(lockedBet * multiplier)})
            </Button>
          ) : (
            <Button variant="nox" className="w-full h-14 text-lg font-bold"
              disabled={betAmount < 1 || betAmount > points || points === 0}
              onClick={startGame}>
              {gameState === 'idle' ? 'PLAY' : 'PLAY AGAIN'}
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
                  <span className="font-bold text-xs px-2 py-0.5 rounded bg-current/10">{Math.abs(h.amount)}</span>
                  <span className="font-bold text-xs">{h.won ? `✅ +${h.amount}` : `❌ ${h.amount}`}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
