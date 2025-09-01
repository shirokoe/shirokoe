"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Cropper from "react-easy-crop";
import { FaImage, FaUser, FaStore, FaCheckCircle, FaTimesCircle, FaUpload, FaCrop, FaSpinner } from "react-icons/fa";
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

  const MAX_WIDTH = 1200;
  const scale = Math.min(1, MAX_WIDTH / croppedAreaPixels.width);

  canvas.width = Math.round(croppedAreaPixels.width * scale);
  canvas.height = Math.round(croppedAreaPixels.height * scale);

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
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
// ショップ作成ページ本体
// =====================================================================
export default function CreateShopPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const [accountName, setAccountName] = useState("");
  const [shopName, setShopName] = useState("");

  const [bannerPreviewUrl, setBannerPreviewUrl] = useState(null);
  const [bannerBlob, setBannerBlob] = useState(null);

  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user ?? null;

      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);

      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (shop) {
        router.replace("/creator");
        return;
      }

      setChecking(false);
    })();
  }, [router]);

  const isValidAccountName = useMemo(
    () => /^[a-zA-Z0-9_]{1,20}$/.test(accountName),
    [accountName]
  );

  const onPickBanner = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileToDataUrl(file);
    setBannerPreviewUrl(dataUrl);
    setIsCropping(true);
  };

  const onCropComplete = (_, areaPixels) => setCroppedAreaPixels(areaPixels);

  const confirmCrop = async () => {
    if (!bannerPreviewUrl || !croppedAreaPixels) {
      setIsCropping(false);
      return;
    }
    const blob = await getCroppedBlob(bannerPreviewUrl, croppedAreaPixels);
    setBannerBlob(blob);
    // クロップ後のプレビュー用に新しいDataURLを生成
    const croppedDataUrl = await readFileToDataUrl(blob);
    setBannerPreviewUrl(croppedDataUrl);
    setIsCropping(false);
  };

  const cancelCrop = () => {
    // クロップをキャンセルしても、元の画像選択状態は維持
    setIsCropping(false);
  };

  const createShop = async (e) => {
    e.preventDefault();
    setError("");

    if (!user) { router.replace("/login"); return; }
    if (!isValidAccountName) { setError("ユーザーネームは英数字と_のみ（最大20文字）です。"); return; }
    if (!shopName.trim()) { setError("ショップ名を入力してください。"); return; }

    setBusy(true);
    try {
      const { data: existing } = await supabase.from("shops").select("id").eq("account_name", accountName).maybeSingle();
      if (existing) {
        setError("そのユーザーネームはすでに使われています。");
        setBusy(false);
        return;
      }

      let bannerPath = null;
      if (bannerBlob) {
        const storage = supabase.storage.from("shop_banners");
        const filePath = `${user.id}/${uuidv4()}.jpeg`;
        const { error: upErr } = await storage.upload(filePath, bannerBlob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        bannerPath = filePath;
      }

      const { error: insErr } = await supabase.from("shops").insert([{
        id: user.id,
        email: user.email,
        account_name: accountName,
        shop_name: shopName,
        banner_image_path: bannerPath,
      }]);
      if (insErr) throw insErr;

      router.replace("/creator");
    } catch (err) {
      setError(err.message ?? "ショップ作成に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  if (isCropping && bannerPreviewUrl) {
    return (
      <div className="min-h-screen w-full bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-8">バナー画像を調整</h1>
        <div className="relative w-full max-w-4xl h-80 bg-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <Cropper
            image={bannerPreviewUrl}
            crop={crop}
            zoom={zoom}
            aspect={3 / 1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4 mt-8 w-full max-w-sm">
          <button onClick={confirmCrop} className="flex-1 px-6 py-4 bg-lime-500 text-neutral-900 rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
            <FaCheckCircle />
            確定する
          </button>
          <button onClick={cancelCrop} className="flex-1 px-6 py-4 bg-neutral-700 text-white rounded-xl font-bold transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
            <FaTimesCircle />
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (checking) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen w-full bg-neutral-100 text-neutral-800 flex items-center justify-center p-6">
      <form
        onSubmit={createShop}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 space-y-8"
      >
        <h1 className="text-4xl font-black text-center">あなたのショップを作成</h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center font-semibold">
            {error}
          </p>
        )}

        {/* バナー */}
        <div>
          <label className="font-semibold text-neutral-600 flex items-center gap-2 mb-2">
            <FaImage />
            バナー画像 (横長推奨)
          </label>
          <div
            className="w-full h-40 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 overflow-hidden flex flex-col items-center justify-center cursor-pointer relative transition-colors hover:border-lime-500 group"
            onClick={() => document.getElementById("bannerInput")?.click()}
          >
            {bannerPreviewUrl ? (
              <img src={bannerPreviewUrl} alt="banner preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-neutral-500 text-sm font-semibold">クリックして画像を選択</span>
            )}
             <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white font-bold flex items-center gap-2">
                    <FaUpload />
                    <span>画像を{bannerPreviewUrl ? '変更' : '選択'}</span>
                </div>
            </div>
          </div>
          <input id="bannerInput" type="file" accept="image/*" className="hidden" onChange={onPickBanner} />
        </div>

        {/* ユーザーネーム */}
        <div>
          <label className="font-semibold text-neutral-600 flex items-center gap-2 mb-2">
            <FaUser />
            ユーザーネーム (ショップURLになります)
          </label>
          <div className="flex items-center gap-2 border-2 border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50 focus-within:border-lime-500 transition-colors">
            <span className="font-bold select-none text-neutral-400">shirokoe.jp/</span>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="your_name"
              className="flex-1 bg-transparent outline-none font-semibold text-neutral-800"
              maxLength={30}
              required
            />
          </div>
          {!isValidAccountName && accountName.length > 0 && (
            <p className="text-red-600 text-sm mt-1">英数字とアンダースコア(_)のみ、最大30文字</p>
          )}
        </div>

        {/* ショップ名 */}
        <div>
          <label className="font-semibold text-neutral-600 flex items-center gap-2 mb-2">
            <FaStore />
            ショップ名
          </label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="あなたの声のショップ"
            className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50 font-semibold text-neutral-800 focus:outline-none focus:border-lime-500 transition-colors"
            maxLength={50}
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-4 bg-neutral-800 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy ? (
            <><FaSpinner className="animate-spin" /><span>作成中...</span></>
          ) : (
            "ショップを作成する"
          )}
        </button>
      </form>
    </div>
  );
}