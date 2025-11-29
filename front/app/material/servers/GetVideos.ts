"use server";

import { createClient } from "@supabase/supabase-js";
import { UpdateVideoStatusToError } from "./UpdateVideoStatus";

// Ленивая инициализация клиента для избежания ошибок при загрузке модуля
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL не задан");
    }

    if (!supabaseServiceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY не задан");
    }

    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  return supabaseAdminInstance;
}

export interface VideoRow {
  id: string;
  uid: string;
  video_title: string;
  status: string;
  url: string | null;
  created_at?: string;
}

export interface GetVideosSuccess {
  success: true;
  videos: VideoRow[];
}

export interface GetVideosFailure {
  success: false;
  error: string;
}

export type GetVideosResult = GetVideosSuccess | GetVideosFailure;

/**
 * Получает список видео для авторизированного пользователя
 * @param uid - UUID авторизированного пользователя
 * @returns Список видео пользователя
 */
export async function GetVideos(uid: string): Promise<GetVideosResult> {
  try {
    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    // Обновляем статус на "error" для видео текущего пользователя старше 3 часов без URL
    // Не прерываем выполнение, если обновление статуса не удалось
    try {
      await UpdateVideoStatusToError(uid.trim());
    } catch (statusError) {
      console.warn("[GetVideos] Не удалось обновить статус видео:", statusError);
      // Продолжаем выполнение даже если обновление статуса не удалось
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("videos")
      .select("*")
      .eq("uid", uid.trim())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GetVideos] Ошибка при получении видео:", error);
      return { success: false, error: error.message };
    }

    return { success: true, videos: data || [] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[GetVideos]", message);
    return { success: false, error: message };
  }
}

