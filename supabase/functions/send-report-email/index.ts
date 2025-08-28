// supabase/functions/send-report-email/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ★重要: Supabaseの環境変数に、以下の3つを設定してください
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const REPORT_TO_EMAIL = Deno.env.get("REPORT_TO_EMAIL"); // あなたのGmailアドレス
const REPORT_FROM_EMAIL = Deno.env.get("REPORT_FROM_EMAIL"); // SendGridで認証した、あなたのGmailアドレス

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { workUrl, reason, workTitle, shopName } = await req.json();

    const emailBody = `
      <h2>shirokoe 作品報告</h2>
      <p>以下の作品について、ユーザーから報告がありました。</p>
      <hr>
      <ul>
        <li><strong>作品名:</strong> ${workTitle}</li>
        <li><strong>ショップ名:</strong> ${shopName}</li>
        <li><strong>作品URL:</strong> <a href="${workUrl}">${workUrl}</a></li>
        <li><strong>報告理由:</strong> ${reason}</li>
      </ul>
      <hr>
      <p>速やかに内容を確認し、利用規約に違反している場合は、Supabaseの管理画面から作品を削除してください。</p>
    `;

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: REPORT_TO_EMAIL }] }],
        from: { email: REPORT_FROM_EMAIL, name: "shirokoe 自動通知" },
        subject: `[shirokoe] 作品の報告がありました: ${workTitle}`,
        content: [{ type: "text/html", value: emailBody }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid API error: ${response.statusText} - ${errorBody}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("メール送信エラー:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
