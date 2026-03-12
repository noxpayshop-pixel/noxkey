import { JSZip } from 'https://esm.sh/jszip@3.10.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const botToken = Deno.env.get('DISCORD_BOT_TOKEN')!
  const guildId = Deno.env.get('DISCORD_GUILD_ID')!

  try {
    const contentType = req.headers.get('content-type') || ''
    let zipData: ArrayBuffer

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      zipData = await file.arrayBuffer()
    } else {
      zipData = await req.arrayBuffer()
    }

    const zip = new JSZip()
    await zip.loadAsync(zipData)

    const results: Array<{ name: string; status: string; error?: string }> = []
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.gif']

    for (const [filename, fileEntry] of Object.entries(zip.files)) {
      const entry = fileEntry as any
      if (entry.dir) continue

      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
      if (!supportedExtensions.includes(ext)) {
        results.push({ name: filename, status: 'skipped', error: 'Unsupported format' })
        continue
      }

      // Get emoji name from filename (without extension, without path)
      const baseName = filename.split('/').pop()!.replace(/\.[^.]+$/, '')
      // Discord emoji names: 2-32 chars, alphanumeric + underscores only
      const emojiName = baseName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32)
      if (emojiName.length < 2) {
        results.push({ name: filename, status: 'skipped', error: 'Name too short after sanitizing' })
        continue
      }

      try {
        const imageData = await entry.async('base64')
        const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
        const dataUri = `data:${mimeType};base64,${imageData}`

        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: emojiName, image: dataUri }),
        })

        if (res.ok) {
          const emoji = await res.json()
          results.push({ name: emojiName, status: 'uploaded', error: undefined })
        } else {
          const err = await res.json()
          results.push({ name: emojiName, status: 'failed', error: err.message || JSON.stringify(err) })
        }

        // Rate limit: Discord allows ~50 req/s but emoji creation is stricter
        await new Promise((r) => setTimeout(r, 1500))
      } catch (err) {
        results.push({ name: emojiName, status: 'failed', error: String(err) })
      }
    }

    const uploaded = results.filter((r) => r.status === 'uploaded').length
    const failed = results.filter((r) => r.status === 'failed').length
    const skipped = results.filter((r) => r.status === 'skipped').length

    return new Response(
      JSON.stringify({ uploaded, failed, skipped, total: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error processing emoji upload:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
