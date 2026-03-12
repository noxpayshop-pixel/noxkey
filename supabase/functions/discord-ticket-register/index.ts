const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const botToken = Deno.env.get('DISCORD_TICKET_BOT_TOKEN')!
  const appId = Deno.env.get('DISCORD_TICKET_APP_ID')!

  const commands = [
    {
      name: 'panel',
      description: 'Post the ticket panel with dropdown menu in this channel',
      type: 1,
    },
    {
      name: 'setup',
      description: 'Create all ticket categories in the server',
      type: 1,
    },
    {
      name: 'ping',
      description: 'Send a DM reminder to the ticket owner',
      type: 1,
    },
    {
      name: 'closeall',
      description: 'Close all open tickets in the server',
      type: 1,
    },
  ]

  try {
    const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to register commands', details: data }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, commands: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
