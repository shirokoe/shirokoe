"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaMicrophone, FaBolt, FaLeaf, FaArrowRight, FaWaveSquare } from "react-icons/fa";
import Link from "next/link";

export default function Home() {
  // const router = useRouter(); // Next.js固有のため削除
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="bg-neutral-100 text-neutral-800 min-h-screen flex flex-col items-center justify-center px-6 py-20 font-sans">
      <div className="max-w-5xl w-full text-center">
        
        {/* ロゴとサービス紹介 */}
        <div className="mb-12 animate-fadeIn">
            <h1 className="text-7xl md:text-9xl font-black text-lime-500 tracking-tighter">
                shirokoe
            </h1>
            <p className="mt-2 text-lg font-bold text-neutral-600">
                白声<span className="text-xs">（シロコエ）</span>は、30秒録音専用ショップを作るプラットフォームです
            </p>
        </div>

        {/* メイン見出し */}
        <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight animate-fadeInUp">
          その<span className="text-lime-500">30秒</span>が、<br />
          誰かの宝物になる。
        </h2>

        {/* 説明文 */}
        <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto text-neutral-600 animate-fadeInUp delay-200">
          高価な機材も、複雑な編集も、もういりません。<br />
          あなたの日常のささやき、応援のメッセージ、心に浮かんだメロディを、<br />
          スマートフォン一つで、**30秒間の一発録り**。<br />
          その声は、時を超えて誰かの心に届く「作品」になります。
        </p>

        {/* ショップ作成ボタン */}
        <div className="relative inline-block group mb-4 animate-fadeInUp delay-300">
          <button
            className="relative z-10 bg-neutral-800 text-white text-xl font-bold px-12 py-5 rounded-full shadow-lg transition-all duration-300 transform group-hover:scale-105 group-hover:bg-neutral-700"
            onClick={() => window.location.href = '/register'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            無料でショップを始める
            <FaArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className={`absolute inset-0 bg-neutral-800 rounded-full blur-xl opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-40' : ''}`} />
        </div>
       
<p className="text-sm text-neutral-500 mb-24 animate-fadeInUp delay-300">
  すでにアカウントをお持ちですか？{" "}
  <Link
    href="/login"
    className="text-lime-600 underline font-semibold hover:text-lime-500"
  >
    ログイン
  </Link>
</p>
        
        {/* 還元率セクション */}
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-left transform hover:scale-105 transition-transform duration-300 animate-fadeInUp delay-400">
            <div className="md:flex items-center gap-10">
                <div className="flex-shrink-0 text-center md:text-left mb-6 md:mb-0">
                    <p className="text-lime-600 font-bold text-lg">クリエイターファースト</p>
                    <p className="text-8xl font-black text-neutral-800 tracking-tighter leading-none">80<span className="text-5xl text-lime-500">%</span></p>
                    <p className="font-bold text-neutral-500">が、あなたの収益に。</p>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-neutral-900 mb-4">声の価値を、最大化する。</h3>
                    <p className="text-neutral-600 mb-4">
                        shirokoeは、クリエイターの皆様が活動に集中できるよう、業界最高水準の還元率をご用意しました。
                        作品が売れた場合、<strong className="text-neutral-900">税抜販売価格の80%</strong>があなたの収益になります。
                    </p>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm">
                        <p className="font-semibold text-neutral-700">【収益の内訳】</p>
                        <ul className="list-disc list-inside mt-2 text-neutral-600">
                            <li><strong className="text-lime-700">あなたの取り分: 80%</strong></li>
                            <li>shirokoe プラットフォーム手数料: 20%</li>
                        </ul>
                        <p className="text-xs text-neutral-400 mt-2">※ Stripe決済手数料は、私たちの手数料から負担しますのでご安心ください。</p>
                    </div>
                </div>
            </div>
        </div>


        {/* サブ情報セクション */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeInUp delay-500">
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

