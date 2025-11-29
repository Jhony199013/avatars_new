"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { CosmoLoader } from "@/components/ui/CosmoLoader";
import { VoiceGrid } from "@/app/voices/components/VoiceGrid";
import { VoicesEmptyState } from "./VoicesEmptyState";

interface VoiceRow {
  id?: string;
  uid: string;
  name: string;
  url: string;
  created_at?: string;
  description?: string | null;
}

export function VoicesSection() {
  const router = useRouter();
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
      const validVoices = (data ?? []).filter((voice) => voice.url && voice.name);
      console.log("[voices] Валидных голосов:", validVoices.length);
      setVoices(validVoices);
    }
    setIsFetchingVoices(false);
  }, [router]);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  return (
    <section className="mb-8 sm:mb-10 md:mb-12">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Мои голоса</h2>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-4 sm:rounded-3xl sm:p-6 md:p-8">
        {isFetchingVoices ? (
          <div className="flex min-h-[200px] items-center justify-center sm:min-h-[300px]">
            <CosmoLoader ariaLabel="Загружаем голоса..." />
          </div>
        ) : voices.length === 0 ? (
          <VoicesEmptyState />
        ) : (
          <VoiceGrid
            voices={voices}
            currentUserId={currentUserId}
            onVoicesChanged={fetchVoices}
          />
        )}
      </div>
    </section>
  );
}

