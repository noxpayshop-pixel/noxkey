import nacl from 'https://esm.sh/tweetnacl@1.0.3'

const TICKET_TYPES = [
  { label: 'Purchase Issue', value: 'purchase', emoji: '🛒', description: 'Problems with a purchase or order' },
  { label: 'Replacement', value: 'replacement', emoji: '🔄', description: 'Request a replacement for your product' },
  { label: 'General Support', value: 'support', emoji: '❓', description: 'General questions or help' },
  { label: 'Bug Report', value: 'bug', emoji: '🐛', description: 'Report a bug or technical issue' },
  { label: 'Other', value: 'other', emoji: '💬', description: 'Anything else' },
]

const REQUIRED_ROLE_ID = '1481337204767981841'

function hexToUint8Array(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return arr
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

async function createTicket(botToken: string, guildId: string, selectedValue: string, userId: string, username: string) {
  const ticketType = TICKET_TYPES.find(t => t.value === selectedValue)
  const typeLabel = ticketType?.label || selectedValue
  const typeEmoji = ticketType?.emoji || '🎫'

  // Find matching category
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

  // Send welcome message
  await fetch(`https://discord.com/api/v10/channels/${ticketChannel.id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `<@${userId}>`,
      embeds: [{
        title: `${typeEmoji}  ${typeLabel}`,
        description: [
          `Hey <@${userId}>, welcome to your ticket!`,
          '',
          '## 📝 Please describe your issue',
          '',
          '> • What product or service is this about?',
          '> • What exactly happened?',
          '> • Include any screenshots, order IDs, or details.',
          '',
          `-# A team member will be with you shortly. Please be patient!`,
        ].join('\n'),
        color: 0x7c3aed,
        footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
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

  // Edit the original deferred response with the ticket link
  // We use a followup message instead
  const appId = Deno.env.get('DISCORD_TICKET_APP_ID')!
  const interactionToken = (globalThis as any).__currentInteractionToken
  if (interactionToken) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${interactionToken}/messages/@original`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>` }),
    })
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
      return Response.json({
        type: 4,
        data: {
          embeds: [{
            title: '🎫 Support Panel',
            description: [
              `Create a support request with **The Nox**.`,
              '',
              `**Professional support** tailored to your needs`,
              `**Fast responses** — no long wait times`,
              `**Secure & private** ticket channels`,
              '',
              `## ✦ Start your ticket`,
              '',
              `Select the service you want from the menu below to create your ticket.`,
            ].join('\n'),
            color: 0x7c3aed,
            thumbnail: {
              url: 'https://cdn.discordapp.com/icons/' + guildId + '/a_placeholder.png',
            },
            footer: { text: '© The Nox • Ticket System' },
          }],
          components: [{
            type: 1,
            components: [{
              type: 3,
              custom_id: 'ticket_open',
              placeholder: 'Choose your ticket type',
              options: TICKET_TYPES.map(t => ({
                label: t.label, value: t.value, description: t.description,
                emoji: { name: t.emoji },
              })),
            }],
          }],
        },
      })
    }

    if (commandName === 'setup') {
      const categoryNames = [
        '🎫 Tickets — Purchase',
        '🎫 Tickets — Replacement',
        '🎫 Tickets — Support',
        '🎫 Tickets — Bug Reports',
        '🎫 Tickets — Other',
      ]
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
  }

  // MESSAGE_COMPONENT
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id

    if (customId === 'ticket_open') {
      const selectedValue = interaction.data.values[0]
      const userId = interaction.member.user.id
      const username = interaction.member.user.username

      // Store token for background task
      ;(globalThis as any).__currentInteractionToken = interaction.token

      // Defer response, do heavy work in background
      EdgeRuntime.waitUntil(
        createTicket(botToken, guildId, selectedValue, userId, username).catch(e => console.error('Ticket creation error:', e))
      )

      // Return deferred ephemeral response (type 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE)
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
