"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

function getHeygenApiKey(): string {
  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    throw new Error("HEYGEN_API_KEY не задан");
  }
  return heygenApiKey;
}

interface DeletePhotoAvatarInput {
  uid: string;
  recordId?: string | null;
  groupId?: string | null;
  imageKey?: string | null;
}

interface DeletePhotoAvatarResult {
  success: boolean;
  error?: string;
}

async function deleteFromHeygen(groupId?: string | null) {
  if (!groupId) {
    return;
  }

  const heygenApiKey = getHeygenApiKey();

  const response = await fetch(
    `https://api.heygen.com/v2/photo_avatar_group/${groupId}`,
    {
      method: "DELETE",
      headers: {
        "X-Api-Key": heygenApiKey,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const message = await response.text();
    throw new Error(
      `Не удалось удалить аватар в HeyGen: ${message || response.statusText}`
    );
  }
}

export async function DeletePhotoAvatar({
  uid,
  recordId,
  groupId,
  imageKey,
}: DeletePhotoAvatarInput): Promise<DeletePhotoAvatarResult> {
  try {
    if (!uid) {
      return { success: false, error: "Пользователь не найден" };
    }

    if (!recordId && !groupId && !imageKey) {
      return { success: false, error: "Нет идентификатора записи" };
    }

    await deleteFromHeygen(groupId);

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin.from("photo_avatars").delete().eq("uid", uid);

    if (recordId) {
      query = query.eq("id", recordId);
    } else if (groupId) {
      query = query.eq("group_id", groupId);
    } else if (imageKey) {
      query = query.eq("image_key", imageKey);
    }

    const { error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("[DeletePhotoAvatar]", message);
    return { success: false, error: message };
  }
}







