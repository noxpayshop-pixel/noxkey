import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SELLAUTH_BASE = 'https://api.sellauth.com/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('SELLAUTH_API_KEY');
  const shopId = Deno.env.get('SELLAUTH_SHOP_ID');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'SELLAUTH_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!shopId) {
    return new Response(JSON.stringify({ error: 'SELLAUTH_SHOP_ID not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || 'products';
    const fetchAll = url.searchParams.get('all') === 'true';

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // If fetchAll is requested, paginate through all pages
    if (fetchAll && path === 'feedbacks') {
      const allItems: any[] = [];
      let page = 1;
      const maxPages = 50; // safety limit

      while (page <= maxPages) {
        const sellAuthUrl = `${SELLAUTH_BASE}/shops/${shopId}/${path}?page=${page}`;
        const response = await fetch(sellAuthUrl, { method: 'GET', headers });

        if (!response.ok) break;

        const data = await response.json();
        const items = data.data ?? [];

        if (items.length === 0) break;

        allItems.push(...items);

        // Check if there are more pages
        const lastPage = data.meta?.last_page ?? data.last_page ?? 1;
        if (page >= lastPage) break;
        page++;
      }

      return new Response(JSON.stringify({ data: allItems }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single page request (default)
    const sellAuthUrl = `${SELLAUTH_BASE}/shops/${shopId}/${path}`;
    const response = await fetch(sellAuthUrl, { method: 'GET', headers });
    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `SellAuth API error [${response.status}]`, details: data }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
