import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Send, Plus, Trash2, Hash, ChevronDown, Smile, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedData {
  title: string;
  description: string;
  url: string;
  color: string;
  timestamp: boolean;
  author_name: string;
  author_url: string;
  author_icon_url: string;
  thumbnail_url: string;
  image_url: string;
  footer_text: string;
  footer_icon_url: string;
  fields: EmbedField[];
}

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
}

interface Category {
  id: string;
  name: string;
  position: number;
}

interface GuildEmoji {
  id: string;
  name: string;
  animated: boolean;
}

const DEFAULT_EMBED: EmbedData = {
  title: '',
  description: '',
  url: '',
  color: '#7c3aed',
  timestamp: true,
  author_name: '',
  author_url: '',
  author_icon_url: '',
  thumbnail_url: '',
  image_url: '',
  footer_text: '',
  footer_icon_url: '',
  fields: [],
};

function renderEmbedMarkdown(text: string): string {
  return text
    .replace(/<(a?):(\w+):(\d+)>/g, (_, animated, name, id) => {
      const ext = animated ? 'gif' : 'png';
      return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=20" alt="${name}" class="inline-block w-5 h-5 align-middle" />`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/^### (.+)$/gm, '<div class="text-sm font-semibold text-white mt-1.5 mb-0.5">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-semibold text-white mt-2 mb-1">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-white mt-2 mb-1">$1</div>')
    .replace(/`([^`]+)`/g, '<code class="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#e8e8e8] text-sm font-mono">$1</code>')
    .replace(/^> (.+)$/gm, '<div class="pl-3 border-l-2 border-[#4e5058] text-[#dbdee1]">$1</div>')
    .replace(/^-# (.+)$/gm, '<div class="text-[11px] text-[#a1a5ab]">$1</div>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#00a8fc] hover:underline">$1</a>')
    .replace(/\n/g, '<br/>');
}

function EmojiPicker({ emojis, onSelect, onClose }: { emojis: GuildEmoji[]; onSelect: (text: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = emojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="absolute z-50 top-full mt-1 right-0 w-80 max-h-72 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden">
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

function FieldEditor({ field, index, onChange, onRemove }: {
  field: EmbedField; index: number; onChange: (f: EmbedField) => void; onRemove: () => void
}) {
  return (
    <div className="flex gap-2 items-start p-3 rounded-lg bg-background/30 border border-border/30">
      <div className="flex-1 space-y-2">
        <Input value={field.name} onChange={e => onChange({ ...field, name: e.target.value })}
          placeholder="Field name" className="h-8 text-xs bg-background/50 border-border/40" />
        <Textarea value={field.value} onChange={e => onChange({ ...field, value: e.target.value })}
          placeholder="Field value" className="min-h-[60px] text-xs bg-background/50 border-border/40 font-mono" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={field.inline} onCheckedChange={v => onChange({ ...field, inline: v })} className="scale-75" />
          Inline
        </label>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive h-8 w-8 p-0">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function ChannelSelector({ channels, categories, selected, onSelect }: {
  channels: Channel[]; categories: Category[]; selected: string; onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false);
  const selectedChannel = channels.find(c => c.id === selected);

  const grouped: Record<string, Channel[]> = { uncategorized: [] };
  categories.forEach(cat => { grouped[cat.id] = []; });
  channels.forEach(ch => {
    if (ch.parent_id && grouped[ch.parent_id]) grouped[ch.parent_id].push(ch);
    else grouped['uncategorized'].push(ch);
  });

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background/50 border border-border/60 text-sm hover:border-primary/40 transition-colors">
        <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={selectedChannel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedChannel ? selectedChannel.name : 'Select a channel...'}
        </span>
        <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 top-full mt-1 left-0 w-full max-h-64 rounded-xl border border-border/60 bg-card shadow-xl overflow-y-auto">
            {Object.entries(grouped).map(([catId, chans]) => {
              if (chans.length === 0) return null;
              const cat = categories.find(c => c.id === catId);
              return (
                <div key={catId}>
                  {cat && <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat.name}</div>}
                  {chans.map(ch => (
                    <button key={ch.id} onClick={() => { onSelect(ch.id); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40 transition-colors ${ch.id === selected ? 'bg-primary/10 text-primary' : 'text-foreground'}`}>
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      {ch.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmbedBuilder() {
  const [embed, setEmbed] = useState<EmbedData>({ ...DEFAULT_EMBED });
  const [messageContent, setMessageContent] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
  const [emojiTarget, setEmojiTarget] = useState<string | null>(null);
  const [showSections, setShowSections] = useState({ author: false, images: false, footer: false, fields: false });

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const res = await supabase.functions.invoke('discord-send-embed', { body: { action: 'list_channels' } });
      if (res.data?.channels) {
        setChannels(res.data.channels);
        setCategories(res.data.categories || []);
      }
    } catch {}
    setLoadingChannels(false);
  }, []);

  const fetchEmojis = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke('discord-upload-emojis', { body: { action: 'list' } });
      if (res.data?.emojis) setEmojis(res.data.emojis);
    } catch {}
  }, []);

  useEffect(() => { fetchChannels(); fetchEmojis(); }, [fetchChannels, fetchEmojis]);

  const update = (key: keyof EmbedData, value: any) => setEmbed(prev => ({ ...prev, [key]: value }));

  const addField = () => update('fields', [...embed.fields, { name: '', value: '', inline: false }]);
  const updateField = (i: number, f: EmbedField) => {
    const fields = [...embed.fields];
    fields[i] = f;
    update('fields', fields);
  };
  const removeField = (i: number) => update('fields', embed.fields.filter((_, idx) => idx !== i));

  const insertEmoji = (target: string, emoji: string) => {
    if (target === 'description') update('description', embed.description + emoji);
    else if (target === 'title') update('title', embed.title + emoji);
    else if (target === 'content') setMessageContent(prev => prev + emoji);
    else if (target === 'footer') update('footer_text', embed.footer_text + emoji);
  };

  const send = async () => {
    if (!selectedChannel) return toast.error('Select a channel first');
    if (!embed.title && !embed.description && !messageContent) return toast.error('Add some content');
    setSending(true);
    try {
      const res = await supabase.functions.invoke('discord-send-embed', {
        body: {
          action: 'send',
          channel_id: selectedChannel,
          content: messageContent || undefined,
          embed: (embed.title || embed.description) ? embed : undefined,
        },
      });
      if (res.data?.success) {
        toast.success('Embed sent!');
      } else {
        toast.error(res.data?.error || 'Failed to send');
      }
    } catch (e) {
      toast.error('Failed to send embed');
    }
    setSending(false);
  };

  const toggleSection = (key: keyof typeof showSections) => setShowSections(prev => ({ ...prev, [key]: !prev[key] }));

  const colorInt = parseInt(embed.color.replace('#', ''), 16);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Embed Builder</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchChannels} disabled={loadingChannels}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingChannels ? 'animate-spin' : ''}`} /> Channels
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Editor */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Channel selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
            <ChannelSelector channels={channels} categories={categories} selected={selectedChannel} onSelect={setSelectedChannel} />
          </div>

          {/* Message content */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Message Content (optional)</label>
            <div className="relative">
              <Textarea value={messageContent} onChange={e => setMessageContent(e.target.value)}
                placeholder="Text outside the embed..." className="bg-background/50 border-border/60 min-h-[60px] text-xs" />
              <button onClick={() => setEmojiTarget(emojiTarget === 'content' ? null : 'content')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                <Smile className="w-4 h-4" />
              </button>
              {emojiTarget === 'content' && <EmojiPicker emojis={emojis} onSelect={e => insertEmoji('content', e)} onClose={() => setEmojiTarget(null)} />}
            </div>
          </div>

          <div className="border-t border-border/30 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Embed</p>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <div className="relative">
              <Input value={embed.title} onChange={e => update('title', e.target.value)}
                className="bg-background/50 border-border/60 pr-10" placeholder="Embed title" />
              <button onClick={() => setEmojiTarget(emojiTarget === 'title' ? null : 'title')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <Smile className="w-4 h-4" />
              </button>
              {emojiTarget === 'title' && <EmojiPicker emojis={emojis} onSelect={e => insertEmoji('title', e)} onClose={() => setEmojiTarget(null)} />}
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title URL (optional)</label>
            <Input value={embed.url} onChange={e => update('url', e.target.value)}
              className="bg-background/50 border-border/60 text-xs" placeholder="https://..." />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <div className="relative">
              <Textarea value={embed.description} onChange={e => update('description', e.target.value)}
                className="bg-background/50 border-border/60 min-h-[120px] font-mono text-xs" placeholder="Supports **markdown**" />
              <button onClick={() => setEmojiTarget(emojiTarget === 'description' ? null : 'description')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                <Smile className="w-4 h-4" />
              </button>
              {emojiTarget === 'description' && <EmojiPicker emojis={emojis} onSelect={e => insertEmoji('description', e)} onClose={() => setEmojiTarget(null)} />}
            </div>
          </div>

          {/* Color + Timestamp */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={embed.color} onChange={e => update('color', e.target.value)}
                  className="w-8 h-8 rounded border border-border/60 cursor-pointer" />
                <Input value={embed.color} onChange={e => update('color', e.target.value)}
                  className="bg-background/50 border-border/60 flex-1 font-mono text-xs" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Timestamp</label>
              <div className="pt-1.5">
                <Switch checked={embed.timestamp} onCheckedChange={v => update('timestamp', v)} />
              </div>
            </div>
          </div>

          {/* Author section */}
          <button onClick={() => toggleSection('author')}
            className="w-full flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSections.author ? 'rotate-180' : ''}`} />
            Author
          </button>
          <AnimatePresence>
            {showSections.author && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden">
                <Input value={embed.author_name} onChange={e => update('author_name', e.target.value)}
                  placeholder="Author name" className="bg-background/50 border-border/60 text-xs" />
                <Input value={embed.author_url} onChange={e => update('author_url', e.target.value)}
                  placeholder="Author URL" className="bg-background/50 border-border/60 text-xs" />
                <Input value={embed.author_icon_url} onChange={e => update('author_icon_url', e.target.value)}
                  placeholder="Author icon URL" className="bg-background/50 border-border/60 text-xs" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Images section */}
          <button onClick={() => toggleSection('images')}
            className="w-full flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSections.images ? 'rotate-180' : ''}`} />
            Images
          </button>
          <AnimatePresence>
            {showSections.images && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden">
                <Input value={embed.thumbnail_url} onChange={e => update('thumbnail_url', e.target.value)}
                  placeholder="Thumbnail URL" className="bg-background/50 border-border/60 text-xs" />
                <Input value={embed.image_url} onChange={e => update('image_url', e.target.value)}
                  placeholder="Image URL" className="bg-background/50 border-border/60 text-xs" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer section */}
          <button onClick={() => toggleSection('footer')}
            className="w-full flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSections.footer ? 'rotate-180' : ''}`} />
            Footer
          </button>
          <AnimatePresence>
            {showSections.footer && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden">
                <div className="relative">
                  <Input value={embed.footer_text} onChange={e => update('footer_text', e.target.value)}
                    placeholder="Footer text" className="bg-background/50 border-border/60 text-xs pr-10" />
                  <button onClick={() => setEmojiTarget(emojiTarget === 'footer' ? null : 'footer')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <Smile className="w-4 h-4" />
                  </button>
                  {emojiTarget === 'footer' && <EmojiPicker emojis={emojis} onSelect={e => insertEmoji('footer', e)} onClose={() => setEmojiTarget(null)} />}
                </div>
                <Input value={embed.footer_icon_url} onChange={e => update('footer_icon_url', e.target.value)}
                  placeholder="Footer icon URL" className="bg-background/50 border-border/60 text-xs" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fields section */}
          <button onClick={() => toggleSection('fields')}
            className="w-full flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSections.fields ? 'rotate-180' : ''}`} />
            Fields ({embed.fields.length})
          </button>
          <AnimatePresence>
            {showSections.fields && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden">
                {embed.fields.map((f, i) => (
                  <FieldEditor key={i} field={f} index={i} onChange={nf => updateField(i, nf)} onRemove={() => removeField(i)} />
                ))}
                <Button variant="ghost" size="sm" onClick={addField} className="text-xs w-full border border-dashed border-border/40">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send button */}
          <div className="pt-3 border-t border-border/30">
            <Button variant="nox" onClick={send} disabled={sending} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send to #{channels.find(c => c.id === selectedChannel)?.name || 'channel'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl bg-[#313338] p-4 min-h-[300px] self-start sticky top-4">
          <div className="text-[10px] text-[#a1a5ab] uppercase tracking-wider mb-3">Preview</div>

          {/* Message content preview */}
          {messageContent && (
            <div className="text-[#dbdee1] text-sm mb-3 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: renderEmbedMarkdown(messageContent) }} />
          )}

          {/* Embed preview */}
          {(embed.title || embed.description) && (
            <div className="flex gap-3">
              <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: embed.color }} />
              <div className="flex-1 space-y-2 min-w-0">
                {/* Author */}
                {embed.author_name && (
                  <div className="flex items-center gap-1.5">
                    {embed.author_icon_url && <img src={embed.author_icon_url} alt="" className="w-5 h-5 rounded-full" />}
                    <span className="text-xs font-medium text-white">{embed.author_name}</span>
                  </div>
                )}

                {/* Title */}
                {embed.title && (
                  <div className="font-semibold text-white text-sm"
                    dangerouslySetInnerHTML={{ __html: renderEmbedMarkdown(embed.title) }} />
                )}

                {/* Description */}
                {embed.description && (
                  <div className="text-[#dbdee1] text-[13px] whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderEmbedMarkdown(embed.description) }} />
                )}

                {/* Fields */}
                {embed.fields.length > 0 && (
                  <div className="grid gap-2 mt-1" style={{
                    gridTemplateColumns: embed.fields.some(f => f.inline) ? 'repeat(3, 1fr)' : '1fr'
                  }}>
                    {embed.fields.map((f, i) => (
                      <div key={i} className={f.inline ? '' : 'col-span-full'}>
                        <div className="text-xs font-semibold text-white">{f.name || '\u200b'}</div>
                        <div className="text-[13px] text-[#dbdee1]"
                          dangerouslySetInnerHTML={{ __html: renderEmbedMarkdown(f.value || '\u200b') }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Thumbnail */}
                {embed.thumbnail_url && (
                  <img src={embed.thumbnail_url} alt="" className="absolute top-0 right-0 w-16 h-16 rounded-lg object-cover" />
                )}

                {/* Image */}
                {embed.image_url && <img src={embed.image_url} alt="" className="w-full max-w-xs rounded-lg mt-2" />}

                {/* Footer */}
                {(embed.footer_text || embed.timestamp) && (
                  <div className="flex items-center gap-1.5 text-[#a1a5ab] text-[11px] mt-3 pt-2 border-t border-[#3f4147]">
                    {embed.footer_icon_url && <img src={embed.footer_icon_url} alt="" className="w-4 h-4 rounded-full" />}
                    <span>{embed.footer_text}</span>
                    {embed.footer_text && embed.timestamp && <span>•</span>}
                    {embed.timestamp && <span>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {!embed.title && !embed.description && !messageContent && (
            <p className="text-[#a1a5ab] text-xs text-center py-12">Start typing to see the preview...</p>
          )}
        </div>
      </div>
    </div>
  );
}
