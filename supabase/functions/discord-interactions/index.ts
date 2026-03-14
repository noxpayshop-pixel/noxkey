import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Discord interaction types
const PING = 1
const MESSAGE_COMPONENT = 3
// Response types
const PONG = 1
const CHANNEL_MESSAGE_WITH_SOURCE = 4
const DEFERRED_UPDATE_MESSAGE = 6
const UPDATE_MESSAGE = 7

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp',
}

// Verify Discord signature using Web Crypto API
async function verifyDiscordSignature(req: Request, body: string): Promise<boolean> {
  const publicKey = Deno.env.get('DISCORD_GIVEAWAY_PUBLIC_KEY')
  if (!publicKey) return false

  const signature = req.headers.get('x-signature-ed25519')
  const timestamp = req.headers.get('x-signature-timestamp')
  if (!signature || !timestamp) return false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToUint8Array(publicKey),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    )

    const encoder = new TextEncoder()
    const message = encoder.encode(timestamp + body)
    const sig = hexToUint8Array(signature)

    return await crypto.subtle.verify('Ed25519', key, sig, message)
  } catch (e) {
    console.error('Signature verification error:', e)
    return false
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.text()

    // Verify signature
    const isValid = await verifyDiscordSignature(req, body)
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 })
    }

    const interaction = JSON.parse(body)

    // Handle PING (required by Discord)
    if (interaction.type === PING) {
      return new Response(JSON.stringify({ type: PONG }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle button interactions
    if (interaction.type === MESSAGE_COMPONENT) {
      const customId = interaction.data?.custom_id
      const userId = interaction.member?.user?.id || interaction.user?.id
      const username = interaction.member?.user?.username || interaction.user?.username
      const messageId = interaction.message?.id

      if (customId === 'giveaway_enter' && userId && messageId) {
        // Respond immediately with deferred update to avoid "interaction failed"
        // Then process in background
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const botToken = Deno.env.get('DISCORD_GIVEAWAY_BOT_TOKEN')!
        const sb = createClient(supabaseUrl, supabaseKey)

        // Find giveaway by message_id
        const { data: giveaway } = await sb.from('giveaways')
          .select('*')
          .eq('message_id', messageId)
          .eq('ended', false)
          .single()

        if (!giveaway) {
          return new Response(JSON.stringify({
            type: CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ This giveaway has ended or does not exist.',
              flags: 64, // Ephemeral
            },
          }), { headers: { 'Content-Type': 'application/json' } })
        }

        const entries: string[] = giveaway.entries || []

        if (entries.includes(userId)) {
          return new Response(JSON.stringify({
            type: CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '⚠️ You have already entered this giveaway!',
              flags: 64,
            },
          }), { headers: { 'Content-Type': 'application/json' } })
        }

        // Add entry
        entries.push(userId)
        await sb.from('giveaways').update({ entries }).eq('id', giveaway.id)

        // Update the giveaway embed with new entry count in background
        const config = await getEmbedConfig(sb, 'giveaway')
        const updatedEmbed = buildEmbed(config, {
          '{prize}': giveaway.prize,
          '{ends_at}': `<t:${Math.floor(new Date(giveaway.ends_at).getTime() / 1000)}:R>`,
          '{winner_count}': String(giveaway.winner_count),
        })
        updatedEmbed.description = (updatedEmbed.description || '') + `\n\n👥 **${entries.length}** entries`

        // Update the original message
        fetch(`https://discord.com/api/v10/channels/${giveaway.channel_id}/messages/${giveaway.message_id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [updatedEmbed],
            components: [{
              type: 1,
              components: [{
                type: 2,
                style: 1,
                label: '🎉 Enter Giveaway',
                custom_id: 'giveaway_enter',
              }],
            }],
          }),
        }).catch(() => {})

        return new Response(JSON.stringify({
          type: CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `✅ You have entered the giveaway for **${giveaway.prize}**! (Entry #${entries.length})`,
            flags: 64,
          },
        }), { headers: { 'Content-Type': 'application/json' } })
      }
    }

    // Unknown interaction
    return new Response(JSON.stringify({
      type: CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Unknown interaction.', flags: 64 },
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Interaction error:', err)
    return new Response(JSON.stringify({
      type: CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: '❌ An error occurred.', flags: 64 },
    }), { headers: { 'Content-Type': 'application/json' } })
  }
})

// Helpers
async function getEmbedConfig(sb: any, type: string) {
  const { data } = await sb.from('bot_embed_config').select('*').eq('bot_type', type).single()
  return data
}

function buildEmbed(config: any, vars: Record<string, string>) {
  let title = config?.embed_title || ''
  let description = config?.embed_description || ''
  for (const [k, v] of Object.entries(vars)) {
    title = title.replaceAll(k, v)
    description = description.replaceAll(k, v)
  }
  const embed: any = {}
  if (title) embed.title = title
  if (description) embed.description = description
  if (config?.embed_color) embed.color = parseInt(config.embed_color.replace('#', ''), 16)
  if (config?.embed_image_url) embed.image = { url: config.embed_image_url }
  if (config?.embed_footer_text) embed.footer = { text: config.embed_footer_text }
  return embed
}
