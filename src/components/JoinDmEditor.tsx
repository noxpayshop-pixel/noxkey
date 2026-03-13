import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw, Users, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import BotEmbedEditor from './BotEmbedEditor';

interface JoinDmConfig {
  id: string;
  is_enabled: boolean;
  required_role_id: string;
  required_role_name: string;
  check_after_hours: number;
}

interface MemberJoin {
  id: string;
  discord_user_id: string;
  discord_username: string | null;
  joined_at: string;
  welcome_sent: boolean;
  reminder_checked: boolean;
  reminder_sent: boolean;
  has_role: boolean;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export default function JoinDmEditor() {
  const [config, setConfig] = useState<JoinDmConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [joins, setJoins] = useState<MemberJoin[]>([]);
  const [loadingJoins, setLoadingJoins] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('join_dm_config' as any)
      .select('*')
      .limit(1)
      .single();
    if (data) setConfig(data as any);
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await supabase.functions.invoke('discord-join-welcome', {
        body: { action: 'list_roles' },
      });
      // Fallback: fetch roles via the send-embed function which has channel listing
      if (!res.data?.roles) {
        // Try fetching via guild roles API through our edge function
        const res2 = await supabase.functions.invoke('discord-send-embed', {
          body: { action: 'list_channels' },
        });
        // We'll use a dedicated approach
      }
    } catch {}
    setLoadingRoles(false);
  }, []);

  const fetchJoins = useCallback(async () => {
    setLoadingJoins(true);
    const { data } = await supabase
      .from('member_joins' as any)
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(50);
    if (data) setJoins(data as any);
    setLoadingJoins(false);
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchJoins();
  }, [fetchConfig, fetchJoins]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from('join_dm_config' as any)
      .update({
        is_enabled: config.is_enabled,
        required_role_id: config.required_role_id,
        required_role_name: config.required_role_name,
        check_after_hours: config.check_after_hours,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', config.id);
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Join DM config saved!');
  };

  const runReminderCheck = async () => {
    setRunningCheck(true);
    try {
      const res = await supabase.functions.invoke('discord-join-welcome', {
        body: { action: 'check_reminders' },
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`Checked ${res.data?.checked || 0} members`);
        fetchJoins();
      }
    } catch (err) {
      toast.error('Failed to run check');
    }
    setRunningCheck(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!config) return <p className="text-muted-foreground text-center py-12">No join DM config found.</p>;

  return (
    <div className="space-y-8">
      {/* Header & Config */}
      <div className="nox-surface rounded-2xl border border-border/50 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Join DM System</h3>
              <p className="text-xs text-muted-foreground">Sends a welcome DM on join & a reminder if role is missing after X hours</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Enabled</span>
              <Switch checked={config.is_enabled} onCheckedChange={v => setConfig({ ...config, is_enabled: v })} />
            </div>
            <Button variant="nox" size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Required Role ID</label>
            <Input
              value={config.required_role_id}
              onChange={e => setConfig({ ...config, required_role_id: e.target.value })}
              placeholder="e.g. 1234567890123456789"
              className="bg-background/50 border-border/60 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Role Name (display only)</label>
            <Input
              value={config.required_role_name}
              onChange={e => setConfig({ ...config, required_role_name: e.target.value })}
              placeholder="e.g. Customer"
              className="bg-background/50 border-border/60 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Check After (hours)
            </label>
            <Input
              type="number"
              value={config.check_after_hours}
              onChange={e => setConfig({ ...config, check_after_hours: parseInt(e.target.value) || 24 })}
              min={1}
              max={168}
              className="bg-background/50 border-border/60 text-xs"
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Variables: <code className="bg-muted/50 px-1 py-0.5 rounded text-[10px]">{'{user}'}</code> — replaced with the member's username.
          Your Discord bot must call this endpoint on <code className="bg-muted/50 px-1 py-0.5 rounded text-[10px]">GUILD_MEMBER_ADD</code> events,
          and a cron job should call <code className="bg-muted/50 px-1 py-0.5 rounded text-[10px]">check_reminders</code> periodically.
        </p>
      </div>

      {/* Welcome Embed */}
      <div className="nox-surface rounded-2xl border border-border/50 p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Welcome DM Embed
        </h4>
        <BotEmbedEditor botType="join_welcome" />
      </div>

      {/* Reminder Embed */}
      <div className="nox-surface rounded-2xl border border-border/50 p-6">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Reminder DM Embed (no role after {config.check_after_hours}h)
        </h4>
        <BotEmbedEditor botType="join_reminder" />
      </div>

      {/* Manual Check & Recent Joins */}
      <div className="nox-surface rounded-2xl border border-border/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" /> Recent Joins & Reminder Status
          </h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchJoins} disabled={loadingJoins}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingJoins ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="nox" size="sm" onClick={runReminderCheck} disabled={runningCheck}>
              {runningCheck ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
              Run Check Now
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground">
                <th className="text-left px-3 py-2 font-medium">User</th>
                <th className="text-left px-3 py-2 font-medium">Joined</th>
                <th className="text-center px-3 py-2 font-medium">Welcome</th>
                <th className="text-center px-3 py-2 font-medium">Checked</th>
                <th className="text-center px-3 py-2 font-medium">Has Role</th>
                <th className="text-center px-3 py-2 font-medium">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {joins.map(j => (
                <tr key={j.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 text-foreground font-medium">
                    {j.discord_username || j.discord_user_id}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(j.joined_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${j.welcome_sent ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${j.reminder_checked ? 'bg-blue-500' : 'bg-muted-foreground/30'}`} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${j.has_role ? 'bg-green-500' : j.reminder_checked ? 'bg-red-500' : 'bg-muted-foreground/30'}`} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${j.reminder_sent ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                  </td>
                </tr>
              ))}
              {joins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No joins recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
