// supabase/functions/verify-and-get-download-url/index.ts

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
    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("決済セッションIDが必要です。");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
        throw new Error("支払いが完了していません。");
    }

    const workId = session.metadata.work_id;
    if (!workId) {
        throw new Error("セッションから購入情報が見つかりませんでした。");
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // 1. 販売数を+1する (RPCでデータベース関数を呼び出す)
    const { error: rpcError } = await supabaseAdmin.rpc('increment_sales_count', { work_id_to_increment: workId });
    if (rpcError) {
        console.error(`販売数の更新に失敗 (workId: ${workId}):`, rpcError);
    }

    // 2. 音声ファイルのURLを取得して返す
    const { data: work, error: workError } = await supabaseAdmin
        .from('works')
        .select('title, voice_data_path')
        .eq('id', workId)
        .single();
    
    if (workError || !work) {
        throw new Error("購入された作品のファイルが見つかりませんでした。");
    }

    const { data: urlData } = supabaseAdmin.storage.from('voice_datas').getPublicUrl(work.voice_data_path);

    return new Response(JSON.stringify({ downloadUrl: urlData.publicUrl, title: work.title, workId: workId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ダウンロードURL取得エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
