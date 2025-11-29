"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ленивая инициализация клиентов для избежания ошибок при загрузке модуля
let supabaseAdminInstance: SupabaseClient | null = null;
let s3ClientInstance: S3Client | null = null;

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

function getS3Client() {
  if (!s3ClientInstance) {
    const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
    const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
    const S3_ENDPOINT = process.env.S3_ENDPOINT;
    const S3_BUCKET = process.env.S3_BUCKET;

    if (!S3_ACCESS_KEY_ID) {
      throw new Error("S3_ACCESS_KEY_ID не задан");
    }
    if (!S3_SECRET_ACCESS_KEY) {
      throw new Error("S3_SECRET_ACCESS_KEY не задан");
    }
    if (!S3_ENDPOINT) {
      throw new Error("S3_ENDPOINT не задан");
    }
    if (!S3_BUCKET) {
      throw new Error("S3_BUCKET не задан");
    }

    s3ClientInstance = new S3Client({
      endpoint: S3_ENDPOINT,
      region: "us-east-1",
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

function getS3Bucket(): string {
  const S3_BUCKET = process.env.S3_BUCKET;
  if (!S3_BUCKET) {
    throw new Error("S3_BUCKET не задан");
  }
  return S3_BUCKET;
}

function getS3Endpoint(): string {
  const S3_ENDPOINT = process.env.S3_ENDPOINT;
  if (!S3_ENDPOINT) {
    throw new Error("S3_ENDPOINT не задан");
  }
  return S3_ENDPOINT;
}

export interface UploadMediaSuccess {
  success: true;
  url: string;
  key: string;
}

export interface UploadMediaFailure {
  success: false;
  error: string;
}

export type UploadMediaResult = UploadMediaSuccess | UploadMediaFailure;

/**
 * Загружает медиа файл в S3 хранилище
 * @param file - Файл для загрузки
 * @param userUuid - UUID залогиненного пользователя
 * @returns Результат загрузки с URL файла или ошибкой
 */
export async function UploadMedia(
  file: File,
  userUuid: string,
): Promise<UploadMediaResult> {
  try {
    if (!file) {
      return { success: false, error: "Файл не предоставлен" };
    }

    if (!userUuid || !userUuid.trim()) {
      return { success: false, error: "UUID пользователя не может быть пустым" };
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).slice(2, 9);
    const fileExtension = file.name.split(".").pop() || "bin";
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;

    // Путь в S3: temp/media/{uuid}/{filename}
    const s3Key = `temp/media/${userUuid.trim()}/${fileName}`;

    // Читаем файл как буфер
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Определяем Content-Type
    const contentType = file.type || "application/octet-stream";

    // Загружаем файл в S3
    const s3Client = getS3Client();
    const s3Bucket = getS3Bucket();
    const s3Endpoint = getS3Endpoint();
    
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Формируем публичный URL файла
    const baseUrl = s3Endpoint.replace(/\/$/, "");
    const url = `${baseUrl}/${s3Bucket}/${s3Key}`;

    return {
      success: true,
      url,
      key: s3Key,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка при загрузке файла";
    console.error("[UploadMedia] Ошибка загрузки медиа:", message);
    return { success: false, error: message };
  }
}









