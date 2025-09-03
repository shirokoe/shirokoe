// supabase/functions/weekly-payouts/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Cron Jobからの呼び出しのみを想定

  try {
    console.log("週次振込処理を開始します...");

    // 1. 未払いの売上をショップごとに集計
    const { data: pendingSales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('shop_id, amount')
      .eq('status', 'pending');

    if (salesError) throw salesError;

    const payoutsByShop = pendingSales.reduce((acc, sale) => {
      acc[sale.shop_id] = (acc[sale.shop_id] || 0) + sale.amount;
      return acc;
    }, {});

    // 2. 各ショップの振込処理を実行
    for (const shopId in payoutsByShop) {
      const totalPayoutAmount = payoutsByShop[shopId];

      // StripeアカウントIDを取得
      const { data: shop, error: shopError } = await supabaseAdmin
        .from('shops')
        .select('stripe_account_id')
        .eq('id', shopId)
        .single();

      if (shopError || !shop || !shop.stripe_account_id) {
        console.error(`ショップ(${shopId})のStripeアカウントが見つかりません。`);
        continue; // 次のショップへ
      }

      try {
        // Stripe Payouts APIを使って送金
        await stripe.transfers.create({
          amount: totalPayoutAmount,
          currency: 'jpy',
          destination: shop.stripe_account_id,
        });

        // 3. 成功したら、該当する売上のステータスを 'paid_out' に更新
        const { error: updateError } = await supabaseAdmin
          .from('sales')
          .update({ status: 'paid_out' })
          .eq('shop_id', shopId)
          .eq('status', 'pending');
        
        if (updateError) {
          console.error(`ショップ(${shopId})の売上ステータス更新に失敗:`, updateError);
        } else {
          console.log(`ショップ(${shopId})へ ${totalPayoutAmount}円の振込を正常に処理しました。`);
        }

      } catch (payoutError) {
        console.error(`ショップ(${shopId})への振込に失敗:`, payoutError);
      }
    }
    
    console.log("週次振込処理が完了しました。");
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("週次振込処理全体でエラーが発生:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});