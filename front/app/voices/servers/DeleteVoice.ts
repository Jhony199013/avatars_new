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

interface DeleteVoiceInput {
  uid: string;
  voiceId: string;
}

interface DeleteVoiceResult {
  success: boolean;
  error?: string;
}

export async function DeleteVoice({
  uid,
  voiceId,
}: DeleteVoiceInput): Promise<DeleteVoiceResult> {
  try {
    if (!uid) {
      return { success: false, error: "Пользователь не найден" };
    }

    if (!voiceId) {
      return { success: false, error: "ID голоса не указан" };
    }

    // Сначала получаем запись из таблицы, чтобы извлечь voice_id и название голоса
    const supabaseAdmin = getSupabaseAdmin();
    const { data: voiceRecord, error: fetchError } = await supabaseAdmin
      .from("voices")
      .select("voice_id, name")
      .eq("id", voiceId)
      .eq("uid", uid)
      .single();

    if (fetchError) {
      throw new Error(`Не удалось найти голос: ${fetchError.message}`);
    }

    if (!voiceRecord || !voiceRecord.voice_id) {
      throw new Error("Не найдено значение voice_id для этого голоса");
    }

    // Отправляем вебхук с voice_id, названием голоса и UUID пользователя
    const webhookResponse = await fetch(
      "https://rueleven.ru/webhook/932aee6f-b554-45e9-b232-f7829b0a1d06",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          voice_id: voiceRecord.voice_id,
          voice_name: voiceRecord.name || null,
          uuid: uid,
        }),
      }
    );

    if (!webhookResponse.ok) {
      const message = await webhookResponse.text();
      throw new Error(
        `Не удалось отправить вебхук: ${
          message || webhookResponse.statusText
        }`
      );
    }

    // Удаляем запись из таблицы
    const { error } = await supabaseAdmin
      .from("voices")
      .delete()
      .eq("id", voiceId)
      .eq("uid", uid);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("[DeleteVoice]", message);
    return { success: false, error: message };
  }
}


