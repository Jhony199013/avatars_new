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

interface UpdateVoiceInput {
  uid: string;
  voiceId: string;
  name: string;
  description?: string | null;
}

interface UpdateVoiceResult {
  success: boolean;
  error?: string;
}

export async function UpdateVoice({
  uid,
  voiceId,
  name,
  description,
}: UpdateVoiceInput): Promise<UpdateVoiceResult> {
  try {
    if (!uid) {
      return { success: false, error: "Пользователь не найден" };
    }

    if (!voiceId) {
      return { success: false, error: "ID голоса не указан" };
    }

    if (!name || !name.trim()) {
      return { success: false, error: "Имя не может быть пустым" };
    }

    const trimmedName = name.trim();
    const trimmedDescription = description?.trim();

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("voices")
      .update({
        name: trimmedName,
        description: trimmedDescription || null,
      })
      .eq("id", voiceId)
      .eq("uid", uid);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("[UpdateVoice]", message);
    return { success: false, error: message };
  }
}


