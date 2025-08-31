// supabase/functions/delete-user/index.ts

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
    // Admin client to bypass RLS for this sensitive operation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // 1. Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("認証ヘッダーがありません。");
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error("ユーザーが見つかりません。");
    const userId = user.id;

    // 2. Fetch all works to get file paths
    const { data: works, error: worksError } = await supabaseAdmin
      .from('works')
      .select('cover_image_path, voice_data_path')
      .eq('user_id', userId);
    if (worksError) throw new Error(`作品の取得に失敗しました: ${worksError.message}`);

    // 3. Delete all work-related storage files
    if (works && works.length > 0) {
      const coverPaths = works.map(w => w.cover_image_path).filter(Boolean);
      const voicePaths = works.map(w => w.voice_data_path).filter(Boolean);

      if (coverPaths.length > 0) {
        const { error: coverDeleteError } = await supabaseAdmin.storage.from('work_covers').remove(coverPaths);
        if (coverDeleteError) console.error("カバー画像の削除に失敗（処理は続行）:", coverDeleteError.message);
      }
      if (voicePaths.length > 0) {
        const { error: voiceDeleteError } = await supabaseAdmin.storage.from('voice_datas').remove(voicePaths);
        if (voiceDeleteError) console.error("音声データの削除に失敗（処理は続行）:", voiceDeleteError.message);
      }
    }
    
    // 4. Fetch shop to get banner path
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('banner_image_path')
      .eq('id', userId)
      .single();
    if (shopError && shopError.code !== 'PGRST116') { // "no rows found"エラーは無視
        throw new Error(`ショップ情報の取得に失敗しました: ${shopError.message}`);
    }

    // 5. Delete banner storage file
    if (shop && shop.banner_image_path) {
      const { error: bannerDeleteError } = await supabaseAdmin.storage.from('shop_banners').remove([shop.banner_image_path]);
      if (bannerDeleteError) console.error("バナー画像の削除に失敗（処理は続行）:", bannerDeleteError.message);
    }

    // 6. Delete all works from the database table
    const { error: deleteWorksError } = await supabaseAdmin
      .from('works')
      .delete()
      .eq('user_id', userId);
    if (deleteWorksError) throw new Error(`作品DBの削除に失敗しました: ${deleteWorksError.message}`);

    // 7. Delete the shop from the database table
    const { error: deleteShopError } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('id', userId);
    if (deleteShopError) throw new Error(`ショップDBの削除に失敗しました: ${deleteShopError.message}`);

    // 8. Finally, delete the user from auth
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw new Error(`ユーザー認証情報の削除に失敗しました: ${deleteUserError.message}`);
    }

    return new Response(JSON.stringify({ message: "アカウントは関連データと共に正常に削除されました。" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("退会処理エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});

