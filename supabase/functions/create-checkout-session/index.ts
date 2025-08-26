// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let workId;
    try {
      const body = await req.json();
      workId = body.workId;
    } catch (e) {
      return new Response(JSON.stringify({ error: "リクエストが不正です。" }), { status: 400, headers: corsHeaders });
    }
    
    if (!workId) {
      return new Response(JSON.stringify({ error: "作品IDがリクエストに含まれていません。" }), { status: 400, headers: corsHeaders });
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
          stripe_account_id
        )
      `)
      .eq("id", workId)
      .single();

    if (workError) {
      console.error("Supabase work fetch error:", workError);
      return new Response(JSON.stringify({ error: "データベースで作品の検索中にエラーが発生しました。" }), { status: 500, headers: corsHeaders });
    }
    if (!work) {
      return new Response(JSON.stringify({ error: `指定された作品が見つかりません。` }), { status: 404, headers: corsHeaders });
    }

    const creatorStripeAccountId = work.shops?.stripe_account_id;
    if (!creatorStripeAccountId) {
      return new Response(JSON.stringify({ error: "このクリエイターはまだ決済情報が未登録のため、購入できません。" }), { status: 409, headers: corsHeaders });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "paypay"],
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
        success_url: `${Deno.env.get("SITE_URL")}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${Deno.env.get("SITE_URL")}/cancel`,
        payment_intent_data: {
          application_fee_amount: Math.round(work.price * 0.20),
          transfer_data: {
            destination: creatorStripeAccountId,
          },
        },
      });

      return new Response(JSON.stringify({ sessionId: session.id, checkoutUrl: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (stripeError) {
        console.error("Stripe API error:", stripeError);
        return new Response(JSON.stringify({ error: `決済サービスとの通信に失敗しました: ${stripeError.message}` }), { status: 500, headers: corsHeaders });
    }

  } catch (error) {
    console.error("予期せぬエラー:", error);
    return new Response(JSON.stringify({ error: "サーバーで予期せぬエラーが発生しました。" }), { status: 500, headers: corsHeaders });
  }
});
