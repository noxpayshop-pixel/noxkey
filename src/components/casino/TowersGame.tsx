import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Zap, Skull } from 'lucide-react';
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

const ROWS = 8;
const COLS = 3;

export default function TowersGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const [gameActive, setGameActive] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [safeColumns, setSafeColumns] = useState<number[]>([]);
  const [selected, setSelected] = useState<Array<number | null>>(Array(ROWS).fill(null));
  const [hitTrap, setHitTrap] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [lockedBet, setLockedBet] = useState(0);
  const [maxSafeRows, setMaxSafeRows] = useState(999);

  const getMultiplier = (row: number) => parseFloat((1 + row * 0.5).toFixed(2));

  const startGame = async () => {
    const safes = Array.from({ length: ROWS }, () => Math.floor(Math.random() * COLS));
    setSafeColumns(safes);
    setCurrentRow(0);
    setSelected(Array(ROWS).fill(null));
    setHitTrap(false);
    setCashedOut(false);
    setCurrentMult(1.0);
    setLockedBet(betAmount);

    if (discordUsername) {
      const { shouldWin, adjustedWinChance } = await getRiggedOutcome({
        betAmount, currentPoints: points, discordUsername,
      });
      if (!shouldWin) {
        setMaxSafeRows(Math.floor(Math.random() * 2)); // 0-1 safe rows
      } else {
        setMaxSafeRows(Math.max(2, Math.floor(ROWS * (0.3 + adjustedWinChance * 0.5))));
      }
    }

    await onDeduct();
    setGameActive(true);
  };

  const handlePick = async (row: number, col: number) => {
    if (!gameActive || row !== currentRow || hitTrap) return;

    const newSelected = [...selected];
    newSelected[row] = col;
    setSelected(newSelected);

    // If exceeded max safe rows, force wrong pick
    let isSafe = col === safeColumns[row];
    if (row >= maxSafeRows && isSafe) {
      // Move safe column away from player's pick
      const newSafes = [...safeColumns];
      newSafes[row] = (col + 1 + Math.floor(Math.random() * (COLS - 1))) % COLS;
      setSafeColumns(newSafes);
      isSafe = false;
    }

    if (!isSafe) {
      setHitTrap(true);
      setGameActive(false);
      await onComplete(false, 0);
      return;
    }

    const mult = getMultiplier(row + 1);
    setCurrentMult(mult);
    
    if (row + 1 >= ROWS) {
      setCashedOut(true);
      setGameActive(false);
      await onComplete(true, Math.floor(lockedBet * mult));
    } else {
      setCurrentRow(row + 1);
    }
  };

  const handleCashout = async () => {
    if (!gameActive || currentRow === 0) return;
    setCashedOut(true);
    setGameActive(false);
    await onComplete(true, Math.floor(lockedBet * currentMult));
  };

  const presets = [1, 5, 10, 25, 50];
  const isGameOver = hitTrap || cashedOut;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Towers</h2>
        <p className="text-xs text-muted-foreground mb-6">Climb higher for bigger multipliers</p>

        <div className="w-full max-w-[300px] space-y-2 flex flex-col-reverse">
          {Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="flex gap-2">
              <div className="w-12 flex items-center justify-center text-xs font-bold text-muted-foreground">
                {getMultiplier(row + 1)}x
              </div>
              {Array.from({ length: COLS }, (_, col) => {
                const isSelected = selected[row] === col;
                const isSafe = safeColumns[row] === col;
                const showResult = isGameOver && row <= (hitTrap ? currentRow : currentRow - 1);
                const isCurrentRow = row === currentRow && gameActive;

                return (
                  <motion.button
                    key={col}
                    whileHover={isCurrentRow ? { scale: 1.05 } : {}}
                    onClick={() => handlePick(row, col)}
                    disabled={!gameActive || row !== currentRow}
                    className={`flex-1 h-14 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected && !isSafe ? 'bg-destructive/20 border-destructive' :
                      isSelected && isSafe ? 'bg-green-500/10 border-green-500/30' :
                      showResult && isSafe ? 'bg-green-500/5 border-green-500/20' :
                      showResult && !isSafe ? 'bg-card border-border' :
                      isCurrentRow ? 'bg-card border-primary/40 hover:bg-primary/5 cursor-pointer' :
                      row < currentRow && selected[row] === col ? 'bg-green-500/10 border-green-500/30' :
                      'bg-card border-border opacity-50'
                    }`}
                  >
                    {isSelected && !isSafe && <Skull className="w-5 h-5 text-destructive" />}
                    {isSelected && isSafe && <Zap className="w-5 h-5 text-green-400" />}
                    {showResult && isSafe && !isSelected && <div className="w-2 h-2 rounded-full bg-green-500/30" />}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>

        {isGameOver && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
            {hitTrap ? (
              <p className="text-xl font-black text-destructive">Wrong pick! 💀</p>
            ) : (
              <p className="text-xl font-black text-green-400">
                {currentRow >= ROWS ? 'Reached the top!' : `Cashed out at ${currentMult}x!`} ✨
              </p>
            )}
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
              <Button variant="nox" className="w-full h-14 text-lg font-bold"
                disabled={betAmount < 1 || betAmount > points || points === 0}
                onClick={startGame}>
                PLAY
              </Button>
            </>
          ) : (
            <>
              <div className="bg-background rounded-xl border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Current Multiplier</p>
                <p className="text-2xl font-black text-foreground">{currentMult}x</p>
                <p className="text-xs text-muted-foreground mt-1">Next: {getMultiplier(currentRow + 1)}x</p>
              </div>
              <Button variant="nox" className="w-full h-14 text-lg font-bold"
                disabled={currentRow === 0}
                onClick={handleCashout}>
                CASHOUT ({Math.floor(lockedBet * currentMult)})
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
