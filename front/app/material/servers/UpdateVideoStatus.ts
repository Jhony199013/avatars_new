"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logServerEvent, logServerError } from "@/lib/serverLogger";

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
    logServerEvent("UpdateVideoStatusToError", "Incoming request", { uid });
    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    // Находим видео текущего пользователя со статусом "generate", созданные более 3 часов назад и без URL
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ status: "error" })
      .eq("uid", uid.trim())
      .eq("status", "generate")
      .is("url", null)
      .lt("created_at", threeHoursAgo);

    if (error) {
      logServerError("UpdateVideoStatusToError", error, {
        stage: "update statuses",
        uid,
      });
      console.error("[UpdateVideoStatusToError] Ошибка обновления статуса:", error);
      return { success: false, error: error.message };
    }

    logServerEvent("UpdateVideoStatusToError", "Updated stale videos", { uid });
    return { success: true };
  } catch (error) {
    logServerError("UpdateVideoStatusToError", error, { uid });
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[UpdateVideoStatusToError]", message);
    return { success: false, error: message };
  }
}

