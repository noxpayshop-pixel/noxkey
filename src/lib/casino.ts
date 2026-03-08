import { supabase } from '@/integrations/supabase/client';

// House edge engine — the house ALWAYS wins long term
// Higher bets = dramatically worse odds
// Winning streaks get punished
// Recent profit gets punished

interface HouseEdgeParams {
  betAmount: number;
  discordUsername: string;
}

interface HouseEdgeResult {
  baseWinChance: number; // 0-1
  adjustedWinChance: number;
  recentProfit: number;
  winStreak: number;
  totalWon: number;
  totalLost: number;
}

export async function calculateHouseEdge({ betAmount, discordUsername }: HouseEdgeParams): Promise<HouseEdgeResult> {
  // Fetch recent bets (last 50)
  const { data: recentBets } = await supabase
    .from('casino_bets')
    .select('*')
    .eq('discord_username', discordUsername)
    .order('created_at', { ascending: false })
    .limit(50);

  const bets = recentBets ?? [];

  // Calculate stats
  let recentProfit = 0;
  let winStreak = 0;
  let totalWon = 0;
  let totalLost = 0;
  let countingStreak = true;

  for (const bet of bets) {
    const net = bet.won ? (bet.payout - bet.bet_amount) : -bet.bet_amount;
    recentProfit += net;
    if (bet.won) totalWon += bet.payout - bet.bet_amount;
    else totalLost += bet.bet_amount;

    if (countingStreak && bet.won) winStreak++;
    else countingStreak = false;
  }

  // Base win chance: 45% for 1 coin, drops dramatically with higher bets
  let baseWinChance = 0.45;

  // Bet amount penalty: exponential decay
  if (betAmount <= 1) baseWinChance = 0.55;
  else if (betAmount <= 3) baseWinChance = 0.42;
  else if (betAmount <= 5) baseWinChance = 0.35;
  else if (betAmount <= 10) baseWinChance = 0.22;
  else if (betAmount <= 25) baseWinChance = 0.15;
  else if (betAmount <= 50) baseWinChance = 0.10;
  else baseWinChance = 0.06;

  let adjustedWinChance = baseWinChance;

  // Win streak penalty: each consecutive win reduces chance by 12%
  if (winStreak >= 2) adjustedWinChance *= Math.pow(0.88, winStreak - 1);

  // Recent profit penalty: if user is up, reduce chances
  if (recentProfit > 5) adjustedWinChance *= 0.75;
  if (recentProfit > 15) adjustedWinChance *= 0.60;
  if (recentProfit > 30) adjustedWinChance *= 0.40;

  // Total lifetime profit penalty
  const lifetimeProfit = totalWon - totalLost;
  if (lifetimeProfit > 20) adjustedWinChance *= 0.70;
  if (lifetimeProfit > 50) adjustedWinChance *= 0.50;

  // Per-user chance modifier from admin
  const { data: userRow } = await supabase
    .from('user_points')
    .select('casino_chance_modifier')
    .eq('discord_username', discordUsername)
    .single();
  const modifier = Number(userRow?.casino_chance_modifier ?? 0);
  adjustedWinChance += modifier / 100; // e.g. +10 means +10% chance

  // Floor: minimum 2% chance (so it's not impossible)
  adjustedWinChance = Math.max(0.02, Math.min(0.65, adjustedWinChance));

  return { baseWinChance, adjustedWinChance, recentProfit, winStreak, totalWon, totalLost };
}

export async function placeBet(
  discordUsername: string,
  game: string,
  betAmount: number,
  currentPoints: number,
): Promise<{ won: boolean; payout: number; newPoints: number; winStreak: number }> {
  if (betAmount > currentPoints || betAmount < 1) {
    throw new Error('Invalid bet amount');
  }

  const edge = await calculateHouseEdge({ betAmount, discordUsername });
  const roll = Math.random();
  const won = roll < edge.adjustedWinChance;

  // Payout multiplier varies by game
  let multiplier = 2; // default: double
  if (game === 'coinflip') multiplier = 2;
  else if (game === 'crash') multiplier = 1.5 + Math.random() * 2; // 1.5x - 3.5x
  else if (game === 'mines') multiplier = 1.8;
  else if (game === 'towers') multiplier = 2.5;
  else if (game === 'limbo') multiplier = 1 + Math.random() * 4; // 1x-5x
  else if (game === 'splat') multiplier = 2 + Math.random() * 3; // 2x-5x

  const payout = won ? Math.floor(betAmount * multiplier) : 0;
  const newPoints = currentPoints - betAmount + payout;
  const newStreak = won ? edge.winStreak + 1 : 0;

  // Record bet
  await supabase.from('casino_bets').insert({
    discord_username: discordUsername,
    game,
    bet_amount: betAmount,
    won,
    payout,
  });

  // Update points
  await supabase
    .from('user_points')
    .update({ points: newPoints, updated_at: new Date().toISOString() })
    .eq('discord_username', discordUsername);

  // Record transaction
  await supabase.from('point_transactions').insert({
    discord_username: discordUsername,
    amount: won ? payout - betAmount : -betAmount,
    type: 'casino',
    description: `${won ? 'Won' : 'Lost'} ${game} (bet ${betAmount})`,
  });

  return { won, payout, newPoints, winStreak: newStreak };
}

export async function getRecentActivity(limit = 20): Promise<any[]> {
  const { data } = await supabase
    .from('casino_bets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUserStats(discordUsername: string) {
  const { data: bets } = await supabase
    .from('casino_bets')
    .select('*')
    .eq('discord_username', discordUsername)
    .order('created_at', { ascending: false });

  const all = bets ?? [];
  let totalWon = 0;
  let totalLost = 0;
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let countingStreak = true;

  for (const b of all) {
    if (b.won) {
      wins++;
      totalWon += b.payout - b.bet_amount;
      if (countingStreak) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    } else {
      losses++;
      totalLost += b.bet_amount;
      countingStreak = false;
    }
  }

  return { totalWon, totalLost, wins, losses, currentStreak, maxStreak, totalBets: all.length };
}
