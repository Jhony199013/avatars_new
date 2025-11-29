"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { GetVideos, type VideoRow } from "../servers/GetVideos";
import { VideoLoadingBlock } from "./VideoLoadingBlock";
import { VideoDisplay } from "./VideoDisplay";
import { VideoErrorBlock } from "./VideoErrorBlock";
import { EmptyState } from "@/components/EmptyState";
import { CosmoLoader } from "@/components/ui/CosmoLoader";

export function VideosList() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Функция для загрузки видео в фоне (используется для обновлений после первой загрузки)
  const loadVideosInBackground = useCallback(async (userId: string) => {
    const result = await GetVideos(userId);
    if (result.success) {
      setVideos(result.videos);
    } else {
      console.error("[VideosList] Ошибка загрузки видео:", result.error);
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
        console.error("[VideosList] Ошибка загрузки видео:", result.error);
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

  // Показываем EmptyState с CosmoLoader во время первой загрузки (как в голосах)
  if (isInitialLoading) {
    return (
      <div className="flex w-full justify-center">
        <EmptyState title="" description="">
          <div className="mt-px flex justify-center">
            <CosmoLoader ariaLabel="Проверка видео..." />
          </div>
        </EmptyState>
      </div>
    );
  }

  // После загрузки показываем EmptyState с дефолтными значениями, если видео нет
  if (videos.length === 0) {
    return (
      <div className="flex w-full justify-center">
        <EmptyState />
      </div>
    );
  }

  // Разделяем видео на группы
  const doneVideos = videos.filter((video) => video.status === "done" && video.url);
  const generatingVideos = videos.filter((video) => video.status === "generate");
  const errorVideos = videos.filter((video) => video.status === "error");
  const otherVideos = videos.filter(
    (video) => video.status !== "done" && video.status !== "generate" && video.status !== "error"
  );

  return (
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
  );
}

