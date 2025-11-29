"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AvatarsSection } from "./AvatarsSection";
import { VoicesSection } from "./VoicesSection";
import { VideosSection } from "./VideosSection";

export function Dashboard() {
  const router = useRouter();
  const [hasAvatars, setHasAvatars] = useState(false);
  const [hasVoices, setHasVoices] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkResources = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

    const [avatarsResult, voicesResult] = await Promise.all([
      supabase
        .from("photo_avatars")
        .select("*")
        .eq("uid", user.id)
        .limit(1),
      supabase
        .from("voices")
        .select("*")
        .eq("uid", user.id)
        .limit(1),
    ]);

      setHasAvatars((avatarsResult.data?.length ?? 0) > 0);
      const validVoices = (voicesResult.data ?? []).filter(
        (voice) => voice.url && voice.name
      );
      setHasVoices(validVoices.length > 0);
      setIsChecking(false);
    } catch (error) {
      console.error("[Dashboard] Ошибка проверки ресурсов:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    checkResources();
  }, [checkResources]);

  const handleAvatarsChanged = useCallback(async () => {
    await checkResources();
  }, [checkResources]);

  const handleVoicesChanged = useCallback(async () => {
    await checkResources();
  }, [checkResources]);

  if (isChecking) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1350px] px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <AvatarsSection />
      <VoicesSection />
      <VideosSection
        hasAvatars={hasAvatars}
        hasVoices={hasVoices}
        onAvatarsChanged={handleAvatarsChanged}
        onVoicesChanged={handleVoicesChanged}
      />
    </div>
  );
}

