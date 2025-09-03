// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { workId } = await req.json();
    if (!workId) {
      throw new Error("作品IDがありません");
    }

    // Admin client to fetch work details securely
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get work and shop details to construct URLs and product name
    const { data: work, error: workError } = await supabaseAdmin
      .from("works")
      .select(`
        title,
        price,
        shops (
          account_name
        )
      `)
      .eq("id", workId)
      .single();

    if (workError || !work || !work.shops) {
      throw new Error("作品またはショップ情報が見つかりません。");
    }

    // Create a Stripe Checkout session
    // This is now a standard payment, not a Connect transfer.
    // The payment goes entirely to the platform's Stripe account.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: work.title,
            },
            unit_amount: work.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Add metadata to know which work was purchased later for payouts
      metadata: {
        work_id: workId,
      },
      success_url: `${Deno.env.get("SITE_URL")}/${work.shops.account_name}/${workId}?purchase_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get("SITE_URL")}/${work.shops.account_name}/${workId}`,
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Checkoutセッション作成エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});