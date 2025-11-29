"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ленивая инициализация клиента для избежания ошибок при загрузке модуля
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
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

interface UpdateVideoTitleInput {
  uid: string;
  oldVideoTitle: string;
  newVideoTitle: string;
}

interface UpdateVideoTitleResult {
  success: boolean;
  error?: string;
}

/**
 * Обновляет название видео в таблице videos
 * @param uid - UUID пользователя
 * @param oldVideoTitle - Старое название видео (video_title)
 * @param newVideoTitle - Новое название видео
 */
export async function UpdateVideoTitle({
  uid,
  oldVideoTitle,
  newVideoTitle,
}: UpdateVideoTitleInput): Promise<UpdateVideoTitleResult> {
  try {
    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    if (!oldVideoTitle || !oldVideoTitle.trim()) {
      return { success: false, error: "Старое название видео не может быть пустым" };
    }

    if (!newVideoTitle || !newVideoTitle.trim()) {
      return { success: false, error: "Новое название видео не может быть пустым" };
    }

    const trimmedNewTitle = newVideoTitle.trim();
    const trimmedOldTitle = oldVideoTitle.trim();

    // Извлекаем UUID из старого названия (формат: "название_uuid")
    const parts = trimmedOldTitle.split("_");
    const uuid = parts[parts.length - 1];
    
    // Формируем новое название с сохранением UUID
    const newTitleWithUuid = `${trimmedNewTitle}_${uuid}`;

    // Обновляем запись в таблице videos
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ video_title: newTitleWithUuid })
      .eq("video_title", trimmedOldTitle)
      .eq("uid", uid.trim());

    if (error) {
      console.error("[UpdateVideoTitle] Ошибка обновления названия видео:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[UpdateVideoTitle]", message);
    return { success: false, error: message };
  }
}




