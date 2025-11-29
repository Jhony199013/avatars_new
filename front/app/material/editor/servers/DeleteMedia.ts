"use server";

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { logServerEvent, logServerError } from "@/lib/serverLogger";

// Ленивая инициализация клиента для избежания ошибок при загрузке модуля
let s3ClientInstance: S3Client | null = null;

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
    logServerEvent("DeleteMedia", "Received delete request", { s3Key });
    if (!s3Key || !s3Key.trim()) {
      return { success: false, error: "S3 ключ не может быть пустым" };
    }

    // Удаляем файл из S3
    const s3Client = getS3Client();
    const s3Bucket = getS3Bucket();
    
    const command = new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key.trim(),
    });

    await s3Client.send(command);
    logServerEvent("DeleteMedia", "Deleted object from S3", {
      bucket: s3Bucket,
      s3Key,
    });

    return { success: true };
  } catch (error) {
    logServerError("DeleteMedia", error, { s3Key });
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка при удалении файла";
    console.error("[DeleteMedia] Ошибка удаления медиа:", message);
    return { success: false, error: message };
  }
}









