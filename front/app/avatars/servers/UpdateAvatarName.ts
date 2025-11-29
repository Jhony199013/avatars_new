"use server";

import { createClient } from "@supabase/supabase-js";

// Ленивая инициализация клиента для избежания ошибок при загрузке модуля
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

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

interface UpdateAvatarNameInput {
  uid: string;
  recordId: string;
  newName: string;
}

interface UpdateAvatarNameResult {
  success: boolean;
  error?: string;
}

export async function UpdateAvatarName({
  uid,
  recordId,
  newName,
}: UpdateAvatarNameInput): Promise<UpdateAvatarNameResult> {
  try {
    if (!uid) {
      return { success: false, error: "Пользователь не найден" };
    }

    if (!recordId) {
      return { success: false, error: "ID записи не указан" };
    }

    if (!newName || !newName.trim()) {
      return { success: false, error: "Имя не может быть пустым" };
    }

    const trimmedName = newName.trim();

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("photo_avatars")
      .update({ name: trimmedName })
      .eq("id", recordId)
      .eq("uid", uid);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("[UpdateAvatarName]", message);
    return { success: false, error: message };
  }
}





