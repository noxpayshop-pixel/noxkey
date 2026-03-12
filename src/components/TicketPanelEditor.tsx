import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Save, Eye, Smile, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface TicketType {
  label: string;
  value: string;
  emoji: string;
  description: string;
}

interface PanelConfig {
  id: string;
  embed_title: string;
  embed_description: string;
  embed_color: string;
  embed_thumbnail_url: string | null;
  embed_image_url: string | null;
  embed_footer_text: string | null;
  dropdown_placeholder: string | null;
  ticket_types: TicketType[];
  welcome_title: string | null;
  welcome_description: string | null;
  welcome_color: string | null;
  welcome_footer_text: string | null;
}

interface GuildEmoji {
  id: string;
  name: string;
  animated: boolean;
}

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function EmojiPicker({ emojis, onSelect, onClose }: { emojis: GuildEmoji[]; onSelect: (text: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute z-50 top-full mt-1 left-0 w-80 max-h-72 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-border/40">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="h-8 text-xs bg-background/50 border-border/40"
          autoFocus
        />
      </div>
      <div className="p-2 overflow-y-auto max-h-52 grid grid-cols-8 gap-1">
        {filtered.map(e => (
          <button
            key={e.id}
            onClick={() => { onSelect(`<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted/60 transition-colors"
            title={`:${e.name}:`}
          >
            <img
              src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=32`}
              alt={e.name}
              className="w-6 h-6"
            />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-8 text-xs text-muted-foreground text-center py-4">No emojis found</p>
        )}
      </div>
      <div className="p-1.5 border-t border-border/40 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">Close</Button>
      </div>
    </motion.div>
  );
}

export default function TicketPanelEditor() {
  const [config, setConfig] = useState<PanelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
  const [loadingEmojis, setLoadingEmojis] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'panel' | 'welcome'>('panel');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ticket_panel_config')
      .select('*')
      .limit(1)
      .single();
    if (data) {
      setConfig({
        ...data,
        ticket_types: (typeof data.ticket_types === 'string' ? JSON.parse(data.ticket_types) : data.ticket_types) as TicketType[],
      });
    }
    setLoading(false);
  }, []);

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
      .from('ticket_panel_config')
      .update({
        embed_title: config.embed_title,
        embed_description: config.embed_description,
        embed_color: config.embed_color,
        embed_thumbnail_url: config.embed_thumbnail_url,
        embed_image_url: config.embed_image_url,
        embed_footer_text: config.embed_footer_text,
        dropdown_placeholder: config.dropdown_placeholder,
        ticket_types: config.ticket_types as any,
        welcome_title: config.welcome_title,
        welcome_description: config.welcome_description,
        welcome_color: config.welcome_color,
        welcome_footer_text: config.welcome_footer_text,
      })
      .eq('id', config.id);
    setSaving(false);
    if (error) toast.error('Failed to save');
    else toast.success('Panel config saved! Use /panel in Discord to see it.');
  };

  const update = (key: keyof PanelConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const updateTicketType = (index: number, key: keyof TicketType, value: string) => {
    if (!config) return;
    const types = [...config.ticket_types];
    types[index] = { ...types[index], [key]: value };
    setConfig({ ...config, ticket_types: types });
  };

  const addTicketType = () => {
    if (!config) return;
    setConfig({
      ...config,
      ticket_types: [...config.ticket_types, { label: 'New Type', value: `type_${Date.now()}`, emoji: '📌', description: 'Description' }],
    });
  };

  const removeTicketType = (index: number) => {
    if (!config) return;
    const types = config.ticket_types.filter((_, i) => i !== index);
    setConfig({ ...config, ticket_types: types });
  };

  const insertEmojiAtField = (fieldId: string, emojiText: string) => {
    if (!config) return;
    if (fieldId === 'embed_title') update('embed_title', config.embed_title + ' ' + emojiText);
    else if (fieldId === 'embed_description') update('embed_description', config.embed_description + ' ' + emojiText);
    else if (fieldId === 'welcome_title') update('welcome_title', (config.welcome_title || '') + ' ' + emojiText);
    else if (fieldId === 'welcome_description') update('welcome_description', (config.welcome_description || '') + ' ' + emojiText);
    else if (fieldId.startsWith('tt_emoji_')) {
      const idx = parseInt(fieldId.replace('tt_emoji_', ''));
      updateTicketType(idx, 'emoji', emojiText);
    }
  };

  // Render emoji strings for preview (convert <:name:id> to img tags)
  const renderPreviewText = (text: string) => {
    return text.replace(/<(a?):(\w+):(\d+)>/g, (_, animated, name, id) => {
      const ext = animated ? 'gif' : 'png';
      return `![${name}](https://cdn.discordapp.com/emojis/${id}.${ext}?size=20)`;
    });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!config) {
    return <p className="text-muted-foreground text-center py-12">No config found.</p>;
  }

  const panelColor = hexToDecimal(config.embed_color);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Ticket Panel Designer</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchEmojis} disabled={loadingEmojis}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingEmojis ? 'animate-spin' : ''}`} /> Emojis
          </Button>
          <Button variant="nox" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Config
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-5">
          {/* Panel Embed Section */}
          <div className="nox-surface rounded-xl border border-border/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Panel Embed
            </h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <div className="relative">
                <Input value={config.embed_title} onChange={e => update('embed_title', e.target.value)}
                  className="bg-background/50 border-border/60 pr-10" />
                <button onClick={() => setEmojiPickerFor(emojiPickerFor === 'embed_title' ? null : 'embed_title')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerFor === 'embed_title' && (
                  <EmojiPicker emojis={emojis} onSelect={t => insertEmojiAtField('embed_title', t)} onClose={() => setEmojiPickerFor(null)} />
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (Markdown supported)</label>
              <div className="relative">
                <Textarea value={config.embed_description} onChange={e => update('embed_description', e.target.value)}
                  className="bg-background/50 border-border/60 min-h-[120px] font-mono text-xs" />
                <button onClick={() => setEmojiPickerFor(emojiPickerFor === 'embed_description' ? null : 'embed_description')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerFor === 'embed_description' && (
                  <EmojiPicker emojis={emojis} onSelect={t => insertEmojiAtField('embed_description', t)} onClose={() => setEmojiPickerFor(null)} />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Thumbnail URL</label>
                <Input value={config.embed_thumbnail_url || ''} onChange={e => update('embed_thumbnail_url', e.target.value || null)}
                  placeholder="https://..." className="bg-background/50 border-border/60 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Image URL</label>
                <Input value={config.embed_image_url || ''} onChange={e => update('embed_image_url', e.target.value || null)}
                  placeholder="https://..." className="bg-background/50 border-border/60 text-xs" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Dropdown Placeholder</label>
              <Input value={config.dropdown_placeholder || ''} onChange={e => update('dropdown_placeholder', e.target.value)}
                className="bg-background/50 border-border/60" />
            </div>
          </div>

          {/* Ticket Types */}
          <div className="nox-surface rounded-xl border border-border/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Ticket Categories</h3>
              <Button variant="ghost" size="sm" onClick={addTicketType}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
            
            <div className="space-y-3">
              {config.ticket_types.map((tt, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Input value={tt.emoji} onChange={e => updateTicketType(i, 'emoji', e.target.value)}
                        className="bg-background/50 border-border/60 w-24 text-center text-xs" placeholder="Emoji" />
                      <button onClick={() => setEmojiPickerFor(emojiPickerFor === `tt_emoji_${i}` ? null : `tt_emoji_${i}`)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <Smile className="w-3 h-3" />
                      </button>
                      {emojiPickerFor === `tt_emoji_${i}` && (
                        <EmojiPicker emojis={emojis} onSelect={t => insertEmojiAtField(`tt_emoji_${i}`, t)} onClose={() => setEmojiPickerFor(null)} />
                      )}
                    </div>
                    <Input value={tt.label} onChange={e => updateTicketType(i, 'label', e.target.value)}
                      className="bg-background/50 border-border/60 flex-1 text-xs" placeholder="Label" />
                    <Input value={tt.value} onChange={e => updateTicketType(i, 'value', e.target.value)}
                      className="bg-background/50 border-border/60 w-28 font-mono text-xs" placeholder="value_id" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeTicketType(i)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                    </Button>
                  </div>
                  <Input value={tt.description} onChange={e => updateTicketType(i, 'description', e.target.value)}
                    className="bg-background/50 border-border/60 text-xs" placeholder="Description shown in dropdown" />
                </div>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="nox-surface rounded-xl border border-border/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Welcome Message (Ticket opened)</h3>
            <p className="text-xs text-muted-foreground">Variables: {'{emoji}'}, {'{label}'}, {'{user}'}</p>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <div className="relative">
                <Input value={config.welcome_title || ''} onChange={e => update('welcome_title', e.target.value)}
                  className="bg-background/50 border-border/60 pr-10" />
                <button onClick={() => setEmojiPickerFor(emojiPickerFor === 'welcome_title' ? null : 'welcome_title')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerFor === 'welcome_title' && (
                  <EmojiPicker emojis={emojis} onSelect={t => insertEmojiAtField('welcome_title', t)} onClose={() => setEmojiPickerFor(null)} />
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (Markdown)</label>
              <div className="relative">
                <Textarea value={config.welcome_description || ''} onChange={e => update('welcome_description', e.target.value)}
                  className="bg-background/50 border-border/60 min-h-[140px] font-mono text-xs" />
                <button onClick={() => setEmojiPickerFor(emojiPickerFor === 'welcome_description' ? null : 'welcome_description')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerFor === 'welcome_description' && (
                  <EmojiPicker emojis={emojis} onSelect={t => insertEmojiAtField('welcome_description', t)} onClose={() => setEmojiPickerFor(null)} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.welcome_color || '#7c3aed'} onChange={e => update('welcome_color', e.target.value)}
                    className="w-8 h-8 rounded border border-border/60 cursor-pointer" />
                  <Input value={config.welcome_color || ''} onChange={e => update('welcome_color', e.target.value)}
                    className="bg-background/50 border-border/60 flex-1 font-mono text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Footer</label>
                <Input value={config.welcome_footer_text || ''} onChange={e => update('welcome_footer_text', e.target.value)}
                  className="bg-background/50 border-border/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setPreviewTab('panel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${previewTab === 'panel' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Panel Preview
            </button>
            <button onClick={() => setPreviewTab('welcome')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${previewTab === 'welcome' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Welcome Preview
            </button>
          </div>

          {/* Discord-style embed preview */}
          <div className="rounded-xl bg-[#313338] p-4 min-h-[300px]">
            {previewTab === 'panel' ? (
              <div className="flex gap-3">
                {/* Colored bar */}
                <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: config.embed_color }} />
                <div className="flex-1 space-y-2">
                  {/* Title */}
                  <div className="font-semibold text-white text-sm" dangerouslySetInnerHTML={{ __html: renderEmbedText(config.embed_title, emojis) }} />
                  {/* Description */}
                  <div className="text-[#dbdee1] text-[13px] whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderEmbedText(config.embed_description, emojis) }} />
                  {/* Thumbnail */}
                  {config.embed_thumbnail_url && (
                    <img src={config.embed_thumbnail_url} alt="" className="w-16 h-16 rounded-lg absolute top-4 right-4" />
                  )}
                  {/* Image */}
                  {config.embed_image_url && (
                    <img src={config.embed_image_url} alt="" className="w-full max-w-xs rounded-lg mt-2" />
                  )}
                  {/* Footer */}
                  {config.embed_footer_text && (
                    <div className="text-[#a1a5ab] text-[11px] mt-3 pt-2 border-t border-[#3f4147]">{config.embed_footer_text}</div>
                  )}
                  {/* Fake dropdown */}
                  <div className="mt-3 bg-[#1e1f22] rounded-md px-3 py-2 text-[#6d6f78] text-sm cursor-default">
                    {config.dropdown_placeholder || 'Choose your ticket type'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: config.welcome_color || '#7c3aed' }} />
                <div className="flex-1 space-y-2">
                  <div className="font-semibold text-white text-sm"
                    dangerouslySetInnerHTML={{ __html: renderEmbedText(
                      (config.welcome_title || '{emoji} {label}')
                        .replace('{emoji}', '🛒')
                        .replace('{label}', 'Purchase Issue'), emojis
                    ) }} />
                  <div className="text-[#dbdee1] text-[13px] whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderEmbedText(
                      (config.welcome_description || '')
                        .replace(/\{user\}/g, '@ExampleUser')
                        .replace(/\{emoji\}/g, '🛒')
                        .replace(/\{label\}/g, 'Purchase Issue'), emojis
                    ) }} />
                  {config.welcome_footer_text && (
                    <div className="text-[#a1a5ab] text-[11px] mt-3 pt-2 border-t border-[#3f4147]">{config.welcome_footer_text}</div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <div className="bg-[#da373c] text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5">
                      🔒 Close Ticket
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emoji palette quick reference */}
          {emojis.length > 0 && (
            <div className="nox-surface rounded-xl border border-border/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Server Emojis ({emojis.length})</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {emojis.slice(0, 60).map(e => (
                  <img key={e.id}
                    src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=24`}
                    alt={e.name} title={`<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`}
                    className="w-5 h-5 cursor-pointer hover:scale-125 transition-transform"
                    onClick={() => navigator.clipboard.writeText(`<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`).then(() => toast.success(`Copied :${e.name}:`))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderEmbedText(text: string, emojis: GuildEmoji[]): string {
  let html = text
    // Custom emojis
    .replace(/<(a?):(\w+):(\d+)>/g, (_, animated, name, id) => {
      const ext = animated ? 'gif' : 'png';
      return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=20" alt="${name}" class="inline-block w-5 h-5 align-middle" />`;
    })
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Headers
    .replace(/^## (.+)$/gm, '<div class="text-base font-semibold text-white mt-2 mb-1">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-white mt-2 mb-1">$1</div>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<div class="pl-3 border-l-2 border-[#4e5058] text-[#dbdee1]">$1</div>')
    // Small text
    .replace(/^-# (.+)$/gm, '<div class="text-[11px] text-[#a1a5ab]">$1</div>')
    // User mentions
    .replace(/<@(\d+)>/g, '<span class="bg-[#5865f2]/20 text-[#c9cdfb] rounded px-1">@user</span>')
    // Channel mentions
    .replace(/<#(\d+)>/g, '<span class="bg-[#5865f2]/20 text-[#c9cdfb] rounded px-1">#channel</span>')
    // Line breaks
    .replace(/\n/g, '<br/>');
  
  return html;
}
