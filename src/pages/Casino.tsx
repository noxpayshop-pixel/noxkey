import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import { supabase } from '@/integrations/supabase/client';
import { deductBet, completeBet, getRecentActivity, getUserStats } from '@/lib/casino';
import { getSettings } from '@/lib/store';
import { Link } from 'react-router-dom';
import {
  Loader2, Coins, ArrowLeft, LogOut, TrendingUp, TrendingDown,
  Flame, Trophy, Dices, Target, Zap, Bird,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logo from '@/assets/logo.gif';

import CoinFlipGame from '@/components/casino/CoinFlipGame';
import MinesGame from '@/components/casino/MinesGame';
import CrashGame from '@/components/casino/CrashGame';
import TowersGame from '@/components/casino/TowersGame';
import BlackjackGame from '@/components/casino/BlackjackGame';
import LimboGame from '@/components/casino/LimboGame';
import ChickenRoadGame from '@/components/casino/ChickenRoadGame';
import WheelGame from '@/components/casino/WheelGame';

interface GameDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const ALL_GAMES: GameDef[] = [
  { id: 'coinflip', name: 'Coin Flip', description: 'Double or nothing. Pick a side.', icon: <Coins className="w-5 h-5" />, color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'crash', name: 'Crash', description: 'Cash out before it crashes!', icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/10' },
  { id: 'mines', name: 'Mines', description: 'Find diamonds, avoid the bombs.', icon: <Target className="w-5 h-5" />, color: 'text-red-400', gradient: 'from-red-500/20 to-rose-500/10' },
  { id: 'chicken', name: 'Chicken Road', description: 'Cross the road, avoid the cars!', icon: <span className="text-lg">🐔</span>, color: 'text-amber-400', gradient: 'from-amber-500/20 to-yellow-500/10' },
  { id: 'towers', name: 'Towers', description: 'Climb the tower for multipliers.', icon: <Zap className="w-5 h-5" />, color: 'text-blue-400', gradient: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'blackjack', name: 'Blackjack', description: 'Classic 21. Hit or Stand?', icon: <Dices className="w-5 h-5" />, color: 'text-purple-400', gradient: 'from-purple-500/20 to-violet-500/10' },
  { id: 'limbo', name: 'Limbo', description: 'Predict the multiplier.', icon: <Flame className="w-5 h-5" />, color: 'text-orange-400', gradient: 'from-orange-500/20 to-amber-500/10' },
  { id: 'wheel', name: 'Lucky Wheel', description: 'Spin to win up to 5x!', icon: <span className="text-lg">🎡</span>, color: 'text-pink-400', gradient: 'from-pink-500/20 to-fuchsia-500/10' },
];

const Casino = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
  const setPointsTracked = (n: number) => { pointsRef.current = n; setPoints(n); };
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [enabledGames, setEnabledGames] = useState<string[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Array<{ won: boolean; amount: number }>>([]);

  const fetchData = useCallback(async () => {
    if (!discordUsername) return;
    setLoading(true);
    const [pointsRes, activity, userStats] = await Promise.all([
      supabase.from('user_points').select('points').eq('discord_username', discordUsername).single(),
      getRecentActivity(discordUsername, 15),
      getUserStats(discordUsername),
    ]);
    setPointsTracked(pointsRes.data?.points ?? 0);
    setRecentActivity(activity);
    setStats(userStats);
    const settings = getSettings();
    setEnabledGames(settings.enabledCasinoGames || ALL_GAMES.map(g => g.id));
    setLoading(false);
  }, [discordUsername]);

  useEffect(() => { if (isLoggedIn) fetchData(); }, [isLoggedIn, fetchData]);

  useEffect(() => {
    if (!discordUsername) return;
    const channel = supabase
      .channel('casino-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casino_bets' }, () => {
        getRecentActivity(discordUsername, 15).then(setRecentActivity);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [discordUsername]);

  useEffect(() => { setSessionHistory([]); }, [selectedGame]);

  const handleDeduct = async () => {
    if (!discordUsername || betAmount < 1 || betAmount > pointsRef.current) throw new Error('Invalid');
    const res = await deductBet(discordUsername, betAmount, pointsRef.current);
    setPointsTracked(res.newPoints);
  };

  const handleComplete = async (won: boolean, payout: number) => {
    if (!selectedGame || !discordUsername) return;
    const currentPts = pointsRef.current;
    const res = await completeBet(discordUsername, selectedGame, betAmount, won, payout, currentPts);
    setPointsTracked(res.newPoints);
    const net = won ? payout - betAmount : -betAmount;
    setSessionHistory(prev => [{ won, amount: net }, ...prev]);
    if (won) toast.success(`🎉 You won ${payout} points!`, { duration: 4000 });
    else toast.error(`💀 You lost ${betAmount} points`, { duration: 3000 });
    getUserStats(discordUsername).then(setStats);
  };

  const GAMES = ALL_GAMES.filter(g => enabledGames.includes(g.id));

  const renderGame = () => {
    const props = { points, betAmount, setBetAmount, playing, sessionHistory, onDeduct: handleDeduct, onComplete: handleComplete };

    switch (selectedGame) {
      case 'coinflip': return <CoinFlipGame {...props} />;
      case 'mines': return <MinesGame {...props} />;
      case 'crash': return <CrashGame {...props} />;
      case 'chicken': return <ChickenRoadGame {...props} />;
      case 'towers': return <TowersGame {...props} />;
      case 'blackjack': return <BlackjackGame {...props} />;
      case 'limbo': return <LimboGame {...props} />;
      case 'wheel': return <WheelGame {...props} />;
      default: return null;
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[200px] animate-float" />
        <div className="absolute -bottom-48 -left-32 w-[600px] h-[500px] rounded-full bg-accent/5 blur-[180px]" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[250px]" />
        <div className="nox-grid-pattern absolute inset-0 opacity-30" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="The Nox" className="w-9 h-9 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-black nox-gradient-text tracking-tight">Casino</span>
          </Link>
          {isLoggedIn && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 nox-gradient rounded-full px-5 py-2 nox-glow-sm">
                <Coins className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground font-black tracking-wide">{points.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 glass rounded-full px-4 py-2 border border-border">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-foreground font-medium">@{discordUsername}</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-destructive/10" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {!isLoggedIn ? (
          <div className="mt-20 max-w-lg mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-center mb-10">
              <div className="w-20 h-20 rounded-3xl nox-gradient flex items-center justify-center mx-auto mb-6 nox-glow animate-pulse-glow">
                <Dices className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-black text-foreground mb-3">Nox Casino</h1>
              <p className="text-muted-foreground text-lg">Login with Discord to play and bet your points.</p>
            </motion.div>
            <DiscordLoginPanel />
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : selectedGame ? (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)} className="mb-4 hover:bg-card">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Games
            </Button>
            {stats && stats.currentStreak >= 2 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 nox-gradient rounded-2xl p-4 flex items-center gap-3 nox-glow-sm">
                <Flame className="w-6 h-6 text-primary-foreground animate-pulse" />
                <div>
                  <p className="text-primary-foreground font-bold text-lg">🔥 {stats.currentStreak} Win Streak!</p>
                  <p className="text-primary-foreground/70 text-xs">Keep going! Max streak: {stats.maxStreak}</p>
                </div>
              </motion.div>
            )}
            {renderGame()}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Total Won */}
            {stats && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="nox-surface nox-card-shine rounded-xl border border-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg nox-gradient flex items-center justify-center nox-glow-sm">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Total Won</p>
                  <p className="text-2xl font-black text-green-400">+{stats.totalWon.toLocaleString()} <span className="text-sm text-muted-foreground font-medium">points</span></p>
                </div>
              </motion.div>
            )}

            {/* Streak banner */}
            {stats && stats.currentStreak >= 2 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="nox-gradient rounded-2xl p-5 flex items-center gap-4 nox-glow">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                  <Flame className="w-7 h-7 text-primary-foreground animate-pulse" />
                </div>
                <div>
                  <p className="text-primary-foreground font-black text-xl">🔥 {stats.currentStreak} Win Streak!</p>
                  <p className="text-primary-foreground/60 text-sm">Max streak: {stats.maxStreak}</p>
                </div>
              </motion.div>
            )}

            <div className="grid lg:grid-cols-[1fr_340px] gap-8">
              <div>
                <h2 className="text-2xl font-black text-foreground mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg nox-gradient flex items-center justify-center">
                    <Dices className="w-4 h-4 text-primary-foreground" />
                  </div>
                  Featured Games
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {GAMES.map((game, i) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      className="nox-surface nox-card-shine rounded-2xl border border-border overflow-hidden cursor-pointer group relative"
                      onClick={() => setSelectedGame(game.id)}
                    >
                      {/* Shimmer overlay on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="absolute inset-0 animate-shimmer" />
                      </div>

                      <div className={`h-32 bg-gradient-to-br ${game.gradient} relative flex items-center justify-center overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                        <motion.div
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          className={`relative z-10 w-14 h-14 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 flex items-center justify-center ${game.color} shadow-lg`}
                        >
                          {game.icon}
                        </motion.div>
                        <span className="absolute top-3 right-3 z-10 text-[9px] font-black uppercase tracking-wider bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20 backdrop-blur-sm">
                          ● Live
                        </span>
                      </div>
                      <div className="p-5 relative z-10">
                        <h3 className="font-black text-foreground text-base">{game.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{game.description}</p>
                        <div className="flex items-center gap-1.5 mt-3">
                          <span className="text-xs text-primary font-bold group-hover:text-accent transition-colors">
                            PLAY NOW
                          </span>
                          <motion.span
                            className="text-primary group-hover:text-accent transition-colors"
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            →
                          </motion.span>
                        </div>
                      </div>

                      {/* Bottom glow on hover */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-4">
                <div className="nox-surface nox-card-shine rounded-2xl border border-border p-5">
                  <h3 className="font-black text-foreground mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
                  </h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {recentActivity.length === 0 && (
                      <div className="text-center py-10">
                        <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mx-auto mb-3">
                          <Dices className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-sm">No bets yet</p>
                        <p className="text-muted-foreground/50 text-xs mt-1">Play a game to see your history</p>
                      </div>
                    )}
                    {recentActivity.map((bet, i) => (
                      <motion.div key={bet.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          bet.won ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'
                        }`}>
                          {bet.won ? <TrendingDown className="w-4 h-4 text-green-400" /> : <TrendingUp className="w-4 h-4 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{bet.won ? 'Win' : 'Bet'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(bet.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-sm font-black ${bet.won ? 'text-green-400' : 'text-destructive'}`}>
                          {bet.won ? `+${bet.payout - bet.bet_amount}` : `-${bet.bet_amount}`}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} className="nox-surface nox-card-shine rounded-2xl border border-border p-5 nox-hover-glow">
                  <Link to="/mypoints" className="flex items-center gap-2 text-sm text-primary hover:text-accent transition-colors font-bold">
                    <Coins className="w-4 h-4" /> Need more points? Earn them here →
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Casino;
