// supabase/functions/reset-stripe-account/index.ts

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
    if (!user) {
      return new Response(JSON.stringify({ error: "認証されていません" }), { status: 401, headers: corsHeaders });
    }
    
    const { data: shop, error: shopError } = await supabaseClient
      .from("shops")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (shopError || !shop.stripe_account_id) {
      // 既にリセット済み、またはアカウントが存在しない場合でも成功として扱う
      return new Response(JSON.stringify({ success: true, message: "No Stripe account to reset." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Stripe Connectアカウントを削除（存在しない場合はエラーになるが、後続処理でカバー）
    try {
        await stripe.accounts.del(shop.stripe_account_id);
    } catch (stripeErr) {
        console.warn(`Stripe account ${shop.stripe_account_id} could not be deleted (might already be gone):`, stripeErr.message);
    }

    // 2. Supabaseのshopsテーブルのstripe_account_idをnullにする
    const { error: updateError } = await supabaseClient
      .from("shops")
      .update({ stripe_account_id: null })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripeアカウントのリセットエラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});