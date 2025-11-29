"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { AvatarUploadModal } from "@/app/avatars/components/AvatarUploadModal";
import { VoiceCreateModal } from "@/app/voices/components/VoiceCreateModal";
import type {
  AspectRatio,
  AvatarOption,
  Scene,
  VoiceOption,
} from "./types";

type EditorSidebarProps = {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  videoTitle: string;
  onVideoTitleChange: (value: string) => void;
  avatars: AvatarOption[];
  isLoadingAvatars: boolean;
  voices: VoiceOption[];
  isLoadingVoices: boolean;
  scenes: Scene[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onAddScene: (afterSceneId?: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onSceneVoiceChange: (sceneId: string, voiceId: string | null) => void;
  onSceneScriptChange: (sceneId: string, script: string) => void;
  onSceneAvatarChange: (sceneId: string, avatarId: string | null) => void;
  onRefreshAvatars?: () => void | Promise<void>;
  onRefreshVoices?: () => void | Promise<void>;
  onApplyCreatedAvatar?: (sceneId: string, avatarId: string) => void;
};

type ManagedAudio = HTMLAudioElement & {
  __handlers?: {
    onPlay: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    onPause: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    onEnded: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    onError: ((this: GlobalEventHandlers, ev: Event) => any) | null;
  };
};

const ratioOptions: { label: string; value: AspectRatio }[] = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
];

export function EditorSidebar({
  aspectRatio,
  onAspectRatioChange,
  videoTitle,
  onVideoTitleChange,
  avatars,
  isLoadingAvatars,
  voices,
  isLoadingVoices,
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onSceneVoiceChange,
  onSceneScriptChange,
  onSceneAvatarChange,
  onRefreshAvatars,
  onRefreshVoices,
  onApplyCreatedAvatar,
}: EditorSidebarProps) {
  const [openAvatarModalForSceneId, setOpenAvatarModalForSceneId] = useState<string | null>(null);
  const [openVoiceModalForSceneId, setOpenVoiceModalForSceneId] = useState<string | null>(null);
  const [isAvatarCreateModalOpen, setIsAvatarCreateModalOpen] = useState(false);
  const [isVoiceCreateModalOpen, setIsVoiceCreateModalOpen] = useState(false);
  const [pendingSceneIdForAvatar, setPendingSceneIdForAvatar] = useState<string | null>(null);
  const [pendingSceneIdForVoice, setPendingSceneIdForVoice] = useState<string | null>(null);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  // Сохраняем последний отправленный текст для каждого слайда
  const lastSentTexts = useRef<Record<string, string>>({});
  const sceneScriptsSnapshot = useRef<Record<string, string>>({});
  // Refs для textarea элементов
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement>>({});

  // Очистка аудио при размонтировании компонента
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        const managed = audio as ManagedAudio;
        audio.pause();
        audio.onplay = null;
        audio.onpause = null;
        audio.onended = null;
        audio.onerror = null;
        managed.__handlers = undefined;
        audio.removeAttribute("src");
        audio.src = "";
      });
      audioRefs.current = {};
    };
  }, []);

  const stopAudioForScene = (
    sceneId: string,
    { resetTime = true }: { resetTime?: boolean } = {},
  ) => {
    const audio = audioRefs.current[sceneId];
    if (!audio) {
      return;
    }
    audio.pause();
    if (resetTime) {
      audio.currentTime = 0;
    }
    setPlayingSceneId((current) => (current === sceneId ? null : current));
  };

  // Останавливает воспроизведение на всех слайдах, кроме указанного
  const stopOtherScenesAudio = (currentSceneId: string) => {
    Object.keys(audioRefs.current).forEach((sceneId) => {
      if (sceneId !== currentSceneId) {
        stopAudioForScene(sceneId);
      }
    });
  };

  useEffect(() => {
    const snapshot: Record<string, string> = {};
    scenes.forEach((scene) => {
      snapshot[scene.id] = scene.script;
    });

    const prevSnapshot = sceneScriptsSnapshot.current;
    if (playingSceneId) {
      const prevScript = prevSnapshot[playingSceneId];
      const currentScript = snapshot[playingSceneId];
      const sceneRemoved = prevScript !== undefined && currentScript === undefined;
      const scriptChanged =
        prevScript !== undefined && currentScript !== undefined && prevScript !== currentScript;
      if (sceneRemoved || scriptChanged) {
        stopAudioForScene(playingSceneId);
      }
    }

    sceneScriptsSnapshot.current = snapshot;
  }, [scenes, playingSceneId]);

  // Автоматически изменяет высоту textarea в зависимости от содержимого
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Синхронизация высоты textarea при изменении содержимого
  useEffect(() => {
    scenes.forEach((scene) => {
      const textarea = textareaRefs.current[scene.id];
      if (textarea) {
        adjustTextareaHeight(textarea);
      }
    });
  }, [scenes]);

  const getOrCreateAudioElement = (sceneId: string) => {
    let audio = audioRefs.current[sceneId] as ManagedAudio | undefined;
    if (audio) {
      return audio;
    }

    audio = new Audio() as ManagedAudio;

    const handlePlay = () => {
      setPlayingSceneId(sceneId);
      setLoadingSceneId(null);
    };

    const handlePause = () => {
      setPlayingSceneId((current) => (current === sceneId ? null : current));
    };

    const handleEnded = () => {
      setPlayingSceneId((current) => (current === sceneId ? null : current));
    };

    const handleError = (event: Event | string) => {
      if (typeof event === "string") {
        console.error("Ошибка загрузки аудио:", event);
        setLoadingSceneId(null);
        setPlayingSceneId((current) => (current === sceneId ? null : current));
        return;
      }

      const audioElement = event.currentTarget as HTMLAudioElement;
      const hasSrcAttr = audioElement.getAttribute("src");
      if (!hasSrcAttr || hasSrcAttr === "") {
        return;
      }
      console.error("Ошибка загрузки аудио:", event);
      setLoadingSceneId(null);
      setPlayingSceneId((current) => (current === sceneId ? null : current));
      if (audioElement.error) {
        console.error("Код ошибки:", audioElement.error.code);
        console.error("Сообщение:", audioElement.error.message);
      }
    };

    audio.onplay = handlePlay;
    audio.onpause = handlePause;
    audio.onended = handleEnded;
    audio.onerror = handleError;
    audio.__handlers = {
      onPlay: handlePlay,
      onPause: handlePause,
      onEnded: handleEnded,
      onError: handleError,
    };

    audioRefs.current[sceneId] = audio;
    return audio;
  };

  const playSceneAudio = async (sceneId: string, audioUrl: string) => {
    stopOtherScenesAudio(sceneId);
    stopAudioForScene(sceneId);
    const audio = getOrCreateAudioElement(sceneId);
    const currentSrc = audio.getAttribute("src");
    if (currentSrc !== audioUrl) {
      audio.setAttribute("src", audioUrl);
      audio.src = audioUrl;
    }
    try {
      await audio.play();
      setPlayingSceneId(sceneId);
      setLoadingSceneId(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.warn("Воспроизведение прервано из-за смены источника");
        return;
      }
      throw error;
    }
  };

  const handlePlayClick = async (sceneId: string, sceneIndex: number) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene || !scene.avatarId || !scene.script || scene.script.trim() === "") {
      return;
    }

    // Находим выбранный голос и получаем его voice_id из таблицы
    const selectedVoice = voices.find((voice) => voice.id === scene.voiceId);
    if (!selectedVoice || !selectedVoice.voice_id) {
      alert("У выбранного голоса отсутствует voice_id");
      return;
    }

    // Извлекаем номер слайда из title (например, "Слайд 1" -> 1)
    const slideNumberMatch = scene.title.match(/\d+/);
    const slideNumber = slideNumberMatch ? parseInt(slideNumberMatch[0], 10) : sceneIndex + 1;

    const currentText = scene.script.trim();
    const lastSentText = lastSentTexts.current[sceneId];

    // Получаем UUID залогиненного пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userUuid = user?.id;
    if (!userUuid) {
      alert("Не удалось определить пользователя, авторизуйтесь повторно.");
      return;
    }

    // Проксируем аудио через собственный API, чтобы не светить прямую ссылку
    const baseAudioUrl = `/api/tts-audio?user=${encodeURIComponent(userUuid)}&slide=${slideNumber}&voice=${encodeURIComponent(selectedVoice.voice_id)}`;

    // Определяем, изменился ли текст
    const textChanged = lastSentText !== currentText;

    // Если текст не изменился и уже есть загруженный аудио-файл для этого слайда,
    // просто управляем воспроизведением/паузой без повторной отправки вебхука
    const existingAudio = audioRefs.current[sceneId];
    const existingSrc = existingAudio?.getAttribute("src") ?? "";
    if (!textChanged && existingAudio && existingSrc.startsWith(baseAudioUrl)) {
      if (!existingAudio.paused) {
        stopAudioForScene(sceneId, { resetTime: false });
      } else {
        // Перед воспроизведением этого слайда останавливаем все остальные
        stopOtherScenesAudio(sceneId);
        await existingAudio.play();
        setPlayingSceneId(sceneId);
      }
      return;
    }

    try {
      if (!textChanged) {
        setLoadingSceneId(sceneId);
        await playSceneAudio(sceneId, baseAudioUrl);
        return;
      }

      setLoadingSceneId(sceneId);

      // Отправляем вебхук и ждем, пока n8n вернет success === true
      const response = await fetch("https://rueleven.ru/webhook/d08c47c0-82c3-4b50-a7e0-e1b525c5498b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_id: selectedVoice.voice_id, // voice_id из таблицы voices
          slide_number: slideNumber, // Номер слайда
          text: currentText,
          uuid: userUuid,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ожидаем подтверждение от n8n, что файл готов: [{ "success": true }] или { "success": true }
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new Error("Некорректный JSON ответ от вебхука");
      }

      let success = false;
      if (Array.isArray(json) && json.length > 0 && typeof json[0] === "object" && json[0] !== null) {
        success = Boolean((json[0] as { success?: unknown }).success);
      } else if (json && typeof json === "object") {
        success = Boolean((json as { success?: unknown }).success);
      }

      if (!success) {
        console.error("Неожиданный ответ вебхука, ожидали success=true:", json);
        throw new Error("Вебхук не вернул success=true, аудио может быть не готово");
      }

      console.log("Вебхук успешно завершил генерацию для слайда:", slideNumber);

      // Сохраняем отправленный текст (используется для определения, изменился ли текст)
      lastSentTexts.current[sceneId] = currentText;

      // Если текст изменился, добавляем cache-buster к URL, чтобы браузер не брал старое аудио из кеша
      const audioUrl = textChanged ? `${baseAudioUrl}&bust=${Date.now()}` : baseAudioUrl;

      console.log("Воспроизведение аудио по URL:", audioUrl);

      await playSceneAudio(sceneId, audioUrl);
      console.log("Воспроизведение начато");
    } catch (error) {
      setLoadingSceneId(null);
      console.error("Ошибка при отправке вебхука или воспроизведении:", error);
      alert(error instanceof Error ? error.message : "Не удалось отправить вебхук или воспроизвести аудио");
    }
  };

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex-shrink-0 space-y-6 border-b border-gray-100 p-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
              Настройка слайдов
            </p>
            <div className="flex items-center gap-3">
              {ratioOptions.map(({ label, value }) => {
                const isActive = aspectRatio === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onAspectRatioChange(value)}
                    className={`flex h-12 flex-1 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                      isActive
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm text-gray-600">Название видео</span>
            <input
              type="text"
              value={videoTitle}
              onChange={(event) => onVideoTitleChange(event.target.value)}
              placeholder="Придумайте название видео"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            />
          </label>
        </div>

        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {scenes.map((scene, index) => {
            const isActive = scene.id === activeSceneId;
            const selectedAvatar = avatars.find((avatar) => avatar.id === scene.avatarId);
            const selectedVoice = voices.find((voice) => voice.id === scene.voiceId);

            return (
              <div key={scene.id} className="space-y-2">
                <div
                  className={`rounded-2xl p-4 transition ${
                    isActive
                      ? "bg-gray-50"
                      : "bg-white hover:bg-gray-50/50"
                  }`}
                  onClick={() => onSelectScene(scene.id)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                        {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAvatarModalForSceneId(scene.id);
                        }}
                        className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 transition hover:bg-gray-200"
                      >
                        {selectedAvatar ? (
                          <>
                            <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
                              <Image
                                src={selectedAvatar.photo}
                                alt={selectedAvatar.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <span className="text-left text-sm font-medium text-gray-900 whitespace-nowrap">
                              Аватар
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white">
                              <span className="text-sm text-gray-400">＋</span>
                            </div>
                            <span className="text-left text-sm text-gray-500 whitespace-nowrap">
                              Аватар
                            </span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenVoiceModalForSceneId(scene.id);
                        }}
                        className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 transition hover:bg-gray-200"
                      >
                        {selectedVoice ? (
                          <>
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="h-4 w-4 text-gray-400"
                              >
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                              </svg>
                            </div>
                            <span className="text-left text-sm font-medium text-gray-900 whitespace-nowrap">
                              {selectedVoice.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-white">
                              <span className="text-sm text-gray-400">＋</span>
                            </div>
                            <span className="text-left text-sm text-gray-500 whitespace-nowrap">
                              Голос
                            </span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayClick(scene.id, index);
                        }}
                        disabled={
                          !scene.avatarId ||
                          !scene.voiceId ||
                          !scene.script ||
                          scene.script.trim() === "" ||
                          loadingSceneId === scene.id
                        }
                        className="ml-auto flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 transition hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
                        aria-label={playingSceneId === scene.id ? "Поставить на паузу" : "Воспроизвести голос"}
                      >
                        {loadingSceneId === scene.id ? (
                          <svg
                            className="h-4 w-4 animate-spin text-gray-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : playingSceneId === scene.id ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      {scenes.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteScene(scene.id);
                          }}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                          aria-label="Удалить слайд"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-4 w-4"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        ref={(el) => {
                          if (el) {
                            textareaRefs.current[scene.id] = el;
                            adjustTextareaHeight(el);
                          }
                        }}
                        value={scene.script}
                        onChange={(event) => {
                          const newValue = event.target.value.slice(0, 500);
                          onSceneScriptChange(scene.id, newValue);
                          adjustTextareaHeight(event.target);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Напишите текст"
                        maxLength={500}
                        className="w-full resize-none overflow-hidden rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        style={{ height: "auto", minHeight: "60px" }}
                      />
                      <div className="mt-1 flex justify-end">
                        <span className={`text-xs ${scene.script.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                          {scene.script.length}/500
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (scenes.length < 3) {
                        onAddScene(scene.id);
                      }
                    }}
                    disabled={scenes.length >= 3}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100"
                    title={scenes.length >= 3 ? "Максимальное количество слайдов (3) достигнуто" : "Добавить слайд"}
                  >
                    <span className="text-sm">＋</span>
                    Слайд
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {openAvatarModalForSceneId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenAvatarModalForSceneId(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Выберите аватар
              </h2>
              <button
                type="button"
                onClick={() => setOpenAvatarModalForSceneId(null)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Закрыть"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {isLoadingAvatars ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">Загрузка аватаров...</p>
              </div>
            ) : avatars.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-gray-500">Нет доступных аватаров</p>
                <button
                  type="button"
                  onClick={() => {
                    // Проверка лимита в демо-режиме
                    if (avatars.length >= 3) {
                      alert("В демо-режиме можно создать максимум 3 аватара");
                      return;
                    }
                    if (openAvatarModalForSceneId) {
                      setPendingSceneIdForAvatar(openAvatarModalForSceneId);
                    }
                    setOpenAvatarModalForSceneId(null);
                    setIsAvatarCreateModalOpen(true);
                  }}
                  disabled={avatars.length >= 3}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
                  title={avatars.length >= 3 ? "Максимальное количество аватаров (3) достигнуто" : "Создать аватар"}
                >
                  Создать аватар
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {avatars.map((avatar) => {
                  const scene = scenes.find((s) => s.id === openAvatarModalForSceneId);
                  const isSelected = scene?.avatarId === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => {
                        if (openAvatarModalForSceneId) {
                          onSceneAvatarChange(
                            openAvatarModalForSceneId,
                            isSelected ? null : avatar.id,
                          );
                        }
                        setOpenAvatarModalForSceneId(null);
                      }}
                      className={`group relative aspect-[3/4] overflow-hidden rounded-2xl border transition ${
                        isSelected
                          ? "border-gray-900 ring ring-gray-900"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={avatar.photo}
                        alt={avatar.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-sm font-semibold text-white">
                          {avatar.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {openVoiceModalForSceneId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenVoiceModalForSceneId(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Выберите голос
              </h2>
              <button
                type="button"
                onClick={() => setOpenVoiceModalForSceneId(null)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Закрыть"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {isLoadingVoices ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">Загрузка голосов...</p>
              </div>
            ) : voices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <p className="text-gray-500">Нет доступных голосов</p>
                <button
                  type="button"
                  onClick={async () => {
                    // Проверка лимита в демо-режиме
                    if (voices.length >= 3) {
                      alert("В демо-режиме можно создать максимум 3 голоса");
                      return;
                    }
                    if (openVoiceModalForSceneId) {
                      setPendingSceneIdForVoice(openVoiceModalForSceneId);
                    }
                    setOpenVoiceModalForSceneId(null);
                    setIsVoiceCreateModalOpen(true);
                  }}
                  disabled={voices.length >= 3}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-purple-600"
                  title={voices.length >= 3 ? "Максимальное количество голосов (3) достигнуто" : "Создать голос"}
                >
                  Создать голос
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {voices.map((voice) => {
                  const scene = scenes.find((s) => s.id === openVoiceModalForSceneId);
                  const isSelected = scene?.voiceId === voice.id;
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => {
                        if (openVoiceModalForSceneId) {
                          onSceneVoiceChange(
                            openVoiceModalForSceneId,
                            isSelected ? null : voice.id,
                          );
                        }
                        setOpenVoiceModalForSceneId(null);
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-gray-900 bg-gray-50 ring ring-gray-900"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-5 w-5 text-gray-600"
                          >
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {voice.name}
                          </p>
                          {voice.description && (
                            <p className="text-xs text-gray-500">
                              {voice.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно создания аватара */}
      <AvatarUploadModal
        isOpen={isAvatarCreateModalOpen}
        onClose={() => {
          setIsAvatarCreateModalOpen(false);
          setPendingSceneIdForAvatar(null);
        }}
        onAvatarUploaded={async () => {
          // Обновляем список аватаров
          await onRefreshAvatars?.();
          
          // Получаем последний созданный аватар и применяем его
          if (pendingSceneIdForAvatar) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            
            if (user) {
              // Ждем немного, чтобы аватар успел обработаться
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const { data: avatarsData } = await supabase
                .from("photo_avatars")
                .select("id")
                .eq("uid", user.id)
                .eq("status", "done")
                .order("created_at", { ascending: false })
                .limit(1);
              
              if (avatarsData && avatarsData.length > 0 && avatarsData[0].id) {
                const avatarId = avatarsData[0].id;
                // Используем специальную функцию для применения созданного аватара
                if (onApplyCreatedAvatar) {
                  onApplyCreatedAvatar(pendingSceneIdForAvatar, avatarId);
                } else {
                  onSceneAvatarChange(pendingSceneIdForAvatar, avatarId);
                }
              }
            }
          }
          
          setIsAvatarCreateModalOpen(false);
          setPendingSceneIdForAvatar(null);
        }}
      />

      {/* Модальное окно создания голоса */}
      <VoiceCreateModal
        isOpen={isVoiceCreateModalOpen}
        onClose={() => {
          setIsVoiceCreateModalOpen(false);
          setPendingSceneIdForVoice(null);
        }}
        onVoiceCreated={async () => {
          // Обновляем список голосов
          await onRefreshVoices?.();
          
          // Получаем последний созданный голос и применяем его
          if (pendingSceneIdForVoice) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            
            if (user) {
              const { data: voicesData } = await supabase
                .from("voices")
                .select("id")
                .eq("uid", user.id)
                .order("created_at", { ascending: false })
                .limit(1);
              
              if (voicesData && voicesData.length > 0 && voicesData[0].id) {
                onSceneVoiceChange(pendingSceneIdForVoice, voicesData[0].id);
              }
            }
          }
          
          setIsVoiceCreateModalOpen(false);
          setPendingSceneIdForVoice(null);
        }}
      />
    </>
  );
}
