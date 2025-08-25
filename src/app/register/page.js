"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaEnvelope, FaLock, FaUserPlus, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // 'form' or 'verify'

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
      // signUpは、ユーザーが既に存在する場合でもエラーではなく、
      // isNewUser: false を返しますが、確認メールは再送されます。
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // その他の予期せぬエラー
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      
      // 登録/メール再送が成功したら確認ステップへ
      setStep("verify");

    } catch (err) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-6">
      {step === "form" && (
        <div className="w-full max-w-md bg-white text-neutral-800 p-8 rounded-3xl shadow-2xl space-y-8">
          <div className="text-center">
            <a href="/" className="font-black text-4xl text-lime-500">
              shirokoe
            </a>
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
              <a href="/login" className="text-lime-600 underline font-semibold hover:text-lime-500">
                ログイン
              </a>
            </p>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="w-full max-w-md bg-white text-neutral-800 p-10 rounded-3xl shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center animate-pulse">
                <FaCheckCircle className="text-lime-500 text-4xl" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">確認メールを送信しました</h1>
          <p className="text-neutral-600">
            <strong className="text-neutral-800">{email}</strong> 宛にメールを送信しました。メール内のリンクをクリックして、アカウント登録を完了してください。
          </p>
           <p className="text-xs text-neutral-400 mt-4">
            (メールが届かない場合は、迷惑メールフォルダもご確認ください)
          </p>
        </div>
      )}
    </div>
  );
}
