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
    const { action, discord_user_id, discord_username } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')!

    // Get join DM config
    const { data: config } = await supabase
      .from('join_dm_config')
      .select('*')
      .limit(1)
      .single()

    if (!config?.is_enabled) {
      return new Response(JSON.stringify({ message: 'Join DM system is disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'member_join') {
      // Record the join
      await supabase.from('member_joins').upsert({
        discord_user_id,
        discord_username: discord_username || null,
        joined_at: new Date().toISOString(),
        welcome_sent: false,
        reminder_checked: false,
        reminder_sent: false,
        has_role: false,
      }, { onConflict: 'discord_user_id' })

      // Get welcome embed config
      const { data: embedCfg } = await supabase
        .from('bot_embed_config')
        .select('*')
        .eq('bot_type', 'join_welcome')
        .limit(1)
        .single()

      if (!embedCfg) {
        return new Response(JSON.stringify({ error: 'No join_welcome embed config found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create DM channel
      const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: discord_user_id }),
      })
      const dmChannel = await dmRes.json()

      if (!dmChannel.id) {
        return new Response(JSON.stringify({ error: 'Could not create DM channel', details: dmChannel }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const title = embedCfg.embed_title || undefined
      let desc = embedCfg.embed_description || ''
      desc = desc.replace(/\\n/g, '\n')
      const color = parseInt((embedCfg.embed_color || '#7c3aed').replace('#', ''), 16)

      // Replace variables
      const finalTitle = title?.replace(/\{user\}/g, discord_username || 'there')
      const finalDesc = desc.replace(/\{user\}/g, discord_username || 'there')

      await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: finalTitle || undefined,
            description: finalDesc,
            color,
            image: embedCfg.embed_image_url ? { url: embedCfg.embed_image_url } : undefined,
            footer: embedCfg.embed_footer_text ? { text: embedCfg.embed_footer_text } : undefined,
            timestamp: new Date().toISOString(),
          }],
        }),
      })

      // Mark welcome as sent
      await supabase
        .from('member_joins')
        .update({ welcome_sent: true })
        .eq('discord_user_id', discord_user_id)

      return new Response(JSON.stringify({ success: true, action: 'welcome_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'check_reminders') {
      // Find all joins older than check_after_hours that haven't been checked
      const hoursAgo = config.check_after_hours || 24
      const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()

      const { data: pendingJoins } = await supabase
        .from('member_joins')
        .select('*')
        .eq('reminder_checked', false)
        .eq('welcome_sent', true)
        .lte('joined_at', cutoff)
        .limit(50)

      if (!pendingJoins?.length) {
        return new Response(JSON.stringify({ message: 'No pending reminders', checked: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const guildId = Deno.env.get('DISCORD_GUILD_ID')!
      const requiredRoleId = config.required_role_id

      if (!requiredRoleId) {
        return new Response(JSON.stringify({ error: 'No required_role_id configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get reminder embed config
      const { data: reminderCfg } = await supabase
        .from('bot_embed_config')
        .select('*')
        .eq('bot_type', 'join_reminder')
        .limit(1)
        .single()

      const results: Array<{ user: string; status: string }> = []

      for (const join of pendingJoins) {
        try {
          // Check if member has the required role
          const memberRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${join.discord_user_id}`,
            { headers: { Authorization: `Bot ${botToken}` } }
          )

          if (!memberRes.ok) {
            // Member left the server
            await supabase
              .from('member_joins')
              .update({ reminder_checked: true, has_role: false })
              .eq('id', join.id)
            results.push({ user: join.discord_user_id, status: 'member_not_found' })
            continue
          }

          const member = await memberRes.json()
          const hasRole = member.roles?.includes(requiredRoleId)

          await supabase
            .from('member_joins')
            .update({ reminder_checked: true, has_role: hasRole })
            .eq('id', join.id)

          if (hasRole) {
            results.push({ user: join.discord_user_id, status: 'has_role' })
            continue
          }

          // User doesn't have the role — send reminder DM
          if (reminderCfg) {
            const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
              method: 'POST',
              headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipient_id: join.discord_user_id }),
            })
            const dmChannel = await dmRes.json()

            if (dmChannel.id) {
              const title = reminderCfg.embed_title || undefined
              let desc = reminderCfg.embed_description || ''
              desc = desc.replace(/\\n/g, '\n')
              const color = parseInt((reminderCfg.embed_color || '#f59e0b').replace('#', ''), 16)
              const username = join.discord_username || 'there'

              await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  embeds: [{
                    title: title?.replace(/\{user\}/g, username) || undefined,
                    description: desc.replace(/\{user\}/g, username),
                    color,
                    image: reminderCfg.embed_image_url ? { url: reminderCfg.embed_image_url } : undefined,
                    footer: reminderCfg.embed_footer_text ? { text: reminderCfg.embed_footer_text } : undefined,
                    timestamp: new Date().toISOString(),
                  }],
                }),
              })

              await supabase
                .from('member_joins')
                .update({ reminder_sent: true })
                .eq('id', join.id)

              results.push({ user: join.discord_user_id, status: 'reminder_sent' })
            } else {
              results.push({ user: join.discord_user_id, status: 'dm_failed' })
            }
          }
        } catch (err) {
          results.push({ user: join.discord_user_id, status: `error: ${err}` })
        }
      }

      return new Response(JSON.stringify({ checked: results.length, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use member_join or check_reminders' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
