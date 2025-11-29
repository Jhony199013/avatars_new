"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL не задан");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY не задан");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface UpdateVideoStatusResult {
  success: boolean;
  error?: string;
}

/**
 * Обновляет статус видео на "error" если прошло 3 часа и нет URL
 * @param uid - UUID пользователя, для которого нужно обновить статус
 */
export async function UpdateVideoStatusToError(uid: string): Promise<UpdateVideoStatusResult> {
  try {
    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    // Находим видео текущего пользователя со статусом "generate", созданные более 3 часов назад и без URL
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ status: "error" })
      .eq("uid", uid.trim())
      .eq("status", "generate")
      .is("url", null)
      .lt("created_at", threeHoursAgo);

    if (error) {
      console.error("[UpdateVideoStatusToError] Ошибка обновления статуса:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[UpdateVideoStatusToError]", message);
    return { success: false, error: message };
  }
}

