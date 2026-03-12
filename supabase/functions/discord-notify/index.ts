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
    const { product_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')!
    const guildId = Deno.env.get('DISCORD_GUILD_ID')!

    // Get unfulfilled waitlist entries
    const { data: waitlistEntries } = await supabase
      .from('waitlist')
      .select('*')
      .eq('product_id', product_id)
      .eq('is_fulfilled', false)
      .order('created_at', { ascending: true })

    if (!waitlistEntries?.length) {
      return new Response(JSON.stringify({ message: 'No waitlist entries', delivered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get available stock
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('*')
      .eq('product_id', product_id)
      .eq('is_claimed', false)
      .order('created_at', { ascending: true })
      .limit(waitlistEntries.length)

    if (!stockItems?.length) {
      return new Response(JSON.stringify({ message: 'No stock available', delivered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get product info
    const { data: product } = await supabase
      .from('products')
      .select('name, description')
      .eq('id', product_id)
      .single()

    // Fetch embed config from DB
    let embedTitle = `📦 Your {product} is ready!`
    let embedDesc = 'Your item from the waitlist is now available!\n\n🔗 **Pick it up here:**\nhttps://noxkey.lovable.app/myclaims\n\nLog in with your Discord to view your deliverables.'
    let embedColor = 0x22c55e
    let embedImage: string | null = 'https://noxkey.lovable.app/images/products-banner.png'
    let embedFooter = 'The Nox — We Care About YOU ✦ Premium Digital Delivery'

    try {
      const { data: cfg } = await supabase.from('bot_embed_config').select('*').eq('bot_type', 'product').limit(1).single()
      if (cfg) {
        embedTitle = cfg.embed_title || embedTitle
        embedDesc = cfg.embed_description || embedDesc
        embedColor = parseInt((cfg.embed_color || '#22c55e').replace('#', ''), 16)
        embedImage = cfg.embed_image_url ?? embedImage
        embedFooter = cfg.embed_footer_text || embedFooter
      }
    } catch {}

    const results: Array<{ discord: string; status: string; error?: string }> = []
    const deliverCount = Math.min(waitlistEntries.length, stockItems.length)

    for (let i = 0; i < deliverCount; i++) {
      const entry = waitlistEntries[i]
      const item = stockItems[i]

      // Mark stock as claimed
      await supabase.from('stock_items').update({ is_claimed: true }).eq('id', item.id)

      // Mark waitlist as fulfilled
      await supabase
        .from('waitlist')
        .update({ is_fulfilled: true, fulfilled_item: item.item })
        .eq('id', entry.id)

      // Update redemption record
      await supabase
        .from('redemptions')
        .update({ delivered_item: item.item })
        .eq('product_id', product_id)
        .eq('discord', entry.discord)
        .eq('email', entry.email)
        .is('delivered_item', null)

      // Try to send Discord DM
      try {
        // Search for user in guild
        const searchRes = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(entry.discord)}&limit=1`,
          { headers: { Authorization: `Bot ${botToken}` } }
        )
        const members = await searchRes.json()

        if (Array.isArray(members) && members.length > 0) {
          const userId = members[0].user.id

          // Create DM channel
          const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipient_id: userId }),
          })
          const dmChannel = await dmRes.json()

          if (dmChannel.id) {
            // Send notification embed (NOT the item itself — user picks it up on the website)
            await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                embeds: [
                  {
                    title: `📦 Your ${product?.name || 'product'} is ready!`,
                    description: [
                      'Your item from the waitlist is now available!',
                      '',
                      '🔗 **Pick it up here:**',
                      'https://noxkey.lovable.app/myclaims',
                      '',
                      'Log in with your Discord to view your deliverables.',
                    ].join('\n'),
                    color: 0x22c55e,
                    image: { url: 'https://noxkey.lovable.app/images/products-banner.png' },
                    footer: { text: 'The Nox — We Care About YOU ✦ Premium Digital Delivery' },
                    timestamp: new Date().toISOString(),
                  },
                ],
              }),
            })
            results.push({ discord: entry.discord, status: 'delivered' })
          } else {
            results.push({ discord: entry.discord, status: 'dm_channel_failed' })
          }
        } else {
          results.push({ discord: entry.discord, status: 'user_not_found_in_guild' })
        }
      } catch (err) {
        results.push({ discord: entry.discord, status: 'dm_failed', error: String(err) })
      }
    }

    return new Response(
      JSON.stringify({ delivered: results.filter((r) => r.status === 'delivered').length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
