// supabase/functions/verify-checkout-session/index.ts

// ★修正: 互換性の問題を解決するため、完全なURLでライブラリを直接インポートします
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
  console.log("--- verify-checkout-session: 処理開始 ---");

  if (req.method === 'OPTIONS') {
    console.log("OPTIONSリクエストを処理しました。");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("リクエストボディを解析中...");
    const { session_id } = await req.json();
    console.log("受け取ったセッションID:", session_id);

    if (!session_id) {
      console.error("エラー: session_idがありません。");
      throw new Error("決済セッションIDが必要です。");
    }

    console.log("Stripeからセッション情報を取得中...");
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("Stripeセッションの取得に成功しました。");

    if (session.payment_status !== 'paid') {
      console.error(`エラー: 支払いが完了していません。現在のステータス: ${session.payment_status}`);
      throw new Error("支払いが完了していません。");
    }
    console.log("支払いステータスが 'paid' であることを確認しました。");

    const workId = session.metadata.work_id;
    const accountName = session.metadata.account_name;
    console.log("メタデータを取得しました:", { workId, accountName });

    if (!workId || !accountName) {
      console.error("エラー: セッションからメタデータが見つかりませんでした。");
      throw new Error("セッションから購入情報が見つかりませんでした。");
    }
    
    console.log("--- 検証成功。クライアントにデータを返します。 ---");
    return new Response(JSON.stringify({ workId, accountName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- セッションの確認エラー発生 ---", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});