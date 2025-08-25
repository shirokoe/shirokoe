"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FaSpinner, FaExclamationCircle, FaPlay, FaUserPlus, FaCalendarAlt, FaUsers } from "react-icons/fa";
import { MdClose, MdLogin } from "react-icons/md";

// =====================================================================
// アカウント名直下の公開ショップページ
// =====================================================================
export default function AccountShopPage() {
  const params = useParams();
  const router = useRouter();
  const { account_name } = params;

  const [shop, setShop] = useState(null);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreatorModal, setShowCreatorModal] = useState(false);

  const fetchShopAndWorks = useCallback(async () => {
    if (!account_name) {
      setError("無効なURLです。");
      setLoading(false);
      return;
    }

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('account_name', account_name)
      .single();

    if (shopError || !shopData) {
      console.error("ショップ情報の取得エラー:", shopError);
      setError("お探しのショップは見つかりませんでした。");
      setLoading(false);
      return;
    }
    
    if (shopData.banner_image_path) {
        const { data: bannerUrlData } = supabase.storage.from('shop_banners').getPublicUrl(shopData.banner_image_path);
        shopData.banner_url = bannerUrlData.publicUrl;
    }
    setShop(shopData);

    const { data: worksData, error: worksError } = await supabase
      .from('works')
      .select('*')
      .eq('user_id', shopData.id)
      .order('created_at', { ascending: false });

    if (worksError) {
      console.error("作品リストの取得エラー:", worksError);
    } else {
      const worksWithCovers = worksData.map(work => {
        const { data: coverUrlData } = supabase.storage.from('work_covers').getPublicUrl(work.cover_image_path);
        return {
          ...work,
          cover_url: coverUrlData.publicUrl,
        };
      });
      setWorks(worksWithCovers);
    }

    setLoading(false);

  }, [account_name]);

  useEffect(() => {
    fetchShopAndWorks();
  }, [fetchShopAndWorks]);


  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-lime-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col items-center justify-center text-center p-8">
        <FaExclamationCircle className="text-5xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
        <p className="text-neutral-500">{error}</p>
        <button 
            onClick={() => router.push('/')}
            className="mt-8 px-6 py-3 bg-neutral-200 text-neutral-800 rounded-xl font-bold transition-transform transform hover:scale-105"
        >
            トップページに戻る
        </button>
      </div>
    );
  }

  if (!shop) return null;

  return (
    <div className="bg-neutral-100 min-h-screen relative text-neutral-800">
      {/* ヘッダーエリア */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-white/80 backdrop-blur-sm shadow-sm">
        <a href="/" className="font-black text-2xl text-lime-500">
          shirokoe
        </a>
        <button
          className="bg-neutral-800 text-white px-4 py-2 rounded-full font-semibold text-sm transition-transform transform hover:scale-105"
          onClick={() => setShowCreatorModal(true)}
        >
          クリエイターになる
        </button>
      </header>

      <main className="max-w-5xl mx-auto pt-24 px-4 pb-10">
        {/* ショップバナー */}
        <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden shadow-lg mb-8">
          {shop.banner_url ? (
            <img src={shop.banner_url} alt={`${shop.shop_name}のバナー`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-neutral-300"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-8">
            <h1 className="text-4xl md:text-5xl font-black text-white">{shop.shop_name}</h1>
          </div>
        </div>

        {/* ★追加: ショップコンセプトの説明 */}
        <div className="text-center mb-12">
            <p className="text-lg text-neutral-600">ここは30秒の録音作品だけを販売する、特別なショップです。</p>
        </div>

        {/* 作品一覧 */}
        <div className="bg-white rounded-3xl p-8 shadow-md">
          <h2 className="text-2xl font-bold mb-6">作品一覧</h2>
          {works.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {works.map((work) => (
                <div 
                  key={work.id} 
                  className="bg-neutral-50 rounded-2xl overflow-hidden shadow-sm transition-transform transform hover:scale-105 cursor-pointer group flex flex-col"
                  onClick={() => router.push(`/${shop.account_name}/${work.id}`)}
                >
                  <div className="relative w-full aspect-[8/7]">
                    <img src={work.cover_url} alt={work.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <FaPlay className="text-white text-4xl" />
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg truncate mb-2">{work.title}</h3>
                    {/* ★追加: 公開日と販売数 */}
                    <div className="text-xs text-neutral-500 space-y-1 mb-2">
                        <p className="flex items-center gap-1.5"><FaCalendarAlt /> <span>{new Date(work.created_at).toLocaleDateString()}</span></p>
                        <p className="flex items-center gap-1.5"><FaUsers /> <span>{work.sales_count}</span></p>
                    </div>
                    <p className="text-lg font-bold text-lime-600 mt-auto">¥{work.price}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500">このショップにはまだ作品がありません。</p>
          )}
        </div>

        {/* フッター */}
        <footer className="mt-16 text-center text-neutral-500 text-sm">
          <p>
            ショップアクセス回数: <span className="font-bold text-neutral-600">{shop.access_count.toLocaleString()}</span>
          </p>
        </footer>
      </main>

      {/* クリエイターモーダル */}
      {showCreatorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl">
            <button
              className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-600 transition"
              onClick={() => setShowCreatorModal(false)}
            >
              <MdClose size={24} />
            </button>
            <h3 className="text-2xl font-bold mb-6 text-neutral-900">クリエイターとして始める</h3>
            <button
              className="flex items-center justify-center gap-2 bg-neutral-800 text-white px-6 py-3 rounded-full mb-4 font-semibold w-full transition-transform transform hover:scale-105"
              onClick={() => router.push("/login")}
            >
              <MdLogin />
              クリエイターログイン
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-lime-500 text-white px-6 py-3 rounded-full font-semibold w-full transition-transform transform hover:scale-105"
              onClick={() => router.push("/createShop")}
            >
              <FaUserPlus />
              無料でショップを作成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}