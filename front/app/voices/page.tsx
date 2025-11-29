"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/ui/Header";
import { CosmoLoader } from "@/components/ui/CosmoLoader";
import { VoiceCreateModal } from "./components/VoiceCreateModal";
import { VoiceGrid } from "./components/VoiceGrid";

interface VoiceRow {
  id?: string;
  uid: string;
  name: string;
  url: string;
  created_at?: string;
  description?: string | null;
}

export default function VoicesPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingVoices, setIsFetchingVoices] = useState(true);
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    setIsFetchingVoices(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
      setCurrentUserId(null);
      setVoices([]);
      setIsFetchingVoices(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("voices")
      .select("*")
      .eq("uid", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[voices] Ошибка загрузки голосов:", error);
      setVoices([]);
    } else {
      console.log("[voices] Загружено голосов:", data?.length ?? 0, data);
      // Фильтруем только голоса с валидным url
      const validVoices = (data ?? []).filter((voice) => voice.url && voice.name);
      console.log("[voices] Валидных голосов:", validVoices.length);
      setVoices(validVoices);
    }
    setIsFetchingVoices(false);
  }, [router]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const hasReachedLimit = voices.length >= 3;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto flex w-full max-w-[1350px] items-center justify-between px-6 pt-8">
        <h1 className="text-2xl font-bold text-gray-900">Мои голоса</h1>
        <button
          type="button"
          onClick={() => {
            if (!hasReachedLimit) {
              setIsModalOpen(true);
            }
          }}
          disabled={hasReachedLimit}
          className="min-w-[170px] rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-purple-600"
          title={hasReachedLimit ? "Максимальное количество голосов (3) достигнуто" : "Создать голос"}
        >
          Создать голос
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
                В демо-режиме можно создать максимум 3 голоса
              </p>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-[1350px] justify-center px-6 py-12">
        {isFetchingVoices ? (
          <EmptyState title="" description="">
            <div className="mt-px flex justify-center">
              <CosmoLoader ariaLabel="Загружаем голоса..." />
            </div>
          </EmptyState>
        ) : voices.length === 0 ? (
        <EmptyState />
        ) : (
          <VoiceGrid
            voices={voices}
            currentUserId={currentUserId}
            onVoicesChanged={fetchVoices}
          />
        )}
      </main>
      <VoiceCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVoiceCreated={fetchVoices}
      />
    </div>
  );
}