////
// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

// Stripeの初期化（環境変数からシークレットキーを読み込む）
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const { workId } = await req.json();

  if (!workId) {
    return new Response(JSON.stringify({ error: "作品IDがありません" }), { status: 400 });
  }

  // ★重要: ここでは管理者権限のSupabaseクライアントを使います
  // これにより、どのユーザーからでも安全に作品情報を取得できます
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  try {
    // 1. 作品情報をデータベースから取得
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

    if (workError || !work) {
      throw new Error("作品が見つかりません。");
    }

    const creatorStripeAccountId = work.shops?.stripe_account_id;
    if (!creatorStripeAccountId) {
      throw new Error("クリエイターのStripeアカウントが設定されていません。");
    }

    // 2. Stripe Checkoutの決済セッションを作成
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
        // ★ここが売上分配の魔法です！
        application_fee_amount: Math.round(work.price * 0.20), // あなた(プラットフォーム)の取り分 (20%)
        transfer_data: {
          destination: creatorStripeAccountId, // クリエイターのStripeアカウントID
        },
      },
    });

    // 決済ページのURLをクライアントに返す
    return new Response(JSON.stringify({ sessionId: session.id, checkoutUrl: session.url }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Checkoutセッション作成エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});