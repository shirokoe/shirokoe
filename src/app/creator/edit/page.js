"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaUserEdit, FaStore, FaPen, FaCheck, FaTimes, FaExternalLinkAlt, FaInfoCircle, FaSpinner, FaImage, FaUpload, FaArrowLeft, FaMoneyBillWave, FaTrash, FaExclamationTriangle, FaPercentage, FaFileContract } from "react-icons/fa";
import { MdAccountBalance, MdClose } from "react-icons/md";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { v4 as uuidv4 } from 'uuid';

// =====================================================================
// ヘルパー関数
// =====================================================================
async function readFileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}
async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function getCroppedBlob(imageSrc, croppedAreaPixels) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const MAX_WIDTH = 1600;
  const scale = Math.min(1, MAX_WIDTH / croppedAreaPixels.width);
  canvas.width = Math.round(croppedAreaPixels.width * scale);
  canvas.height = Math.round(croppedAreaPixels.height * scale);
  ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
  });
}

// =====================================================================
// ローディング画面コンポーネント
// =====================================================================
function LoadingScreen() {
    return (
        <div className="min-h-screen w-full bg-neutral-100 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-5xl font-black text-lime-500 animate-pulse">
                    shirokoe
                </h1>
            </div>
        </div>
    );
}

// =====================================================================
// ★更新: クリエイター利用規約モーダル
// =====================================================================
function CreatorTermsModal({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full text-left relative shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition"
              onClick={onClose}
            >
              <MdClose size={24} />
            </button>
            <h3 className="text-2xl font-bold mb-6 text-neutral-900">shirokoeクリエイター利用規約</h3>
            <div className="prose prose-sm max-h-[60vh] overflow-y-auto pr-4 text-neutral-600">
                <p>この利用規約（以下「本規約」といいます。）は、「shirokoe」（以下「本サービス」といいます。）において、音声作品（以下「作品」といいます。）を販売するクリエイター（以下「クリエイター」といいます。）の皆様に遵守していただく事項を定めます。</p>
                
                <h4>第1条（本サービスの利用）</h4>
                <p>クリエイターは, 本規約に同意することにより, 本サービスを利用して作品を販売することができます。</p>
                
                <h4>第2条（禁止される作品）</h4>
                <p>クリエイターは、自身が完全な権利を有するオリジナルの音声作品のみを出品するものとします。以下の内容を含む、またはその恐れのある作品の出品を固く禁じます。</p>
                <ul>
                    <li>第三者の著作権、プライバシー権、肖像権、その他の知的財産権を侵害する内容。</li>
                    <li>過度に性的、または暴力的な表現を含む内容。</li>
                    <li>特定の個人や団体に対する誹謗中傷、名誉毀損、または個人情報の漏洩に繋がる内容。</li>
                    <li>法令または公序良俗に反する内容。</li>
                    <li>その他、運営者が不適切と判断した内容。</li>
                </ul>

                <h4>第3条（売上と手数料）</h4>
                <p>作品の販売価格は、一律500円（消費税込）とします。</p>
                <p>クリエイターの収益は、税抜販売価格の80%とします。</p>
                <p>当社のプラットフォーム手数料として、税抜販売価格の20%をいただきます。Stripeの決済手数料は、当社のプラットフォーム手数料の中から負担します。</p>

                <h4>第4条（売上の振込）</h4>
                <p>売上を受け取るには、Stripe Connectへの口座登録を完了させる必要があります。</p>
                <p>売上は、Stripeの規定に基づき、毎週月曜日に登録された銀行口座へ自動で振り込まれます。振込スケジュールはStripeの規定に従います。</p>

                <h4>第5条（作品の削除とペナルティ）</h4>
                <p>クリエイターは、いつでも自身の作品を削除することができます。</p>
                <p>運営者は、出品された作品が第2条に違反すると判断した場合、クリエイターへの事前の通知なく、当該作品を無断で削除できるものとします。この措置によるクリエイターの損害について、運営者は一切の責任を負いません。</p>

                <h4>第6条（免責事項）</h4>
                <p>クリエイターと購入者との間で生じたトラブルについて、当社は一切の責任を負いません。</p>
                <p>本サービスの停止、中断、変更、終了によってクリエイターに生じた損害について、当社は一切の責任を負いません。</p>

                <h4>第7条（本規約の変更）</h4>
                <p>当社は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に表示された時点から効力を生じるものとします。</p>
                
                <p className="text-right text-xs text-neutral-400 mt-4">制定日：2025年8月30日</p>
            </div>
            <button onClick={onClose} className="w-full mt-6 py-3 bg-neutral-800 text-white rounded-xl font-bold">閉じる</button>
          </div>
        </div>
    );
}


// =====================================================================
// プロフィール編集ページ本体
// =====================================================================
export default function CreatorEditPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const [shopName, setShopName] = useState("");
  const [editingShopName, setEditingShopName] = useState(false);
  const [shopNameInput, setShopNameInput] = useState("");
  
  const [bannerUrl, setBannerUrl] = useState(null);
  const [bannerBlob, setBannerBlob] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  
  
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchProfile = useCallback(async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user ?? null;
      if (!currentUser) { router.replace("/login"); return; }
      setUser(currentUser);

      const { data: shopData } = await supabase.from("shops").select("*").eq("id", currentUser.id).maybeSingle();
      if (shopData) {
        setShop(shopData);
        setShopName(shopData.shop_name);
        setShopNameInput(shopData.shop_name);
        if (shopData.banner_image_path) {
          const { data } = supabase.storage.from("shop_banners").getPublicUrl(shopData.banner_image_path);
          setBannerUrl(data.publicUrl);
        }
        
        if (shopData.stripe_account_id) {
            const { data: statusData, error: statusError } = await supabase.functions.invoke('get-stripe-account-status');
            if (statusError) {
                console.error("Stripeステータス取得エラー", statusError);
            } else if (statusData.isEnabled) {
                setIsStripeEnabled(true);
            }
        }
      } else {
        router.replace("/createShop");
        return;
      }
      setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveShopName = async () => {
    if (shopNameInput.trim() === "") { setError("ショップ名は必須です。"); return; }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.from("shops").update({ shop_name: shopNameInput }).eq("id", user.id);
      if (updateError) throw updateError;
      setShopName(shopNameInput);
      setEditingShopName(false);
    } catch (err) {
      setError(err.message ?? "ショップ名の更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const onPickBanner = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileToDataUrl(file);
    setBannerPreviewUrl(dataUrl);
    setIsCropping(true);
  };

  const onCropComplete = ((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  });

  const confirmCrop = async () => {
    if (!bannerPreviewUrl || !croppedAreaPixels) { setIsCropping(false); return; }
    const blob = await getCroppedBlob(bannerPreviewUrl, croppedAreaPixels);
    setBannerBlob(blob);
    const croppedDataUrl = await readFileToDataUrl(blob);
    setBannerPreviewUrl(croppedDataUrl);
    setIsCropping(false);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    if (!bannerBlob) { setBannerPreviewUrl(null); }
  };

  const handleSaveBanner = async () => {
    if (!bannerBlob || !user) { setError("画像が選択されていません。"); return; }
    setBusy(true);
    setError("");
    try {
      const storage = supabase.storage.from("shop_banners");
      if (shop?.banner_image_path) { await storage.remove([shop.banner_image_path]); }
      const newBannerPath = `${user.id}/${uuidv4()}.jpeg`;
      const { error: upErr } = await storage.upload(newBannerPath, bannerBlob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error: updateError } = await supabase.from("shops").update({ banner_image_path: newBannerPath }).eq("id", user.id);
      if (updateError) throw updateError;
      const { data: newUrl } = supabase.storage.from("shop_banners").getPublicUrl(newBannerPath);
      setBannerUrl(newUrl.publicUrl);
      setBannerBlob(null);
      setBannerPreviewUrl(null);
    } catch (err) {
      setError(err.message ?? "バナー画像の更新に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const handleStripeConnect = async () => {
    setBusy(true);
    setError("");
    try {
        const { data, error } = await supabase.functions.invoke('stripe-connect', { method: 'POST' });
        if (error) throw error;
        window.location.href = data.url;
    } catch (err) {
        setError("Stripeへの接続に失敗しました。");
        console.error(err);
        setBusy(false);
    }
  };
  
  const handleResetStripe = async () => {
    setBusy(true);
    setError("");
    try {
        const { data: resetData, error } = await supabase.functions.invoke('reset-stripe-account', { method: 'POST' });
        if (error) throw error;
        if(resetData.error){ throw new Error(resetData.error); }
        window.location.reload();
    } catch (err) {
        setError(err.message ?? "Stripeアカウントのリセットに失敗しました。");
        setBusy(false);
        setShowResetModal(false);
    }
  };

  const handleDeleteUser = async () => {
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.functions.invoke('delete-user', { method: 'POST' });
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      setError("アカウントの削除に失敗しました。");
      console.error(err);
      setBusy(false);
      setShowDeleteUserModal(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (isCropping && bannerPreviewUrl) {
    return (
      <div className="min-h-screen w-full bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-8">バナー画像を調整</h1>
        <div className="relative w-full max-w-4xl h-80 bg-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <Cropper image={bannerPreviewUrl} crop={crop} zoom={zoom} aspect={3 / 1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
        </div>
        <div className="flex flex-col md:flex-row gap-4 mt-8 w-full max-w-sm">
          <button onClick={confirmCrop} className="flex-1 px-6 py-4 bg-lime-500 text-neutral-900 rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2"><FaCheck />確定する</button>
          <button onClick={cancelCrop} className="flex-1 px-6 py-4 bg-neutral-700 text-white rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2"><FaTimes />戻る</button>
        </div>
      </div>
    );
  }

 return (
    <>
    <style>{`.prose ul { list-style-type: disc; margin-left: 1.5em; } .prose h4 { font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }`}</style>
    <div className="bg-neutral-100 min-h-screen px-6 py-12 text-neutral-900 font-sans">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/creator')} className="flex items-center gap-2 text-neutral-600 font-semibold mb-6 hover:text-lime-600 transition-colors"><FaArrowLeft /><span>マイページに戻る</span></button>
        
        <div className="bg-white p-8 rounded-3xl shadow-md space-y-8">
            <h1 className="text-4xl font-black text-center">プロフィール・口座設定</h1>

            {error && <div className="flex items-center gap-2 bg-red-100 text-red-700 p-3 rounded-lg text-sm font-semibold"><FaInfoCircle /><span>{error}</span></div>}

            <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><FaImage />バナー画像</label>
                <label className="w-full h-40 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 overflow-hidden flex flex-col items-center justify-center cursor-pointer relative transition-colors hover:border-lime-500 group">
                    <input type="file" accept="image/*" className="hidden" onChange={onPickBanner} />
                    {bannerPreviewUrl ? <img src={bannerPreviewUrl} alt="banner preview" className="h-full w-full object-cover" /> : bannerUrl ? <img src={bannerUrl} alt="current banner" className="h-full w-full object-cover" /> : <span className="text-neutral-500 text-sm font-semibold">クリックして画像を選択</span>}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="text-white font-bold flex items-center gap-2"><FaUpload /><span>画像を{bannerUrl || bannerPreviewUrl ? '変更' : '選択'}</span></div></div>
                </label>
                {bannerBlob && <div className="flex justify-end mt-4"><button type="button" onClick={handleSaveBanner} className="px-5 py-2 bg-lime-500 text-white rounded-full text-sm font-semibold shadow-md flex items-center gap-2 hover:bg-lime-600 transition-colors" disabled={busy}>{busy ? <FaSpinner className="animate-spin" /> : <><FaCheck />バナーを保存</>}</button></div>}
            </div>
            <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><FaStore />ショップ名</label>
                {editingShopName ? (
                    <div className="flex gap-2 items-center">
                        <input type="text" className="flex-1 border-2 border-neutral-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500 transition-colors text-lg" value={shopNameInput} onChange={(e) => setShopNameInput(e.target.value)} />
                        <button type="button" className="p-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700" onClick={handleSaveShopName} disabled={busy}>{busy ? <FaSpinner className="animate-spin" /> : <FaCheck />}</button>
                        <button type="button" className="p-3 bg-neutral-200 text-neutral-800 rounded-xl hover:bg-neutral-300" onClick={() => { setEditingShopName(false); setShopNameInput(shopName); }} disabled={busy}><FaTimes /></button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-xl">
                        <span className="font-bold text-2xl">{shopName}</span>
                        <button type="button" className="px-4 py-2 bg-white text-neutral-800 rounded-lg font-semibold hover:bg-neutral-200 transition-colors flex items-center gap-2 border border-neutral-200" onClick={() => setEditingShopName(true)}><FaPen size={12} />編集</button>
                    </div>
                )}
            </div>
            <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><FaUserEdit />ショップURL (変更不可)</label>
                <a href={`https://shirokoe/${shop?.account_name}`} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center px-4 py-3 bg-neutral-100 text-neutral-500 rounded-xl font-mono text-lg hover:bg-neutral-200 transition-colors">
                    <span>{shop?.account_name}</span>
                    <FaExternalLinkAlt />
                </a>
            </div>
             <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><MdAccountBalance />口座登録</label>
                <div className="space-y-2">
                    {isStripeEnabled ? (
                         <div className="p-4 rounded-xl bg-lime-100 text-lime-800 space-y-2">
                            <div className="font-bold flex items-center justify-center gap-2"><FaCheck />口座登録済み</div>
                            <button onClick={() => setShowResetModal(true)} className="w-full text-xs hover:text-red-600 underline">登録情報を変更/リセットする</button>
                        </div>
                    ) : (
                        <button className={`w-full px-4 py-4 rounded-xl font-bold transition-transform transform hover:scale-105 ${shop?.stripe_account_id ? "bg-yellow-400 text-yellow-900" : "bg-neutral-800 text-white"} flex items-center justify-center gap-2`} onClick={handleStripeConnect} disabled={busy}>
                            {busy ? <FaSpinner className="animate-spin" /> : shop?.stripe_account_id ? <><FaExternalLinkAlt />登録手続きを続行/更新</> : <><FaExternalLinkAlt />Stripeで口座登録</>}
                        </button>
                    )}
                </div>
            </div>
            <div className="space-y-4">
                 <div>
                    <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><FaPercentage />手数料について</label>
                    <div className="bg-neutral-50 rounded-xl p-4 text-neutral-600 text-sm space-y-2">
                         <p>あなたの取り分は、**税抜販売価格の80%**です。</p>
                         <p className="text-xs text-neutral-400">Stripeの決済手数料は、私たちのプラットフォーム手数料から負担しますので、ご安心ください。</p>
                    </div>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3">売上の振込について</label>
                    <div className="bg-neutral-50 rounded-xl p-4 text-neutral-600 text-sm space-y-2">
                        <p>Stripeに登録された口座へ、**毎週月曜日に自動で売上が振り込まれます。**</p>
                        <p className="text-xs text-neutral-400">※ Stripeの規定により、最初の振込は支払いがあってから7〜14日後、それ以降は数営業日の遅延が発生します。</p>
                    </div>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><FaFileContract />利用規約</label>
                    <div className="bg-neutral-50 rounded-xl p-4 text-neutral-600 text-sm space-y-2">
                        <p>サービスをご利用いただく前に、必ず利用規約をご確認ください。</p>
                        <button onClick={() => setShowTermsModal(true)} className="font-semibold text-lime-600 underline">
                            クリエイター利用規約を開く
                        </button>
                    </div>
                </div>
            </div>
            {/* 退会処理セクション */}
            <div className="!mt-12 pt-8 border-t-2 border-dashed border-red-200">
                 <label className="flex items-center gap-2 text-lg font-semibold text-red-600 mb-3"><FaExclamationTriangle />アカウントの削除</label>
                 <p className="text-sm text-neutral-600 mb-4">
                    この操作は取り消せません。アカウントを削除すると、あなたのショップ、公開中のすべての作品、および関連するすべてのデータが完全に削除されます。
                 </p>
                 <button 
                    onClick={() => setShowDeleteUserModal(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl font-bold transition-transform transform hover:scale-105"
                 >
                    退会手続きに進む
                 </button>
            </div>
        </div>
      </div>
    </div>
    
    {showTermsModal && <CreatorTermsModal onClose={() => setShowTermsModal(false)} />}
    
    {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Stripe連携をリセットしますか？</h2>
            <div className="text-neutral-600 mb-6 text-sm space-y-2">
                <p>現在連携されているStripeアカウントの情報が削除され、最初から口座登録をやり直せるようになります。この操作は取り消せません。</p>
                <p className="font-bold bg-yellow-50 p-2 rounded-lg">
                    もし、リセット前のStripeアカウントに売上残高がある場合、その金額は以前登録された銀行口座へ、Stripeのスケジュールに従って後日自動で振り込まれますのでご安心ください。
                </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 bg-neutral-200 text-neutral-800 rounded-xl font-bold" disabled={busy}>キャンセル</button>
              <button onClick={handleResetStripe} className={`flex-1 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 ${busy ? 'cursor-not-allowed' : ''}`} disabled={busy}>
                {busy ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                <span>リセットする</span>
              </button>
            </div>
          </div>
        </div>
    )}

    {showDeleteUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">本当に退会しますか？</h2>
            <div className="text-neutral-600 mb-6 text-sm space-y-2">
                <p>この操作は取り消せません。あなたのショップ、公開中のすべての作品、および関連するすべてのデータが完全に削除されます。</p>
                <p className="font-bold bg-yellow-50 p-2 rounded-lg">
                    未払いの売上がある場合、Stripeのスケジュールに従って後日自動で振り込まれますのでご安心ください。
                </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteUserModal(false)} className="flex-1 py-3 bg-neutral-200 text-neutral-800 rounded-xl font-bold" disabled={busy}>キャンセル</button>
              <button onClick={handleDeleteUser} className={`flex-1 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 ${busy ? 'cursor-not-allowed' : ''}`} disabled={busy}>
                {busy ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                <span>退会する</span>
              </button>
            </div>
          </div>
        </div>
    )}
    </>
  );
}

