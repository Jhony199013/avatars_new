"use server";

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

export interface DeleteMediaSuccess {
  success: true;
}

export interface DeleteMediaFailure {
  success: false;
  error: string;
}

export type DeleteMediaResult = DeleteMediaSuccess | DeleteMediaFailure;

/**
 * Удаляет медиа файл из S3 хранилища
 * @param s3Key - S3 ключ файла (например, "temp/media/{uuid}/{filename}")
 * @returns Результат удаления
 */
export async function DeleteMedia(s3Key: string): Promise<DeleteMediaResult> {
  try {
    if (!s3Key || !s3Key.trim()) {
      return { success: false, error: "S3 ключ не может быть пустым" };
    }

    // Удаляем файл из S3
    const command = new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key.trim(),
    });

    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка при удалении файла";
    console.error("[DeleteMedia] Ошибка удаления медиа:", message);
    return { success: false, error: message };
  }
}









