"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getPrefetchedAvatars, clearPrefetchCache } from "@/lib/prefetchAvatars";

import { CosmoLoader } from "@/components/ui/CosmoLoader";
import { PhotoAvatarGrid } from "@/app/avatars/components/PhotoAvatarGrid";
import { AvatarsEmptyState } from "./AvatarsEmptyState";
import type { PhotoAvatarRow } from "@/app/avatars/servers/UploadAvatar";

export function AvatarsSection() {
  const router = useRouter();
  const [isFetchingAvatars, setIsFetchingAvatars] = useState(true);
  const [photoAvatars, setPhotoAvatars] = useState<PhotoAvatarRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPhotoAvatars = async () => {
      const prefetchedData = getPrefetchedAvatars();
      if (prefetchedData) {
        setPhotoAvatars(prefetchedData);
        setIsFetchingAvatars(false);
        clearPrefetchCache();
        
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

  return (
    <section className="mb-8 sm:mb-10 md:mb-12">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Мои аватары</h2>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-4 sm:rounded-3xl sm:p-6 md:p-8">
        {isFetchingAvatars ? (
          <div className="flex min-h-[200px] items-center justify-center sm:min-h-[300px]">
            <CosmoLoader ariaLabel="Загружаем фото-аватары..." />
          </div>
        ) : !hasPhotoAvatars ? (
          <AvatarsEmptyState />
        ) : (
          <PhotoAvatarGrid
            avatars={photoAvatars}
            currentUserId={currentUserId}
            onAvatarDeleted={refetchPhotoAvatars}
          />
        )}
      </div>
    </section>
  );
}

