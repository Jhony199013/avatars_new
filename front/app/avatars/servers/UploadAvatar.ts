"use server";

import { Buffer } from "buffer";
import { createClient } from "@supabase/supabase-js";

export interface PhotoAvatarRow {
  id?: string;
  uid: string;
  name: string;
  photo: string;
  image_key: string;
  hey_gen_id: string | null;
  group_id: string | null;
  status: "done" | "error";
  created_at?: string;
}

interface UploadAvatarSuccess {
  success: true;
  avatar: PhotoAvatarRow;
}

interface UploadAvatarFailure {
  success: false;
  error: string;
}

type UploadAvatarResult = UploadAvatarSuccess | UploadAvatarFailure;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const heygenApiKey = process.env.HEYGEN_API_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL не задан");
}

if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY не задан");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function uploadPhotoToHeygen(file: File) {
  if (!heygenApiKey) {
    throw new Error("HEYGEN_API_KEY не задан");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const response = await fetch("https://upload.heygen.com/v1/asset", {
    method: "POST",
    headers: {
      "X-Api-Key": heygenApiKey,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ошибка загрузки фото: ${errorText || response.statusText}`
    );
  }

  const json = await response.json();
  const payload = Array.isArray(json) ? json[0] : json;
  const data = payload?.data;

  if (!data?.image_key || !data?.url) {
    throw new Error("Некорректный ответ Heygen при загрузке фото");
  }

  return {
    imageKey: data.image_key as string,
    photoUrl: data.url as string,
  };
}

async function createPhotoAvatarInHeygen(name: string, imageKey: string) {
  if (!heygenApiKey) {
    throw new Error("HEYGEN_API_KEY не задан");
  }

  const response = await fetch(
    "https://api.heygen.com/v2/photo_avatar/avatar_group/create",
    {
      method: "POST",
      headers: {
        "X-Api-Key": heygenApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        image_key: imageKey,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ошибка создания фото-аватара: ${errorText || response.statusText}`
    );
  }

  const json = await response.json();
  const payload = Array.isArray(json) ? json[0] : json;

  return {
    error: payload?.error ?? null,
    data: payload?.data ?? null,
  };
}

export async function UploadAvatar(formData: FormData): Promise<UploadAvatarResult> {
  try {
    const uid = formData.get("uid");
    const name = formData.get("avatar_name");
    const file = formData.get("photo");

    if (typeof uid !== "string" || !uid) {
      return { success: false, error: "Не удалось определить пользователя" };
    }

    if (typeof name !== "string" || !name.trim()) {
      return { success: false, error: "Введите имя аватара" };
    }

    if (!(file instanceof File)) {
      return { success: false, error: "Файл не найден" };
    }

    const trimmedName = name.trim();

    const { imageKey, photoUrl } = await uploadPhotoToHeygen(file);
    const createResult = await createPhotoAvatarInHeygen(
      trimmedName,
      imageKey
    );

    const status: "done" | "error" = createResult.error ? "error" : "done";
    const record: PhotoAvatarRow = {
      uid,
      name: trimmedName,
      photo: photoUrl,
      image_key: imageKey,
      hey_gen_id: createResult.data?.id ?? null,
      group_id:
        createResult.data?.group_id ??
        createResult.data?.id ??
        createResult.data?.group ??
        null,
      status,
    };

    const { data, error } = await supabaseAdmin
      .from("photo_avatars")
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, avatar: data as PhotoAvatarRow };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка сервера";
    console.error("[UploadAvatar]", message);
    return { success: false, error: message };
  }
}

