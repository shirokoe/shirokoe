"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaUserEdit, FaStore, FaPen, FaCheck, FaTimes, FaExternalLinkAlt, FaSpinner, FaImage, FaUpload, FaArrowLeft, FaMicrophone, FaCopy, FaPlay, FaStop, FaCalendarAlt, FaUsers, FaCropAlt, FaInfoCircle } from "react-icons/fa";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { v4 as uuidv4 } from 'uuid';

// =====================================================================
// ヘルパー関数
// =====================================================================
const createImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
});

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const canvasSize = Math.max(image.width, image.height);
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  ctx.drawImage(image, canvasSize / 2 - image.width / 2, canvasSize / 2 - image.height / 2);
  const data = ctx.getImageData(0, 0, canvasSize, canvasSize);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, Math.round(-canvasSize / 2 + image.width / 2 - pixelCrop.x), Math.round(-canvasSize / 2 + image.height / 2 - pixelCrop.y));
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas is empty')); return; }
      blob.name = 'cropped.jpeg';
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

// =====================================================================
// ローディング画面コンポーネント
// =====================================================================
function LoadingScreen() {
    return (
        <div className="min-h-screen w-full bg-neutral-100 flex items-center justify-center">
            <h1 className="text-5xl font-black text-lime-500 animate-pulse">shirokoe</h1>
        </div>
    );
}

// =====================================================================
// 録音UIコンポーネント (UI表示に特化)
// =====================================================================
function RecordingUI({ countdown, stream, onCancel }) {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 2048;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);
            canvasCtx.fillStyle = "rgb(23, 23, 23)";
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeStyle = "rgb(132, 204, 22)";
            canvasCtx.beginPath();
            const sliceWidth = (canvas.width * 1.0) / analyser.frequencyBinCount;
            let x = 0;
            for (let i = 0; i < analyser.frequencyBinCount; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;
                if (i === 0) { canvasCtx.moveTo(x, y); } else { canvasCtx.lineTo(x, y); }
                x += sliceWidth;
            }
            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };
        draw();
        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            audioContext.close();
        };
    }, [stream]);

    return (
        <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col items-center justify-center p-6 z-50">
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full opacity-50"></canvas>
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="font-mono text-8xl font-black text-lime-500 mb-8 tabular-nums">
                    00:{String(countdown).padStart(2, '0')}
                </div>
                <button onClick={onCancel} className="group flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-red-600 text-red-600 rounded-full font-bold text-lg transition-all duration-300 hover:bg-red-600 hover:text-white transform hover:scale-110">
                    <FaStop className="transition-transform duration-300 group-hover:rotate-90" />
                    録音を中断
                </button>
            </div>
        </div>
    );
}

// =====================================================================
// クリエイターページ本体
// =====================================================================
export default function CreatorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState("");
  
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [countdown, setCountdown] = useState(0);
  
  const [newAudioBlob, setNewAudioBlob] = useState(null);
  const [newAudioUrl, setNewAudioUrl] = useState(null);
  const [workTitle, setWorkTitle] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // ★追加: Stripeの有効化状態を管理
  const [isStripeEnabled, setIsStripeEnabled] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isCancelledRef = useRef(false);

  const fetchWorks = async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase.from('works').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) { console.error("作品の取得に失敗しました:", error); } else { setWorks(data); }
  };

  const fetchProfile = useCallback(async () => {
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth?.user ?? null;
      if (!currentUser) { router.replace("/login"); return; }
      setUser(currentUser);
      const { data: shopData } = await supabase.from("shops").select("*").eq("id", currentUser.id).maybeSingle();
      if (!shopData) { router.replace("/create-shop"); return; }
      setShop(shopData);
      
      // ★追加: Stripeアカウントの有効状態を確認
      if (shopData.stripe_account_id) {
          const { data: statusData, error: statusError } = await supabase.functions.invoke('get-stripe-account-status');
          if (statusError) { console.error("Stripeステータス取得エラー", statusError); }
          else if (statusData.isEnabled) { setIsStripeEnabled(true); }
      }
      
      await fetchWorks(currentUser.id);
      setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  useEffect(() => {
    if (!isRecording) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);


  const resetPublishForm = () => {
    setNewAudioBlob(null);
    setNewAudioUrl(null);
    setWorkTitle("");
    setCroppedImageBlob(null);
    setCroppedImageUrl(null);
    setImgSrc('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError('');
  };

  const handleCopyUrl = async () => {
    const shopUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shirokoe.jp'}/${shop.account_name}`;
    await navigator.clipboard.writeText(shopUrl);
    setCopyFeedback("コピーしました！");
    setTimeout(() => setCopyFeedback(""), 2000);
  };

  const startRecording = async () => {
    resetPublishForm();
    isCancelledRef.current = false;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      
      mediaRecorderRef.current = new MediaRecorder(audioStream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        audioStream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (isCancelledRef.current) {
          setStream(null);
          return;
        }
        if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setNewAudioBlob(audioBlob);
            setNewAudioUrl(URL.createObjectURL(audioBlob));
        }
        setStream(null);
      };

      setIsRecording(true);
      setCountdown(30);
      mediaRecorderRef.current.start();
      
    } catch (err) {
      console.error("マイクへのアクセスが拒否されました。", err);
      setError("マイクへのアクセス許可が必要です。");
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    } else {
        stream?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setStream(null);
    }
  };

  const publishWork = async () => {
    if (!workTitle.trim()) { setError("タイトルは必須です。"); return; }
    if (!newAudioBlob) { setError("音声が録音されていません。"); return; }
    if (!croppedImageBlob) { setError("カバー画像を設定してください。"); return; }

    setPublishing(true);
    setError("");

    try {
      const timestamp = Date.now();
      const coverFileName = `${timestamp}-cover.jpeg`;
      const coverFilePath = `${user.id}/${coverFileName}`;
      const { error: coverUploadError } = await supabase.storage.from('work_covers').upload(coverFilePath, croppedImageBlob);
      if (coverUploadError) throw coverUploadError;

      const audioFileName = `${timestamp}-voice.webm`;
      const audioFilePath = `${user.id}/${audioFileName}`;
      const { error: audioUploadError } = await supabase.storage.from('voice_datas').upload(audioFilePath, newAudioBlob);
      if (audioUploadError) throw audioUploadError;

      const { error: insertError } = await supabase.from('works').insert({
        user_id: user.id,
        title: workTitle,
        price: 500,
        cover_image_path: coverFilePath,
        voice_data_path: audioFilePath,
        voice_length: 30,
      });
      if (insertError) throw insertError;
      
      await fetchProfile();
      setPublishing(false);
      resetPublishForm();
    } catch (error) {
      console.error("公開エラー:", error);
      setError("作品の公開に失敗しました。");
      setPublishing(false);
    }
  };

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(String(reader.result)));
      reader.readAsDataURL(e.target.files[0]);
      setIsCropperOpen(true);
    }
    e.target.value = null;
  };

  const onCropComplete = ((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  });

  const handleCrop = async () => {
    if (imgSrc && croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(imgSrc, croppedAreaPixels);
        setCroppedImageBlob(croppedBlob);
        setCroppedImageUrl(URL.createObjectURL(croppedBlob));
        setIsCropperOpen(false);
      } catch (e) {
        console.error(e);
        setError("画像の切り抜きに失敗しました。");
      }
    }
  };

  if (loading) return <LoadingScreen />;
  if (isRecording) return <RecordingUI countdown={countdown} stream={stream} onCancel={cancelRecording} />;

  if (newAudioBlob) {
    return (
      <>
       <div className="min-h-screen bg-neutral-100 p-6 flex flex-col items-center justify-center">
  <div className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-md">
    <h2 className="text-3xl font-black mb-6 text-center">新しい作品を公開</h2>

    {error && (
      <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center font-semibold mb-6">
        {error}
      </p>
    )}

    {/* 音声プレビュー */}
    <div className="mb-6">
      <h3 className="text-lg font-bold mb-2">音声プレビュー (30秒)</h3>
      <audio controls src={newAudioUrl} className="w-full rounded-lg" />
    </div>

    {/* 作品情報 + カバー */}
    <div className="grid grid-cols-3 gap-6 mb-6">
      <div className="col-span-1">
        <h3 className="text-lg font-bold mb-2">カバー画像</h3>
        <label className="cursor-pointer aspect-[8/7] bg-neutral-100 rounded-xl flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-300 hover:border-lime-500 hover:text-lime-500 transition-colors">
          {croppedImageUrl ? (
            <img
              src={croppedImageUrl}
              alt="Cropped Cover"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <>
              <FaImage className="text-4xl mb-2" />
              <span className="text-sm font-semibold text-center">
                画像を選択
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            className="hidden"
          />
        </label>
      </div>

      <div className="col-span-2">
        <h3 className="text-lg font-bold mb-2">作品情報</h3>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col">
            <span className="font-semibold text-neutral-600 mb-1">タイトル</span>
            <input
              type="text"
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="例：夏の日のささやき"
              className="w-full border-2 border-neutral-200 rounded-xl py-3 pl-4 focus:outline-none focus:border-lime-500 transition-colors"
            />
          </label>
        </div>
      </div>
    </div>

    {/* 価格表示 */}
    <div className="mb-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center">
      <p className="text-lg font-bold text-neutral-700">
        価格：<span className="text-lime-600">500円（税込）</span>
      </p>
      <p className="text-sm text-neutral-500 mt-1">
        ※ すべての購入者に一律価格が適用されます
      </p>
    </div>

    {/* ボタン */}
    <div className="flex gap-4">
      <button
        onClick={publishWork}
        className={`flex-1 px-6 py-4 rounded-xl font-bold text-white transition-transform transform hover:scale-105 flex items-center justify-center gap-2 ${
          publishing
            ? "bg-lime-600 cursor-not-allowed"
            : "bg-lime-500"
        }`}
        disabled={publishing}
      >
        {publishing ? (
          <>
            <FaSpinner className="animate-spin" />
            <span>公開中...</span>
          </>
        ) : (
          <>
            <FaUpload />
            <span>作品を公開</span>
          </>
        )}
      </button>

      <button
        onClick={resetPublishForm}
        className="flex-1 px-6 py-4 bg-neutral-200 text-neutral-800 rounded-xl font-bold transition-transform transform hover:scale-105"
        disabled={publishing}
      >
        キャンセル
      </button>
    </div>
  </div>
</div>

        {isCropperOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full flex flex-col" style={{ height: '90vh' }}>
                <h3 className="text-xl font-bold mb-4 flex-shrink-0">画像を切り抜き</h3>
                <div className="relative flex-grow">
                {imgSrc && (
                    <Cropper image={imgSrc} crop={crop} zoom={zoom} aspect={8 / 7} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                )}
                </div>
                <div className="flex gap-4 mt-6 flex-shrink-0">
                    <button onClick={() => setIsCropperOpen(false)} className="flex-1 px-6 py-3 bg-neutral-200 text-neutral-800 rounded-xl font-bold">キャンセル</button>
                    <button onClick={handleCrop} className="flex-1 px-6 py-3 bg-lime-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><FaCropAlt />切り抜く</button>
                </div>
            </div>
            </div>
        )}
      </>
    );
  }

  // 通常のクリエイターページUI
  return (
    <div className="bg-neutral-100 min-h-screen px-6 py-12 text-neutral-900 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-4xl font-black">{shop?.shop_name}</h1>
                        <p className="text-lg text-neutral-500">@{shop?.account_name}</p>
                    </div>
                    <button onClick={() => router.push("/creator/edit")} className="px-5 py-2 bg-neutral-100 text-neutral-800 rounded-full font-semibold hover:bg-neutral-200 transition-colors flex items-center gap-2 border border-neutral-200 whitespace-nowrap">
                        <FaPen size={12} />
                        プロフィール編集
                    </button>
                </div>
                <div className="mt-8 pt-8 border-t border-neutral-200">
                     <label className="font-semibold text-neutral-600 mb-2 block">ショップURLをシェア</label>
                     <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-100 text-neutral-600 px-4 py-3 rounded-lg text-sm font-mono truncate">
                            {`${process.env.NEXT_PUBLIC_SITE_URL || 'https://shirokoe.jp'}/${shop?.account_name}`}
                        </div>
                        <button onClick={handleCopyUrl} className="px-5 py-3 bg-neutral-800 text-white rounded-lg font-bold transition-transform transform hover:scale-105 flex items-center gap-2">
                            <FaCopy />
                            <span>{copyFeedback || "コピー"}</span>
                        </button>
                     </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-md text-center">
                <h2 className="text-2xl font-bold mb-4">新しい作品を録音</h2>
                {/* ★修正: Stripeが有効でない場合の案内 */}
                {!isStripeEnabled ? (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg text-left">
                        <div className="flex">
                            <div className="py-1"><FaInfoCircle className="mr-3" /></div>
                            <div>
                                <p className="font-bold">はじめに</p>
                                <p className="text-sm">作品を公開するには、売上を受け取るための口座登録を完了させる必要があります。</p>
                                <button onClick={() => router.push('/creator/edit')} className="mt-2 px-4 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600">
                                    口座を登録する
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-neutral-500 mb-6 max-w-md mx-auto">スタジオに入り、30秒間の録音を開始します。最高のテイクをファンに届けましょう。</p>
                        <button onClick={startRecording} className="w-full max-w-xs mx-auto py-5 bg-lime-500 text-neutral-900 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3">
                            <FaMicrophone />
                            <span>スタジオに入る</span>
                        </button>
                    </>
                )}
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-md">
               <h2 className="text-2xl font-bold mb-6">作品ギャラリー</h2>
               {works.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                   {works.map((work) => {
                     const coverUrl = supabase.storage.from('work_covers').getPublicUrl(work.cover_image_path).data.publicUrl;
                     return (
                       <div key={work.id} className="bg-neutral-50 rounded-2xl overflow-hidden shadow-sm transition-transform transform hover:-translate-y-1 cursor-pointer group flex flex-col" onClick={() => router.push(`/creator/${work.id}`)}>
                         <div className="relative w-full aspect-[8/7]">
                           <img src={coverUrl} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <FaPlay className="text-white text-4xl" />
                           </div>
                         </div>
                         <div className="p-4 flex flex-col flex-grow">
                           <h3 className="font-bold text-lg truncate mb-2">{work.title}</h3>
                           <div className="text-xs text-neutral-500 space-y-1 mt-auto">
                                <p className="flex items-center gap-1.5"><FaCalendarAlt /> <span>{new Date(work.created_at).toLocaleDateString()}</span></p>
                                <p className="flex items-center gap-1.5"><FaUsers /> <span>{work.sales_count}</span></p>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="text-center py-12">
                    <p className="text-neutral-500">まだ公開された作品はありません。</p>
                    <p className="text-sm text-neutral-400 mt-2">最初の作品を録音してみましょう。</p>
                 </div>
               )}
            </div>
          </div>
          <div className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-md h-fit">
              <h2 className="text-2xl font-bold mb-4">アナリティクス</h2>
              <div className="space-y-4 text-lg">
                <div className="flex justify-between items-center bg-lime-50 p-4 rounded-lg">
                  <span className="font-semibold text-lime-800">総売上(税込)</span>
                  <span className="font-black text-2xl text-lime-600">¥{(shop?.total_sales_count * 500).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-neutral-100 p-4 rounded-lg">
                  <span className="font-semibold text-neutral-600">販売数合計</span>
                  <span className="font-bold">{shop?.total_sales_count.toLocaleString()}</span>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}