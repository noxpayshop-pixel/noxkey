import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2, Bomb, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onPlay: () => Promise<{ won: boolean; payout: number; winStreak: number }>;
  playing: boolean;
}

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

export default function MinesGame({ points, betAmount, setBetAmount, onPlay, playing }: Props) {
  const [mineCount, setMineCount] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [hitMine, setHitMine] = useState<number | null>(null);
  const [cashedOut, setCashedOut] = useState(false);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [payout, setPayout] = useState(0);

  const startGame = useCallback(() => {
    // Place mines randomly
    const minePositions = new Set<number>();
    while (minePositions.size < mineCount) {
      minePositions.add(Math.floor(Math.random() * TOTAL_TILES));
    }
    setMines(minePositions);
    setRevealed(new Set());
    setHitMine(null);
    setCashedOut(false);
    setCurrentMult(1.0);
    setPayout(0);
    setGameActive(true);
  }, [mineCount]);

  const handleTileClick = async (index: number) => {
    if (!gameActive || revealed.has(index) || hitMine !== null) return;

    if (mines.has(index)) {
      // Hit a mine - loss
      setHitMine(index);
      setGameActive(false);
      await onPlay(); // Record loss
      return;
    }

    const newRevealed = new Set(revealed);
    newRevealed.add(index);
    setRevealed(newRevealed);

    // Calculate multiplier: more revealed = higher mult
    const safeTiles = TOTAL_TILES - mineCount;
    const revealedCount = newRevealed.size;
    const mult = parseFloat(((safeTiles / (safeTiles - revealedCount + 1)) * (1 + revealedCount * 0.15)).toFixed(2));
    setCurrentMult(mult);
    setPayout(Math.floor(betAmount * mult));

    // If all safe tiles revealed = auto cashout
    if (revealedCount >= safeTiles) {
      setCashedOut(true);
      setGameActive(false);
    }
  };

  const handleCashout = async () => {
    if (!gameActive || revealed.size === 0) return;
    setCashedOut(true);
    setGameActive(false);
    // The actual bet was already determined; we'll just record it as a win
    await onPlay();
  };

  const nextTileMult = () => {
    const safeTiles = TOTAL_TILES - mineCount;
    const revealedCount = revealed.size + 1;
    return ((safeTiles / (safeTiles - revealedCount + 1)) * (1 + revealedCount * 0.15)).toFixed(2);
  };

  const presets = [1, 5, 10, 25, 50];
  const isGameOver = hitMine !== null || cashedOut;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Game Grid */}
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Mines</h2>
        <p className="text-xs text-muted-foreground mb-8">Find diamonds, avoid the bombs</p>

        <div className="grid grid-cols-5 gap-2 w-full max-w-[400px]">
          {Array.from({ length: TOTAL_TILES }, (_, i) => {
            const isRevealed = revealed.has(i);
            const isMine = mines.has(i);
            const isHit = hitMine === i;
            const showMine = isGameOver && isMine;

            return (
              <motion.button
                key={i}
                whileHover={gameActive && !isRevealed ? { scale: 1.05 } : {}}
                whileTap={gameActive && !isRevealed ? { scale: 0.95 } : {}}
                onClick={() => handleTileClick(i)}
                disabled={!gameActive || isRevealed}
                className={`aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all border ${
                  isHit ? 'bg-destructive/20 border-destructive' :
                  isRevealed ? 'bg-green-500/10 border-green-500/30' :
                  showMine ? 'bg-destructive/10 border-destructive/30' :
                  gameActive ? 'bg-card border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer' :
                  'bg-card border-border'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isHit ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-destructive">
                      <Bomb className="w-6 h-6" />
                    </motion.div>
                  ) : isRevealed ? (
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="text-green-400">
                      <Gem className="w-5 h-5" />
                    </motion.div>
                  ) : showMine ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-destructive/50">
                      <Bomb className="w-5 h-5" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Result */}
        {isGameOver && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
            {hitMine !== null ? (
              <p className="text-xl font-black text-destructive">BOOM! You hit a mine 💀</p>
            ) : cashedOut ? (
              <p className="text-xl font-black text-green-400">Cashed out at {currentMult}x! +{payout} ✨</p>
            ) : null}
          </motion.div>
        )}
      </div>

      {/* Controls Sidebar */}
      <div className="space-y-4">
        <div className="nox-surface rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current Balance</p>
          <p className="text-2xl font-black text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" /> {points}
          </p>
        </div>

        <div className="nox-surface rounded-2xl border border-border p-5 space-y-4">
          {!gameActive ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Bet Amount</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={points} value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Math.min(points, parseInt(e.target.value) || 1)))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors" />
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-widest">Mines</label>
                  <span className="text-sm font-bold text-foreground">{mineCount}</span>
                </div>
                <input type="range" min={1} max={20} value={mineCount} onChange={(e) => setMineCount(parseInt(e.target.value))}
                  className="w-full accent-primary" />
              </div>

              <Button variant="nox" className="w-full h-14 text-lg font-bold"
                disabled={betAmount < 1 || betAmount > points || points === 0}
                onClick={startGame}>
                PLAY
              </Button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Current Mult</p>
                  <p className="text-lg font-black text-foreground">{revealed.size === 0 ? '1.00' : currentMult}x</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Next Tile</p>
                  <p className="text-lg font-black text-green-400">{nextTileMult()}x</p>
                </div>
              </div>

              <Button variant="nox" className="w-full h-14 text-lg font-bold"
                disabled={revealed.size === 0}
                onClick={handleCashout}>
                CASHOUT {payout > 0 ? `(${payout})` : ''}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
