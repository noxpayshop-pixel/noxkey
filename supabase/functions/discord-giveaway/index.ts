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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { action } = body

    // Helper: get embed config
    async function getEmbedConfig(type: string) {
      const { data } = await sb.from('bot_embed_config').select('*').eq('bot_type', type).single()
      return data
    }

    // Helper: build embed from config with variable replacement
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

    // === CREATE GIVEAWAY ===
    if (action === 'create') {
      const { channel_id, title, prize, duration_minutes, winner_count, rigged_user_id, rigged_username } = body
      if (!channel_id || !prize || !duration_minutes) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const ends_at = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString()
      const config = await getEmbedConfig('giveaway')
      const embed = buildEmbed(config, {
        '{prize}': prize,
        '{ends_at}': `<t:${Math.floor(new Date(ends_at).getTime() / 1000)}:R>`,
        '{winner_count}': String(winner_count || 1),
      })

      // Send giveaway message
      const res = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [embed],
          components: [{
            type: 1,
            components: [{
              type: 2,
              style: 1, // Primary
              label: '🎉 Enter Giveaway',
              custom_id: 'giveaway_enter',
            }],
          }],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        return new Response(JSON.stringify({ error: 'Failed to send', details: err }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const msg = await res.json()

      // Save to DB
      const { data: giveaway, error: dbErr } = await sb.from('giveaways').insert({
        channel_id,
        message_id: msg.id,
        title: title || 'Giveaway',
        prize,
        winner_count: winner_count || 1,
        ends_at,
        rigged_user_id: rigged_user_id || null,
        rigged_username: rigged_username || null,
      }).select().single()

      if (dbErr) {
        return new Response(JSON.stringify({ error: dbErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, giveaway }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === ENTER GIVEAWAY (called by Discord bot interaction handler) ===
    if (action === 'enter') {
      const { giveaway_id, user_id, username } = body
      if (!giveaway_id || !user_id) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: giveaway } = await sb.from('giveaways').select('*').eq('id', giveaway_id).single()
      if (!giveaway) {
        return new Response(JSON.stringify({ error: 'Giveaway not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (giveaway.ended) {
        return new Response(JSON.stringify({ error: 'Giveaway has ended' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const entries = giveaway.entries || []
      if (entries.includes(user_id)) {
        return new Response(JSON.stringify({ error: 'Already entered' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      entries.push(user_id)
      await sb.from('giveaways').update({ entries }).eq('id', giveaway_id)

      // Update embed with entry count
      const config = await getEmbedConfig('giveaway')
      const updatedEmbed = buildEmbed(config, {
        '{prize}': giveaway.prize,
        '{ends_at}': `<t:${Math.floor(new Date(giveaway.ends_at).getTime() / 1000)}:R>`,
        '{winner_count}': String(giveaway.winner_count),
      })
      updatedEmbed.description += `\n\n👥 **${entries.length}** entries`

      await fetch(`https://discord.com/api/v10/channels/${giveaway.channel_id}/messages/${giveaway.message_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [updatedEmbed] }),
      }).catch(() => {})

      return new Response(JSON.stringify({ success: true, entry_count: entries.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === ENTER BY MESSAGE_ID (for bot interaction — find giveaway by message) ===
    if (action === 'enter_by_message') {
      const { message_id, user_id, username } = body
      const { data: giveaway } = await sb.from('giveaways').select('*').eq('message_id', message_id).eq('ended', false).single()
      if (!giveaway) {
        return new Response(JSON.stringify({ error: 'Giveaway not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Delegate to enter logic
      const entries = giveaway.entries || []
      if (entries.includes(user_id)) {
        return new Response(JSON.stringify({ already_entered: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      entries.push(user_id)
      await sb.from('giveaways').update({ entries }).eq('id', giveaway.id)

      // Update embed
      const config = await getEmbedConfig('giveaway')
      const updatedEmbed = buildEmbed(config, {
        '{prize}': giveaway.prize,
        '{ends_at}': `<t:${Math.floor(new Date(giveaway.ends_at).getTime() / 1000)}:R>`,
        '{winner_count}': String(giveaway.winner_count),
      })
      updatedEmbed.description += `\n\n👥 **${entries.length}** entries`

      await fetch(`https://discord.com/api/v10/channels/${giveaway.channel_id}/messages/${giveaway.message_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [updatedEmbed] }),
      }).catch(() => {})

      return new Response(JSON.stringify({ success: true, entry_count: entries.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === END GIVEAWAY (pick winner) ===
    if (action === 'end') {
      const { giveaway_id } = body
      if (!giveaway_id) {
        return new Response(JSON.stringify({ error: 'Missing giveaway_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: giveaway } = await sb.from('giveaways').select('*').eq('id', giveaway_id).single()
      if (!giveaway) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (giveaway.ended) {
        return new Response(JSON.stringify({ error: 'Already ended' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const entries: string[] = giveaway.entries || []
      const winnerCount = giveaway.winner_count || 1
      let winners: string[] = []

      // If rigged, ensure rigged user wins
      if (giveaway.rigged_user_id) {
        winners.push(giveaway.rigged_user_id)
        const remaining = entries.filter(e => e !== giveaway.rigged_user_id)
        // Pick additional winners if needed
        for (let i = 0; i < winnerCount - 1 && remaining.length > 0; i++) {
          const idx = Math.floor(Math.random() * remaining.length)
          winners.push(remaining.splice(idx, 1)[0])
        }
      } else {
        // Fair random selection
        const pool = [...entries]
        for (let i = 0; i < winnerCount && pool.length > 0; i++) {
          const idx = Math.floor(Math.random() * pool.length)
          winners.push(pool.splice(idx, 1)[0])
        }
      }

      // Update DB
      await sb.from('giveaways').update({
        ended: true,
        winner_ids: winners,
      }).eq('id', giveaway_id)

      // Update channel message with winner announcement
      const winnerMentions = winners.map(w => `<@${w}>`).join(', ')
      const endEmbed: any = {
        title: '🎉 Giveaway Ended!',
        description: `**${giveaway.prize}**\n\n${winners.length > 0 ? `🏆 Winner${winners.length > 1 ? 's' : ''}: ${winnerMentions}` : '❌ No entries, no winner.'}`,
        color: 0x22c55e,
        footer: { text: 'The Nox — We Care About YOU ✦' },
      }

      await fetch(`https://discord.com/api/v10/channels/${giveaway.channel_id}/messages/${giveaway.message_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [endEmbed],
          components: [], // Remove the button
        }),
      }).catch(() => {})

      // Send winner announcement in channel
      if (winners.length > 0) {
        await fetch(`https://discord.com/api/v10/channels/${giveaway.channel_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`,
          }),
        }).catch(() => {})
      }

      // DM winners
      const winnerConfig = await getEmbedConfig('giveaway_winner')
      for (const winnerId of winners) {
        try {
          // Open DM channel
          const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_id: winnerId }),
          })
          if (dmRes.ok) {
            const dm = await dmRes.json()
            const winEmbed = buildEmbed(winnerConfig, {
              '{prize}': giveaway.prize,
              '{user}': `<@${winnerId}>`,
            })
            await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ embeds: [winEmbed] }),
            })
          }
        } catch {}
      }

      return new Response(JSON.stringify({ success: true, winners }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === LIST GIVEAWAYS ===
    if (action === 'list') {
      const { data, error } = await sb.from('giveaways').select('*').order('created_at', { ascending: false }).limit(50)
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ giveaways: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === DELETE GIVEAWAY ===
    if (action === 'delete') {
      const { giveaway_id } = body
      const { data: giveaway } = await sb.from('giveaways').select('*').eq('id', giveaway_id).single()
      if (giveaway?.message_id) {
        await fetch(`https://discord.com/api/v10/channels/${giveaway.channel_id}/messages/${giveaway.message_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        }).catch(() => {})
      }
      await sb.from('giveaways').delete().eq('id', giveaway_id)
      return new Response(JSON.stringify({ success: true }), {
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
