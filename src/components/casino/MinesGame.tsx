import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Bomb, Gem } from 'lucide-react';
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

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

export default function MinesGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const MINE_OPTIONS = [5, 7, 10, 13, 15];
  const [mineCount, setMineCount] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [hitMine, setHitMine] = useState<number | null>(null);
  const [cashedOut, setCashedOut] = useState(false);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [payout, setPayout] = useState(0);
  const [lockedBet, setLockedBet] = useState(0);
  const [maxSafeTiles, setMaxSafeTiles] = useState(999);

  const startGame = useCallback(async () => {
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
    setLockedBet(betAmount);

    // Pre-determine max safe tiles using house edge
    if (discordUsername) {
      const { shouldWin, adjustedWinChance } = await getRiggedOutcome({
        betAmount, currentPoints: points, discordUsername,
      });
      if (!shouldWin) {
        // Player will lose — allow 0-3 safe tiles before forced mine
        setMaxSafeTiles(Math.floor(Math.random() * 4));
      } else {
        // Player can win — allow reasonable tiles
        const safeTiles = TOTAL_TILES - mineCount;
        setMaxSafeTiles(Math.max(2, Math.floor(safeTiles * (0.3 + adjustedWinChance * 0.5))));
      }
    }

    await onDeduct();
    setGameActive(true);
  }, [mineCount, betAmount, onDeduct, discordUsername, points]);

  const handleTileClick = async (index: number) => {
    if (!gameActive || revealed.has(index) || hitMine !== null) return;

    // If player exceeded max safe tiles, force a mine hit
    if (revealed.size >= maxSafeTiles && !mines.has(index)) {
      // Secretly move a mine to this tile
      const newMines = new Set(mines);
      newMines.add(index);
      setMines(newMines);
    }

    if (mines.has(index)) {
      setHitMine(index);
      setGameActive(false);
      await onComplete(false, 0);
      return;
    }

    const newRevealed = new Set(revealed);
    newRevealed.add(index);
    setRevealed(newRevealed);

    const safeTiles = TOTAL_TILES - mineCount;
    const revealedCount = newRevealed.size;
    // House-edge multiplier: based on true odds * 0.90 (10% house edge)
    // True fair mult per tile = TOTAL_TILES / safeTiles compounded
    // We use: product of (remaining / safe_remaining) with 0.90 cut
    let mult = 1.0;
    for (let i = 0; i < revealedCount; i++) {
      mult *= (TOTAL_TILES - i) / (safeTiles - i) * 0.90;
    }
    mult = parseFloat(Math.max(1.0, mult).toFixed(2));
    setCurrentMult(mult);
    setPayout(Math.floor(lockedBet * mult));

    if (revealedCount >= safeTiles) {
      setCashedOut(true);
      setGameActive(false);
      await onComplete(true, Math.floor(lockedBet * mult));
    }
  };

  const handleCashout = async () => {
    if (!gameActive || revealed.size === 0) return;
    setCashedOut(true);
    setGameActive(false);
    await onComplete(true, payout);
  };

  const nextTileMult = () => {
    const safeTiles = TOTAL_TILES - mineCount;
    const revealedCount = revealed.size + 1;
    let mult = 1.0;
    for (let i = 0; i < revealedCount; i++) {
      mult *= (TOTAL_TILES - i) / (safeTiles - i) * 0.90;
    }
    return Math.max(1.0, mult).toFixed(2);
  };

  const presets = [1, 5, 10, 25, 50];
  const isGameOver = hitMine !== null || cashedOut;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
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
                <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Mines</label>
                <div className="flex gap-1.5">
                  {MINE_OPTIONS.map(m => (
                    <button key={m} onClick={() => setMineCount(m)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                        mineCount === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}>{m}</button>
                  ))}
                </div>
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
