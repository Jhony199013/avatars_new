"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

// S3 конфигурация из переменных окружения
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const s3Endpoint = process.env.S3_ENDPOINT;
const s3Bucket = process.env.S3_BUCKET;

if (!s3AccessKeyId || !s3SecretAccessKey || !s3Endpoint || !s3Bucket) {
  throw new Error("S3 переменные окружения не заданы");
}

// Создаем S3 клиент
const s3Client = new S3Client({
  endpoint: s3Endpoint,
  region: "us-east-1", // Регион по умолчанию для S3-совместимых хранилищ
  credentials: {
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
  },
  forcePathStyle: true, // Для S3-совместимых хранилищ
});

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
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Формируем публичный URL файла
    const baseUrl = s3Endpoint!.replace(/\/$/, "");
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









