"use client";

import { useState } from "react";

export default function OwnerDashboard() {
  // 仮データ
  const [creatorCount] = useState(42);
  const [workCount] = useState(156);
  const [totalSales] = useState(1250000);
  const [stripeBalance, setStripeBalance] = useState(320000);

  function handleWithdraw() {
    alert("Stripeからの引き出し処理を開始します（デモ）");
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 bg-gradient-to-br from-[#f8f4ef] to-[#efe7dd] min-h-screen text-[#3d2a22]">
      <h1 className="text-3xl font-bold mb-8">オーナー管理画面</h1>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-md text-center">
          <p className="text-sm text-gray-500">総クリエイター数</p>
          <p className="text-3xl font-bold">{creatorCount}</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-md text-center">
          <p className="text-sm text-gray-500">総作品数</p>
          <p className="text-3xl font-bold">{workCount}</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-md text-center">
          <p className="text-sm text-gray-500">売上合計</p>
          <p className="text-3xl font-bold">{totalSales.toLocaleString()}円</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-md text-center flex flex-col justify-between">
          <div>
            <p className="text-sm text-gray-500">Stripe残高</p>
            <p className="text-3xl font-bold mb-4">{stripeBalance.toLocaleString()}円</p>
          </div>
          <button
            onClick={handleWithdraw}
            className="px-4 py-2 bg-[#7f5830] text-white rounded hover:shadow-lg transition"
          >
            引き落とし
          </button>
        </div>
      </div>
    </div>
  );
}
