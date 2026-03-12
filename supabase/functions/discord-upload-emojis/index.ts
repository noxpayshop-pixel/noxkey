import JSZip from 'https://esm.sh/jszip@3.10.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const botToken = Deno.env.get('DISCORD_BOT_TOKEN')!
  const guildId = Deno.env.get('DISCORD_GUILD_ID')!

  try {
    const contentType = req.headers.get('content-type') || ''

    // JSON action request (e.g. delete all)
    if (contentType.includes('application/json')) {
      const { action } = await req.json()

      if (action === 'delete_all') {
        // Fetch all emojis
        const listRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
          headers: { Authorization: `Bot ${botToken}` },
        })
        if (!listRes.ok) {
          const err = await listRes.json()
          return new Response(JSON.stringify({ error: 'Failed to list emojis', details: err }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const emojis = await listRes.json()
        const results: Array<{ name: string; status: string; error?: string }> = []

        for (const emoji of emojis) {
          try {
            const delRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis/${emoji.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bot ${botToken}` },
            })
            if (delRes.ok || delRes.status === 204) {
              results.push({ name: emoji.name, status: 'deleted' })
            } else {
              const err = await delRes.json()
              results.push({ name: emoji.name, status: 'failed', error: err.message || JSON.stringify(err) })
            }
            await new Promise((r) => setTimeout(r, 1000))
          } catch (err) {
            results.push({ name: emoji.name, status: 'failed', error: String(err) })
          }
        }

        const deleted = results.filter((r) => r.status === 'deleted').length
        return new Response(
          JSON.stringify({ deleted, failed: results.length - deleted, total: results.length, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Binary ZIP upload
    const zipData = await req.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(zipData)

    const results: Array<{ name: string; status: string; error?: string }> = []
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.gif']

    const entries = Object.entries(zip.files).filter(([filename, entry]: [string, any]) => {
      if (entry.dir) return false
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
      return supportedExtensions.includes(ext)
    })

    for (const [filename, fileEntry] of entries) {
      const entry = fileEntry as any
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))

      const baseName = filename.split('/').pop()!.replace(/\.[^.]+$/, '')
      let emojiName = baseName
      // Remove all "colored_" prefixes repeatedly
      while (emojiName.toLowerCase().startsWith('colored_')) {
        emojiName = emojiName.substring(8)
      }
      emojiName = emojiName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32)
      if (emojiName.length < 2) {
        results.push({ name: baseName, status: 'skipped', error: 'Name too short' })
        continue
      }

      try {
        const arrayBuf = await entry.async('arraybuffer')
        const base64 = arrayBufferToBase64(arrayBuf)
        const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
        const dataUri = `data:${mimeType};base64,${base64}`

        let res: Response | null = null
        for (let attempt = 0; attempt < 5; attempt++) {
          res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: emojiName, image: dataUri }),
          })

          if (res.status === 429) {
            const retryData = await res.json()
            const retryAfter = (retryData.retry_after || 5) * 1000
            await new Promise((r) => setTimeout(r, retryAfter + 500))
            continue
          }
          break
        }

        if (res && res.ok) {
          results.push({ name: emojiName, status: 'uploaded' })
        } else {
          const err = res ? await res.json() : { message: 'No response' }
          results.push({ name: emojiName, status: 'failed', error: err.message || JSON.stringify(err) })
        }

        await new Promise((r) => setTimeout(r, 3000))
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
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
