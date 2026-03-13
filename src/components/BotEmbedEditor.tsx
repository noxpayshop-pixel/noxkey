import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Smile, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface EmbedConfig {
  id: string;
  bot_type: string;
  embed_title: string;
  embed_description: string;
  embed_color: string;
  embed_image_url: string | null;
  embed_footer_text: string | null;
}

interface GuildEmoji {
  id: string;
  name: string;
  animated: boolean;
}

const BOT_INFO: Record<string, { label: string; variables: string; previewVars: Record<string, string> }> = {
  otp: {
    label: 'OTP Bot — Verification DM',
    variables: '{code}',
    previewVars: { '{code}': '123456' },
  },
  product: {
    label: 'Product Bot — Delivery DM',
    variables: '{product}',
    previewVars: { '{product}': 'Netflix Premium' },
  },
  join_welcome: {
    label: 'Join Welcome DM',
    variables: '{user}',
    previewVars: { '{user}': 'CoolUser' },
  },
  join_reminder: {
    label: 'Join Reminder DM (no role)',
    variables: '{user}',
    previewVars: { '{user}': 'CoolUser' },
  },
  giveaway: {
    label: 'Giveaway Embed',
    variables: '{prize}, {ends_at}, {winner_count}',
    previewVars: { '{prize}': 'Netflix Premium', '{ends_at}': 'in 1 hour', '{winner_count}': '1' },
  },
  giveaway_winner: {
    label: 'Giveaway Winner DM',
    variables: '{prize}, {user}',
    previewVars: { '{prize}': 'Netflix Premium', '{user}': 'CoolUser' },
  },
};

function EmojiPicker({ emojis, onSelect, onClose }: { emojis: GuildEmoji[]; onSelect: (text: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="absolute z-50 top-full mt-1 left-0 w-80 max-h-72 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden">
      <div className="p-2 border-b border-border/40">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emojis..."
          className="h-8 text-xs bg-background/50 border-border/40" autoFocus />
      </div>
      <div className="p-2 overflow-y-auto max-h-52 grid grid-cols-8 gap-1">
        {filtered.map(e => (
          <button key={e.id} onClick={() => { onSelect(`<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted/60 transition-colors" title={`:${e.name}:`}>
            <img src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=32`} alt={e.name} className="w-6 h-6" />
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-8 text-xs text-muted-foreground text-center py-4">No emojis found</p>}
      </div>
      <div className="p-1.5 border-t border-border/40 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">Close</Button>
      </div>
    </motion.div>
  );
}

function renderEmbedText(text: string): string {
  return text
    .replace(/<(a?):(\w+):(\d+)>/g, (_, animated, name, id) => {
      const ext = animated ? 'gif' : 'png';
      return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=20" alt="${name}" class="inline-block w-5 h-5 align-middle" />`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-semibold text-white mt-2 mb-1">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-white mt-2 mb-1">$1</div>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#e8e8e8] text-base font-mono">$1</code>')
    .replace(/^> (.+)$/gm, '<div class="pl-3 border-l-2 border-[#4e5058] text-[#dbdee1]">$1</div>')
    .replace(/^-# (.+)$/gm, '<div class="text-[11px] text-[#a1a5ab]">$1</div>')
    .replace(/\n/g, '<br/>');
}

export default function BotEmbedEditor({ botType }: { botType: 'otp' | 'product' | 'join_welcome' | 'join_reminder' }) {
  const [config, setConfig] = useState<EmbedConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
  const [loadingEmojis, setLoadingEmojis] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  const info = BOT_INFO[botType];

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bot_embed_config' as any)
      .select('*')
      .eq('bot_type', botType)
      .limit(1)
      .single();
    if (data) setConfig(data as any);
    setLoading(false);
  }, [botType]);

  const fetchEmojis = useCallback(async () => {
    setLoadingEmojis(true);
    try {
      const res = await supabase.functions.invoke('discord-upload-emojis', { body: { action: 'list' } });
      if (res.data?.emojis) setEmojis(res.data.emojis);
    } catch {}
    setLoadingEmojis(false);
  }, []);

  useEffect(() => { fetchConfig(); fetchEmojis(); }, [fetchConfig, fetchEmojis]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from('bot_embed_config' as any)
      .update({
        embed_title: config.embed_title,
        embed_description: config.embed_description,
        embed_color: config.embed_color,
        embed_image_url: config.embed_image_url,
        embed_footer_text: config.embed_footer_text,
      } as any)
      .eq('id', config.id);
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Embed config saved!');
  };

  const update = (key: keyof EmbedConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const insertEmoji = (field: string, emoji: string) => {
    if (!config) return;
    if (field === 'title') update('embed_title', config.embed_title + ' ' + emoji);
    else if (field === 'description') update('embed_description', config.embed_description + ' ' + emoji);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!config) return <p className="text-muted-foreground text-center py-12">No config found for {botType}.</p>;

  // Preview text with variables replaced
  let previewTitle = config.embed_title;
  let previewDesc = config.embed_description;
  for (const [k, v] of Object.entries(info.previewVars)) {
    previewTitle = previewTitle.replace(new RegExp(k.replace(/[{}]/g, '\\$&'), 'g'), v);
    previewDesc = previewDesc.replace(new RegExp(k.replace(/[{}]/g, '\\$&'), 'g'), v);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{info.label}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchEmojis} disabled={loadingEmojis}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingEmojis ? 'animate-spin' : ''}`} /> Emojis
          </Button>
          <Button variant="nox" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Variables: {info.variables}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Editor */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <div className="relative">
              <Input value={config.embed_title} onChange={e => update('embed_title', e.target.value)}
                className="bg-background/50 border-border/60 pr-10" />
              <button onClick={() => setEmojiPickerFor(emojiPickerFor === 'title' ? null : 'title')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <Smile className="w-4 h-4" />
              </button>
              {emojiPickerFor === 'title' && (
                <EmojiPicker emojis={emojis} onSelect={t => insertEmoji('title', t)} onClose={() => setEmojiPickerFor(null)} />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (Markdown)</label>
            <div className="relative">
              <Textarea value={config.embed_description} onChange={e => update('embed_description', e.target.value)}
                className="bg-background/50 border-border/60 min-h-[160px] font-mono text-xs" />
              <button onClick={() => setEmojiPickerFor(emojiPickerFor === 'description' ? null : 'description')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                <Smile className="w-4 h-4" />
              </button>
              {emojiPickerFor === 'description' && (
                <EmojiPicker emojis={emojis} onSelect={t => insertEmoji('description', t)} onClose={() => setEmojiPickerFor(null)} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.embed_color} onChange={e => update('embed_color', e.target.value)}
                  className="w-8 h-8 rounded border border-border/60 cursor-pointer" />
                <Input value={config.embed_color} onChange={e => update('embed_color', e.target.value)}
                  className="bg-background/50 border-border/60 flex-1 font-mono text-xs" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Footer</label>
              <Input value={config.embed_footer_text || ''} onChange={e => update('embed_footer_text', e.target.value)}
                className="bg-background/50 border-border/60" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Image URL</label>
            <Input value={config.embed_image_url || ''} onChange={e => update('embed_image_url', e.target.value || null)}
              placeholder="https://..." className="bg-background/50 border-border/60 text-xs" />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl bg-[#313338] p-4 min-h-[250px]">
          <div className="text-[10px] text-[#a1a5ab] uppercase tracking-wider mb-3">DM Preview</div>
          <div className="flex gap-3">
            <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: config.embed_color }} />
            <div className="flex-1 space-y-2">
              {previewTitle && (
                <div className="font-semibold text-white text-sm"
                  dangerouslySetInnerHTML={{ __html: renderEmbedText(previewTitle) }} />
              )}
              <div className="text-[#dbdee1] text-[13px] whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderEmbedText(previewDesc) }} />
              {config.embed_image_url && (
                <img src={config.embed_image_url} alt="" className="w-full max-w-xs rounded-lg mt-2" />
              )}
              {config.embed_footer_text && (
                <div className="text-[#a1a5ab] text-[11px] mt-3 pt-2 border-t border-[#3f4147]">{config.embed_footer_text}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
