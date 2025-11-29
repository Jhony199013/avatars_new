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

// Интерфейсы для CreateVideoTemp
export interface CreateVideoTempSuccess {
  success: true;
  id: string;
}

export interface CreateVideoTempFailure {
  success: false;
  error: string;
}

export type CreateVideoTempResult = CreateVideoTempSuccess | CreateVideoTempFailure;

// Интерфейсы для CreateVideo
export interface CreateVideoSuccess {
  success: true;
  id: string;
}

export interface CreateVideoFailure {
  success: false;
  error: string;
}

export type CreateVideoResult = CreateVideoSuccess | CreateVideoFailure;

/**
 * Создает временную запись в таблице video_temp с данными канвы
 */
export async function CreateVideoTemp(
  videoTitle: string,
  canvasInfo: any,
  uid: string,
): Promise<CreateVideoTempResult> {
  try {
    logServerEvent("CreateVideoTemp", "Incoming request", {
      uid,
      videoTitle,
      hasCanvasInfo: Boolean(canvasInfo),
    });
    if (!videoTitle || !videoTitle.trim()) {
      return { success: false, error: "Название видео не может быть пустым" };
    }

    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    if (!canvasInfo) {
      return { success: false, error: "Данные канвы не могут быть пустыми" };
    }

    // Сохраняем canvasInfo как JSON
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("video_temp")
      .insert({
        video_title: videoTitle.trim(),
        canvas_info: canvasInfo,
        uid: uid.trim(),
      })
      .select("id")
      .single();

    if (error) {
      logServerError("CreateVideoTemp", error, {
        stage: "insert video_temp",
        uid,
        videoTitle,
      });
      console.error("[CreateVideoTemp] Ошибка при создании записи:", error);
      return { success: false, error: error.message };
    }

    if (!data || !data.id) {
      return { success: false, error: "Не удалось получить ID созданной записи" };
    }

    logServerEvent("CreateVideoTemp", "Created temp record", {
      uid,
      videoTitle,
      recordId: data.id,
    });
    return { success: true, id: data.id };
  } catch (error) {
    logServerError("CreateVideoTemp", error, { uid, videoTitle });
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[CreateVideoTemp]", message);
    return { success: false, error: message };
  }
}

/**
 * Создает запись в таблице videos при нажатии на кнопку "Сгенерировать"
 * @param uid - UUID авторизированного пользователя
 * @param videoTitle - Название видео
 * @returns Результат создания записи
 */
export async function CreateVideo(
  uid: string,
  videoTitle: string,
): Promise<CreateVideoResult> {
  try {
    logServerEvent("CreateVideo", "Incoming request", { uid, videoTitle });
    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    if (!videoTitle || !videoTitle.trim()) {
      return { success: false, error: "Название видео не может быть пустым" };
    }

    // Создаем запись в таблице videos со статусом "generate"
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("videos")
      .insert({
        uid: uid.trim(),
        video_title: videoTitle.trim(),
        status: "generate",
      })
      .select("id")
      .single();

    if (error) {
      logServerError("CreateVideo", error, {
        stage: "insert videos",
        uid,
        videoTitle,
      });
      console.error("[CreateVideo] Ошибка при создании записи:", error);
      return { success: false, error: error.message };
    }

    if (!data || !data.id) {
      return { success: false, error: "Не удалось получить ID созданной записи" };
    }

    logServerEvent("CreateVideo", "Created video record", {
      uid,
      videoTitle,
      recordId: data.id,
    });
    return { success: true, id: data.id };
  } catch (error) {
    logServerError("CreateVideo", error, { uid, videoTitle });
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[CreateVideo]", message);
    return { success: false, error: message };
  }
}





