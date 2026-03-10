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

  try {
    const { page } = await req.json()
    
    // Get IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || ''

    // Geo lookup
    let country = null
    let countryCode = null
    try {
      if (ip && ip !== 'unknown') {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode`)
        if (geoRes.ok) {
          const geo = await geoRes.json()
          country = geo.country || null
          countryCode = geo.countryCode || null
        }
      }
    } catch {}

    await supabase.from('page_visits').insert({
      page: page || '/',
      ip_address: ip,
      country,
      country_code: countryCode,
      user_agent: userAgent,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
