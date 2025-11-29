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

// Функция-помощник для проверки и получения обязательных переменных окружения
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} не задан`);
  }
  return value;
}

// S3 конфигурация из переменных окружения
const S3_ACCESS_KEY_ID = getRequiredEnv("S3_ACCESS_KEY_ID");
const S3_SECRET_ACCESS_KEY = getRequiredEnv("S3_SECRET_ACCESS_KEY");
const S3_ENDPOINT = getRequiredEnv("S3_ENDPOINT");
const S3_BUCKET = getRequiredEnv("S3_BUCKET");

// Создаем S3 клиент
const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: "us-east-1", // Регион по умолчанию для S3-совместимых хранилищ
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
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
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Формируем публичный URL файла
    const baseUrl = S3_ENDPOINT.replace(/\/$/, "");
    const url = `${baseUrl}/${S3_BUCKET}/${s3Key}`;

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









