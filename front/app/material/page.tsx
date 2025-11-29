"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Header } from "@/components/ui/Header";
import { VideosList } from "./components/VideosList";

export default function MaterialPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto flex w-full max-w-[1350px] items-center justify-between px-6 pt-8">
        <h1 className="text-2xl font-bold text-gray-900">Мои видео</h1>
        <button
          type="button"
          onClick={() => router.push("/material/editor")}
          className="min-w-[170px] rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
        >
          Создать материал
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-[1350px] px-6 pt-4">
        <div className="w-full rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Демо-режим
              </p>
              <p className="mt-1 text-xs text-amber-700">
                В демо-режиме можно сгенерировать максимум 3 видео
              </p>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-[1350px] px-6 py-12">
        <VideosList />
      </main>
    </div>
  );
}