"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaEnvelope, FaLock, FaUserPlus, FaCheckCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import { useRouter } from "next/navigation";
import Link from "next/link";

// =====================================================================
// クリエイター利用規約モーダル
// =====================================================================
function CreatorTermsModal({ onClose }) {
    const terms = [
        { title: "第1条（本サービスの利用）", content: "クリエイターは, 本規約に同意することにより, 本サービスを利用して作品を販売することができます。" },
        { 
            title: "第2条（禁止される作品）", 
            content: "クリエイターは、自身が完全な権利を有するオリジナルの音声作品のみを出品するものとします。以下の内容を含む、またはその恐れのある作品の出品を固く禁じます。",
            items: [
                "第三者の著作権、プライバシー権、肖像権、その他の知的財産権を侵害する内容。",
                "過度に性的、または暴力的な表現を含む内容。",
                "特定の個人や団体に対する誹謗中傷、名誉毀損、または個人情報の漏洩に繋がる内容。",
                "法令または公序良俗に反する内容。",
                "その他、運営者が不適切と判断した内容。"
            ] 
        },
        { title: "第3条（売上と手数料）", content: "作品の販売価格は、一律500円（消費税込）とします。\nクリエイターの収益は、税抜販売価格の80%とします。\n当社のプラットフォーム手数料として、税抜販売価格の20%をいただきます。Stripeの決済手数料は、当社のプラットフォーム手数料の中から負担します。" },
        { title: "第4条（売上の振込）", content: "売上を受け取るには、Stripe Connectへの口座登録を完了させる必要があります。\n売上は、Stripeの規定に基づき、毎週月曜日に登録された銀行口座へ自動で振り込まれます。振込スケジュールはStripeの規定に従います。" },
        { title: "第5条（作品の削除とペナルティ）", content: "クリエイターは、いつでも自身の作品を削除することができます。\n運営者は、出品された作品が第2条に違反すると判断した場合、クリエイターへの事前の通知なく、当該作品を無断で削除できるものとします。この措置によるクリエイターの損害について、運営者は一切の責任を負いません。" },
        { title: "第6条（免責事項）", content: "クリエイターと購入者との間で生じたトラブルについて、当社は一切の責任を負いません。\n本サービスの停止、中断、変更、終了によってクリエイターに生じた損害について、当社は一切の責任を負いません。" },
        { title: "第7条（本規約の変更）", content: "当社は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に表示された時点から効力を生じるものとします。" },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <div className="bg-white rounded-2xl max-w-2xl w-full text-left relative shadow-2xl animate-fadeIn flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-neutral-200">
                <h3 className="text-xl font-bold text-neutral-800">shirokoeクリエイター利用規約</h3>
                <button
                  className="text-neutral-400 hover:text-neutral-600 transition"
                  onClick={onClose}
                >
                  <MdClose size={24} />
                </button>
            </div>
            
            {/* Body */}
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6 text-neutral-700">
                <p className="text-sm leading-relaxed">この利用規約（以下「本規約」といいます。）は、「shirokoe」（以下「本サービス」といいます。）において、音声作品（以下「作品」といいます。）を販売するクリエイター（以下「クリエイター」といいます。）の皆様に遵守していただく事項を定めます。</p>
                
                {terms.map((term, index) => (
                    <div key={index}>
                        <h4 className="font-bold text-neutral-900 mb-2">{term.title}</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{term.content}</p>
                        {term.items && (
                            <ul className="list-disc list-inside space-y-1 mt-2 text-sm pl-4">
                                {term.items.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        )}
                    </div>
                ))}
                
                <p className="text-right text-xs text-neutral-500 pt-4">制定日：2025年8月30日</p>
            </div>

            {/* Footer */}
            <div className="p-6 bg-neutral-50 border-t border-neutral-200 rounded-b-2xl">
                 <button onClick={onClose} className="w-full py-3 bg-neutral-800 text-white rounded-xl font-bold transition-transform transform hover:scale-105">閉じる</button>
            </div>
          </div>
        </div>
    );
}


export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // 'form' or 'verify'
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email) {
      setError("メールアドレスを入力してください");
      setLoading(false);
      return;
    }
    if (!password || password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setStep("verify");
      }

    } catch (err) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-6">
        {step === "form" && (
          <div className="w-full max-w-md bg-white text-neutral-800 p-8 rounded-3xl shadow-2xl space-y-8">
            <div className="text-center">
              <link href="/" className="font-black text-4xl text-lime-500">
                shirokoe
              </link>
              <h1 className="text-xl font-bold text-neutral-600 mt-2">アカウント登録</h1>
            </div>

            {error && (
              <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center font-semibold">
                {error}
              </p>
            )}

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="font-semibold text-neutral-600 flex items-center gap-2 mb-2">
                  <FaEnvelope />
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full border-2 border-neutral-200 rounded-xl py-3 px-4 focus:outline-none focus:border-lime-500 transition-colors bg-neutral-50"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-600 flex items-center gap-2 mb-2">
                  <FaLock />
                  パスワード (8文字以上)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-neutral-200 rounded-xl py-3 px-4 focus:outline-none focus:border-lime-500 transition-colors bg-neutral-50"
                  minLength={8}
                  required
                />
              </div>
              
              <div className="text-center text-xs text-neutral-500">
                  <p>
                    アカウントを登録することにより、
                    <button type="button" onClick={() => setShowTermsModal(true)} className="text-lime-600 underline font-semibold hover:text-lime-500 px-1">
                        利用規約
                    </button>
                    に同意したことになります。
                  </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-neutral-800 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <><FaSpinner className="animate-spin" /><span>登録中...</span></>
                ) : (
                  "アカウントを登録する"
                )}
              </button>
            </form>

            <div className="text-center text-sm text-neutral-500">
              <p>
                すでにアカウントをお持ちですか？{" "}
                <link href="/login" className="text-lime-600 underline font-semibold hover:text-lime-500">
                  ログイン
                </link>
              </p>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="w-full max-w-md bg-white text-neutral-800 p-10 rounded-3xl shadow-2xl text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-lime-500 text-4xl" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">確認メールを送信しました</h1>
            <p className="text-neutral-600">
              <strong className="text-neutral-800">{email}</strong> 宛にメールを送信しました。メール内のリンクをクリックして、アカウント登録を完了してください。
            </p>
            <p className="text-xs text-neutral-400">
              (メールは<strong className="font-semibold">Supabase</strong>から届きます。迷惑メールフォルダもご確認ください)
            </p>
            
            <div className="!mt-6 pt-4 border-t border-neutral-200">
               <div className="flex items-start gap-2 text-left text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                  <FaInfoCircle className="mt-0.5 flex-shrink-0" />
           <p>
  もし、このメールアドレスで既にアカウントを有効化している場合、
  新しい確認メールは届きません。その場合は、お手数ですが
  <Link
    href="/login"
    className="font-bold text-lime-600 underline"
  >
    ログインページ
  </Link>
  からログインしてください。
</p>

               </div>
            </div>
          </div>
        )}
      </div>
      {showTermsModal && <CreatorTermsModal onClose={() => setShowTermsModal(false)} />}
    </>
  );
}

