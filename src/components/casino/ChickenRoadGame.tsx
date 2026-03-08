import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Car, Bird } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onDeduct: () => Promise<void>;
  onComplete: (won: boolean, payout: number) => Promise<void>;
  playing: boolean;
  sessionHistory: Array<{ won: boolean; amount: number }>;
}

const ROWS = 10;
const COLS = 4;
const MULTIPLIERS = [1.2, 1.4, 1.65, 1.95, 2.3, 2.7, 3.2, 3.8, 4.5, 5.3];

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CARS: Record<Difficulty, number> = { easy: 1, medium: 1, hard: 2 };

export default function ChickenRoadGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameActive, setGameActive] = useState(false);
  const [currentRow, setCurrentRow] = useState(-1);
  const [carPositions, setCarPositions] = useState<number[][]>([]);
  const [revealedRows, setRevealedRows] = useState<Map<number, number>>(new Map());
  const [hitCar, setHitCar] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [currentMult, setCurrentMult] = useState(1.0);

  const startGame = useCallback(async () => {
    const carsPerRow = DIFFICULTY_CARS[difficulty];
    const cars: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const rowCars = new Set<number>();
      while (rowCars.size < carsPerRow) {
        rowCars.add(Math.floor(Math.random() * COLS));
      }
      cars.push(Array.from(rowCars));
    }
    setCarPositions(cars);
    setRevealedRows(new Map());
    setCurrentRow(0);
    setHitCar(false);
    setCashedOut(false);
    setCurrentMult(1.0);
    await onDeduct();
    setGameActive(true);
  }, [difficulty, onDeduct]);

  const handleTileClick = async (col: number) => {
    if (!gameActive || hitCar || currentRow >= ROWS) return;

    const newRevealed = new Map(revealedRows);
    newRevealed.set(currentRow, col);
    setRevealedRows(newRevealed);

    if (carPositions[currentRow]?.includes(col)) {
      setHitCar(true);
      setGameActive(false);
      await onComplete(false, 0);
      return;
    }

    const mult = MULTIPLIERS[currentRow];
    setCurrentMult(mult);

    if (currentRow >= ROWS - 1) {
      setCashedOut(true);
      setGameActive(false);
      await onComplete(true, Math.floor(betAmount * mult));
    } else {
      setCurrentRow(currentRow + 1);
    }
  };

  const handleCashout = async () => {
    if (!gameActive || currentRow === 0) return;
    setCashedOut(true);
    setGameActive(false);
    const payout = Math.floor(betAmount * currentMult);
    await onComplete(true, payout);
  };

  const presets = [1, 5, 10, 25, 50];
  const isGameOver = hitCar || cashedOut;
  const payout = Math.floor(betAmount * currentMult);

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Game Area */}
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🐔</span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Chicken Road</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-6">Cross the road, avoid the cars!</p>

        <div className="w-full max-w-[500px] space-y-1.5">
          {Array.from({ length: ROWS }).map((_, rowIdx) => {
            const displayRow = ROWS - 1 - rowIdx;
            const mult = MULTIPLIERS[displayRow];
            const isActive = displayRow === currentRow && gameActive;
            const isRevealed = revealedRows.has(displayRow);
            const selectedCol = revealedRows.get(displayRow);
            const isFuture = displayRow > currentRow;
            const carCols = carPositions[displayRow] ?? [];

            return (
              <div key={displayRow} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-10 text-right">{mult.toFixed(2)}x</span>
                <div className="flex-1 flex gap-1.5">
                  {Array.from({ length: COLS }).map((_, col) => {
                    const isCar = carCols.includes(col);
                    const isSelected = selectedCol === col;
                    const showCar = isRevealed && isCar;
                    const showChicken = isSelected && !isCar;
                    const showCarOnGameOver = isGameOver && isCar && !isRevealed;

                    return (
                      <motion.button
                        key={col}
                        whileHover={isActive ? { scale: 1.05 } : {}}
                        whileTap={isActive ? { scale: 0.95 } : {}}
                        onClick={() => isActive && handleTileClick(col)}
                        disabled={!isActive}
                        className={`flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border ${
                          isSelected && isCar ? 'bg-destructive/20 border-destructive' :
                          showChicken ? 'bg-green-500/15 border-green-500/40' :
                          showCar || showCarOnGameOver ? 'bg-destructive/10 border-destructive/30' :
                          isActive ? 'bg-card border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer' :
                          isFuture ? 'bg-card/50 border-border/50' :
                          'bg-card border-border'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {isSelected && isCar ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>🚗</motion.span>
                          ) : showChicken ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>🐔</motion.span>
                          ) : (showCar || showCarOnGameOver) ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="opacity-50">🚗</motion.span>
                          ) : isActive ? (
                            <span className="text-muted-foreground/30">•</span>
                          ) : null}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground/50 w-6 text-center">{displayRow + 1}</span>
              </div>
            );
          }).reverse().reverse()}
        </div>

        {/* Dashed start line */}
        <div className="w-full max-w-[500px] mt-2 border-t border-dashed border-muted-foreground/20 flex justify-between px-12 pt-1">
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Start</span>
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Start</span>
        </div>

        {isGameOver && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
            {hitCar ? (
              <p className="text-xl font-black text-destructive">HIT A CAR! 🚗💥</p>
            ) : cashedOut ? (
              <p className="text-xl font-black text-green-400">Cashed out at {currentMult.toFixed(2)}x! +{payout} ✨</p>
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
                <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Difficulty Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                        difficulty === d ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}>
                      <div className="uppercase">{d}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{DIFFICULTY_CARS[d]} Car{DIFFICULTY_CARS[d] > 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="nox" className="w-full h-14 text-lg font-bold"
                disabled={betAmount < 1 || betAmount > points || points === 0}
                onClick={startGame}>
                PLAY CHICKEN ▸
              </Button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Current Mult</p>
                  <p className="text-lg font-black text-foreground">{currentRow === 0 ? '1.00' : currentMult.toFixed(2)}x</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Next Row</p>
                  <p className="text-lg font-black text-green-400">{currentRow < ROWS ? MULTIPLIERS[currentRow].toFixed(2) : '--'}x</p>
                </div>
              </div>

              <Button variant="nox" className="w-full h-14 text-lg font-bold"
                disabled={currentRow === 0}
                onClick={handleCashout}>
                CASHOUT {currentRow > 0 ? `(${payout})` : ''}
              </Button>
            </>
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
