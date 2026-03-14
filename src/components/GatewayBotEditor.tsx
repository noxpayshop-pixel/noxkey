import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Hash, Zap, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface GatewayConfig {
  id: string;
  ghost_ping_enabled: boolean;
  ghost_ping_channel_id: string;
  ghost_ping_message: string;
  dmall_embed_title: string;
  dmall_embed_description: string;
  dmall_embed_color: string;
  dmall_embed_image_url: string | null;
  dmall_embed_footer_text: string;
}

interface Channel {
  id: string;
  name: string;
}

export default function GatewayBotEditor() {
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gateway_bot_config' as any)
      .select('*')
      .limit(1)
      .single();
    if (data) setConfig(data as any);
    setLoading(false);
  }, []);

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const { data } = await supabase.functions.invoke('discord-gateway', {
        body: { action: 'list_channels' },
      });
      if (data?.channels) setChannels(data.channels);
    } catch {}
    setLoadingChannels(false);
  }, []);

  useEffect(() => { fetchConfig(); fetchChannels(); }, [fetchConfig, fetchChannels]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from('gateway_bot_config' as any)
      .update({
        ghost_ping_enabled: config.ghost_ping_enabled,
        ghost_ping_channel_id: config.ghost_ping_channel_id,
        ghost_ping_message: config.ghost_ping_message,
        dmall_embed_title: config.dmall_embed_title,
        dmall_embed_description: config.dmall_embed_description,
        dmall_embed_color: config.dmall_embed_color,
        dmall_embed_image_url: config.dmall_embed_image_url || null,
        dmall_embed_footer_text: config.dmall_embed_footer_text,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', config.id);
    setSaving(false);
    if (error) toast.error('Fehler beim Speichern');
    else toast.success('Gateway-Konfiguration gespeichert!');
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!config) return <p className="text-muted-foreground text-center py-12">Keine Gateway-Konfiguration gefunden.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-primary" /> Gateway Bot
        </h2>
        <p className="text-sm text-muted-foreground">Ghost-Ping bei Join & /dmall Command</p>
      </div>

      {/* Ghost Ping Section */}
      <motion.div
        className="nox-surface rounded-xl border border-border/50 p-6 space-y-5"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ghost Ping</h3>
            <p className="text-xs text-muted-foreground">Pingt neue Mitglieder und löscht die Nachricht sofort</p>
          </div>
          <Switch
            checked={config.ghost_ping_enabled}
            onCheckedChange={(v) => setConfig({ ...config, ghost_ping_enabled: v })}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
            <Hash className="w-3 h-3 inline mr-1" /> Channel
          </label>
          {loadingChannels ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Lade Channels...</div>
          ) : (
            <select
              value={config.ghost_ping_channel_id}
              onChange={(e) => setConfig({ ...config, ghost_ping_channel_id: e.target.value })}
              className="w-full rounded-lg border border-border/60 bg-background/50 text-foreground text-sm px-3 py-2"
            >
              <option value="">— Channel wählen —</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Nachricht</label>
          <Input
            value={config.ghost_ping_message}
            onChange={(e) => setConfig({ ...config, ghost_ping_message: e.target.value })}
            placeholder="Hello {user} Check this out."
            className="bg-background/50 border-border/60 text-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">{'{user}'} wird durch den Ping ersetzt</p>
        </div>
      </motion.div>

      {/* DM All Embed Section */}
      <motion.div
        className="nox-surface rounded-xl border border-border/50 p-6 space-y-5"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> /dmall Embed
          </h3>
          <p className="text-xs text-muted-foreground">Wird an alle Server-Mitglieder per DM gesendet (mit Ping)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Titel</label>
            <Input
              value={config.dmall_embed_title}
              onChange={(e) => setConfig({ ...config, dmall_embed_title: e.target.value })}
              placeholder="Embed Titel"
              className="bg-background/50 border-border/60 text-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Farbe</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.dmall_embed_color}
                onChange={(e) => setConfig({ ...config, dmall_embed_color: e.target.value })}
                className="w-10 h-10 rounded border border-border/60 cursor-pointer"
              />
              <Input
                value={config.dmall_embed_color}
                onChange={(e) => setConfig({ ...config, dmall_embed_color: e.target.value })}
                className="bg-background/50 border-border/60 text-foreground font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Beschreibung</label>
          <Textarea
            value={config.dmall_embed_description}
            onChange={(e) => setConfig({ ...config, dmall_embed_description: e.target.value })}
            placeholder="Embed Beschreibung... Verwende \n für neue Zeilen und {user} für den Username"
            rows={4}
            className="bg-background/50 border-border/60 text-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Bild-URL</label>
          <Input
            value={config.dmall_embed_image_url || ''}
            onChange={(e) => setConfig({ ...config, dmall_embed_image_url: e.target.value || null })}
            placeholder="https://example.com/image.png"
            className="bg-background/50 border-border/60 text-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Footer</label>
          <Input
            value={config.dmall_embed_footer_text}
            onChange={(e) => setConfig({ ...config, dmall_embed_footer_text: e.target.value })}
            placeholder="Footer Text"
            className="bg-background/50 border-border/60 text-foreground"
          />
        </div>

        {/* Preview */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Vorschau</label>
          <div className="rounded-lg overflow-hidden border border-border/40 bg-[#2b2d31] p-4">
            <div className="flex gap-3">
              <div
                className="w-1 rounded-full shrink-0"
                style={{ backgroundColor: config.dmall_embed_color || '#7c3aed' }}
              />
              <div className="space-y-2 min-w-0 flex-1">
                {config.dmall_embed_title && (
                  <p className="text-sm font-semibold text-white">{config.dmall_embed_title}</p>
                )}
                {config.dmall_embed_description && (
                  <p className="text-sm text-[#dcddde] whitespace-pre-wrap">
                    {config.dmall_embed_description.replace(/\\n/g, '\n').replace(/\{user\}/g, 'User')}
                  </p>
                )}
                {config.dmall_embed_image_url && (
                  <img src={config.dmall_embed_image_url} alt="" className="max-w-[300px] rounded mt-2" />
                )}
                {config.dmall_embed_footer_text && (
                  <p className="text-xs text-[#a3a6aa] mt-2">{config.dmall_embed_footer_text}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Button variant="nox" onClick={saveConfig} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Konfiguration speichern
      </Button>
    </div>
  );
}
