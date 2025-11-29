"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AvatarUploadModal } from "@/app/avatars/components/AvatarUploadModal";
import { VoiceCreateModal } from "@/app/voices/components/VoiceCreateModal";

type Step = "avatar" | "voice" | "ready";

interface VideoCreationWizardProps {
  hasAvatars: boolean;
  hasVoices: boolean;
  onAvatarsChanged?: () => void | Promise<void>;
  onVoicesChanged?: () => void | Promise<void>;
  onClose?: () => void;
}

export function VideoCreationWizard({
  hasAvatars,
  hasVoices,
  onAvatarsChanged,
  onVoicesChanged,
  onClose,
}: VideoCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("avatar");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [avatarCreated, setAvatarCreated] = useState(false);
  const [voiceCreated, setVoiceCreated] = useState(false);
  const [createdAvatarId, setCreatedAvatarId] = useState<string | null>(null);
  const [createdVoiceId, setCreatedVoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (hasAvatars && hasVoices) {
      router.push("/material/editor");
      return;
    }

    if (!hasAvatars) {
      setCurrentStep("avatar");
    } else if (!hasVoices) {
      setCurrentStep("voice");
    }
  }, [hasAvatars, hasVoices, router]);

  const handleAvatarCreated = useCallback(async () => {
    setAvatarCreated(true);
    setIsAvatarModalOpen(false);
    await onAvatarsChanged?.();
    
    // Небольшая задержка для обновления состояния
    setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        // Получаем ID созданного аватара (последний по времени создания)
        const { data: avatarsData } = await supabase
          .from("photo_avatars")
          .select("id")
          .eq("uid", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        const avatarId = avatarsData && avatarsData.length > 0 && avatarsData[0].id 
          ? avatarsData[0].id 
          : null;
        
        if (avatarId) {
          setCreatedAvatarId(avatarId);
        }
        
        const { data: voicesData } = await supabase
          .from("voices")
          .select("*")
          .eq("uid", user.id);
        
        const validVoices = (voicesData ?? []).filter((voice) => voice.url && voice.name);
        
        if (validVoices.length === 0) {
          setCurrentStep("voice");
        } else {
          // Если есть голос, переходим в редактор с параметрами
          const params = new URLSearchParams();
          if (avatarId) {
            params.set("avatarId", avatarId);
          }
          router.push(`/material/editor?${params.toString()}`);
        }
      }
    }, 1000);
  }, [onAvatarsChanged, router]);

  const handleVoiceCreated = useCallback(async () => {
    setVoiceCreated(true);
    setIsVoiceModalOpen(false);
    await onVoicesChanged?.();
    
    // Получаем ID созданного голоса и переходим в редактор
    setTimeout(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        // Получаем последний созданный голос
        const { data: voicesData } = await supabase
          .from("voices")
          .select("id")
          .eq("uid", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        const params = new URLSearchParams();
        if (createdAvatarId) {
          params.set("avatarId", createdAvatarId);
        }
        if (voicesData && voicesData.length > 0 && voicesData[0].id) {
          params.set("voiceId", voicesData[0].id);
          setCreatedVoiceId(voicesData[0].id);
        }
        
        router.push(`/material/editor?${params.toString()}`);
      }
    }, 500);
  }, [onVoicesChanged, router, createdAvatarId]);

  const handleStartAvatar = () => {
    setIsAvatarModalOpen(true);
  };

  const handleStartVoice = () => {
    setIsVoiceModalOpen(true);
  };

  if (hasAvatars && hasVoices) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-2 py-4 sm:px-4 sm:py-8">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl sm:rounded-[32px]">
          <div className="relative border-b px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
            <h2 className="pr-8 text-lg font-bold text-gray-900 sm:pr-0 sm:text-xl md:text-2xl">
              Создание первого видео
            </h2>
            <p className="mt-1 text-xs text-gray-600 sm:mt-2 sm:text-sm">
              Для создания видео вам понадобятся аватар и голос
            </p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 sm:right-6 sm:top-6"
              >
                <span className="sr-only">Закрыть</span>✕
              </button>
            )}
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
            {/* Прогресс-бар */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <div className="flex flex-1 items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10 ${
                      currentStep === "avatar" || avatarCreated || hasAvatars
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {avatarCreated || hasAvatars ? (
                      <svg
                        className="h-4 w-4 sm:h-6 sm:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold sm:text-sm">1</span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 sm:ml-4">
                    <p className="text-xs font-semibold text-gray-900 sm:text-sm">Создание аватара</p>
                    <p className="hidden text-xs text-gray-500 sm:block">Загрузите фото для аватара</p>
                  </div>
                </div>
                <div className="hidden h-0.5 flex-1 bg-gray-200 sm:block sm:mx-4" />
                <div className="hidden h-0.5 w-full bg-gray-200 sm:hidden" />
                <div className="flex flex-1 items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10 ${
                      currentStep === "voice" || voiceCreated || hasVoices
                        ? "border-purple-600 bg-purple-600 text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {voiceCreated || hasVoices ? (
                      <svg
                        className="h-4 w-4 sm:h-6 sm:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold sm:text-sm">2</span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 sm:ml-4">
                    <p className="text-xs font-semibold text-gray-900 sm:text-sm">Создание голоса</p>
                    <p className="hidden text-xs text-gray-500 sm:block">Загрузите или запишите голос</p>
                  </div>
                </div>
                <div className="hidden h-0.5 flex-1 bg-gray-200 sm:block sm:mx-4" />
                <div className="hidden h-0.5 w-full bg-gray-200 sm:hidden" />
                <div className="flex flex-1 items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10 ${
                      (hasAvatars && hasVoices) || (avatarCreated && voiceCreated)
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {(hasAvatars && hasVoices) || (avatarCreated && voiceCreated) ? (
                      <svg
                        className="h-4 w-4 sm:h-6 sm:w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold sm:text-sm">3</span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 sm:ml-4">
                    <p className="text-xs font-semibold text-gray-900 sm:text-sm">Редактор</p>
                    <p className="hidden text-xs text-gray-500 sm:block">Создание видео</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Контент шага */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:rounded-2xl sm:p-6 md:p-8">
              {currentStep === "avatar" && !hasAvatars && (
                <div className="text-center">
                  <div className="mb-4 flex justify-center sm:mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 sm:h-20 sm:w-20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-blue-600 sm:h-10 sm:w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">
                    Шаг 1: Создайте аватар
                  </h3>
                  <p className="mb-4 text-xs text-gray-600 sm:mb-6 sm:text-sm">
                    Для создания видео вам нужен аватар. Загрузите фото и создайте цифрового двойника.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartAvatar}
                    className="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg sm:w-auto sm:px-8 sm:py-3"
                  >
                    Создать аватар
                  </button>
                </div>
              )}

              {currentStep === "voice" && !hasVoices && (
                <div className="text-center">
                  <div className="mb-4 flex justify-center sm:mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 sm:h-20 sm:w-20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-purple-600 sm:h-10 sm:w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">
                    Шаг 2: Создайте голос
                  </h3>
                  <p className="mb-4 text-xs text-gray-600 sm:mb-6 sm:text-sm">
                    Теперь создайте голос. Загрузите аудио файл или запишите голос с микрофона.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartVoice}
                    className="w-full rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-lg sm:w-auto sm:px-8 sm:py-3"
                  >
                    Создать голос
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onAvatarUploaded={handleAvatarCreated}
      />

      <VoiceCreateModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onVoiceCreated={handleVoiceCreated}
      />
    </>
  );
}

