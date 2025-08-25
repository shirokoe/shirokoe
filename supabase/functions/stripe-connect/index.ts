// supabase/functions/stripe-connect/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

// Stripeの初期化（環境変数からシークレットキーを読み込む）
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: req.headers.get("Authorization") } } }
  );

  // ログインしているユーザー情報を取得
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "認証されていません" }), { status: 401 });
  }

  try {
    // ユーザーのショップ情報を取得
    const { data: shop, error: shopError } = await supabaseClient
      .from("shops")
      .select("stripe_account_id") // 既にStripeアカウントIDがあるか確認
      .eq("id", user.id)
      .single();

    if (shopError) throw shopError;

    let accountId = shop.stripe_account_id;

    // まだStripeアカウントがなければ、新しく作成する
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        country: "JP", // 日本のアカウントとして作成
      });
      accountId = account.id;

      // 作成したアカウントIDをshopsテーブルに保存
      const { error: updateError } = await supabaseClient
        .from("shops")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
      
      if (updateError) throw updateError;
    }

    // クリエイター専用の口座登録ページのURLをStripeに発行してもらう
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${Deno.env.get("SITE_URL")}/creator/edit`,
      return_url: `${Deno.env.get("SITE_URL")}/creator/edit`,
      type: "account_onboarding",
    });

    // URLをクライアントに返す
    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Stripe Connectエラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});