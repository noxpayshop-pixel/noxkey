import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { action, discord_username, otp } = await req.json()

  if (action === 'send_otp') {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min

    // Store OTP
    await supabase.from('otp_codes').insert({
      discord_username,
      code,
      expires_at,
    })

    // Find user in Discord guild
    const botToken = Deno.env.get('DISCORD_OTP_BOT_TOKEN')!
    const guildId = Deno.env.get('DISCORD_GUILD_ID')!

    // Search for user by username
    const searchRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(discord_username)}&limit=1`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )

    if (!searchRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not search Discord server. Make sure the bot has the right permissions.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const members = await searchRes.json()
    const member = members.find((m: any) => m.user.username === discord_username)

    if (!member) {
      return new Response(JSON.stringify({ error: 'not_in_server', message: 'User not found in Discord server. Please join the server first.' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = member.user.id

    // Create DM channel
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: userId }),
    })

    if (!dmRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not open DMs. Please enable DMs from server members.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const dm = await dmRes.json()

    // Send OTP embed
    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🔐 The Nox — Verification Code',
          description: `Your one-time verification code is:\n\n# \`${code}\`\n\nThis code expires in **5 minutes**.\nDo not share this code with anyone.`,
          color: 0x7c3aed,
          image: { url: 'https://noxkey.lovable.app/images/otp-banner.png' },
          footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    return new Response(JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } else if (action === 'verify_otp') {
    // Find valid OTP
    const { data: otpRow } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('discord_username', discord_username)
      .eq('code', otp)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!otpRow) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Mark OTP as used
    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRow.id)

    // Create or update session
    const sessionToken = crypto.randomUUID()

    const { data: existing } = await supabase
      .from('discord_users')
      .select('id')
      .eq('discord_username', discord_username)
      .single()

    if (existing) {
      await supabase.from('discord_users').update({ session_token: sessionToken }).eq('id', existing.id)
    } else {
      await supabase.from('discord_users').insert({ discord_username, session_token: sessionToken })
    }

    return new Response(JSON.stringify({ success: true, session_token: sessionToken }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), 
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
