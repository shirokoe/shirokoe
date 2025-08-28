"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FaTrash, FaArrowLeft, FaExclamationTriangle, FaSpinner, FaCopy } from "react-icons/fa";

export default function WorkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workId = params.workId;

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  const fetchWork = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!workId) {
      setLoading(false);
      setError("作品IDが見つかりません。");
      return;
    }

    const { data: workData, error: fetchError } = await supabase
      .from('works')
      .select('*')
      .eq('id', workId)
      .single();

    if (fetchError || !workData) {
      console.error("作品の取得エラー:", fetchError);
      router.replace("/creator");
      return;
    }

    if (workData.user_id !== user.id) {
      router.replace("/creator");
      return;
    }
    
    const { data: coverUrlData } = supabase.storage.from('work_covers').getPublicUrl(workData.cover_image_path);
    workData.cover_url = coverUrlData.publicUrl;

    setWork(workData);
    setLoading(false);
  }, [workId, router]);

  useEffect(() => {
    fetchWork();
  }, [fetchWork]);

  // ★修正: 削除ロジックを、クライアント側で完結する堅牢な方法に変更
  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      // ステップ1: Storageからカバー画像を削除
      if (work.cover_image_path) {
        const { error: coverError } = await supabase.storage
          .from('work_covers')
          .remove([work.cover_image_path]);
        if (coverError) throw new Error(`カバー画像の削除に失敗: ${coverError.message}`);
      }
      
      // ステップ2: Storageから音声データを削除
      if (work.voice_data_path) {
         const { error: voiceError } = await supabase.storage
          .from('voice_datas')
          .remove([work.voice_data_path]);
        if (voiceError) throw new Error(`音声データの削除に失敗: ${voiceError.message}`);
      }

      // ステップ3: worksテーブルから作品情報を削除
      const { error: dbError } = await supabase
        .from('works')
        .delete()
        .eq('id', workId);
      if (dbError) throw new Error(`データベースからの削除に失敗: ${dbError.message}`);

      // 成功したらクリエイターページに戻る
      router.push("/creator");

    } catch (err) {
      console.error("削除処理中にエラーが発生:", err);
      setError(err.message || "作品の削除に失敗しました。");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCopyWorkUrl = async () => {
    const { data: shopData } = await supabase.from("shops").select("account_name").eq("id", work.user_id).single();
    if (shopData) {
        const workUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${shopData.account_name}/${work.id}`;
        await navigator.clipboard.writeText(workUrl);
        setCopyFeedback("作品URLをコピーしました！");
        setTimeout(() => setCopyFeedback(""), 2000);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-lime-500" />
      </div>
    );
  }
  
  if (!work) {
    return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
            <p className="text-neutral-500">作品を読み込めませんでした。</p>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-neutral-100">
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
          <button 
            onClick={() => router.push('/creator')}
            className="flex items-center gap-2 text-neutral-600 font-semibold mb-6 hover:text-lime-600 transition-colors"
          >
            <FaArrowLeft />
            <span>マイページに戻る</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl shadow-md">
            <div className="aspect-[8/7] w-full">
              <img
                src={work.cover_url}
                alt={work.title}
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>

            <div className="flex flex-col">
              <h1 className="text-4xl font-black mb-4">{work.title}</h1>
              
              <div className="space-y-4 text-lg mb-6">
                <div className="flex justify-between items-center bg-neutral-100 p-4 rounded-lg">
                  <span className="font-semibold text-neutral-600">公開日</span>
                  <span className="font-bold">{new Date(work.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center bg-neutral-100 p-4 rounded-lg">
                  <span className="font-semibold text-neutral-600">販売数</span>
                  <span className="font-bold text-lime-600">{work.sales_count}</span>
                </div>
                 <div className="flex justify-between items-center bg-neutral-100 p-4 rounded-lg">
                  <span className="font-semibold text-neutral-600">価格</span>
                  <span className="font-bold">¥{work.price}</span>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                 <button
                    onClick={handleCopyWorkUrl}
                    className="w-full px-6 py-3 bg-neutral-800 text-white rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FaCopy />
                    <span>{copyFeedback || "この作品のURLをコピー"}</span>
                  </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <FaTrash />
                  <span>この作品を削除する</span>
                </button>
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">本当に削除しますか？</h2>
            <p className="text-neutral-600 mb-6">
              この操作は取り消せません。作品「<span className="font-bold">{work.title}</span>」を完全に削除します。
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-neutral-200 text-neutral-800 rounded-xl font-bold"
                disabled={isDeleting}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className={`flex-1 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 ${isDeleting ? 'cursor-not-allowed' : ''}`}
                disabled={isDeleting}
              >
                {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                <span>削除する</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}