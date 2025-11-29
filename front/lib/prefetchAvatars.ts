import { supabase } from "./supabaseClient";
import type { PhotoAvatarRow } from "@/app/avatars/servers/UploadAvatar";

// Кеш для prefetch данных
let prefetchCache: {
  data: PhotoAvatarRow[] | null;
  timestamp: number;
  userId: string | null;
} = {
  data: null,
  timestamp: 0,
  userId: null,
};

const CACHE_DURATION = 30000; // 30 секунд

export async function prefetchAvatarsData(): Promise<void> {
  try {
    // Проверяем кеш
    const now = Date.now();
    if (
      prefetchCache.data &&
      prefetchCache.userId &&
      now - prefetchCache.timestamp < CACHE_DURATION
    ) {
      return; // Данные уже в кеше и свежие
    }

    // Получаем пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    // Проверяем, не загружаем ли мы те же данные
    if (prefetchCache.userId === user.id && now - prefetchCache.timestamp < CACHE_DURATION) {
      return;
    }

    // Загружаем данные в фоне
    const { data, error } = await supabase
      .from("photo_avatars")
      .select("*")
      .eq("uid", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      prefetchCache = {
        data,
        timestamp: now,
        userId: user.id,
      };
    }
  } catch (error) {
    // Игнорируем ошибки prefetch - это не критично
    console.debug("[prefetch] Ошибка prefetch аватаров:", error);
  }
}

export function getPrefetchedAvatars(): PhotoAvatarRow[] | null {
  const now = Date.now();
  if (
    prefetchCache.data &&
    now - prefetchCache.timestamp < CACHE_DURATION
  ) {
    return prefetchCache.data;
  }
  return null;
}

export function clearPrefetchCache(): void {
  prefetchCache = {
    data: null,
    timestamp: 0,
    userId: null,
  };
}

