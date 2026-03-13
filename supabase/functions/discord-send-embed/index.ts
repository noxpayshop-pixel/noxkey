import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildDiscordPayload(content?: string, embed?: any) {
  const payload: any = {}
  if (content) payload.content = content
  if (embed) {
    const discordEmbed: any = {}
    if (embed.title) discordEmbed.title = embed.title
    if (embed.description) discordEmbed.description = embed.description
    if (embed.url) discordEmbed.url = embed.url
    if (embed.color) discordEmbed.color = typeof embed.color === 'string' ? parseInt(embed.color.replace('#', ''), 16) : embed.color
    if (embed.timestamp) discordEmbed.timestamp = new Date().toISOString()
    if (embed.author_name) {
      discordEmbed.author = {
        name: embed.author_name,
        ...(embed.author_url && { url: embed.author_url }),
        ...(embed.author_icon_url && { icon_url: embed.author_icon_url }),
      }
    }
    if (embed.thumbnail_url) discordEmbed.thumbnail = { url: embed.thumbnail_url }
    if (embed.image_url) discordEmbed.image = { url: embed.image_url }
    if (embed.footer_text) {
      discordEmbed.footer = {
        text: embed.footer_text,
        ...(embed.footer_icon_url && { icon_url: embed.footer_icon_url }),
      }
    }
    if (embed.fields?.length) {
      discordEmbed.fields = embed.fields.map((f: any) => ({
        name: f.name || '\u200b',
        value: f.value || '\u200b',
        inline: f.inline || false,
      }))
    }
    payload.embeds = [discordEmbed]
  }
  return payload
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')!
    const guildId = Deno.env.get('DISCORD_GUILD_ID')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { action, channel_id, embed, content, template_name, template_id } = body

    // List text channels
    if (action === 'list_channels') {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
      })
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch channels' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const channels = await res.json()
      const textChannels = channels
        .filter((c: any) => c.type === 0 || c.type === 5)
        .map((c: any) => ({ id: c.id, name: c.name, type: c.type, position: c.position, parent_id: c.parent_id }))
        .sort((a: any, b: any) => a.position - b.position)
      const categories = channels
        .filter((c: any) => c.type === 4)
        .map((c: any) => ({ id: c.id, name: c.name, position: c.position }))
        .sort((a: any, b: any) => a.position - b.position)
      return new Response(JSON.stringify({ channels: textChannels, categories }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send embed to channel
    if (action === 'send') {
      if (!channel_id) {
        return new Response(JSON.stringify({ error: 'No channel selected' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const payload = buildDiscordPayload(content, embed)
      const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        return new Response(JSON.stringify({ error: 'Failed to send', details: err }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const msg = await res.json()
      return new Response(JSON.stringify({ success: true, message_id: msg.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === TEMPLATES ===

    if (action === 'list_templates') {
      const { data, error } = await sb.from('embed_templates').select('*').order('created_at', { ascending: false })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ templates: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'save_template') {
      if (!template_name) return new Response(JSON.stringify({ error: 'Template name required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const { data, error } = await sb.from('embed_templates').insert({
        name: template_name,
        message_content: content || '',
        embed_data: embed || {},
      }).select().single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true, template: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete_template') {
      if (!template_id) return new Response(JSON.stringify({ error: 'Template ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const { error } = await sb.from('embed_templates').delete().eq('id', template_id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // === STICKY MESSAGES ===

    // Set up or update a sticky message for a channel
    if (action === 'sticky_set') {
      if (!channel_id) return new Response(JSON.stringify({ error: 'No channel selected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Send the message first
      const payload = buildDiscordPayload(content, embed)
      const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        return new Response(JSON.stringify({ error: 'Failed to send', details: err }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const msg = await res.json()

      // Upsert sticky config
      const { error: dbErr } = await sb.from('sticky_messages').upsert({
        channel_id,
        message_id: msg.id,
        message_content: content || '',
        embed_data: embed || {},
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'channel_id' })

      if (dbErr) return new Response(JSON.stringify({ error: dbErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true, message_id: msg.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Refresh sticky: delete old message, send new one (called by bot on MESSAGE_CREATE or manually)
    if (action === 'sticky_refresh') {
      if (!channel_id) return new Response(JSON.stringify({ error: 'No channel' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const { data: sticky } = await sb.from('sticky_messages').select('*').eq('channel_id', channel_id).eq('is_active', true).single()
      if (!sticky) return new Response(JSON.stringify({ error: 'No sticky for this channel' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Delete old message
      if (sticky.message_id) {
        await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/${sticky.message_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        }).catch(() => {})
      }

      // Send new
      const payload = buildDiscordPayload(sticky.message_content, sticky.embed_data)
      const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Failed to resend' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const msg = await res.json()

      await sb.from('sticky_messages').update({ message_id: msg.id, updated_at: new Date().toISOString() }).eq('channel_id', channel_id)
      return new Response(JSON.stringify({ success: true, message_id: msg.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Remove sticky from channel
    if (action === 'sticky_remove') {
      if (!channel_id) return new Response(JSON.stringify({ error: 'No channel' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const { data: sticky } = await sb.from('sticky_messages').select('*').eq('channel_id', channel_id).single()
      if (sticky?.message_id) {
        await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/${sticky.message_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        }).catch(() => {})
      }
      await sb.from('sticky_messages').delete().eq('channel_id', channel_id)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // List active sticky messages
    if (action === 'sticky_list') {
      const { data, error } = await sb.from('sticky_messages').select('*').eq('is_active', true).order('created_at', { ascending: false })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ stickies: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
