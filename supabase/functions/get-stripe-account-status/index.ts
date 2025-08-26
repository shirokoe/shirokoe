// supabase/functions/get-stripe-account-status/index.ts

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
      return new Response(JSON.stringify({ status: 'not_created' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const account = await stripe.accounts.retrieve(shop.stripe_account_id);

    // charges_enabledがtrueなら、支払いを受け付ける準備が完了している
    const isEnabled = account.charges_enabled;

    return new Response(JSON.stringify({ isEnabled: isEnabled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripeアカウントステータス取得エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
