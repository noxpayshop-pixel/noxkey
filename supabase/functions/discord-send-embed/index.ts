import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')!
    const guildId = Deno.env.get('DISCORD_GUILD_ID')!
    const { action, channel_id, embed, content } = await req.json()

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
      // Filter text channels (type 0) and announcement channels (type 5)
      const textChannels = channels
        .filter((c: any) => c.type === 0 || c.type === 5)
        .map((c: any) => ({ id: c.id, name: c.name, type: c.type, position: c.position, parent_id: c.parent_id }))
        .sort((a: any, b: any) => a.position - b.position)

      // Get categories for grouping
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

      // Build the message payload
      const payload: any = {}

      if (content) payload.content = content

      if (embed) {
        const discordEmbed: any = {}
        if (embed.title) discordEmbed.title = embed.title
        if (embed.description) discordEmbed.description = embed.description
        if (embed.url) discordEmbed.url = embed.url
        if (embed.color) discordEmbed.color = parseInt(embed.color.replace('#', ''), 16)
        if (embed.timestamp) discordEmbed.timestamp = new Date().toISOString()

        if (embed.author_name) {
          discordEmbed.author = {
            name: embed.author_name,
            ...(embed.author_url && { url: embed.author_url }),
            ...(embed.author_icon_url && { icon_url: embed.author_icon_url }),
          }
        }

        if (embed.thumbnail_url) {
          discordEmbed.thumbnail = { url: embed.thumbnail_url }
        }

        if (embed.image_url) {
          discordEmbed.image = { url: embed.image_url }
        }

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

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
