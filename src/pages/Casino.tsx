import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import { supabase } from '@/integrations/supabase/client';
import { placeBet, getRecentActivity, getUserStats } from '@/lib/casino';
import { Link } from 'react-router-dom';
import {
  Loader2, Coins, ArrowLeft, LogOut, TrendingUp, TrendingDown,
  Flame, Trophy, Dices, Target, Zap, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logo from '@/assets/logo.gif';

interface GameDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const GAMES: GameDef[] = [
  { id: 'coinflip', name: 'Coin Flip', description: 'Double or nothing. 50/50 chance.', icon: <Coins className="w-5 h-5" />, color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'crash', name: 'Crash', description: 'Cash out before it crashes!', icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/10' },
  { id: 'mines', name: 'Mines', description: 'Avoid the mines, find the gems.', icon: <Target className="w-5 h-5" />, color: 'text-red-400', gradient: 'from-red-500/20 to-rose-500/10' },
  { id: 'towers', name: 'Towers', description: 'Climb the tower for multipliers.', icon: <Zap className="w-5 h-5" />, color: 'text-blue-400', gradient: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'blackjack', name: 'Blackjack', description: 'Classic table game. Hit or Stand?', icon: <Dices className="w-5 h-5" />, color: 'text-purple-400', gradient: 'from-purple-500/20 to-violet-500/10' },
  { id: 'limbo', name: 'Limbo', description: 'How high can you go? Predict the multiplier.', icon: <Flame className="w-5 h-5" />, color: 'text-orange-400', gradient: 'from-orange-500/20 to-amber-500/10' },
];

const Casino = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<{ won: boolean; payout: number; winStreak: number } | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [animating, setAnimating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!discordUsername) return;
    setLoading(true);
    const [pointsRes, activity, userStats] = await Promise.all([
      supabase.from('user_points').select('points').eq('discord_username', discordUsername).single(),
      getRecentActivity(15),
      getUserStats(discordUsername),
    ]);
    setPoints(pointsRes.data?.points ?? 0);
    setRecentActivity(activity);
    setStats(userStats);
    setLoading(false);
  }, [discordUsername]);

  useEffect(() => { if (isLoggedIn) fetchData(); }, [isLoggedIn, fetchData]);

  // Realtime updates for activity
  useEffect(() => {
    const channel = supabase
      .channel('casino-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casino_bets' }, () => {
        getRecentActivity(15).then(setRecentActivity);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePlay = async () => {
    if (!selectedGame || !discordUsername || betAmount < 1 || betAmount > points) return;
    setPlaying(true);
    setResult(null);
    setAnimating(true);

    // Animate for suspense
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    try {
      const res = await placeBet(discordUsername, selectedGame, betAmount, points);
      setResult(res);
      setPoints(res.newPoints);
      setAnimating(false);

      if (res.won) {
        toast.success(`🎉 You won ${res.payout} points!`, { duration: 4000 });
      } else {
        toast.error(`💀 You lost ${betAmount} points`, { duration: 3000 });
      }

      // Refresh stats
      getUserStats(discordUsername).then(setStats);
      getRecentActivity(15).then(setRecentActivity);
    } catch (err) {
      toast.error('Bet failed');
      setAnimating(false);
    } finally {
      setPlaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[400px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] rounded-full bg-accent/3 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border glass">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="The Nox" className="w-9 h-9 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold nox-gradient-text">Casino</span>
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 nox-gradient rounded-full px-4 py-1.5">
                <Coins className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground font-bold">{points}</span>
              </div>
              <div className="flex items-center gap-2 bg-card/50 rounded-full px-3 py-1.5 border border-border">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-foreground font-medium">@{discordUsername}</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {!isLoggedIn ? (
          <div className="mt-16 max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl nox-gradient flex items-center justify-center mx-auto mb-4">
                <Dices className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-extrabold text-foreground mb-2">Nox Casino</h1>
              <p className="text-muted-foreground">Login with Discord to play and bet your points.</p>
            </div>
            <DiscordLoginPanel />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Main area */}
            <div>
              {/* Win streak banner */}
              {stats && stats.currentStreak >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 nox-gradient rounded-2xl p-4 flex items-center gap-3"
                >
                  <Flame className="w-6 h-6 text-primary-foreground animate-pulse" />
                  <div>
                    <p className="text-primary-foreground font-bold text-lg">🔥 {stats.currentStreak} Win Streak!</p>
                    <p className="text-primary-foreground/70 text-xs">Keep going! Max streak: {stats.maxStreak}</p>
                  </div>
                </motion.div>
              )}

              {/* Game selection */}
              {!selectedGame ? (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Dices className="w-5 h-5 text-primary" /> Featured Games
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {GAMES.map((game, i) => (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`nox-surface rounded-2xl border border-border overflow-hidden cursor-pointer nox-hover-glow group`}
                        onClick={() => { setSelectedGame(game.id); setResult(null); }}
                      >
                        <div className={`h-28 bg-gradient-to-br ${game.gradient} relative flex items-center justify-center`}>
                          <div className={`w-12 h-12 rounded-xl bg-background/50 backdrop-blur flex items-center justify-center ${game.color}`}>
                            {game.icon}
                          </div>
                          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Live
                          </span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-foreground">{game.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{game.description}</p>
                          <p className="text-xs text-primary font-semibold mt-2 group-hover:text-accent transition-colors">
                            PLAY NOW →
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <GamePlayArea
                  game={GAMES.find(g => g.id === selectedGame)!}
                  points={points}
                  betAmount={betAmount}
                  setBetAmount={setBetAmount}
                  playing={playing}
                  animating={animating}
                  result={result}
                  onPlay={handlePlay}
                  onBack={() => { setSelectedGame(null); setResult(null); }}
                />
              )}
            </div>

            {/* Recent Activity sidebar */}
            <div className="space-y-4">
              <div className="nox-surface rounded-2xl border border-border p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {recentActivity.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">No bets yet. Be the first!</p>
                  )}
                  {recentActivity.map((bet, i) => (
                    <motion.div
                      key={bet.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        bet.won ? 'bg-green-500/10' : 'bg-destructive/10'
                      }`}>
                        {bet.won ? (
                          <TrendingDown className="w-4 h-4 text-green-400 rotate-180" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-destructive rotate-180" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {bet.won ? 'Win' : 'Bet'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(bet.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${bet.won ? 'text-green-400' : 'text-destructive'}`}>
                        {bet.won ? `+${bet.payout - bet.bet_amount}` : `-${bet.bet_amount}`}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="nox-surface rounded-2xl border border-border p-5">
                <Link to="/mypoints" className="flex items-center gap-2 text-sm text-primary hover:text-accent transition-colors">
                  <Coins className="w-4 h-4" /> Need more points? Earn them here →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function GamePlayArea({
  game, points, betAmount, setBetAmount, playing, animating, result, onPlay, onBack,
}: {
  game: GameDef;
  points: number;
  betAmount: number;
  setBetAmount: (n: number) => void;
  playing: boolean;
  animating: boolean;
  result: { won: boolean; payout: number; winStreak: number } | null;
  onPlay: () => void;
  onBack: () => void;
}) {
  const presets = [1, 5, 10, 25, 50];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Games
      </Button>

      <div className="nox-surface rounded-2xl border border-border overflow-hidden">
        {/* Game header */}
        <div className={`h-40 bg-gradient-to-br ${game.gradient} relative flex items-center justify-center`}>
          <AnimatePresence mode="wait">
            {animating ? (
              <motion.div
                key="spinning"
                initial={{ scale: 0.5, rotate: 0 }}
                animate={{ scale: [0.5, 1.2, 1], rotate: 360 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl nox-gradient flex items-center justify-center nox-glow"
              >
                <RotateCcw className="w-10 h-10 text-primary-foreground animate-spin" />
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`w-24 h-24 rounded-2xl flex items-center justify-center ${
                  result.won ? 'bg-green-500/20 border-2 border-green-400' : 'bg-destructive/20 border-2 border-destructive'
                }`}
              >
                {result.won ? (
                  <div className="text-center">
                    <Trophy className="w-8 h-8 text-green-400 mx-auto" />
                    <p className="text-green-400 font-bold text-lg">+{result.payout}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <TrendingDown className="w-8 h-8 text-destructive mx-auto" />
                    <p className="text-destructive font-bold text-lg">-{betAmount}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`w-16 h-16 rounded-2xl bg-background/50 backdrop-blur flex items-center justify-center ${game.color}`}
              >
                {game.icon}
              </motion.div>
            )}
          </AnimatePresence>

          {result && result.winStreak >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/70 backdrop-blur rounded-full px-3 py-1"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400">🔥 {result.winStreak} Streak!</span>
            </motion.div>
          )}
        </div>

        {/* Game controls */}
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{game.name}</h2>
            <p className="text-sm text-muted-foreground">{game.description}</p>
          </div>

          {/* Bet amount */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Bet Amount</label>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <input
                  type="number"
                  min={1}
                  max={points}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(1, Math.min(points, parseInt(e.target.value) || 1)))}
                  className="w-full pl-9 pr-4 py-3 bg-background border border-border rounded-xl text-foreground text-lg font-bold focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <Button
                variant="noxOutline"
                size="sm"
                onClick={() => setBetAmount(Math.max(1, Math.floor(points / 2)))}
              >
                ½
              </Button>
              <Button
                variant="noxOutline"
                size="sm"
                onClick={() => setBetAmount(points)}
              >
                MAX
              </Button>
            </div>
            <div className="flex gap-2">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setBetAmount(Math.min(p, points))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                    betAmount === p
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Warning for high bets */}
          {betAmount >= 10 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-yellow-400 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-2.5"
            >
              ⚠️ High bets have significantly lower win chances. Bet wisely!
            </motion.p>
          )}

          <Button
            variant="nox"
            className="w-full h-14 text-lg font-bold"
            disabled={playing || betAmount < 1 || betAmount > points || points === 0}
            onClick={onPlay}
          >
            {playing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : points === 0 ? (
              'No points to bet'
            ) : (
              <>
                <Dices className="w-5 h-5 mr-2" />
                Place Bet — {betAmount} {betAmount === 1 ? 'Point' : 'Points'}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default Casino;
