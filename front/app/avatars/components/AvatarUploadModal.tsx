"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UploadAvatar } from "../servers/UploadAvatar";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarUploaded?: () => void | Promise<void>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AvatarUploadModal({
  isOpen,
  onClose,
  onAvatarUploaded,
}: AvatarUploadModalProps) {
  const [avatarName, setAvatarName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isMountedRef = useRef(true);

  const stopProgressLoop = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startTime;
        const nextValue = Math.min(90, (elapsed / 20000) * 90);
        return nextValue > prev ? nextValue : prev;
      });
    }, 200);
  }, [stopProgressLoop]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopProgressLoop();
    };
  }, [stopProgressLoop]);

  const resetState = useCallback(() => {
    setAvatarName("");
    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setProgress(0);
    stopProgressLoop();
  }, [previewUrls, stopProgressLoop]);

  const closeModal = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const validateFileTypes = (files: File[]): File[] => {
    const validFiles: File[] = [];
    const invalidFormat: string[] = [];
    const tooLarge: string[] = [];

    files.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        invalidFormat.push(file.name);
      } else if (file.size > MAX_FILE_SIZE) {
        tooLarge.push(
          `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} МБ)`
        );
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFormat.length || tooLarge.length) {
      let message = "";
      if (invalidFormat.length) {
        message += `Файлы с неподдерживаемым форматом:\n${invalidFormat.join(
          "\n"
        )}\n\nДопустимы только PNG или JPG.\n\n`;
      }
      if (tooLarge.length) {
        message += `Файлы превышают лимит 10 МБ:\n${tooLarge.join("\n")}`;
      }
      alert(message.trim());
    }

    return validFiles;
  };

  const createPreviews = useCallback(
    (files: File[]) => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      const limitedFiles = files.slice(0, 1);
      setSelectedFiles(limitedFiles);
      setPreviewUrls(limitedFiles.map((file) => URL.createObjectURL(file)));
    },
    [previewUrls]
  );

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (event.dataTransfer.files?.[0]) {
        const validFiles = validateFileTypes([event.dataTransfer.files[0]]);
        if (validFiles.length) {
          createPreviews(validFiles);
        }
      }
    },
    [createPreviews]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const validFiles = validateFileTypes([event.target.files[0]]);
      if (validFiles.length) {
        createPreviews(validFiles);
      }
    }
  };

  const removeFile = (index: number) => {
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    const revokedUrl = previewUrls[index];
    if (revokedUrl) {
      URL.revokeObjectURL(revokedUrl);
    }
    setPreviewUrls(newPreviews);
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const waitForAvatarCompletion = useCallback(
    async (recordId?: string | null, initialStatus?: "done" | "error") => {
      if (!recordId) {
        console.warn("[avatars] Нет ID записи для проверки статуса");
        return true;
      }

      // Если статус уже done сразу после создания, не ждём
      if (initialStatus === "done") {
        console.log("[avatars] Статус уже 'done', не требуется ожидание");
        return true;
      }

      if (initialStatus === "error") {
        console.error("[avatars] Статус 'error' при создании записи");
        return false;
      }

      const timeoutMs = 2 * 60 * 1000;
      const pollDelayMs = 2000;
      const deadline = Date.now() + timeoutMs;
      let attemptCount = 0;

      console.log(`[avatars] Начинаем проверку статуса для записи ${recordId}`);

      while (isMountedRef.current && Date.now() < deadline) {
        attemptCount++;
        const { data, error } = await supabase
          .from("photo_avatars")
          .select("status")
          .eq("id", recordId)
          .single();

        if (error) {
          console.error(
            `[avatars] Ошибка проверки статуса (попытка ${attemptCount}):`,
            error
          );
          // Если запись не найдена, продолжаем попытки
          if (error.code === "PGRST116") {
            await sleep(pollDelayMs);
            continue;
          }
        } else if (data?.status === "done") {
          console.log(
            `[avatars] Статус 'done' получен после ${attemptCount} попыток`
          );
          return true;
        } else if (data?.status === "error") {
          console.error(
            `[avatars] Статус 'error' получен после ${attemptCount} попыток`
          );
          return false;
        } else {
          console.log(
            `[avatars] Попытка ${attemptCount}: статус = ${data?.status || "неизвестен"}`
          );
        }

        await sleep(pollDelayMs);
      }

      console.warn(
        `[avatars] Таймаут ожидания статуса после ${attemptCount} попыток`
      );
      return false;
    },
    []
  );

  const handleUpload = async () => {
    if (isUploading || !avatarName.trim() || selectedFiles.length === 0) {
      return;
    }

    // Проверка лимита в демо-режиме
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: avatarsData } = await supabase
          .from("photo_avatars")
          .select("id")
          .eq("uid", user.id);

        if (avatarsData && avatarsData.length >= 3) {
          alert("В демо-режиме можно создать максимум 3 аватара");
          return;
        }
      }
    } catch (error) {
      console.error("[AvatarUploadModal] Ошибка проверки лимита:", error);
    }

    setIsUploading(true);
    setProgress(0);
    startProgressLoop();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        throw new Error("Пользователь не найден");
      }

      const formData = new FormData();
      formData.append("avatar_name", avatarName.trim());
      formData.append("uid", user.id);
      formData.append("photo", selectedFiles[0]);

      const result = await UploadAvatar(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Проверяем статус сразу после создания
      const initialStatus = result.avatar.status;
      console.log(
        `[avatars] Аватар создан с ID ${result.avatar.id}, начальный статус: ${initialStatus}`
      );

      // Если статус уже done, сразу устанавливаем прогресс в 100%
      if (initialStatus === "done") {
        stopProgressLoop();
        setProgress(100);
        await onAvatarUploaded?.();
        await sleep(400);
        closeModal();
        return;
      }

      const isReady = await waitForAvatarCompletion(
        result.avatar.id ?? null,
        initialStatus
      );

      if (!isReady) {
        throw new Error(
          "Не удалось дождаться завершения обработки аватара. Попробуйте позже."
        );
      }

      stopProgressLoop();
      setProgress(100);
      await onAvatarUploaded?.();
      await sleep(400);
      closeModal();
    } catch (error) {
      console.error("[avatars] Ошибка при загрузке:", error);
      alert(
        `Ошибка при загрузке: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
      setProgress(0);
    } finally {
      stopProgressLoop();
      setIsUploading(false);
    }
  };

  const dropZoneClasses = useMemo(() => {
    const base =
      "rounded-2xl border border-dashed border-blue-400/50 bg-blue-50/30 p-6 text-center transition-all duration-200";
    if (dragActive) {
      return `${base} shadow-lg -translate-y-0.5`;
    }
    return `${base} hover:shadow-md hover:-translate-y-0.5`;
  }, [dragActive]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-[32px] bg-white shadow-2xl">
        <div className="relative flex items-center justify-center border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Загрузите фото для аватара
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-6 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Закрыть</span>✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="space-y-6 text-sm text-gray-600">
            <div>
              <label
                htmlFor="avatar-name"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Имя аватара
              </label>
              <input
                id="avatar-name"
                value={avatarName}
                onChange={(event) => setAvatarName(event.target.value)}
                placeholder="Придумайте любое имя"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-400"
              />
            </div>

            <div
              className={dropZoneClasses}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-gray-700">
                <div className="rounded-2xl border border-blue-200 bg-white p-3 text-blue-500">
                  ↑
                </div>
                <p className="text-base font-semibold">
                  Перетащите фотографию сюда
                </p>
                <p className="text-xs text-gray-500">PNG или JPG до 10 МБ</p>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Выбрать файл
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {previewUrls[index] && (
                        <Image
                          src={previewUrls[index]}
                          alt={file.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg object-cover"
                          unoptimized
                        />
                      )}
                      <div className="truncate">{file.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 transition hover:text-red-500"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
              <p className="mb-3 text-sm font-semibold text-gray-800">
                Требования к фото
              </p>
              <ul className="space-y-2">
                <li>Фото в анфас (лицо прямо в камеру)</li>
                <li>Хорошее качество изображения, чёткое и резкое</li>
                <li>Без теней на лице, равномерное освещение</li>
                <li>Без других людей на фото, только вы</li>
                <li>Без открытой улыбки, нейтральное выражение лица</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-1 items-center gap-4">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={isUploading}
            >
              Отмена
            </button>
            {(isUploading || progress > 0) && (
              <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FFB347] via-[#FFC94C] to-[#FFB347] transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={
              isUploading || !avatarName.trim() || selectedFiles.length === 0
            }
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300 sm:ml-auto"
          >
            {isUploading ? "Создаем..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

