import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2, Plus, Loader2, RefreshCw, Shield, Ban, Globe, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

// Country flag emoji from country code
const countryFlag = (code: string | null) => {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
};

interface IpLog {
  id: string;
  discord_username: string;
  ip_address: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  action: string;
  created_at: string;
}

interface PageVisit {
  id: string;
  page: string;
  ip_address: string | null;
  country: string | null;
  country_code: string | null;
  created_at: string;
}

interface BlacklistEntry {
  id: string;
  ip_address?: string;
  discord_username?: string;
  reason: string | null;
  created_at: string;
}

export default function TrafficView() {
  const [ipLogs, setIpLogs] = useState<IpLog[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [ipBlacklist, setIpBlacklist] = useState<BlacklistEntry[]>([]);
  const [discordBlacklist, setDiscordBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'overview' | 'ip-logs' | 'ip-blacklist' | 'discord-blacklist'>('overview');
  const [newIp, setNewIp] = useState('');
  const [newIpReason, setNewIpReason] = useState('');
  const [newDiscord, setNewDiscord] = useState('');
  const [newDiscordReason, setNewDiscordReason] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [logs, visits, ipBl, dBl] = await Promise.all([
      supabase.from('ip_logs').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('page_visits').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('ip_blacklist').select('*').order('created_at', { ascending: false }),
      supabase.from('discord_blacklist').select('*').order('created_at', { ascending: false }),
    ]);
    setIpLogs((logs.data || []) as IpLog[]);
    setPageVisits((visits.data || []) as PageVisit[]);
    setIpBlacklist((ipBl.data || []) as BlacklistEntry[]);
    setDiscordBlacklist((dBl.data || []) as BlacklistEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Chart data: visits per day (last 30 days)
  const visitsByDay = (() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    pageVisits.forEach(v => {
      const day = v.created_at.slice(0, 10);
      if (map[day] !== undefined) map[day]++;
    });
    return Object.entries(map).map(([date, count]) => ({ date: date.slice(5), count }));
  })();

  // Logins per day
  const loginsByDay = (() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    ipLogs.forEach(l => {
      const day = l.created_at.slice(0, 10);
      if (map[day] !== undefined) map[day]++;
    });
    return Object.entries(map).map(([date, count]) => ({ date: date.slice(5), count }));
  })();

  // Top countries
  const topCountries = (() => {
    const map: Record<string, { count: number; code: string }> = {};
    [...pageVisits, ...ipLogs].forEach(v => {
      const c = ('country' in v && v.country) || 'Unknown';
      const cc = ('country_code' in v && v.country_code) || '';
      if (!map[c]) map[c] = { count: 0, code: cc || '' };
      map[c].count++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, { count, code }]) => ({ name, count, code }));
  })();

  // Unique IPs
  const uniqueIps = new Set([
    ...pageVisits.map(v => v.ip_address).filter(Boolean),
    ...ipLogs.map(l => l.ip_address),
  ]).size;

  const addIpBlacklist = async () => {
    if (!newIp.trim()) return;
    const { error } = await supabase.from('ip_blacklist').insert({ ip_address: newIp.trim(), reason: newIpReason.trim() || null });
    if (error) { toast.error(error.message); return; }
    toast.success('IP blacklisted');
    setNewIp(''); setNewIpReason('');
    refresh();
  };

  const removeIpBlacklist = async (id: string) => {
    await supabase.from('ip_blacklist').delete().eq('id', id);
    toast.success('Removed');
    refresh();
  };

  const addDiscordBlacklist = async () => {
    if (!newDiscord.trim()) return;
    const { error } = await supabase.from('discord_blacklist').insert({ discord_username: newDiscord.trim().toLowerCase(), reason: newDiscordReason.trim() || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Discord user blacklisted');
    setNewDiscord(''); setNewDiscordReason('');
    refresh();
  };

  const removeDiscordBlacklist = async (id: string) => {
    await supabase.from('discord_blacklist').delete().eq('id', id);
    toast.success('Removed');
    refresh();
  };

  const deleteIpLog = async (id: string) => {
    await supabase.from('ip_logs').delete().eq('id', id);
    setIpLogs(prev => prev.filter(l => l.id !== id));
    toast.success('Log deleted');
  };

  const deleteAllIpLogs = async () => {
    if (!confirm('Delete ALL IP logs?')) return;
    await supabase.from('ip_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setIpLogs([]);
    toast.success('All logs deleted');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Traffic & Security</h2>
        <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap">
        {([
          ['overview', '📊 Overview'],
          ['ip-logs', '📋 IP Logs'],
          ['ip-blacklist', '🛡️ IP Blacklist'],
          ['discord-blacklist', '🚫 Discord Blacklist'],
        ] as const).map(([key, label]) => (
          <Button key={key} variant="ghost" size="sm"
            className={subTab === key ? 'text-primary bg-primary/10' : 'text-muted-foreground'}
            onClick={() => setSubTab(key)}>
            {label}
          </Button>
        ))}
      </div>

      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="nox-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{pageVisits.length}</p>
              <p className="text-xs text-muted-foreground">Page Views (30d)</p>
            </div>
            <div className="nox-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{uniqueIps}</p>
              <p className="text-xs text-muted-foreground">Unique IPs</p>
            </div>
            <div className="nox-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{ipLogs.filter(l => l.action === 'login').length}</p>
              <p className="text-xs text-muted-foreground">Logins</p>
            </div>
            <div className="nox-surface rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{ipLogs.filter(l => l.action === 'register').length}</p>
              <p className="text-xs text-muted-foreground">Registrations</p>
            </div>
          </div>

          {/* Page views chart */}
          <div className="nox-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Page Views (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={visitsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Logins chart */}
          <div className="nox-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Logins / Registrations (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={loginsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top countries */}
          <div className="nox-surface rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Top Countries</h3>
            <div className="space-y-2">
              {topCountries.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
              {topCountries.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-lg">{countryFlag(c.code)}</span>
                  <span className="text-sm text-foreground flex-1">{c.name}</span>
                  <span className="text-sm font-mono text-muted-foreground">{c.count}</span>
                  {i === 0 && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Top</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'ip-logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{ipLogs.length} logs</p>
            <Button variant="destructive" size="sm" onClick={deleteAllIpLogs}><Trash2 className="w-3 h-3 mr-1" /> Clear All</Button>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {ipLogs.map(log => (
              <div key={log.id} className="nox-surface rounded-lg border border-border p-3 flex items-center gap-3">
                <span className="text-lg">{countryFlag(log.country_code)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{log.discord_username}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${log.action === 'register' ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                      {log.action}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{log.ip_address} · {log.city || ''} {log.country || ''}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setNewIp(log.ip_address); setSubTab('ip-blacklist'); }}>
                    <Ban className="w-3 h-3 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteIpLog(log.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {ipLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No IP logs yet.</p>}
          </div>
        </div>
      )}

      {subTab === 'ip-blacklist' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="IP address..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground flex-1" />
            <Input value={newIpReason} onChange={e => setNewIpReason(e.target.value)} placeholder="Reason (optional)..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground flex-1" />
            <Button variant="nox" onClick={addIpBlacklist}><Plus className="w-4 h-4 mr-1" /> Ban</Button>
          </div>
          <div className="space-y-2">
            {ipBlacklist.map(entry => (
              <div key={entry.id} className="nox-surface rounded-lg border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-foreground">{entry.ip_address}</p>
                  {entry.reason && <p className="text-xs text-muted-foreground">{entry.reason}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeIpBlacklist(entry.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {ipBlacklist.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No blocked IPs.</p>}
          </div>
        </div>
      )}

      {subTab === 'discord-blacklist' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={newDiscord} onChange={e => setNewDiscord(e.target.value)} placeholder="Discord username..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground flex-1" />
            <Input value={newDiscordReason} onChange={e => setNewDiscordReason(e.target.value)} placeholder="Reason (optional)..."
              className="bg-card border-border text-foreground placeholder:text-muted-foreground flex-1" />
            <Button variant="nox" onClick={addDiscordBlacklist}><Plus className="w-4 h-4 mr-1" /> Ban</Button>
          </div>
          <div className="space-y-2">
            {discordBlacklist.map(entry => (
              <div key={entry.id} className="nox-surface rounded-lg border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{entry.discord_username}</p>
                  {entry.reason && <p className="text-xs text-muted-foreground">{entry.reason}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeDiscordBlacklist(entry.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {discordBlacklist.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No banned Discord accounts.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
