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

const ROWS = 9;
const COLS = 3;

type Difficulty = 'easy' | 'hard';
const MINES_PER_ROW: Record<Difficulty, number> = { easy: 1, hard: 2 };

export default function TowersGame({ points, betAmount, setBetAmount, onDeduct, onComplete, playing, sessionHistory }: Props) {
  const { discordUsername } = useDiscordAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameActive, setGameActive] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [mineColumns, setMineColumns] = useState<number[][]>([]);
  const [selected, setSelected] = useState<Array<number | null>>(Array(ROWS).fill(null));
  const [hitTrap, setHitTrap] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [lockedBet, setLockedBet] = useState(0);
  const [maxSafeRows, setMaxSafeRows] = useState(999);

  const getMultiplier = (row: number) => {
    const base = difficulty === 'easy' ? 0.30 : 0.80;
    return parseFloat((1 + row * base).toFixed(2));
  };

  const generateMines = () => {
    const minesCount = MINES_PER_ROW[difficulty];
    return Array.from({ length: ROWS }, () => {
      const mines: number[] = [];
      while (mines.length < minesCount) {
        const col = Math.floor(Math.random() * COLS);
        if (!mines.includes(col)) mines.push(col);
      }
      return mines;
    });
  };

  const startGame = async () => {
    const mines = generateMines();
    setMineColumns(mines);
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
        setMaxSafeRows(Math.floor(Math.random() * 2));
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

    let isMine = mineColumns[row]?.includes(col);

    // If exceeded max safe rows, force a mine hit
    if (row >= maxSafeRows && !isMine) {
      const newMines = [...mineColumns];
      newMines[row] = [col]; // put mine where player clicked
      setMineColumns(newMines);
      isMine = true;
    }

    if (isMine) {
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

  const isGameOver = hitTrap || cashedOut;

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Game area */}
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center min-h-[600px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏰</span>
          <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Towers</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-8">Climb the tower, avoid the mines</p>

        <div className="w-full max-w-[340px] space-y-1.5 flex flex-col-reverse flex-1 justify-center">
          {Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="flex gap-1.5 items-center">
              {Array.from({ length: COLS }, (_, col) => {
                const isSelected = selected[row] === col;
                const isMine = mineColumns[row]?.includes(col);
                const showResult = isGameOver && row <= (hitTrap ? currentRow : currentRow - 1);
                const isCurrentRow = row === currentRow && gameActive;
                const isPassed = row < currentRow && selected[row] !== null;

                return (
                  <motion.button
                    key={col}
                    whileHover={isCurrentRow ? { scale: 1.03 } : {}}
                    whileTap={isCurrentRow ? { scale: 0.97 } : {}}
                    onClick={() => handlePick(row, col)}
                    disabled={!gameActive || row !== currentRow}
                    className={`flex-1 h-12 rounded-lg flex items-center justify-center border transition-all duration-150 ${
                      isSelected && isMine ? 'bg-destructive/20 border-destructive' :
                      isSelected && !isMine ? 'bg-green-500/10 border-green-500/40' :
                      showResult && isMine ? 'bg-destructive/5 border-destructive/20' :
                      showResult && !isMine ? 'bg-card/50 border-border/50' :
                      isPassed && selected[row] === col ? 'bg-green-500/10 border-green-500/30' :
                      isCurrentRow ? 'bg-card border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer' :
                      'bg-card/40 border-border/40'
                    }`}
                  >
                    {isSelected && isMine && <Skull className="w-4 h-4 text-destructive" />}
                    {isSelected && !isMine && <Zap className="w-4 h-4 text-green-400" />}
                    {isPassed && selected[row] === col && !isSelected && <Zap className="w-4 h-4 text-green-400" />}
                    {showResult && isMine && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-destructive/40" />}
                    {!isSelected && !showResult && !isPassed && isCurrentRow && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />}
                    {!isSelected && !showResult && !isPassed && !isCurrentRow && <div className="w-1 h-1 rounded-full bg-muted-foreground/10" />}
                  </motion.button>
                );
              })}
              {/* Multiplier label */}
              <span className={`w-14 text-right text-xs font-bold ${
                row < currentRow ? 'text-green-400' :
                row === currentRow && gameActive ? 'text-primary' :
                'text-muted-foreground/40'
              }`}>
                {getMultiplier(row + 1)}x
              </span>
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

      {/* Sidebar */}
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

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-widest mb-2 block">Difficulty</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['easy', 'hard'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-3 rounded-xl border text-center transition-all ${
                        difficulty === d
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <span className="text-sm font-black uppercase block">{d}</span>
                      <span className="text-[10px] text-muted-foreground">{MINES_PER_ROW[d]} Mine{MINES_PER_ROW[d] > 1 ? 's' : ''}</span>
                    </button>
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
