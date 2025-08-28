"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaEnvelope, FaLock, FaUserPlus, FaCheckCircle, FaSpinner, FaInfoCircle } from "react-icons/fa";
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
      // ★修正: Edge Functionへの呼び出しを完全に削除し、signUpの応答だけをシンプルに処理します
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // Supabaseが明確なエラーを返した場合 (主に、パスワードが短すぎるなどのバリデーションエラー)
        setError(signUpError.message);
      } else {
        // signUpが成功した場合、それは「新規ユーザー」または「既存だが未確認のユーザー」です。
        // どちらのケースでもSupabaseは確認メールを送信するため、確認ステップに進むのが正しい挙動です。
        setStep("verify");
      }

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
                    もし、このメールアドレスで既にアカウントを有効化している場合、新しい確認メールは届きません。その場合は、お手数ですが<a href="/login" className="font-bold text-lime-600 underline">ログインページ</a>からログインしてください。
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}