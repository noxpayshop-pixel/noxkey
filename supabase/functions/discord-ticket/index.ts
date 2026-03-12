import nacl from 'https://esm.sh/tweetnacl@1.0.3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REQUIRED_ROLE_ID = '1481337204767981841'

const DEFAULT_TICKET_TYPES = [
  { label: 'Purchase Issue', value: 'purchase', emoji: '🛒', description: 'Problems with a purchase or order' },
  { label: 'Replacement', value: 'replacement', emoji: '🔄', description: 'Request a replacement for your product' },
  { label: 'General Support', value: 'support', emoji: '❓', description: 'General questions or help' },
  { label: 'Bug Report', value: 'bug', emoji: '🐛', description: 'Report a bug or technical issue' },
  { label: 'Other', value: 'other', emoji: '💬', description: 'Anything else' },
]

function hexToUint8Array(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return arr
}

function hexColorToInt(hex: string): number {
  return parseInt((hex || '#7c3aed').replace('#', ''), 16)
}

async function verifySignature(req: Request, publicKey: string): Promise<{ valid: boolean; body: string }> {
  const signature = req.headers.get('x-signature-ed25519')
  const timestamp = req.headers.get('x-signature-timestamp')
  const body = await req.text()
  if (!signature || !timestamp) return { valid: false, body }
  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(publicKey)
  )
  return { valid: isValid, body }
}

function hasRole(member: any): boolean {
  return member?.roles?.includes(REQUIRED_ROLE_ID) ?? false
}

async function getPanelConfig() {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseKey)
    const { data } = await sb.from('ticket_panel_config').select('*').limit(1).single()
    if (data) {
      return {
        ...data,
        ticket_types: typeof data.ticket_types === 'string' ? JSON.parse(data.ticket_types) : data.ticket_types,
      }
    }
  } catch (e) {
    console.error('Failed to fetch panel config:', e)
  }
  return null
}

function parseEmojiForDropdown(emojiStr: string): { name: string; id?: string; animated?: boolean } | null {
  const customMatch = emojiStr.match(/^<(a?):(\w+):(\d+)>$/)
  if (customMatch) {
    return { name: customMatch[2], id: customMatch[3], animated: customMatch[1] === 'a' }
  }
  return { name: emojiStr }
}

async function createTicket(botToken: string, guildId: string, selectedValue: string, userId: string, username: string, interactionToken: string) {
  const config = await getPanelConfig()
  const ticketTypes = config?.ticket_types || DEFAULT_TICKET_TYPES
  const ticketType = ticketTypes.find((t: any) => t.value === selectedValue)
  const typeLabel = ticketType?.label || selectedValue
  const typeEmoji = ticketType?.emoji || '🎫'

  let parentId: string | null = null
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
    })
    const channels = await res.json()
    const cat = channels.find((c: any) => c.type === 4 && c.name.toLowerCase().includes('ticket') && c.name.toLowerCase().includes(selectedValue))
    if (cat) parentId = cat.id
  } catch (e) {
    console.error('Failed to fetch channels:', e)
  }

  const channelPayload: any = {
    name: `ticket-${username}-${Date.now().toString(36)}`,
    type: 0,
    permission_overwrites: [
      { id: guildId, type: 0, deny: '1024' },
      { id: userId, type: 1, allow: '3072' },
    ],
  }
  if (parentId) channelPayload.parent_id = parentId

  const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(channelPayload),
  })

  if (!createRes.ok) {
    console.error('Channel creation failed:', await createRes.text())
    return
  }

  const ticketChannel = await createRes.json()

  const welcomeTitle = (config?.welcome_title || '{emoji} {label}')
    .replace(/\{emoji\}/g, typeEmoji)
    .replace(/\{label\}/g, typeLabel)
  const welcomeDesc = (config?.welcome_description || 'Hey {user}, welcome to your ticket!')
    .replace(/\{user\}/g, `<@${userId}>`)
    .replace(/\{emoji\}/g, typeEmoji)
    .replace(/\{label\}/g, typeLabel)
  const welcomeColor = hexColorToInt(config?.welcome_color || '#7c3aed')
  const welcomeFooter = config?.welcome_footer_text || 'The Nox — We Care About YOU ✦ Premium Digital Delivery'

  await fetch(`https://discord.com/api/v10/channels/${ticketChannel.id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `<@${userId}>`,
      embeds: [{
        title: welcomeTitle,
        description: welcomeDesc,
        color: welcomeColor,
        footer: { text: welcomeFooter },
        timestamp: new Date().toISOString(),
      }],
      components: [{
        type: 1,
        components: [{
          type: 2, style: 4, label: 'Close Ticket',
          custom_id: `ticket_close_${ticketChannel.id}`,
          emoji: { name: '🔒' },
        }],
      }],
    }),
  })

  const appId = Deno.env.get('DISCORD_TICKET_APP_ID')!
  if (interactionToken) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` }),
    })
  }
}

async function handlePing(botToken: string, interaction: any) {
  const config = await getPanelConfig()
  const channelId = interaction.channel_id
  const channelName = interaction.channel?.name || 'ticket'

  // Get channel to find the ticket owner from permission overwrites
  let ticketOwnerId: string | null = null
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    })
    const channel = await res.json()
    // Find user permission overwrite (type 1) that isn't the bot
    const userOverwrite = channel.permission_overwrites?.find((o: any) => o.type === 1)
    if (userOverwrite) ticketOwnerId = userOverwrite.id
  } catch (e) {
    console.error('Failed to get channel:', e)
  }

  if (!ticketOwnerId) {
    return Response.json({ type: 4, data: { content: '❌ Could not find the ticket owner.', flags: 64 } })
  }

  // Build DM message from config
  const dmTemplate = config?.ping_dm_message || 'Hey {user}! 👋\n\nYou have an open ticket that needs your attention.\n\nPlease check your ticket and respond as soon as possible!'
  const dmContent = dmTemplate
    .replace(/\{user\}/g, `<@${ticketOwnerId}>`)
    .replace(/\{channel\}/g, `<#${channelId}>`)

  // Create DM channel then send message
  try {
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: ticketOwnerId }),
    })
    const dmChannel = await dmRes.json()

    await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: dmContent }),
    })

    return Response.json({ type: 4, data: { content: `✅ Ping sent to <@${ticketOwnerId}> via DM.`, flags: 64 } })
  } catch (e) {
    console.error('Failed to send DM:', e)
    return Response.json({ type: 4, data: { content: '❌ Failed to send DM. The user may have DMs disabled.', flags: 64 } })
  }
}

Deno.serve(async (req) => {
  const publicKey = Deno.env.get('DISCORD_TICKET_PUBLIC_KEY')!
  const botToken = Deno.env.get('DISCORD_TICKET_BOT_TOKEN')!
  const guildId = Deno.env.get('DISCORD_GUILD_ID')!

  const { valid, body } = await verifySignature(req, publicKey)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const interaction = JSON.parse(body)

  // PING
  if (interaction.type === 1) return Response.json({ type: 1 })

  // APPLICATION_COMMAND
  if (interaction.type === 2) {
    const commandName = interaction.data.name
    const member = interaction.member

    if (!hasRole(member)) {
      return Response.json({ type: 4, data: { content: '❌ You do not have permission to use this command.', flags: 64 } })
    }

    if (commandName === 'panel') {
      // Defer ephemeral so "xyz used /panel" is hidden
      const appId = Deno.env.get('DISCORD_TICKET_APP_ID')!
      const channelId = interaction.channel_id
      const token = interaction.token

      EdgeRuntime.waitUntil((async () => {
        try {
          const config = await getPanelConfig()
          const ticketTypes = config?.ticket_types || DEFAULT_TICKET_TYPES
          const embedColor = hexColorToInt(config?.embed_color || '#7c3aed')

          const embed: any = {
            description: config?.embed_description || 'Create a support request with **The Nox**.',
            color: embedColor,
          }
          if (config?.embed_title) embed.title = config.embed_title
          if (config?.embed_thumbnail_url) embed.thumbnail = { url: config.embed_thumbnail_url }
          if (config?.embed_image_url) embed.image = { url: config.embed_image_url }
          if (config?.embed_footer_text) embed.footer = { text: config.embed_footer_text }

          const dropdownOptions = ticketTypes.map((t: any) => {
            const opt: any = { label: t.label, value: t.value, description: t.description }
            const parsed = parseEmojiForDropdown(t.emoji)
            if (parsed) opt.emoji = parsed
            return opt
          })

          const dropdownComponent = {
            type: 1,
            components: [{
              type: 3,
              custom_id: 'ticket_open',
              placeholder: config?.dropdown_placeholder || 'Choose your ticket type',
              options: dropdownOptions,
            }],
          }

          const msgPayload: any = {
            embeds: [embed],
            components: [dropdownComponent],
          }
          if (config?.panel_content) msgPayload.content = config.panel_content

          // Post as bot message to the channel
          await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(msgPayload),
          })

          // Edit deferred response
          await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: '✅ Panel posted.' }),
          })
        } catch (e) {
          console.error('Panel post error:', e)
        }
      })())

      return Response.json({ type: 5, data: { flags: 64 } })
    }

    if (commandName === 'ping') {
      return await handlePing(botToken, interaction)
    }

    if (commandName === 'setup') {
      const config = await getPanelConfig()
      const ticketTypes = config?.ticket_types || DEFAULT_TICKET_TYPES
      const categoryNames = ticketTypes.map((t: any) => `🎫 Tickets — ${t.label}`)
      const created: string[] = []
      const errors: string[] = []

      for (const name of categoryNames) {
        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            method: 'POST',
            headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type: 4, permission_overwrites: [{ id: guildId, type: 0, deny: '1024' }] }),
          })
          if (res.ok) { created.push((await res.json()).name) }
          else { errors.push(`${name}: ${await res.text()}`) }
        } catch (e) { errors.push(`${name}: ${String(e)}`) }
      }

      return Response.json({
        type: 4,
        data: {
          embeds: [{
            title: '✅ Setup Complete',
            description: (created.length > 0 ? `Created ${created.length} categories:\n${created.map(c => `• ${c}`).join('\n')}` : 'No categories created.')
              + (errors.length > 0 ? `\n\n**Errors:**\n${errors.join('\n')}` : ''),
            color: 0x22c55e,
            footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
          }],
          flags: 64,
        },
      })
    }

    if (commandName === 'closeall') {
      const appId = Deno.env.get('DISCORD_TICKET_APP_ID')!
      const token = interaction.token

      EdgeRuntime.waitUntil((async () => {
        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${botToken}` },
          })
          const channels = await res.json()
          const ticketChannels = channels.filter((c: any) => c.type === 0 && c.name.startsWith('ticket-'))
          let closed = 0

          for (const ch of ticketChannels) {
            try {
              await fetch(`https://discord.com/api/v10/channels/${ch.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bot ${botToken}` },
              })
              closed++
            } catch {}
          }

          await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `✅ ${closed} Ticket(s) geschlossen.` }),
          })
        } catch (e) {
          console.error('closeall error:', e)
        }
      })())

      return Response.json({ type: 5, data: { flags: 64 } })
    }
  }

  // MESSAGE_COMPONENT
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id

    if (customId === 'ticket_open') {
      const selectedValue = interaction.data.values[0]
      const userId = interaction.member.user.id
      const username = interaction.member.user.username
      const token = interaction.token

      EdgeRuntime.waitUntil(
        createTicket(botToken, guildId, selectedValue, userId, username, token).catch(e => console.error('Ticket creation error:', e))
      )

      return Response.json({ type: 5, data: { flags: 64 } })
    }

    if (customId.startsWith('ticket_close_')) {
      const channelId = customId.replace('ticket_close_', '')
      if (!hasRole(interaction.member)) {
        return Response.json({ type: 4, data: { content: '❌ Only staff members can close tickets.', flags: 64 } })
      }
      try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: 'DELETE', headers: { Authorization: `Bot ${botToken}` },
        })
      } catch {}
      return Response.json({ type: 4, data: { content: '✅ Ticket closed.', flags: 64 } })
    }
  }

  return Response.json({ type: 1 })
})
