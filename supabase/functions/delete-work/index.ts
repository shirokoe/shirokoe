// supabase/functions/delete-work/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { workId } = await req.json();
    if (!workId) {
      throw new Error("作品IDがありません。");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // 1. リクエストヘッダーからユーザーの認証情報を取得
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("認証ヘッダーがありません。");
    }
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      throw new Error("ユーザーが見つかりません。");
    }

    // 2. 削除対象の作品情報を取得し、本人確認を行う
    const { data: work, error: workError } = await supabaseAdmin
      .from('works')
      .select('user_id, cover_image_path, voice_data_path')
      .eq('id', workId)
      .single();

    if (workError) throw new Error("作品が見つかりませんでした。");
    if (work.user_id !== user.id) {
      throw new Error("権限がありません。");
    }

    // 3. Storageから関連ファイルを削除 (存在する場合のみ)
    if (work.cover_image_path) {
      await supabaseAdmin.storage.from('work_covers').remove([work.cover_image_path]);
    }
    if (work.voice_data_path) {
      await supabaseAdmin.storage.from('voice_datas').remove([work.voice_data_path]);
    }

    // 4. データベースから作品情報を削除
    const { error: deleteError } = await supabaseAdmin
      .from('works')
      .delete()
      .eq('id', workId);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: "作品が正常に削除されました。" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("作品削除エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});