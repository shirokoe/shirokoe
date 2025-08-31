"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { FaSpinner, FaExclamationCircle, FaPlay, FaUserPlus, FaCalendarAlt, FaUsers,FaYenSign  } from "react-icons/fa";
import { MdClose, MdLogin } from "react-icons/md";
import { RouterIcon } from "lucide-react";

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
  <div className="bg-gray-50 min-h-screen relative text-gray-800 font-sans">
  {/* ヘッダー */}
  <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-white/80 backdrop-blur-md shadow-sm">
    <link href="/" className="font-black text-2xl text-lime-600 tracking-tighter">
      shirokoe
    </link>
    <button
      className="bg-gradient-to-r from-lime-500 to-green-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:scale-105 transition-transform"
      onClick={() => setShowCreatorModal(true)}
    >
      クリエイターになる
    </button>
  </header>

  {/* メイン */}
  <main className="max-w-6xl mx-auto pt-24 px-4 pb-20">
    {/* ショップ紹介 */}
    <section className="mb-16 text-center">
      <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden shadow-lg bg-gray-200">
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt={`${shop.shop_name}のバナー`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
        )}
      </div>
      <h1 className="text-4xl md:text-5xl font-black text-gray-900 mt-8">{shop.shop_name}</h1>
      <p className="text-lg text-gray-500 mt-1">@{shop.account_name}</p>
      <div className="mt-4 inline-block bg-lime-100 text-lime-800 text-sm font-bold px-4 py-1 rounded-full">
        🎧 30秒ボイスショップ
      </div>
      <p className="mt-8 max-w-2xl mx-auto text-gray-600 leading-relaxed text-lg">
        30秒に込められた <span className="font-semibold text-gray-900">“声の瞬間”</span> 。<br />
        ここでしか出会えない響きを、あなたのコレクションに。
      </p>
    </section>

    {/* 作品ギャラリー */}
    <section className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl">
      <h2 className="text-3xl font-bold mb-10 text-center text-gray-900">
        作品ギャラリー
      </h2>
      {works.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-7">
          {works.map((work) => (
            <div
              key={work.id}
              className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 group cursor-pointer"
              onClick={() => router.push(`/${shop.account_name}/${work.id}`)}
            >
              {/* カバー */}
              <div className="relative w-full aspect-[8/7] overflow-hidden">
                <img
                  src={work.cover_url}
                  alt={work.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <FaPlay className="text-white text-5xl drop-shadow-lg" />
                </div>
                <div className="absolute bottom-0 left-0 p-3 w-full">
                  <h3 className="font-bold text-lg text-white truncate">{work.title}</h3>
                </div>
              </div>

              {/* 詳細 */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1 text-lime-600 font-bold text-lg">
                    <FaYenSign /> 
                    <span>{work.price ? work.price.toLocaleString() : '---'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FaUsers /> <span>{work.sales_count || 0}</span>
                  </div>
                </div>

                {/* タグ */}
                {work.tags && work.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {work.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 日付 */}
                <div className="border-t border-gray-100 pt-2 flex items-center text-xs text-gray-400">
                  <FaCalendarAlt className="mr-1.5" /> 
                  <span>{new Date(work.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-6">
          <p className="text-2xl font-bold text-gray-500">最初の声が、待っています。</p>
          <p className="text-gray-500 mt-2">このクリエイターの最初の作品が公開されるのをお楽しみに。</p>
        </div>
      )}
    </section>
  </main>



      {showCreatorModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              onClick={() => setShowCreatorModal(false)}
            >
              <MdClose size={28} />
            </button>
            <h3 className="text-2xl font-bold mb-6 text-gray-900">クリエイターとして始める</h3>
            <button
              className="flex items-center justify-center gap-2.5 bg-gray-800 text-white px-6 py-3 rounded-full mb-4 font-semibold w-full transition-all transform hover:scale-105 hover:bg-gray-900"
              onClick={() => router.push("/login")}
            >
              <MdLogin />
              クリエイターログイン
            </button>
            <button
              className="flex items-center justify-center gap-2.5 bg-lime-500 text-white px-6 py-3 rounded-full font-semibold w-full transition-all transform hover:scale-105 hover:bg-lime-600"
              onClick={() => router.push("/register")}
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

