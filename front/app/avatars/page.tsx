"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getPrefetchedAvatars, clearPrefetchCache } from "@/lib/prefetchAvatars";

import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/ui/Header";
import { CosmoLoader } from "@/components/ui/CosmoLoader";
import { AvatarUploadModal } from "./components/AvatarUploadModal";
import { PhotoAvatarGrid } from "./components/PhotoAvatarGrid";
import type { PhotoAvatarRow } from "./servers/UploadAvatar";

export default function AvatarsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingAvatars, setIsFetchingAvatars] = useState(true);
  const [photoAvatars, setPhotoAvatars] = useState<PhotoAvatarRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPhotoAvatars = async () => {
      // Проверяем prefetch кеш
      const prefetchedData = getPrefetchedAvatars();
      if (prefetchedData) {
        // Используем prefetch данные сразу
        setPhotoAvatars(prefetchedData);
        setIsFetchingAvatars(false);
        clearPrefetchCache(); // Очищаем кеш после использования
        
        // Получаем userId для установки
      const {
        data: { user },
      } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
      if (!user) {
        router.push("/login");
          setCurrentUserId(null);
          setPhotoAvatars([]);
          return;
        }
        
        setCurrentUserId(user.id);
        return;
      }

    setIsFetchingAvatars(true);

      // Получаем пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser();

      if (!isMounted) return;

    if (!user) {
        router.push("/login");
      setCurrentUserId(null);
      setPhotoAvatars([]);
      setIsFetchingAvatars(false);
      return;
    }

    setCurrentUserId(user.id);

      // Загружаем аватары
      const { data, error } = await supabase
        .from("photo_avatars")
        .select("*")
        .eq("uid", user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("[avatars] Ошибка загрузки аватаров:", error);
      } else {
        setPhotoAvatars(data ?? []);
      }
      setIsFetchingAvatars(false);
    };

    fetchPhotoAvatars();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const refetchPhotoAvatars = useCallback(async () => {
    if (!currentUserId) return;

    // Очищаем prefetch кеш при обновлении
    clearPrefetchCache();

    const { data, error } = await supabase
      .from("photo_avatars")
      .select("*")
      .eq("uid", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[avatars] Ошибка загрузки аватаров:", error);
    } else {
      setPhotoAvatars(data ?? []);
    }
  }, [currentUserId]);

  const hasPhotoAvatars = photoAvatars.length > 0;

  const content = (() => {
    if (isFetchingAvatars) {
      return (
        <EmptyState title="" description="">
          <div className="mt-px flex justify-center">
            <CosmoLoader ariaLabel="Загружаем фото-аватары..." />
        </div>
        </EmptyState>
      );
    }

    if (!hasPhotoAvatars) {
      return <EmptyState />;
    }

    return (
      <PhotoAvatarGrid
        avatars={photoAvatars}
        currentUserId={currentUserId}
        onAvatarDeleted={refetchPhotoAvatars}
      />
    );
  })();

  const hasReachedLimit = photoAvatars.length >= 3;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto flex w-full max-w-[1350px] items-center justify-between px-6 pt-8">
        <h1 className="text-2xl font-bold text-gray-900">Мои аватары</h1>
        <button
          type="button"
          onClick={() => {
            if (!hasReachedLimit) {
              setIsModalOpen(true);
            }
          }}
          disabled={hasReachedLimit}
          className="min-w-[170px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
          title={hasReachedLimit ? "Максимальное количество аватаров (3) достигнуто" : "Создать аватар"}
        >
          Создать аватар
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
                В демо-режиме можно создать максимум 3 аватара
              </p>
            </div>
          </div>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-[1350px] justify-center px-6 py-12">
        {content}
      </main>
      <AvatarUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAvatarUploaded={refetchPhotoAvatars}
      />
    </div>
  );
}