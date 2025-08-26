"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FaPlay, FaPause, FaShoppingCart, FaSpinner, FaExclamationCircle, FaCalendarAlt, FaUsers, FaDownload, FaCheckCircle } from "react-icons/fa";
import { loadStripe } from '@stripe/stripe-js';

// Stripeの初期化 (公開可能キーを.env.localファイルから読み込む)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// =====================================================================
// カスタム再生ボタンコンポーネント
// =====================================================================
function CustomPlayButton({ isPlaying, isLoading, onPlayClick }) {
  return (
    <button
      onClick={onPlayClick}
      className="absolute inset-0 w-full h-full flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
      aria-label="プレビュー再生"
    >
      <div className="relative w-24 h-24 bg-lime-500 bg-opacity-80 rounded-full flex items-center justify-center text-neutral-900 shadow-lg transform transition-transform hover:scale-110">
        {isLoading ? (
          <FaSpinner className="text-4xl animate-spin" />
        ) : isPlaying ? (
          <div className="flex items-center justify-center gap-1 h-8">
            <span className="w-1 h-full bg-neutral-900 rounded-full animate-[wave_1s_ease-in-out_-0.4s_infinite]"></span>
            <span className="w-1 h-full bg-neutral-900 rounded-full animate-[wave_1s_ease-in-out_-0.2s_infinite]"></span>
            <span className="w-1 h-full bg-neutral-900 rounded-full animate-[wave_1s_ease-in-out_0s_infinite]"></span>
          </div>
        ) : (
          <FaPlay className="text-4xl ml-2" />
        )}
      </div>
    </button>
  );
}


// =====================================================================
// 公開作品ページ本体
// =====================================================================
export default function PublicWorkPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account_name, workId } = params;

  const [work, setWork] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const audioRef = useRef(null);
  
  const PREVIEW_DURATION = 5;

  // ★修正: 購入完了時の処理をここに統合
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      // 1. URLに purchase_success=true があるかチェック
      if (searchParams.get('purchase_success') === 'true') {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
          setError("決済情報が見つかりません。");
          return;
        }

        try {
          setIsProcessingPurchase(true); // UIを「確認中」にする
          
          // 2. 決済が本物か、ロボットに確認してもらう
          const { data, error: invokeError } = await supabase.functions.invoke(
            "verify-and-get-download-url",
            { body: { session_id: sessionId } }
          );
          if (invokeError) throw invokeError;

          const { downloadUrl, title, workId: purchasedWorkId } = data;
          if (!downloadUrl || !title || !purchasedWorkId) {
            throw new Error("ダウンロード情報の取得に失敗しました。");
          }

          // 3. ローカルストレージに保存
          const purchases = JSON.parse(localStorage.getItem('shiroke_purchases')) || [];
          if (!purchases.includes(purchasedWorkId)) {
            purchases.push(purchasedWorkId);
            localStorage.setItem('shiroke_purchases', JSON.stringify(purchases));
          }
          setIsPurchased(true);

          // 4. 自動ダウンロードを開始
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none'; a.href = url; a.download = `${title}.webm`;
          document.body.appendChild(a); a.click();
          window.URL.revokeObjectURL(url); a.remove();

          // 5. URLからクエリパラメータを削除して見た目をクリーンに
          router.replace(`/${account_name}/${workId}`, { scroll: false });

        } catch (err) {
          console.error("購入処理の確認に失敗しました:", err);
          setError(err.message || "購入処理の確認に失敗しました。");
        } finally {
            setIsProcessingPurchase(false);
        }
      }
    };
    checkPurchaseStatus();
  }, [searchParams, workId, account_name, router]);

  const fetchWorkAndShop = useCallback(async () => {
    if (!account_name || !workId) { setError("無効なURLです。"); setLoading(false); return; }
    try {
        const purchases = JSON.parse(localStorage.getItem('shiroke_purchases')) || [];
        if (purchases.includes(workId)) { setIsPurchased(true); }
    } catch (e) { console.error("ローカルストレージの読み込みに失敗", e); }
    
    const { data: shopData, error: shopError } = await supabase.from('shops').select('*').eq('account_name', account_name).single();
    if (shopError || !shopData) { setError("お探しのショップは見つかりませんでした。"); setLoading(false); return; }
    setShop(shopData);

    const { data: workData, error: workError } = await supabase.from('works').select('*').eq('id', workId).eq('user_id', shopData.id).single();
    if (workError || !workData) { setError("お探しの作品は見つからないか、現在非公開です。"); setLoading(false); return; }

    const { data: coverUrlData } = supabase.storage.from('work_covers').getPublicUrl(workData.cover_image_path);
    workData.cover_url = coverUrlData.publicUrl;
    setWork(workData);
    setLoading(false);
  }, [account_name, workId]);

  useEffect(() => { fetchWorkAndShop(); }, [fetchWorkAndShop]);

  const handlePlayPause = () => {
    if (!isAudioLoaded) {
      setIsAudioLoading(true);
      const { data: audioUrlData } = supabase.storage.from('voice_datas').getPublicUrl(work.voice_data_path);
      audioRef.current.src = audioUrlData.publicUrl;
      audioRef.current.play();
      setIsAudioLoaded(true);
    } else {
      if (isPlaying) { audioRef.current.pause(); } else {
        if(audioRef.current.currentTime >= PREVIEW_DURATION) { audioRef.current.currentTime = 0; }
        audioRef.current.play();
      }
    }
  };
  
  const handlePurchase = async () => {
    setIsProcessingPurchase(true);
    setError("");
    try {
        const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
            body: { workId: work.id },
        });
        if (invokeError) throw invokeError;
        const stripe = await stripePromise;
        const { error: stripeError } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
        });
        if (stripeError) { throw stripeError; }
    } catch (err) {
        setError("決済ページの読み込みに失敗しました。");
        console.error(err);
        setIsProcessingPurchase(false);
    }
  };

  const handleDownload = async () => {
    setIsAudioLoading(true); // スピナー表示のため
    const { data: audioUrlData } = supabase.storage.from('voice_datas').getPublicUrl(work.voice_data_path);
    try {
        const response = await fetch(audioUrlData.publicUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none'; a.href = url; a.download = `${work.title}.webm`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); a.remove();
    } catch (err) {
        console.error("ダウンロードエラー:", err);
        setError("ダウンロードに失敗しました。");
    } finally {
        setIsAudioLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-neutral-100 flex items-center justify-center"><FaSpinner className="animate-spin text-4xl text-lime-500" /></div>;
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col items-center justify-center text-center p-8">
        <FaExclamationCircle className="text-5xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
        <p className="text-neutral-500">{error}</p>
        <button onClick={() => router.push('/')} className="mt-8 px-6 py-3 bg-neutral-200 text-neutral-800 rounded-xl font-bold transition-transform transform hover:scale-105">トップページに戻る</button>
      </div>
    );
  }

  if (!work || !shop) return null;
  
  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex items-center justify-center p-4">
      <style jsx global>{`@keyframes wave { 0%, 100% { height: 0.5rem; } 50% { height: 2rem; } }`}</style>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="relative w-full aspect-[8/7] group">
            <img src={work.cover_url} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
            {!isPurchased && <CustomPlayButton isPlaying={isPlaying} isLoading={isAudioLoading} onPlayClick={handlePlayPause} />}
            <audio ref={audioRef} onPlay={() => { setIsPlaying(true); setIsAudioLoading(false); }} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onWaiting={() => setIsAudioLoading(true)} onCanPlay={() => setIsAudioLoading(false)} onTimeUpdate={() => { if (audioRef.current && audioRef.current.currentTime >= PREVIEW_DURATION) { audioRef.current.pause(); } }} className="hidden" />
          </div>
          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-black leading-tight">{work.title}</h1>
              <p onClick={() => router.push(`/${shop.account_name}`)} className="text-lg text-neutral-500 mt-2 cursor-pointer hover:text-lime-600 transition-colors">by {shop.shop_name}</p>
              {!isPurchased && <p className="text-xs text-neutral-400 mt-3">(カバー画像をタップして5秒間プレビューできます)</p>}
            </div>
            <div className="flex justify-center gap-6 text-neutral-500 mb-8">
              <div className="flex items-center gap-2"><FaCalendarAlt /><span className="font-semibold">{new Date(work.created_at).toLocaleDateString()}</span></div>
              <div className="flex items-center gap-2"><FaUsers /><span className="font-semibold">{work.sales_count} 人が購入済み</span></div>
            </div>
            {isPurchased ? (
                <button onClick={handleDownload} className={`w-full py-4 rounded-xl font-bold text-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-3 bg-neutral-800 text-white`} disabled={isAudioLoading}>
                    {isAudioLoading ? <><FaSpinner className="animate-spin" /><span>準備中...</span></> : <><FaDownload /><span>再度ダウンロード</span></>}
                </button>
            ) : (
              <button onClick={handlePurchase} className={`w-full py-4 rounded-xl font-bold text-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-3 ${isProcessingPurchase ? 'bg-lime-600 cursor-not-allowed' : 'bg-lime-500'}`} disabled={isProcessingPurchase}>
                {isProcessingPurchase ? <><FaSpinner className="animate-spin" /><span>処理中...</span></> : <><FaShoppingCart /><span>¥{work.price} で購入する</span></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
