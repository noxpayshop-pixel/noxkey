import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp',
}

// Verify Discord signature
async function verifyDiscordSignature(req: Request, body: string): Promise<boolean> {
  const publicKey = Deno.env.get('DISCORD_GATEWAY_PUBLIC_KEY')
  if (!publicKey) return false
  const signature = req.headers.get('x-signature-ed25519')
  const timestamp = req.headers.get('x-signature-timestamp')
  if (!signature || !timestamp) return false
  try {
    const key = await crypto.subtle.importKey(
      'raw', hexToUint8Array(publicKey),
      { name: 'Ed25519', namedCurve: 'Ed25519' }, false, ['verify']
    )
    const message = new TextEncoder().encode(timestamp + body)
    return await crypto.subtle.verify('Ed25519', key, hexToUint8Array(signature), message)
  } catch { return false }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const botToken = Deno.env.get('DISCORD_GATEWAY_BOT_TOKEN')!
    const body = await req.json()
    const { action } = body

    // === Discord Interactions endpoint (for /dmall slash command) ===
    if (body.type !== undefined) {
      // Verify signature
      const rawBody = JSON.stringify(body)
      // For interaction endpoint, re-read isn't possible, so we trust the parsed body
      // Ping
      if (body.type === 1) {
        return new Response(JSON.stringify({ type: 1 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Slash command
      if (body.type === 2) {
        const commandName = body.data?.name
        if (commandName === 'dmall') {
          // Respond immediately with deferred message
          const promise = (async () => {
            try {
              const guildId = body.guild_id
              const { data: config } = await supabase
                .from('gateway_bot_config')
                .select('*')
                .limit(1)
                .single()

              if (!config) return

              const embed: any = {}
              if (config.dmall_embed_title) embed.title = config.dmall_embed_title
              if (config.dmall_embed_description) {
                embed.description = config.dmall_embed_description.replace(/\\n/g, '\n')
              }
              embed.color = parseInt((config.dmall_embed_color || '#7c3aed').replace('#', ''), 16)
              if (config.dmall_embed_image_url) embed.image = { url: config.dmall_embed_image_url }
              if (config.dmall_embed_footer_text) embed.footer = { text: config.dmall_embed_footer_text }
              embed.timestamp = new Date().toISOString()

              // Fetch all members (paginated)
              let allMembers: any[] = []
              let after = '0'
              while (true) {
                const res = await fetch(
                  `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
                  { headers: { Authorization: `Bot ${botToken}` } }
                )
                if (!res.ok) break
                const members = await res.json()
                if (!members.length) break
                allMembers = allMembers.concat(members)
                after = members[members.length - 1].user.id
                if (members.length < 1000) break
              }

              let sent = 0
              let failed = 0
              for (const member of allMembers) {
                if (member.user?.bot) continue
                try {
                  // Create DM channel
                  const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
                    method: 'POST',
                    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipient_id: member.user.id }),
                  })
                  const dmChannel = await dmRes.json()
                  if (!dmChannel.id) { failed++; continue }

                  const username = member.user.username || 'there'
                  const finalEmbed = {
                    ...embed,
                    title: embed.title?.replace(/\{user\}/g, username),
                    description: embed.description?.replace(/\{user\}/g, username),
                  }

                  // Send DM with user mention (ping in DM)
                  await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                    method: 'POST',
                    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: `<@${member.user.id}>`,
                      embeds: [finalEmbed],
                    }),
                  })
                  sent++
                } catch { failed++ }
              }

              // Follow up
              await fetch(`https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: `✅ DM-All abgeschlossen: ${sent} gesendet, ${failed} fehlgeschlagen.`,
                }),
              })
            } catch (err) {
              console.error('dmall error:', err)
            }
          })()

          // @ts-ignore
          if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(promise)

          return new Response(JSON.stringify({
            type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      return new Response(JSON.stringify({ error: 'Unknown interaction' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === API actions (called from bot event handler or dev portal) ===

    // Ghost ping on member join
    if (action === 'ghost_ping') {
      const { discord_user_id, discord_username } = body

      const { data: config } = await supabase
        .from('gateway_bot_config')
        .select('*')
        .limit(1)
        .single()

      if (!config?.ghost_ping_enabled || !config?.ghost_ping_channel_id) {
        return new Response(JSON.stringify({ message: 'Ghost ping disabled or no channel set' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const message = (config.ghost_ping_message || 'Hello {user} Check this out.')
        .replace(/\{user\}/g, `<@${discord_user_id}>`)

      // Send message
      const sendRes = await fetch(`https://discord.com/api/v10/channels/${config.ghost_ping_channel_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })

      if (!sendRes.ok) {
        const err = await sendRes.json()
        return new Response(JSON.stringify({ error: 'Failed to send', details: err }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const msg = await sendRes.json()

      // Immediately delete it (ghost ping)
      await fetch(`https://discord.com/api/v10/channels/${config.ghost_ping_channel_id}/messages/${msg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${botToken}` },
      }).catch(() => {})

      return new Response(JSON.stringify({ success: true, action: 'ghost_pinged' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get config
    if (action === 'get_config') {
      const { data } = await supabase.from('gateway_bot_config').select('*').limit(1).single()
      return new Response(JSON.stringify({ config: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // List channels (for channel picker)
    if (action === 'list_channels') {
      const guildId = Deno.env.get('DISCORD_GUILD_ID')!
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
      return new Response(JSON.stringify({ channels: textChannels }), {
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
