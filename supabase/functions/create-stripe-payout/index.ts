// supabase/functions/create-stripe-payout/index.ts

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: req.headers.get("Authorization") } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("認証されていません");
    
    const { data: shop } = await supabaseClient
      .from("shops")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!shop?.stripe_account_id) throw new Error("Stripeアカウントが連携されていません");

    // 振込可能額をStripeから直接取得
    const balance = await stripe.balance.retrieve({
      stripeAccount: shop.stripe_account_id,
    });
    const jpyBalance = balance.available.find(b => b.currency === 'jpy');
    const availableAmount = jpyBalance ? jpyBalance.amount : 0;

    if (availableAmount <= 0) {
      throw new Error("振込可能な残高がありません。");
    }

    // 振込(Pout)を作成
    await stripe.payouts.create({
      amount: availableAmount,
      currency: 'jpy',
    }, {
      stripeAccount: shop.stripe_account_id,
    });

    return new Response(JSON.stringify({ success: true, amount: availableAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe振込エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});