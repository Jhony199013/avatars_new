"use server";

import { createClient } from "@supabase/supabase-js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Ленивая инициализация клиентов для избежания ошибок при загрузке модуля
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;
let s3ClientInstance: S3Client | null = null;

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

function getS3Client() {
  if (!s3ClientInstance) {
    const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
    const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const s3Endpoint = process.env.S3_ENDPOINT;

    if (!s3AccessKeyId) {
      throw new Error("S3_ACCESS_KEY_ID не задан");
    }
    if (!s3SecretAccessKey) {
      throw new Error("S3_SECRET_ACCESS_KEY не задан");
    }
    if (!s3Endpoint) {
      throw new Error("S3_ENDPOINT не задан");
    }

    s3ClientInstance = new S3Client({
      endpoint: s3Endpoint,
      region: "us-east-1",
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

function getS3Bucket(): string {
  const s3Bucket = process.env.S3_BUCKET;
  if (!s3Bucket) {
    throw new Error("S3_BUCKET не задан");
  }
  return s3Bucket;
}

/**
 * Извлекает S3 ключ из URL
 * @param url - URL видео (например, "https://endpoint/bucket/key")
 * @returns S3 ключ или null
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const s3Bucket = getS3Bucket();
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    // Если URL содержит bucket в пути (forcePathStyle: true)
    // Формат: /bucket/key
    if (pathParts.length >= 2 && pathParts[0] === s3Bucket) {
      return pathParts.slice(1).join("/");
    }
    
    // Если bucket в hostname, то путь после первого слеша - это ключ
    if (pathParts.length >= 1) {
      return pathParts.join("/");
    }
    
    return null;
  } catch (error) {
    console.error("[DeleteVideo] Ошибка парсинга URL:", error);
    return null;
  }
}

export interface DeleteVideoResult {
  success: boolean;
  error?: string;
}

/**
 * Удаляет видео из таблицы videos по video_title и удаляет файл из S3
 * @param uid - UUID пользователя
 * @param videoTitle - Название видео (video_title)
 * @param videoUrl - URL видео для удаления из S3 (опционально, если не указан - получаем из БД)
 */
export async function DeleteVideo(
  uid: string,
  videoTitle: string,
  videoUrl?: string | null,
): Promise<DeleteVideoResult> {
  try {
    if (!uid || !uid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    if (!videoTitle || !videoTitle.trim()) {
      return { success: false, error: "Название видео не может быть пустым" };
    }

    // Сначала получаем запись из БД, чтобы извлечь оригинальный URL
    // Это важно, так как URL может быть сформирован по старому названию
    const supabaseAdmin = getSupabaseAdmin();
    const { data: videoData, error: fetchError } = await supabaseAdmin
      .from("videos")
      .select("url")
      .eq("video_title", videoTitle.trim())
      .eq("uid", uid.trim())
      .single();

    if (fetchError) {
      console.error("[DeleteVideo] Ошибка получения видео из БД:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Используем URL из БД, если он есть, иначе используем переданный URL
    const urlToDelete = videoData?.url || videoUrl;

    // Удаляем файл из S3 перед удалением записи из БД
    if (urlToDelete && urlToDelete.trim()) {
      const s3Key = extractS3KeyFromUrl(urlToDelete.trim());
      if (s3Key) {
        try {
          const s3Client = getS3Client();
          const s3Bucket = getS3Bucket();
          const command = new DeleteObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
          });
          await s3Client.send(command);
          console.log("[DeleteVideo] Видео успешно удалено из S3:", s3Key);
        } catch (s3Error) {
          // Логируем ошибку, но продолжаем удаление записи из БД
          console.error("[DeleteVideo] Ошибка удаления видео из S3:", s3Error);
          // Если файл не найден - это не критично, возможно он уже был удален
          const errorMessage = s3Error instanceof Error ? s3Error.message : String(s3Error);
          if (!errorMessage.includes("NoSuchKey") && !errorMessage.includes("404")) {
            console.warn("[DeleteVideo] Файл не найден в S3, возможно уже удален:", s3Key);
          }
        }
      } else {
        console.warn("[DeleteVideo] Не удалось извлечь S3 ключ из URL:", urlToDelete);
      }
    }

    // Удаляем запись из таблицы videos по video_title
    const { error } = await supabaseAdmin
      .from("videos")
      .delete()
      .eq("video_title", videoTitle.trim())
      .eq("uid", uid.trim());

    if (error) {
      console.error("[DeleteVideo] Ошибка удаления видео из БД:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[DeleteVideo]", message);
    return { success: false, error: message };
  }
}


