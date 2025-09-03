// supabase/functions/stripe-connect/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ★修正: apiVersionを最新版に更新
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: req.headers.get("Authorization") } } }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "認証されていません" }), { status: 401, headers: corsHeaders });
  }

  try {
    const { data: shop, error: shopError } = await supabaseClient
      .from("shops")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (shopError) throw shopError;

    let accountId = shop.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        country: "JP",
      });
      accountId = account.id;

      const { error: updateError } = await supabaseClient
        .from("shops")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      
      if (updateError) throw updateError;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${Deno.env.get("SITE_URL")}/creator/edit`,
      return_url: `${Deno.env.get("SITE_URL")}/creator/edit`,
      type: "account_onboarding",
    });
    
    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe Connectエラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});     