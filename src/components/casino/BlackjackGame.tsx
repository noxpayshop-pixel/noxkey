import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  onPlay: () => Promise<{ won: boolean; payout: number; winStreak: number }>;
  playing: boolean;
  sessionHistory: Array<{ won: boolean; amount: number }>;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Card { rank: string; suit: string; }

function cardValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (['K', 'Q', 'J'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function drawCard(): Card {
  return { rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: SUITS[Math.floor(Math.random() * SUITS.length)] };
}

function CardDisplay({ card, hidden }: { card: Card; hidden?: boolean }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180 }}
      animate={{ scale: 1, rotateY: 0 }}
      className={`w-16 h-24 rounded-xl flex flex-col items-center justify-center font-bold border-2 ${
        hidden ? 'bg-primary/20 border-primary/40' :
        'bg-card border-border'
      }`}
    >
      {hidden ? (
        <span className="text-primary text-2xl">?</span>
      ) : (
        <>
          <span className={`text-lg ${isRed ? 'text-destructive' : 'text-foreground'}`}>{card.rank}</span>
          <span className={`text-sm ${isRed ? 'text-destructive' : 'text-foreground'}`}>{card.suit}</span>
        </>
      )}
    </motion.div>
  );
}

export default function BlackjackGame({ points, betAmount, setBetAmount, onPlay, playing, sessionHistory }: Props) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [result, setResult] = useState<'win' | 'lose' | 'push' | null>(null);
  const [showDealer, setShowDealer] = useState(false);

  const startGame = () => {
    const pCards = [drawCard(), drawCard()];
    const dCards = [drawCard(), drawCard()];
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setResult(null);
    setShowDealer(false);
    setGameState('playing');

    if (cardValue(pCards) === 21) {
      finishGame(pCards, dCards);
    }
  };

  const hit = () => {
    const newCards = [...playerCards, drawCard()];
    setPlayerCards(newCards);
    if (cardValue(newCards) > 21) {
      finishGame(newCards, dealerCards);
    }
  };

  const stand = () => {
    let dCards = [...dealerCards];
    while (cardValue(dCards) < 17) {
      dCards.push(drawCard());
    }
    setDealerCards(dCards);
    finishGame(playerCards, dCards);
  };

  const finishGame = async (pCards: Card[], dCards: Card[]) => {
    setShowDealer(true);
    setDealerCards(dCards);
    const pVal = cardValue(pCards);
    const dVal = cardValue(dCards);

    let res: 'win' | 'lose' | 'push';
    if (pVal > 21) res = 'lose';
    else if (dVal > 21) res = 'win';
    else if (pVal > dVal) res = 'win';
    else if (pVal < dVal) res = 'lose';
    else res = 'push';

    setResult(res);
    setGameState('done');
    await onPlay();
  };

  const presets = [1, 5, 10, 25, 50];

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="nox-surface rounded-2xl border border-border p-6 flex flex-col items-center min-h-[500px]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Blackjack</h2>
        <p className="text-xs text-muted-foreground mb-8">Get closer to 21 than the dealer</p>

        {gameState === 'idle' ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Place a bet and deal
          </div>
        ) : (
          <div className="flex-1 w-full max-w-md space-y-8">
            {/* Dealer */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dealer</span>
                {showDealer && <span className="text-sm font-bold text-foreground">{cardValue(dealerCards)}</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {dealerCards.map((c, i) => (
                  <CardDisplay key={i} card={c} hidden={i === 1 && !showDealer} />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="nox-divider" />

            {/* Player */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Hand</span>
                <span className={`text-sm font-bold ${cardValue(playerCards) > 21 ? 'text-destructive' : 'text-foreground'}`}>
                  {cardValue(playerCards)}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {playerCards.map((c, i) => (
                  <CardDisplay key={i} card={c} />
                ))}
              </div>
            </div>

            {/* Actions */}
            {gameState === 'playing' && cardValue(playerCards) <= 21 && (
              <div className="flex gap-3">
                <Button variant="nox" className="flex-1 h-12 font-bold" onClick={hit}>HIT</Button>
                <Button variant="noxOutline" className="flex-1 h-12 font-bold" onClick={stand}>STAND</Button>
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <p className={`text-2xl font-black ${result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {result === 'win' ? `YOU WIN! +${betAmount * 2}` : result === 'lose' ? 'DEALER WINS' : 'PUSH'}
                </p>
              </motion.div>
            )}
          </div>
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
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors"
              disabled={gameState === 'playing'} />
            <div className="flex gap-1.5 mt-3">
              {presets.map(p => (
                <button key={p} onClick={() => setBetAmount(Math.min(p, points))}
                  disabled={gameState === 'playing'}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    betAmount === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
          {gameState !== 'playing' && (
            <Button variant="nox" className="w-full h-14 text-lg font-bold"
              disabled={betAmount < 1 || betAmount > points || points === 0}
              onClick={startGame}>
              {gameState === 'idle' ? 'DEAL' : 'NEW HAND'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
