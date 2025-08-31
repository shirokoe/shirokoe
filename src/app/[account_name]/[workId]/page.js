"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FaPlay, FaPause, FaShoppingCart, FaSpinner, FaExclamationCircle, FaCalendarAlt, FaUsers, FaDownload, FaCheckCircle, FaLock, FaArrowLeft, FaFlag } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import { loadStripe } from '@stripe/stripe-js';

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
// 利用規約モーダルコンポーネント
// =====================================================================
function TermsModal({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-left relative shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition"
              onClick={onClose}
            >
              <MdClose size={24} />
            </button>
            <h3 className="text-2xl font-bold mb-6 text-neutral-900">shirokoe購入者利用規約</h3>
            <div className="prose prose-sm max-h-[60vh] overflow-y-auto pr-4 text-neutral-600">
                <p>この利用規約（以下「本規約」といいます。）は、「shirokoe」（以下「本サービス」といいます。）において、音声作品（以下「作品」といいます。）を購入するお客様（以下「購入者」といいます。）に遵守していただく事項を定めます。</p>
                <h4>第1条（本サービスの利用）</h4>
                <p>購入者は、本規約に同意することにより、本サービスを利用して作品を購入することができます。</p>
                <h4>第2条（作品の購入）</h4>
                <p>作品の購入は、Stripeが提供する決済サービスを通じて行われます。作品はデジタルコンテンツの性質上、一度購入された後の<b>返品・返金は一切お受けできません。</b> 5秒間のプレビュー機能を参考に、十分にご確認の上、ご購入ください。</p>
                <h4>第3条（作品の利用）</h4>
                <p>購入者は、購入した作品を私的利用の範囲内でのみ楽しむことができます。購入した作品の複製、再配布、転売、公衆送信、その他クリエイターの権利を侵害する一切の行為を固く禁じます。</p>
                <h4>第4条（作品のダウンロード）</h4>
                <p>購入した作品は、購入後に表示されるダウンロード機能、またはブラウザのローカルストレージに保存された購入履歴を通じて、いつでも再ダウンロードすることが可能です。ただし、クリエイターが作品を削除した場合、または本サービスが終了した場合は、<b>再ダウンロードはできなくなります</b>ので、あらかじめご了承ください。</p>
                <h4>第5条（禁止事項）</h4>
                <p>購入者は、本サービスの利用にあたり、他の利用者、クリエイター、または当社の権利を侵害する行為、その他不正な行為を行ってはなりません。</p>
                 <h4>第6条（免責事項）</h4>
                <p>購入者とクリエイターとの間で生じたトラブルについて、当社は一切の責任を負いません。本サービスの停止、中断、変更、終了によって購入者に生じた損害について、当社は一切の責任を負いません。</p>
                <h4>第7条（本規約の変更）</h4>
                <p>当社は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に表示された時点から効力を生じるものとします。</p>
                <p className="text-xs text-neutral-400">制定日：2025年8月30日</p>
            </div>
            <button onClick={onClose} className="w-full mt-6 py-3 bg-neutral-800 text-white rounded-xl font-bold">閉じる</button>
          </div>
        </div>
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportFeedback, setReportFeedback] = useState("");

  // ★追加: 利用規約モーダルの状態管理
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const PREVIEW_DURATION = 5;

  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (searchParams.get('purchase_success') === 'true') {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) { setError("決済情報が見つかりません。"); return; }
        try {
          setIsProcessingPurchase(true);
          const { data, error: invokeError } = await supabase.functions.invoke("verify-and-get-download-url", { body: { session_id: sessionId } });
          if (invokeError) throw invokeError;
          const { downloadUrl, title, workId: purchasedWorkId } = data;
          if (!downloadUrl || !title || !purchasedWorkId) { throw new Error("ダウンロード情報の取得に失敗しました。"); }
          const purchases = JSON.parse(localStorage.getItem('shiroke_purchases')) || [];
          if (!purchases.includes(purchasedWorkId)) {
            purchases.push(purchasedWorkId);
            localStorage.setItem('shiroke_purchases', JSON.stringify(purchases));
          }
          setIsPurchased(true);
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none'; a.href = url; a.download = `${title}.webm`;
          document.body.appendChild(a); a.click();
          window.URL.revokeObjectURL(url); a.remove();
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
    
    const { data: shopData, error: shopError } = await supabase.from('shops').select('*, stripe_charges_enabled').eq('account_name', account_name).single();
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
    setIsAudioLoading(true);
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

  const handleReport = () => {
    if (!reportReason) { alert("報告理由を選択してください。"); return; }
    const workUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shirokoe.com'}/${account_name}/${workId}`;
    const subject = `[shirokoe] 作品の報告 (ID: ${work.id})`;
    const body = `問題のある作品について報告します。\n\n作品URL: ${workUrl}\n理由: ${reportReason}\n\n`;
    window.location.href = `mailto:shirokoe.official@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setReportFeedback("ご報告ありがとうございます。");
    setTimeout(() => {
        setShowReportModal(false);
        setReportFeedback("");
        setReportReason("");
    }, 2000);
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
    <>
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex items-center justify-center p-4">
      <style jsx global>{`@keyframes wave { 0%, 100% { height: 0.5rem; } 50% { height: 2rem; } } .prose { line-height: 1.6; } .prose h4 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }`}</style>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="relative w-full aspect-[8/7] group">
            <img src={work.cover_url} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
            {!isPurchased && shop.stripe_charges_enabled && <CustomPlayButton isPlaying={isPlaying} isLoading={isAudioLoading} onPlayClick={handlePlayPause} />}
            <audio ref={audioRef} onPlay={() => { setIsPlaying(true); setIsAudioLoading(false); }} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} onWaiting={() => setIsAudioLoading(true)} onCanPlay={() => setIsAudioLoading(false)} onTimeUpdate={() => { if (audioRef.current && audioRef.current.currentTime >= PREVIEW_DURATION) { audioRef.current.pause(); } }} className="hidden" />
          </div>
<div className="p-8">
  <div className="text-center mb-6">
    <h1 className="text-4xl font-black leading-tight">{work.title}</h1>
    <div className="mt-3 flex justify-center">
      <span className="px-3 py-1 text-xs font-bold bg-lime-100 text-lime-700 rounded-full shadow-sm">
        🎧 30秒ボイス作品
      </span>
    </div>
    <p
      onClick={() => router.push(`/${shop.account_name}`)}
      className="text-lg text-neutral-500 mt-3 cursor-pointer hover:text-lime-600 transition-colors"
    >
      by {shop.shop_name}
    </p>
    {!isPurchased && shop.stripe_charges_enabled && (
      <p className="text-xs text-neutral-400 mt-2">
        カバー画像をタップして <b className="text-lime-600">5秒間のプレビュー</b> を体験。<br />
        購入後は <b className="text-lime-600">30秒フルボイス</b> を楽しめます。
      </p>
    )}
  </div>

  {/* 信頼感を出すメタ情報 */}
  <div className="grid grid-cols-2 gap-4 mb-8">
    <div className="bg-neutral-50 rounded-xl py-3 flex flex-col items-center shadow-sm">
      <FaCalendarAlt className="text-lime-600 mb-1" />
      <span className="text-sm text-neutral-500">公開日</span>
      <span className="font-semibold">{new Date(work.created_at).toLocaleDateString()}</span>
    </div>
    <div className="bg-neutral-50 rounded-xl py-3 flex flex-col items-center shadow-sm">
      <FaUsers className="text-lime-600 mb-1" />
      <span className="text-sm text-neutral-500">購入者</span>
      <span className="font-semibold">{work.sales_count} 人</span>
    </div>
  </div>

  {/* 購入・ダウンロードボタン */}
  {isPurchased ? (
    <button
      onClick={handleDownload}
      className="w-full py-4 rounded-xl font-bold text-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-3 bg-neutral-800 text-white"
      disabled={isAudioLoading}
    >
      {isAudioLoading ? (
        <>
          <FaSpinner className="animate-spin" />
          <span>準備中...</span>
        </>
      ) : (
        <>
          <FaDownload />
          <span>再度ダウンロード</span>
        </>
      )}
    </button>
  ) : shop.stripe_charges_enabled ? (
    <button
      onClick={handlePurchase}
      className={`w-full py-4 rounded-xl font-bold text-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-3 text-white ${
        isProcessingPurchase
          ? "bg-lime-600 cursor-not-allowed"
          : "bg-gradient-to-r from-lime-500 to-green-500 shadow-lg"
      }`}
      disabled={isProcessingPurchase}
    >
      {isProcessingPurchase ? (
        <>
          <FaSpinner className="animate-spin" />
          <span>処理中...</span>
        </>
      ) : (
        <>
          <FaShoppingCart />
          <span>¥{work.price} （税込）で購入する</span>
        </>
      )}
    </button>
  ) : (
    <div className="text-center">
      <button
        className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 bg-neutral-200 text-neutral-500 cursor-not-allowed"
        disabled
      >
        <FaLock />
        <span>現在購入できません</span>
      </button>
      <p className="text-xs text-neutral-400 mt-3">
        クリエイターの準備が完了するまでお待ちください。
      </p>
    </div>
  )}

            <div className="mt-4 text-center">
                <button onClick={() => router.push(`/${shop.account_name}`)} className="text-sm text-neutral-500 hover:text-lime-600 font-semibold transition-colors flex items-center justify-center gap-2 mx-auto">
                    <FaArrowLeft />
                    <span>{shop.shop_name}のトップに戻る</span>
                </button>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200 text-center">
                <button onClick={() => setShowReportModal(true)} className="text-xs text-neutral-400 hover:text-red-600 font-semibold transition-colors flex items-center justify-center gap-1.5 mx-auto">
                    <FaFlag />
                    <span>この作品を報告する</span>
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ★追加: 利用規約モーダル */}
    {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}
    
    {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-left relative shadow-2xl">
            <button className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition" onClick={() => setShowReportModal(false)}><MdClose size={24} /></button>
            <h3 className="text-2xl font-bold mb-6 text-neutral-900">作品を報告する</h3>
            {reportFeedback ? (
                <p className="text-lime-600 font-semibold text-center">{reportFeedback}</p>
            ) : (
                <>
                    <div className="space-y-3 mb-6">
                        <p className="text-sm text-neutral-600">報告理由を選択してください:</p>
                        {['過度に性的', '個人情報の漏洩等', '著作権違反', 'その他'].map(reason => (
                            <label key={reason} className="flex items-center p-3 bg-neutral-100 rounded-lg cursor-pointer hover:bg-lime-100 transition-colors">
                                <input type="radio" name="report_reason" value={reason} checked={reportReason === reason} onChange={(e) => setReportReason(e.target.value)} className="h-4 w-4 text-lime-600 border-neutral-300 focus:ring-lime-500" />
                                <span className="ml-3 font-semibold text-neutral-800">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <button onClick={handleReport} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2">報告を送信</button>
                </>
            )}
          </div>
        </div>
    )}
    </>
  );
}
