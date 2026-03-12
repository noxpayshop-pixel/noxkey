import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nacl from 'https://esm.sh/tweetnacl@1.0.3'

const TICKET_TYPES = [
  { label: '🛒 Purchase Issue', value: 'purchase', emoji: '🛒', description: 'Problems with a purchase or order' },
  { label: '🔄 Replacement', value: 'replacement', emoji: '🔄', description: 'Request a replacement for your product' },
  { label: '❓ General Support', value: 'support', emoji: '❓', description: 'General questions or help' },
  { label: '🐛 Bug Report', value: 'bug', emoji: '🐛', description: 'Report a bug or technical issue' },
  { label: '💬 Other', value: 'other', emoji: '💬', description: 'Anything else' },
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

Deno.serve(async (req) => {
  const publicKey = Deno.env.get('DISCORD_TICKET_PUBLIC_KEY')!
  const botToken = Deno.env.get('DISCORD_TICKET_BOT_TOKEN')!
  const guildId = Deno.env.get('DISCORD_GUILD_ID')!

  const { valid, body } = await verifySignature(req, publicKey)
  if (!valid) {
    return new Response('Invalid signature', { status: 401 })
  }

  const interaction = JSON.parse(body)

  // PING
  if (interaction.type === 1) {
    return Response.json({ type: 1 })
  }

  // APPLICATION_COMMAND (slash commands)
  if (interaction.type === 2) {
    const commandName = interaction.data.name
    const member = interaction.member

    if (!hasRole(member)) {
      return Response.json({
        type: 4,
        data: {
          content: '❌ You do not have permission to use this command.',
          flags: 64,
        },
      })
    }

    if (commandName === 'panel') {
      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '🎫 The Nox — Support Tickets',
              description: [
                'Need help? Open a ticket by selecting a category below.',
                '',
                '**Available categories:**',
                '🛒 **Purchase Issue** — Problems with orders',
                '🔄 **Replacement** — Product replacements',
                '❓ **General Support** — Questions & help',
                '🐛 **Bug Report** — Technical issues',
                '💬 **Other** — Anything else',
                '',
                '> *Please select a category from the dropdown to open a ticket.*',
              ].join('\n'),
              color: 0x7c3aed,
              footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
              timestamp: new Date().toISOString(),
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: 'ticket_open',
                  placeholder: '📩 Select a category to open a ticket...',
                  options: TICKET_TYPES.map((t) => ({
                    label: t.label,
                    value: t.value,
                    description: t.description,
                  })),
                },
              ],
            },
          ],
        },
      })
    }

    if (commandName === 'setup') {
      // Create categories for tickets
      const categoryNames = [
        '🎫 Tickets — Purchase',
        '🎫 Tickets — Replacement',
        '🎫 Tickets — Support',
        '🎫 Tickets — Bug Reports',
        '🎫 Tickets — Other',
      ]

      const createdCategories: string[] = []

      for (const name of categoryNames) {
        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              type: 4, // GUILD_CATEGORY
              permission_overwrites: [
                {
                  id: guildId, // @everyone
                  type: 0,
                  deny: '1024', // VIEW_CHANNEL
                },
              ],
            }),
          })

          if (res.ok) {
            const cat = await res.json()
            createdCategories.push(cat.name)
          }
        } catch {}
      }

      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '✅ Setup Complete',
              description: `Created ${createdCategories.length} ticket categories:\n${createdCategories.map((c) => `• ${c}`).join('\n')}`,
              color: 0x22c55e,
              footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
            },
          ],
          flags: 64,
        },
      })
    }
  }

  // MESSAGE_COMPONENT (dropdown select)
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id

    if (customId === 'ticket_open') {
      const selectedValue = interaction.data.values[0]
      const userId = interaction.member.user.id
      const username = interaction.member.user.username

      const ticketType = TICKET_TYPES.find((t) => t.value === selectedValue)
      const typeLabel = ticketType?.label || selectedValue

      // Map ticket type to category name prefix for lookup
      const categoryMap: Record<string, string> = {
        purchase: 'tickets-—-purchase',
        replacement: 'tickets-—-replacement',
        support: 'tickets-—-support',
        bug: 'tickets-—-bug-reports',
        other: 'tickets-—-other',
      }

      // Find the matching category
      let parentId: string | null = null
      try {
        const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          headers: { Authorization: `Bot ${botToken}` },
        })
        const channels = await channelsRes.json()
        const categorySlug = categoryMap[selectedValue] || ''
        const category = channels.find(
          (c: any) => c.type === 4 && c.name.toLowerCase().includes(categorySlug)
        )
        if (category) parentId = category.id
      } catch {}

      // Create ticket channel
      const ticketChannelName = `ticket-${username}-${Date.now().toString(36)}`

      const channelPayload: any = {
        name: ticketChannelName,
        type: 0, // GUILD_TEXT
        permission_overwrites: [
          {
            id: guildId, // @everyone — deny view
            type: 0,
            deny: '1024',
          },
          {
            id: userId, // ticket creator — allow view + send
            type: 1,
            allow: '3072', // VIEW_CHANNEL + SEND_MESSAGES
          },
        ],
      }

      if (parentId) {
        channelPayload.parent_id = parentId
      }

      // Acknowledge immediately with deferred update
      // We need to respond first, then do the channel creation
      // Use type 6 (DEFERRED_UPDATE_MESSAGE) to acknowledge without changing the message
      // Then use followup

      // Actually for select menus we should acknowledge and then do work via followup
      // Type 6 = DEFERRED_UPDATE_MESSAGE (doesn't change the original)
      // But we want to send an ephemeral message to the user

      // Let's use type 4 (CHANNEL_MESSAGE_WITH_SOURCE) with ephemeral flag
      // But we need to create the channel first... let's do it inline since it's fast

      try {
        const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(channelPayload),
        })

        if (!createRes.ok) {
          const err = await createRes.text()
          return Response.json({
            type: 4,
            data: {
              content: `❌ Could not create ticket channel. Error: ${err}`,
              flags: 64,
            },
          })
        }

        const ticketChannel = await createRes.json()

        // Send welcome message in the ticket channel asking user to describe their issue
        await fetch(`https://discord.com/api/v10/channels/${ticketChannel.id}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `<@${userId}>`,
            embeds: [
              {
                title: `🎫 ${typeLabel}`,
                description: [
                  `Hey <@${userId}>, welcome to your ticket!`,
                  '',
                  '**Please describe your issue or question below:**',
                  '• What product or service is this about?',
                  '• What exactly happened or what do you need help with?',
                  '• Include any relevant screenshots, order IDs, or details.',
                  '',
                  '> *A team member will be with you shortly. Please be patient!*',
                ].join('\n'),
                color: 0x7c3aed,
                footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
                timestamp: new Date().toISOString(),
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 4, // DANGER
                    label: '🔒 Close Ticket',
                    custom_id: `ticket_close_${ticketChannel.id}`,
                  },
                ],
              },
            ],
          }),
        })

        return Response.json({
          type: 4,
          data: {
            content: `✅ Your ticket has been created: <#${ticketChannel.id}>`,
            flags: 64,
          },
        })
      } catch (err) {
        return Response.json({
          type: 4,
          data: {
            content: `❌ An error occurred while creating your ticket: ${String(err)}`,
            flags: 64,
          },
        })
      }
    }

    // Handle ticket close button
    if (customId.startsWith('ticket_close_')) {
      const channelId = customId.replace('ticket_close_', '')

      // Check if user has the required role
      if (!hasRole(interaction.member)) {
        return Response.json({
          type: 4,
          data: {
            content: '❌ Only staff members can close tickets.',
            flags: 64,
          },
        })
      }

      // Delete the channel
      try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        })
      } catch {}

      return Response.json({
        type: 4,
        data: {
          content: '✅ Ticket closed.',
          flags: 64,
        },
      })
    }
  }

  return Response.json({ type: 1 })
})
