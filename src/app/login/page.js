"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { FaEnvelope, FaLock, FaSignInAlt, FaSpinner } from "react-icons/fa";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 初期ロード時にログイン済みかチェック
  useEffect(() => {
    const checkLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ショップ確認
        const { data: shop } = await supabase
          .from("shops")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (shop) {
          router.push("/creator");
        } else {
          router.push("/create-shop");
        }
      }
    };
    checkLogin();
  }, [router]);

  const handleLogin = async (e) => {
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user.email_confirmed_at) {
        setError("メールアドレスの確認が必要です。登録メールを確認してください。");
        setLoading(false);
        return;
      }

      // ショップ確認
      const { data: shop } = await supabase
        .from("shops")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (shop) {
        router.push("/creator");
      } else {
        router.push("/create-shop");
      }

    } catch (err) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="flex flex-col gap-8 w-full max-w-md bg-white text-neutral-900 p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl font-black text-center mb-2">ログイン</h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded-lg text-sm text-center font-semibold animate-pulse">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
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

          <label className="flex flex-col">
            <span className="font-semibold mb-2 text-neutral-600">パスワード</span>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                className="w-full border-2 border-neutral-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-lime-500 transition-colors"
                minLength={8}
                required
              />
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
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
                <span>ログイン中...</span>
              </>
            ) : (
              <>
                <FaSignInAlt />
                <span>ログイン</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-neutral-500 space-y-2">
          <p>
            ショップアカウントをお持ちでない方は{" "}
            <a href="/register" className="text-lime-600 underline font-semibold hover:text-lime-500">
              新規登録
            </a>
          </p>
          <p>
            <a href="/resetPassword" className="text-neutral-600 underline hover:text-neutral-500">
              パスワードをお忘れの方はこちら
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
