import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2, Plus, Loader2, RefreshCw, Ban, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

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

  const totalVisits = pageVisits.length;
  const totalLogins = ipLogs.filter(l => l.action === 'login').length;
  const totalRegistrations = ipLogs.filter(l => l.action === 'register').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Traffic & Security</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Monitor activity and manage access</p>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit">
        {([
          ['overview', 'Overview'],
          ['ip-logs', 'IP Logs'],
          ['ip-blacklist', 'IP Blacklist'],
          ['discord-blacklist', 'Discord Ban'],
        ] as const).map(([key, label]) => (
          <button key={key}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              subTab === key
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setSubTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Page Views', value: totalVisits, icon: Globe },
              { label: 'Unique IPs', value: uniqueIps, icon: Globe },
              { label: 'Logins', value: totalLogins, icon: Globe },
              { label: 'Registrations', value: totalRegistrations, icon: Globe },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border/50 bg-card/50 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Page Views — Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={visitsByDay}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#viewsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/30 p-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Sessions — Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={loginsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))', fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top countries */}
          <div className="rounded-xl border border-border/50 bg-card/30 p-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Top Countries</h3>
            {topCountries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {topCountries.map((c, i) => {
                  const maxCount = topCountries[0]?.count || 1;
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-lg w-8 text-center">{countryFlag(c.code)}</span>
                      <span className="text-sm text-foreground w-28 truncate">{c.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-10 text-right tabular-nums">{c.count}</span>
                      {i === 0 && <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">TOP</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'ip-logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{ipLogs.length} logs</p>
            <Button variant="destructive" size="sm" onClick={deleteAllIpLogs} className="h-8 text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> Clear All
            </Button>
          </div>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {ipLogs.map(log => (
              <div key={log.id} className="rounded-lg border border-border/40 bg-card/30 p-3 flex items-center gap-3 group hover:bg-card/60 transition-colors">
                <span className="text-lg">{countryFlag(log.country_code)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">@{log.discord_username}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      log.action === 'register' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{log.ip_address} · {log.city || ''} {log.country || ''}</p>
                  <p className="text-[10px] text-muted-foreground/60">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => { setNewIp(log.ip_address); setSubTab('ip-blacklist'); }}>
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => deleteIpLog(log.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {ipLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No IP logs yet.</p>}
          </div>
        </div>
      )}

      {subTab === 'ip-blacklist' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="IP address..."
              className="bg-card/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 flex-1" />
            <Input value={newIpReason} onChange={e => setNewIpReason(e.target.value)} placeholder="Reason (optional)..."
              className="bg-card/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 flex-1" />
            <Button variant="nox" size="sm" onClick={addIpBlacklist}><Plus className="w-3.5 h-3.5 mr-1" /> Ban</Button>
          </div>
          <div className="space-y-1.5">
            {ipBlacklist.map(entry => (
              <div key={entry.id} className="rounded-lg border border-border/40 bg-card/30 p-3 flex items-center justify-between group hover:bg-card/60 transition-colors">
                <div>
                  <p className="text-sm font-mono text-foreground">{entry.ip_address}</p>
                  {entry.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.reason}</p>}
                  <p className="text-[10px] text-muted-foreground/60">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <button className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => removeIpBlacklist(entry.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {ipBlacklist.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No blocked IPs.</p>}
          </div>
        </div>
      )}

      {subTab === 'discord-blacklist' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={newDiscord} onChange={e => setNewDiscord(e.target.value)} placeholder="Discord username..."
              className="bg-card/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 flex-1" />
            <Input value={newDiscordReason} onChange={e => setNewDiscordReason(e.target.value)} placeholder="Reason (optional)..."
              className="bg-card/50 border-border/60 text-foreground placeholder:text-muted-foreground/50 flex-1" />
            <Button variant="nox" size="sm" onClick={addDiscordBlacklist}><Plus className="w-3.5 h-3.5 mr-1" /> Ban</Button>
          </div>
          <div className="space-y-1.5">
            {discordBlacklist.map(entry => (
              <div key={entry.id} className="rounded-lg border border-border/40 bg-card/30 p-3 flex items-center justify-between group hover:bg-card/60 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">@{entry.discord_username}</p>
                  {entry.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{entry.reason}</p>}
                  <p className="text-[10px] text-muted-foreground/60">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <button className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => removeDiscordBlacklist(entry.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {discordBlacklist.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No banned Discord accounts.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
