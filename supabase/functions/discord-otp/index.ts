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

  // Get IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'unknown'

  // Check IP blacklist
  const { data: ipBanned } = await supabase
    .from('ip_blacklist')
    .select('id')
    .eq('ip_address', ip)
    .limit(1)
    .single()

  if (ipBanned) {
    return new Response(JSON.stringify({ error: 'Access denied.' }), 
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Check Discord blacklist
  const { data: discordBanned } = await supabase
    .from('discord_blacklist')
    .select('id')
    .eq('discord_username', discord_username.toLowerCase())
    .limit(1)
    .single()

  if (discordBanned) {
    return new Response(JSON.stringify({ error: 'This account has been banned.' }), 
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  if (action === 'send_otp') {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    await supabase.from('otp_codes').insert({
      discord_username,
      code,
      expires_at,
    })

    const botToken = Deno.env.get('DISCORD_OTP_BOT_TOKEN')!
    const guildId = Deno.env.get('DISCORD_GUILD_ID')!

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

    // Fetch embed config from DB
    let embedTitle = '🔐 The Nox — Verification Code'
    let embedDesc = `Your one-time verification code is:\n\n# \`${code}\`\n\nThis code expires in **5 minutes**.\nDo not share this code with anyone.`
    let embedColor = 0x7c3aed
    let embedImage = 'https://noxkey.lovable.app/images/otp-banner.png'
    let embedFooter = 'The Nox — We Care About YOU ✦ Premium Digital Delivery'

    try {
      const { data: cfg } = await supabase.from('bot_embed_config').select('*').eq('bot_type', 'otp').limit(1).single()
      if (cfg) {
        embedTitle = (cfg.embed_title || embedTitle).replace(/\{code\}/g, code)
        embedDesc = (cfg.embed_description || embedDesc).replace(/\{code\}/g, code)
        embedColor = parseInt((cfg.embed_color || '#7c3aed').replace('#', ''), 16)
        embedImage = cfg.embed_image_url || embedImage
        embedFooter = cfg.embed_footer_text || embedFooter
      }
    } catch {}

    await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: embedTitle,
          description: embedDesc,
          color: embedColor,
          image: embedImage ? { url: embedImage } : undefined,
          footer: { text: embedFooter },
          timestamp: new Date().toISOString(),
        }],
      }),
    })

    return new Response(JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } else if (action === 'verify_otp') {
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

    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRow.id)

    const sessionToken = crypto.randomUUID()

    const { data: existing } = await supabase
      .from('discord_users')
      .select('id')
      .eq('discord_username', discord_username)
      .single()

    const isNewAccount = !existing

    if (existing) {
      await supabase.from('discord_users').update({ session_token: sessionToken }).eq('id', existing.id)
    } else {
      await supabase.from('discord_users').insert({ discord_username, session_token: sessionToken })
    }

    // Log IP
    let country = null
    let countryCode = null
    let city = null
    try {
      if (ip && ip !== 'unknown') {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city`)
        if (geoRes.ok) {
          const geo = await geoRes.json()
          country = geo.country || null
          countryCode = geo.countryCode || null
          city = geo.city || null
        }
      }
    } catch {}

    await supabase.from('ip_logs').insert({
      discord_username,
      ip_address: ip,
      country,
      country_code: countryCode,
      city,
      action: isNewAccount ? 'register' : 'login',
    })

    return new Response(JSON.stringify({ success: true, session_token: sessionToken }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), 
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
