import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Trophy, Gift, Users, Clock, Crown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BotEmbedEditor from './BotEmbedEditor';

interface Channel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Giveaway {
  id: string;
  channel_id: string;
  message_id: string | null;
  title: string;
  prize: string;
  winner_count: number;
  ends_at: string;
  ended: boolean;
  rigged_user_id: string | null;
  rigged_username: string | null;
  entries: string[];
  winner_ids: string[];
  created_at: string;
}

export default function GiveawayEditor() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // New giveaway form
  const [channelId, setChannelId] = useState('');
  const [prize, setPrize] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [winnerCount, setWinnerCount] = useState(1);
  const [riggedUserId, setRiggedUserId] = useState('');
  const [riggedUsername, setRiggedUsername] = useState('');

  const fetchChannels = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke('discord-send-embed', { body: { action: 'list_channels' } });
      if (res.data?.channels) setChannels(res.data.channels);
      if (res.data?.categories) setCategories(res.data.categories);
    } catch {}
  }, []);

  const fetchGiveaways = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke('discord-giveaway', { body: { action: 'list' } });
      if (res.data?.giveaways) setGiveaways(res.data.giveaways);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchChannels(), fetchGiveaways()]).then(() => setLoading(false));
  }, [fetchChannels, fetchGiveaways]);

  const createGiveaway = async () => {
    if (!channelId || !prize.trim()) {
      toast.error('Select a channel and enter a prize');
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke('discord-giveaway', {
        body: {
          action: 'create',
          channel_id: channelId,
          prize: prize.trim(),
          duration_minutes: durationMinutes,
          winner_count: winnerCount,
          rigged_user_id: riggedUserId.trim() || undefined,
          rigged_username: riggedUsername.trim() || undefined,
        },
      });
      if (res.data?.success) {
        toast.success('Giveaway created!');
        setPrize('');
        setRiggedUserId('');
        setRiggedUsername('');
        fetchGiveaways();
      } else {
        toast.error(res.data?.error || 'Failed to create');
      }
    } catch (e) {
      toast.error('Error creating giveaway');
    }
    setCreating(false);
  };

  const endGiveaway = async (id: string) => {
    try {
      const res = await supabase.functions.invoke('discord-giveaway', {
        body: { action: 'end', giveaway_id: id },
      });
      if (res.data?.success) {
        toast.success(`Winners: ${res.data.winners?.length || 0}`);
        fetchGiveaways();
      } else {
        toast.error(res.data?.error || 'Failed to end');
      }
    } catch {
      toast.error('Error ending giveaway');
    }
  };

  const deleteGiveaway = async (id: string) => {
    try {
      await supabase.functions.invoke('discord-giveaway', {
        body: { action: 'delete', giveaway_id: id },
      });
      toast.success('Deleted');
      fetchGiveaways();
    } catch {
      toast.error('Error deleting');
    }
  };

  const getChannelName = (id: string) => {
    const ch = channels.find(c => c.id === id);
    return ch ? `#${ch.name}` : id;
  };

  const groupedChannels = categories.map(cat => ({
    ...cat,
    channels: channels.filter(c => c.parent_id === cat.id),
  }));
  const uncategorized = channels.filter(c => !c.parent_id);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeGiveaways = giveaways.filter(g => !g.ended);
  const endedGiveaways = giveaways.filter(g => g.ended);

  return (
    <div className="space-y-8">
      {/* Create New Giveaway */}
      <div className="nox-surface rounded-xl border border-border/50 p-6">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
          <Gift className="w-4 h-4 text-primary" /> Create Giveaway
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
            <select
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              className="w-full h-10 rounded-lg bg-background/50 border border-border/60 text-foreground text-sm px-3"
            >
              <option value="">Select channel...</option>
              {uncategorized.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
              {groupedChannels.map(cat => (
                <optgroup key={cat.id} label={cat.name}>
                  {cat.channels.map(c => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Prize</label>
            <Input
              value={prize}
              onChange={e => setPrize(e.target.value)}
              placeholder="e.g. Netflix Premium 1 Month"
              className="bg-background/50 border-border/60"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration (minutes)</label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              min={1}
              className="bg-background/50 border-border/60"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Winner Count</label>
            <Input
              type="number"
              value={winnerCount}
              onChange={e => setWinnerCount(Number(e.target.value))}
              min={1}
              max={10}
              className="bg-background/50 border-border/60"
            />
          </div>
        </div>

        {/* Rig Section */}
        <div className="mt-5 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-3">
            <Crown className="w-3.5 h-3.5" /> Rig Winner (Optional)
          </h4>
          <p className="text-[11px] text-muted-foreground mb-3">
            If set, this user will always win. Leave empty for a fair giveaway.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Discord User ID</label>
              <Input
                value={riggedUserId}
                onChange={e => setRiggedUserId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className="bg-background/50 border-border/60 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Username (for reference)</label>
              <Input
                value={riggedUsername}
                onChange={e => setRiggedUsername(e.target.value)}
                placeholder="e.g. CoolUser"
                className="bg-background/50 border-border/60 text-xs"
              />
            </div>
          </div>
        </div>

        <Button variant="nox" className="mt-5" onClick={createGiveaway} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Giveaway
        </Button>
      </div>

      {/* Active Giveaways */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Active Giveaways ({activeGiveaways.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={fetchGiveaways}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <AnimatePresence>
          {activeGiveaways.map(g => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="nox-surface rounded-xl border border-border/50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{g.prize}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{getChannelName(g.channel_id)}</span>
                    <span>👥 {g.entries?.length || 0} entries</span>
                    <span>🏆 {g.winner_count} winner{g.winner_count > 1 ? 's' : ''}</span>
                    <span>⏰ {new Date(g.ends_at).toLocaleString()}</span>
                    {g.rigged_user_id && (
                      <span className="text-destructive font-medium">🎯 Rigged: {g.rigged_username || g.rigged_user_id}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="nox" size="sm" onClick={() => endGiveaway(g.id)}>
                    <Trophy className="w-3.5 h-3.5 mr-1" /> End & Pick Winner
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteGiveaway(g.id)}>
                    <Trash2 className="w-4 h-4 text-destructive/70" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeGiveaways.length === 0 && (
          <p className="text-muted-foreground text-center py-8 text-sm">No active giveaways.</p>
        )}
      </div>

      {/* Ended Giveaways */}
      {endedGiveaways.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" /> Ended Giveaways
          </h3>
          {endedGiveaways.slice(0, 10).map(g => (
            <div key={g.id} className="nox-surface rounded-xl border border-border/30 p-4 opacity-70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{g.prize}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{getChannelName(g.channel_id)}</span>
                    <span>👥 {g.entries?.length || 0} entries</span>
                    <span>🏆 {g.winner_ids?.length || 0} winner{(g.winner_ids?.length || 0) > 1 ? 's' : ''}</span>
                    {g.rigged_user_id && (
                      <span className="text-destructive/60 font-medium">🎯 Was rigged</span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteGiveaway(g.id)}>
                  <Trash2 className="w-4 h-4 text-destructive/50" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embed Customization */}
      <div className="border-t border-border/40 pt-8 space-y-8">
        <h3 className="text-sm font-semibold text-foreground mb-4">Embed Customization</h3>
        <BotEmbedEditor botType="giveaway" />
        <div className="border-t border-border/40 pt-8">
          <BotEmbedEditor botType="giveaway_winner" />
        </div>
      </div>
    </div>
  );
}
