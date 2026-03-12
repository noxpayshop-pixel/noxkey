import nacl from 'https://esm.sh/tweetnacl@1.0.3'

const TICKET_TYPES = [
  { label: 'Purchase Issue', value: 'purchase', emoji_name: 'purchase', description: 'Problems with a purchase or order' },
  { label: 'Replacement', value: 'replacement', emoji_name: 'replacement', description: 'Request a replacement for your product' },
  { label: 'General Support', value: 'support', emoji_name: 'support', description: 'General questions or help' },
  { label: 'Bug Report', value: 'bug', emoji_name: 'bug', description: 'Report a bug or technical issue' },
  { label: 'Other', value: 'other', emoji_name: 'other', description: 'Anything else' },
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

// Fetch custom emojis from the guild and build a lookup map
async function getGuildEmojis(botToken: string, guildId: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
      headers: { Authorization: `Bot ${botToken}` },
    })
    if (!res.ok) return {}
    const emojis = await res.json()
    const map: Record<string, string> = {}
    for (const e of emojis) {
      map[e.name.toLowerCase()] = `<:${e.name}:${e.id}>`
    }
    return map
  } catch {
    return {}
  }
}

// Get a custom emoji string or fallback to default
function getEmoji(emojiMap: Record<string, string>, name: string, fallback: string): string {
  // Try exact match, then common variations
  const lower = name.toLowerCase()
  if (emojiMap[lower]) return emojiMap[lower]
  // Try with nox_ prefix
  if (emojiMap[`nox_${lower}`]) return emojiMap[`nox_${lower}`]
  // Try ticket_ prefix
  if (emojiMap[`ticket_${lower}`]) return emojiMap[`ticket_${lower}`]
  return fallback
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

  // Fetch guild emojis for custom emoji usage
  const emojiMap = await getGuildEmojis(botToken, guildId)
  
  // Get branded emojis with fallbacks
  const ticketEmoji = getEmoji(emojiMap, 'ticket', '🎫')
  const purchaseEmoji = getEmoji(emojiMap, 'purchase', '🛒')
  const replacementEmoji = getEmoji(emojiMap, 'replacement', '🔄')
  const supportEmoji = getEmoji(emojiMap, 'support', '❓')
  const bugEmoji = getEmoji(emojiMap, 'bug', '🐛')
  const otherEmoji = getEmoji(emojiMap, 'other', '💬')
  const starEmoji = getEmoji(emojiMap, 'star', '✦')
  const arrowEmoji = getEmoji(emojiMap, 'arrow', '➜')
  const lockEmoji = getEmoji(emojiMap, 'lock', '🔒')
  const noxEmoji = getEmoji(emojiMap, 'nox', '💜')

  const emojiForType: Record<string, string> = {
    purchase: purchaseEmoji,
    replacement: replacementEmoji,
    support: supportEmoji,
    bug: bugEmoji,
    other: otherEmoji,
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
              title: `${ticketEmoji}  Support Panel`,
              description: [
                `Open a support ticket with **The Nox**.`,
                '',
                `**Professional support** tailored to your needs`,
                `**Fast responses** — no long wait times`,
                `**Secure & private** ticket channels`,
                '',
                `## ${starEmoji} Start your ticket`,
                '',
                `Select the category from the menu below to create your ticket.`,
              ].join('\n'),
              color: 0x7c3aed,
              thumbnail: {
                url: 'https://cdn.discordapp.com/icons/' + guildId + '/a_placeholder.png',
              },
              footer: { text: '© The Nox • Ticket System' },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: 'ticket_open',
                  placeholder: 'Choose your ticket type',
                  options: TICKET_TYPES.map((t) => ({
                    label: t.label,
                    value: t.value,
                    description: t.description,
                    emoji: { name: t.value === 'purchase' ? '🛒' : t.value === 'replacement' ? '🔄' : t.value === 'support' ? '❓' : t.value === 'bug' ? '🐛' : '💬' },
                  })),
                },
              ],
            },
          ],
        },
      })
    }

    if (commandName === 'setup') {
      const categoryNames = [
        { name: '🎫 Tickets — Purchase', slug: 'purchase' },
        { name: '🎫 Tickets — Replacement', slug: 'replacement' },
        { name: '🎫 Tickets — Support', slug: 'support' },
        { name: '🎫 Tickets — Bug Reports', slug: 'bug' },
        { name: '🎫 Tickets — Other', slug: 'other' },
      ]

      const createdCategories: string[] = []
      const errors: string[] = []

      for (const cat of categoryNames) {
        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: cat.name,
              type: 4,
              permission_overwrites: [
                {
                  id: guildId,
                  type: 0,
                  deny: '1024',
                },
              ],
            }),
          })

          if (res.ok) {
            const created = await res.json()
            createdCategories.push(created.name)
          } else {
            const errText = await res.text()
            errors.push(`${cat.name}: ${errText}`)
          }
        } catch (e) {
          errors.push(`${cat.name}: ${String(e)}`)
        }
      }

      const desc = createdCategories.length > 0
        ? `Created ${createdCategories.length} ticket categories:\n${createdCategories.map((c) => `• ${c}`).join('\n')}`
        : 'No categories were created.'

      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '✅ Setup Complete',
              description: desc + (errors.length > 0 ? `\n\n**Errors:**\n${errors.join('\n')}` : ''),
              color: 0x22c55e,
              footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
            },
          ],
          flags: 64,
        },
      })
    }
  }

  // MESSAGE_COMPONENT (dropdown select / buttons)
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id

    if (customId === 'ticket_open') {
      const selectedValue = interaction.data.values[0]
      const userId = interaction.member.user.id
      const username = interaction.member.user.username
      const typeEmoji = emojiForType[selectedValue] || '🎫'
      const ticketType = TICKET_TYPES.find((t) => t.value === selectedValue)
      const typeLabel = ticketType?.label || selectedValue

      // Map ticket type to category name for lookup
      const categoryMap: Record<string, string> = {
        purchase: 'purchase',
        replacement: 'replacement',
        support: 'support',
        bug: 'bug',
        other: 'other',
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
          (c: any) => c.type === 4 && c.name.toLowerCase().includes('ticket') && c.name.toLowerCase().includes(categorySlug)
        )
        if (category) parentId = category.id
      } catch (e) {
        console.error('Failed to fetch channels:', e)
      }

      // Create ticket channel
      const ticketChannelName = `ticket-${username}-${Date.now().toString(36)}`

      const channelPayload: any = {
        name: ticketChannelName,
        type: 0,
        permission_overwrites: [
          {
            id: guildId,
            type: 0,
            deny: '1024',
          },
          {
            id: userId,
            type: 1,
            allow: '3072',
          },
        ],
      }

      if (parentId) {
        channelPayload.parent_id = parentId
      }

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
          console.error('Channel creation failed:', err)
          return Response.json({
            type: 4,
            data: {
              content: `❌ Could not create ticket channel.`,
              flags: 64,
            },
          })
        }

        const ticketChannel = await createRes.json()

        // Send welcome message in ticket channel
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
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 4,
                    label: 'Close Ticket',
                    custom_id: `ticket_close_${ticketChannel.id}`,
                    emoji: { name: '🔒' },
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
        console.error('Ticket creation error:', err)
        return Response.json({
          type: 4,
          data: {
            content: `❌ An error occurred while creating your ticket.`,
            flags: 64,
          },
        })
      }
    }

    // Handle ticket close button
    if (customId.startsWith('ticket_close_')) {
      const channelId = customId.replace('ticket_close_', '')

      if (!hasRole(interaction.member)) {
        return Response.json({
          type: 4,
          data: {
            content: '❌ Only staff members can close tickets.',
            flags: 64,
          },
        })
      }

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
