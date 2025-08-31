"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaEnvelope, FaSignInAlt, FaSpinner, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (!email) {
      setError("メールアドレスを入力してください");
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        // Supabaseのエラーメッセージをそのまま表示
        setError(resetError.message);
      } else {
        setMessage("パスワードリセットメールを送信しました。メール内のリンクをクリックしてください。");
      }
    } catch (err) {
      // 予期せぬエラー
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="flex flex-col gap-8 w-full max-w-md bg-white text-neutral-900 p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-black text-center mb-2">パスワードリセット</h1>

        {error && (
          <div className="flex items-center gap-2 bg-red-100 text-red-700 p-3 rounded-lg text-sm font-semibold animate-pulse">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 bg-green-100 text-green-700 p-3 rounded-lg text-sm font-semibold">
            <FaCheckCircle />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="flex flex-col gap-6">
          <label className="flex flex-col">
            <span className="font-semibold mb-2 text-neutral-600">メールアドレス</span>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full border-2 border-neutral-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-lime-500 transition-colors"
                required
              />
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            </div>
          </label>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-neutral-900 text-white py-4 rounded-xl font-bold hover:bg-neutral-800 transition-all duration-300 transform hover:scale-105"
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>送信中...</span>
              </>
            ) : (
              <>
                <FaSignInAlt />
                <span>パスワードリセットメール送信</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-neutral-500 space-y-2">
          <p>
            <link href="/login" className="text-lime-600 underline font-semibold hover:text-lime-500">
              ログインページに戻る
            </link>
          </p>
        </div>
      </div>
    </div>
  );
}