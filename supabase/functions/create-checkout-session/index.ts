// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
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
      return new Response(JSON.stringify({ error: "作品IDがありません" }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: work, error: workError } = await supabaseAdmin
      .from("works")
      .select(`
        title,
        price,
        shops (
          account_name,
          stripe_account_id
        )
      `)
      .eq("id", workId)
      .single();

    if (workError || !work) {
      throw new Error("作品が見つかりません。");
    }

    const creatorStripeAccountId = work.shops?.stripe_account_id;
    if (!creatorStripeAccountId) {
      throw new Error("クリエイターのStripeアカウントが設定されていません。");
    }

    const priceIncludingTax = work.price;
    const priceExcludingTax = Math.round(priceIncludingTax / 1.1);
    const consumptionTax = priceIncludingTax - priceExcludingTax;
    const platformFee = Math.round(priceExcludingTax * 0.20);
    const stripeProcessingFee = Math.round(priceIncludingTax * 0.036);
    const totalApplicationFee = platformFee + consumptionTax + stripeProcessingFee;

    const session = await stripe.checkout.sessions.create({
      // ★修正: Stripeに決済方法の選択を完全に自動化させるための命令
      automatic_payment_methods: {
        enabled: true,
      },
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: work.title,
            },
            unit_amount: priceIncludingTax,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${Deno.env.get("SITE_URL")}/${work.shops.account_name}/${workId}?purchase_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get("SITE_URL")}/${work.shops.account_name}/${workId}`,
      metadata: {
        work_id: workId,
      },
      payment_intent_data: {
        application_fee_amount: totalApplicationFee,
        transfer_data: {
          destination: creatorStripeAccountId,
        },
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Checkoutセッション作成エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
