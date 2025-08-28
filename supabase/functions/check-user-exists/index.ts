// supabase/functions/check-user-exists/index.ts

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
    const { email } = await req.json();
    if (!email) {
      throw new Error("メールアドレスがありません。");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // 管理者権限で、メールアドレスからユーザーを検索
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (error) {
      // 「ユーザーが見つからない」エラーは、ここでは「存在しない」という成功とみなす
      if (error.message.includes("User not found")) {
        return new Response(JSON.stringify({ exists: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // それ以外の予期せぬエラーは、本当のエラー
      throw error;
    }

    // ユーザーが見つかった場合
    return new Response(JSON.stringify({ exists: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("ユーザー存在確認エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});