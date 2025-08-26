// supabase/functions/get-stripe-balance/index.ts

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

    const balance = await stripe.balance.retrieve({
      stripeAccount: shop.stripe_account_id,
    });
    
    // 日本円の振込可能額を探す
    const jpyBalance = balance.available.find(b => b.currency === 'jpy');
    const availableAmount = jpyBalance ? jpyBalance.amount : 0;

    return new Response(JSON.stringify({ availableAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe残高の取得エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});