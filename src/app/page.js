"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaMicrophone, FaBolt, FaLeaf, FaArrowRight, FaWaveSquare } from "react-icons/fa";

export default function Home() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="bg-neutral-100 text-neutral-800 min-h-screen flex flex-col items-center justify-center px-6 py-12 font-sans">
      <div className="max-w-5xl w-full text-center">
        
        {/* メイン見出し */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
          その<span className="text-lime-500">30秒</span>が、<br />
          誰かの宝物になる。
        </h1>

        {/* 説明文 */}
        <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto text-neutral-600">
          高価な機材も、複雑な編集も、もういりません。<br />
          あなたの日常のささやき、応援のメッセージ、心に浮かんだメロディを、<br />
          スマートフォン一つで、**30秒間の一発録り**。<br />
          その声は、時を超えて誰かの心に届く「作品」になります。
        </p>

        {/* ショップ作成ボタン */}
        <div className="relative inline-block group mb-4">
          <button
            className="relative z-10 bg-neutral-800 text-white text-xl font-bold px-12 py-5 rounded-full shadow-lg transition-all duration-300 transform group-hover:scale-105 group-hover:bg-neutral-700"
            onClick={() => router.push('/register')}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            無料でショップを始める
            <FaArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className={`absolute inset-0 bg-neutral-800 rounded-full blur-xl opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-40' : ''}`} />
        </div>
        <p className="text-sm text-neutral-500">
            すでにアカウントをお持ちですか？ <a href="/login" className="text-lime-600 underline font-semibold hover:text-lime-500">ログイン</a>
        </p>

        {/* サブ情報セクション */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-xl transition-transform transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mb-4">
                <FaLeaf size={28} className="text-lime-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">リスクゼロ、才能だけ</h3>
            <p className="text-sm text-neutral-500">
              初期費用や月額費用は一切不要。あなたの声という才能だけで、収益化の新しい扉を開けます。
            </p>
          </div>
          <div className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-xl transition-transform transform hover:-translate-y-2">
            <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mb-4">
                <FaBolt size={28} className="text-lime-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">録音は30秒、公開は1分</h3>
            <p className="text-sm text-neutral-500">
              究極まで削ぎ落としたシンプルな操作性。思い立った瞬間に、あなたのショップを公開できます。
            </p>
          </div>
          <div className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-xl transition-transform transform hover:-translate-y-2">
             <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mb-4">
                <FaWaveSquare size={28} className="text-lime-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">想いが、直接届く場所</h3>
            <p className="text-sm text-neutral-500">
              あなたの「声」に価値を感じるファンに直接届けるから、努力がダイレクトに報われる高還元率を実現。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
