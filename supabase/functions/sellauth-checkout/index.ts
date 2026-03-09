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

  const authHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'payment-methods';

    if (action === 'payment-methods') {
      const response = await fetch(`${SELLAUTH_BASE}/shops/${shopId}/payment-methods`, {
        method: 'GET',
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ error: `SellAuth API error [${response.status}]`, details: data }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(data), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'checkout') {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST required' }), {
          status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { cart, email, payment_method_id, coupon } = body;

      // Validate inputs
      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return new Response(JSON.stringify({ error: 'Cart is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return new Response(JSON.stringify({ error: 'Valid email is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const checkoutBody: Record<string, unknown> = {
        cart: cart.map((item: { productId: number; variantId: number; quantity: number }) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity || 1,
        })),
        email,
      };

      if (payment_method_id) {
        checkoutBody.payment_method_id = payment_method_id;
      }
      if (coupon) {
        checkoutBody.coupon = coupon;
      }

      const response = await fetch(`${SELLAUTH_BASE}/shops/${shopId}/checkout`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(checkoutBody),
      });

      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Checkout failed [${response.status}]`, details: data }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
