"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaUserEdit, FaStore, FaPen, FaCheck, FaTimes, FaExternalLinkAlt, FaInfoCircle, FaSpinner, FaImage, FaUpload, FaArrowLeft, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import { MdAccountBalance } from "react-icons/md";
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
// プロフィール編集ページ本体
// =====================================================================
export default function CreatorEditPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const [shopName, setShopName] = useState("");
  const [editingShopName, setEditingShopName] = useState(false);
  const [shopNameInput, setShopNameInput] = useState("");
  
  const [bannerUrl, setBannerUrl] = useState(null);
  const [bannerBlob, setBannerBlob] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);
  
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

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

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
        const { error } = await supabase.functions.invoke('reset-stripe-account', { method: 'POST' });
        if (error) throw error;
        await fetchProfile();
        setShowResetModal(false);
    } catch (err) {
        setError("Stripeアカウントのリセットに失敗しました。");
        console.error(err);
    } finally {
        setBusy(false);
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
    <div className="bg-neutral-100 min-h-screen px-6 py-12 text-neutral-900 font-sans">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/creator')} className="flex items-center gap-2 text-neutral-600 font-semibold mb-6 hover:text-lime-600 transition-colors"><FaArrowLeft /><span>マイページに戻る</span></button>
        
        <div className="bg-white p-8 rounded-3xl shadow-md space-y-8">
            <h1 className="text-4xl font-black text-center">プロフィール・口座設定</h1>

            {error && <div className="flex items-center gap-2 bg-red-100 text-red-700 p-3 rounded-lg text-sm font-semibold"><FaInfoCircle /><span>{error}</span></div>}

            <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><FaImage />バナー画像</label>
                <div className="w-full h-40 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 overflow-hidden flex flex-col items-center justify-center cursor-pointer relative transition-colors hover:border-lime-500 group">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onPickBanner} />
                    {bannerPreviewUrl ? <img src={bannerPreviewUrl} alt="banner preview" className="h-full w-full object-cover" /> : bannerUrl ? <img src={bannerUrl} alt="current banner" className="h-full w-full object-cover" /> : <span className="text-neutral-500 text-sm font-semibold">クリックして画像を選択</span>}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="text-white font-bold flex items-center gap-2"><FaUpload /><span>画像を{bannerUrl || bannerPreviewUrl ? '変更' : '選択'}</span></div></div>
                </div>
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
                <a href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${shop?.account_name}`} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center px-4 py-3 bg-neutral-100 text-neutral-500 rounded-xl font-mono text-lg hover:bg-neutral-200 transition-colors">
                    <span>{shop?.account_name}</span>
                    <FaExternalLinkAlt />
                </a>
            </div>
             <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3"><MdAccountBalance />口座登録</label>
                <div className="space-y-2">
                    {isStripeEnabled ? (
                        <div className="w-full px-4 py-4 rounded-xl font-bold bg-lime-100 text-lime-800 flex items-center justify-center gap-2">
                            <FaCheck />口座登録済み
                        </div>
                    ) : (
                        <button className={`w-full px-4 py-4 rounded-xl font-bold transition-transform transform hover:scale-105 ${shop?.stripe_account_id ? "bg-yellow-400 text-yellow-900" : "bg-neutral-800 text-white"} flex items-center justify-center gap-2`} onClick={handleStripeConnect} disabled={busy}>
                            {busy ? <FaSpinner className="animate-spin" /> : shop?.stripe_account_id ? <><FaExternalLinkAlt />登録手続きを続行/更新</> : <><FaExternalLinkAlt />Stripeで口座登録</>}
                        </button>
                    )}
                    {shop?.stripe_account_id && (
                        <button onClick={() => setShowResetModal(true)} className="w-full text-xs text-neutral-500 hover:text-red-600 underline">
                            間違えましたか？登録をリセットする
                        </button>
                    )}
                </div>
            </div>
            {/* ★修正: 振込申請セクションを、自動振込の案内に変更 */}
            <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-neutral-600 mb-3">
                    売上の振込について
                </label>
                <div className="bg-neutral-50 rounded-xl p-4 text-neutral-600 text-sm space-y-2">
                    <p>Stripeに登録された口座へ、**毎週月曜日に自動で売上が振り込まれます。**</p>
                    <p className="text-xs text-neutral-400">※ Stripeの規定により、最初の振込は支払いがあってから7〜14日後、それ以降は4営業日の遅延が発生します。</p>
                    <a href="https://stripe.com/docs/payouts" target="_blank" rel="noopener noreferrer" className="text-lime-600 font-semibold underline flex items-center gap-1">
                        Stripeの振込スケジュールについて詳しく <FaExternalLinkAlt size={12} />
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
    {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <FaExclamationTriangle className="text-5xl text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Stripe連携をリセットしますか？</h2>
            <p className="text-neutral-600 mb-6">現在連携されているStripeアカウントの情報が削除され、最初から口座登録をやり直せるようになります。この操作は取り消せません。</p>
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
    </>
  );
}