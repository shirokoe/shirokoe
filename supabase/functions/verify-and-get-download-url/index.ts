// supabase/functions/verify-and-get-download-url/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Stripe from "https://esm.sh/stripe@15.12.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("決済セッションIDが必要です。");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
        throw new Error("支払いが完了していません。");
    }

    const workId = session.metadata?.work_ids;
    const chargeId = session.payment_intent;

    if (!workId || !chargeId) {
        throw new Error("セッションから購入情報が見つかりませんでした。");
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // --- ここからが、2つの機能の美しい「統合」です ---

    // 1. まず、この支払いがすでに記録されていないかを確認します (二重計上を防ぐ保険)
    const { data: existingSale, error: checkError } = await supabaseAdmin
      .from('sales')
      .select('id')
      .eq('stripe_charge_id', chargeId)
      .maybeSingle();

    if (checkError) throw checkError;

    // 2. もしまだ記録されていなければ、売上を記録し、販売数を+1します
    if (!existingSale) {
        const { data: workData, error: workError } = await supabaseAdmin
          .from('works')
          .select('user_id, price')
          .eq('id', workId)
          .single();

        if (workError || !workData) throw new Error("作品情報が見つかりません。");

        const creatorShare = Math.round((workData.price / 1.1) * 0.80);

        // a) salesテーブルに会計記録を追加
        const { error: insertError } = await supabaseAdmin
          .from('sales')
          .insert({
            work_id: workId,
            shop_id: workData.user_id,
            amount: creatorShare,
            stripe_charge_id: chargeId,
          });
        if (insertError) throw insertError;

        // b) worksとshopsの販売数を+1する
        const { error: rpcError } = await supabaseAdmin.rpc('increment_sales_count', { work_id_to_increment: workId });
        if (rpcError) throw rpcError;
    }

    // 3. 最後に、音声ファイルのURLを取得して返します
    const { data: work, error: finalWorkError } = await supabaseAdmin
        .from('works')
        .select('title, voice_data_path')
        .eq('id', workId)
        .single();
    
    if (finalWorkError || !work) {
        throw new Error("購入された作品のファイルが見つかりませんでした。");
    }

    const { data: urlData } = supabaseAdmin.storage.from('voice_datas').getPublicUrl(work.voice_data_path);

    return new Response(JSON.stringify({ downloadUrl: urlData.publicUrl, title: work.title, workId: workId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ダウンロードURL取得・売上記録エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});