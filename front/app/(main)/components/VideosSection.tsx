"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { VideosEmptyState } from "./VideosEmptyState";
import { VideoCreationWizard } from "./VideoCreationWizard";
import { GetVideos, type VideoRow } from "@/app/material/servers/GetVideos";
import { VideoLoadingBlock } from "@/app/material/components/VideoLoadingBlock";
import { VideoDisplay } from "@/app/material/components/VideoDisplay";
import { VideoErrorBlock } from "@/app/material/components/VideoErrorBlock";

interface VideosSectionProps {
  hasAvatars: boolean;
  hasVoices: boolean;
  onAvatarsChanged?: () => void | Promise<void>;
  onVoicesChanged?: () => void | Promise<void>;
}

export function VideosSection({
  hasAvatars,
  hasVoices,
  onAvatarsChanged,
  onVoicesChanged,
}: VideosSectionProps) {
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Функция для загрузки видео в фоне (используется для обновлений после первой загрузки)
  const loadVideosInBackground = useCallback(async (userId: string) => {
    const result = await GetVideos(userId);
    if (result.success) {
      setVideos(result.videos);
    } else {
      console.error("[VideosSection] Ошибка загрузки видео:", result.error);
      setVideos([]);
    }
  }, []);

  // Инициализация и первая загрузка
  useEffect(() => {
    const initializeVideos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        setCurrentUserId(null);
        setVideos([]);
        setIsInitialLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      // Первая загрузка
      const result = await GetVideos(user.id);
      if (result.success) {
        setVideos(result.videos);
      } else {
        console.error("[VideosSection] Ошибка загрузки видео:", result.error);
        setVideos([]);
      }
      setIsInitialLoading(false);
    };

    initializeVideos();
  }, [router]);

  // Обновляем список каждые 10 секунд для проверки статуса в фоне
  useEffect(() => {
    if (!currentUserId || isInitialLoading) return;

    const interval = setInterval(() => {
      loadVideosInBackground(currentUserId);
    }, 10000); // Проверяем каждые 10 секунд

    return () => clearInterval(interval);
  }, [currentUserId, loadVideosInBackground, isInitialLoading]);

  const handleCreateVideo = async () => {
    // Проверяем наличие аватаров и голосов перед открытием редактора
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
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
          .eq("uid", user.id),
      ]);

      const hasAvatarsNow = (avatarsResult.data?.length ?? 0) > 0;
      const validVoices = (voicesResult.data ?? []).filter(
        (voice) => voice.url && voice.name
      );
      const hasVoicesNow = validVoices.length > 0;

      if (!hasAvatarsNow || !hasVoicesNow) {
        setIsWizardOpen(true);
      } else {
        router.push("/material/editor");
      }
    } catch (error) {
      console.error("[VideosSection] Ошибка проверки ресурсов:", error);
      // В случае ошибки открываем визард для безопасности
      setIsWizardOpen(true);
    }
  };

  useEffect(() => {
    if (hasAvatars && hasVoices) {
      setIsWizardOpen(false);
    }
  }, [hasAvatars, hasVoices]);

  // Разделяем видео на группы
  const doneVideos = videos.filter((video) => video.status === "done" && video.url);
  const generatingVideos = videos.filter((video) => video.status === "generate");
  const errorVideos = videos.filter((video) => video.status === "error");
  const otherVideos = videos.filter(
    (video) => video.status !== "done" && video.status !== "generate" && video.status !== "error"
  );

  const hasAnyVideos = videos.length > 0;

  return (
    <section className="mb-8 sm:mb-10 md:mb-12">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Мои видео</h2>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50 p-4 sm:rounded-3xl sm:p-6 md:p-8">
        {isInitialLoading ? (
          <div className="flex min-h-[200px] items-center justify-center sm:min-h-[300px]">
            <div className="text-sm text-gray-500">Загрузка видео...</div>
          </div>
        ) : !hasAnyVideos ? (
      <VideosEmptyState onCreateClick={handleCreateVideo} />
        ) : (
          <div className="flex w-full flex-col gap-8">
            {/* Видео со статусом done - большие размеры */}
            {doneVideos.length > 0 && (
              <div className="grid w-full gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {doneVideos.map((video) => (
                  <VideoDisplay
                    key={video.id}
                    videoTitle={video.video_title}
                    videoUrl={video.url!}
                    videoId={video.id}
                    userId={currentUserId || ""}
                    onDeleted={() => {
                      if (currentUserId) {
                        loadVideosInBackground(currentUserId);
                      }
                    }}
                    onUpdated={() => {
                      if (currentUserId) {
                        loadVideosInBackground(currentUserId);
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* Видео со статусом generate - под блоком done */}
            {generatingVideos.length > 0 && (
              <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {generatingVideos.map((video) => (
                  <VideoLoadingBlock
                    key={video.id}
                    videoTitle={video.video_title}
                    createdAt={video.created_at}
                  />
                ))}
              </div>
            )}

            {/* Видео со статусом error */}
            {errorVideos.length > 0 && (
              <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {errorVideos.map((video) => (
                  <VideoErrorBlock
                    key={video.id}
                    videoId={video.id}
                    videoTitle={video.video_title}
                    userId={currentUserId || ""}
                    onDeleted={() => {
                      if (currentUserId) {
                        loadVideosInBackground(currentUserId);
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* Другие статусы */}
            {otherVideos.length > 0 && (
              <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {otherVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {video.video_title.split("_").slice(0, -1).join("_") || video.video_title}
                      </h3>
                    </div>
                    <div className="text-sm text-gray-500">
                      Статус: {video.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isWizardOpen && (
        <VideoCreationWizard
          hasAvatars={hasAvatars}
          hasVoices={hasVoices}
          onAvatarsChanged={onAvatarsChanged}
          onVoicesChanged={onVoicesChanged}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </section>
  );
}

