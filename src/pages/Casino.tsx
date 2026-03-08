import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import DiscordLoginPanel from '@/components/DiscordLoginPanel';
import { supabase } from '@/integrations/supabase/client';
import { placeBet, getRecentActivity, getUserStats } from '@/lib/casino';
import { getSettings } from '@/lib/store';
import { Link } from 'react-router-dom';
import {
  Loader2, Coins, ArrowLeft, LogOut, TrendingUp, TrendingDown,
  Flame, Trophy, Dices, Target, Zap, Droplets,
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
import SplatGame from '@/components/casino/SplatGame';

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
  { id: 'towers', name: 'Towers', description: 'Climb the tower for multipliers.', icon: <Zap className="w-5 h-5" />, color: 'text-blue-400', gradient: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'blackjack', name: 'Blackjack', description: 'Classic 21. Hit or Stand?', icon: <Dices className="w-5 h-5" />, color: 'text-purple-400', gradient: 'from-purple-500/20 to-violet-500/10' },
  { id: 'limbo', name: 'Limbo', description: 'Predict the multiplier.', icon: <Flame className="w-5 h-5" />, color: 'text-orange-400', gradient: 'from-orange-500/20 to-amber-500/10' },
  { id: 'splat', name: 'Splat', description: 'Pick a color, watch the splat!', icon: <Droplets className="w-5 h-5" />, color: 'text-pink-400', gradient: 'from-pink-500/20 to-fuchsia-500/10' },
];

const Casino = () => {
  const { isLoggedIn, discordUsername, logout, loading: authLoading } = useDiscordAuth();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [enabledGames, setEnabledGames] = useState<string[]>([]);

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
    const settings = getSettings();
    setEnabledGames(settings.enabledCasinoGames || ALL_GAMES.map(g => g.id));
    setLoading(false);
  }, [discordUsername]);

  useEffect(() => { if (isLoggedIn) fetchData(); }, [isLoggedIn, fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('casino-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'casino_bets' }, () => {
        getRecentActivity(15).then(setRecentActivity);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePlay = async (): Promise<{ won: boolean; payout: number; winStreak: number }> => {
    if (!selectedGame || !discordUsername || betAmount < 1 || betAmount > points) {
      throw new Error('Invalid');
    }
    setPlaying(true);
    try {
      const res = await placeBet(discordUsername, selectedGame, betAmount, points);
      setPoints(res.newPoints);
      if (res.won) toast.success(`🎉 You won ${res.payout} points!`, { duration: 4000 });
      else toast.error(`💀 You lost ${betAmount} points`, { duration: 3000 });
      getUserStats(discordUsername).then(setStats);
      getRecentActivity(15).then(setRecentActivity);
      return res;
    } finally {
      setPlaying(false);
    }
  };

  const GAMES = ALL_GAMES.filter(g => enabledGames.includes(g.id));

  const renderGame = () => {
    const commonProps = { points, betAmount, setBetAmount, onPlay: handlePlay, playing };
    switch (selectedGame) {
      case 'coinflip': return <CoinFlipGame {...commonProps} />;
      case 'mines': return <MinesGame {...commonProps} />;
      case 'crash': return <CrashGame {...commonProps} />;
      case 'towers': return <TowersGame {...commonProps} />;
      case 'blackjack': return <BlackjackGame {...commonProps} />;
      case 'limbo': return <LimboGame {...commonProps} />;
      case 'splat': return <SplatGame {...commonProps} />;
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
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[400px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] rounded-full bg-accent/3 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <div className="relative z-10 max-w-7xl mx-auto p-6">
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
        ) : selectedGame ? (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Games
            </Button>
            {/* Win streak banner */}
            {stats && stats.currentStreak >= 2 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 nox-gradient rounded-2xl p-4 flex items-center gap-3">
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
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div>
              {stats && stats.currentStreak >= 2 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-6 nox-gradient rounded-2xl p-4 flex items-center gap-3">
                  <Flame className="w-6 h-6 text-primary-foreground animate-pulse" />
                  <div>
                    <p className="text-primary-foreground font-bold text-lg">🔥 {stats.currentStreak} Win Streak!</p>
                    <p className="text-primary-foreground/70 text-xs">Max streak: {stats.maxStreak}</p>
                  </div>
                </motion.div>
              )}

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
                    className="nox-surface rounded-2xl border border-border overflow-hidden cursor-pointer nox-hover-glow group"
                    onClick={() => setSelectedGame(game.id)}
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

            {/* Recent Activity */}
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
                    <motion.div key={bet.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        bet.won ? 'bg-green-500/10' : 'bg-destructive/10'
                      }`}>
                        {bet.won ? <Trophy className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{bet.game}</p>
                        <p className="text-xs text-muted-foreground">@{bet.discord_username}</p>
                      </div>
                      <span className={`text-sm font-bold ${bet.won ? 'text-green-400' : 'text-destructive'}`}>
                        {bet.won ? `+${bet.payout - bet.bet_amount}` : `-${bet.bet_amount}`}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
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

export default Casino;
