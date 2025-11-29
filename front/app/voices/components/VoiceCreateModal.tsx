"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface VoiceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCreated?: () => void | Promise<void>;
}

const MAX_FILE_SIZE_MB = 11;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 11 МБ
const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"];
const MAX_DESCRIPTION_LENGTH = 100;

export function VoiceCreateModal({
  isOpen,
  onClose,
  onVoiceCreated,
}: VoiceCreateModalProps) {
  const [voiceName, setVoiceName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const stopProgressLoop = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    setProgress(0);
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextValue = Math.min(100, (elapsed / 15000) * 100);
      setProgress(nextValue);
    }, 50);
  }, [stopProgressLoop]);

  const resetState = useCallback(() => {
    setVoiceName("");
    setVoiceDescription("");
    setSelectedFile(null);
    setRecordedBlob(null);
    // Очищаем URL для освобождения памяти
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
    setIsRecording(false);
    setIsWaiting(false);
    setProgress(0);
    stopProgressLoop();
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [recordedAudioUrl, stopProgressLoop]);

  const closeModal = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      // Очищаем URL при размонтировании
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      stopProgressLoop();
    };
  }, [recordedAudioUrl, stopProgressLoop]);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      alert("Неподдерживаемый формат файла. Допустимы только MP3, WAV, WebM или OGG.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(
        `Файл превышает лимит ${MAX_FILE_SIZE_MB} МБ. Размер файла: ${(file.size / 1024 / 1024).toFixed(1)} МБ`,
      );
      return false;
    }
    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const file = event.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setRecordedBlob(null); // Сбрасываем запись если выбрали файл
      }
    }
  };

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files?.[0]) {
      const file = event.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setRecordedBlob(null); // Сбрасываем запись если выбрали файл
      }
    }
  }, []);

  const startRecording = async () => {
    try {
      // Проверяем доступность API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(
          "Ваш браузер не поддерживает запись с микрофона. Пожалуйста, используйте современный браузер (Chrome, Firefox, Edge)."
        );
        return;
      }

      // Проверяем разрешения перед запросом
      try {
        const permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (permissionStatus.state === "denied") {
          alert(
            "Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера и обновите страницу."
          );
          return;
        }
      } catch (permError) {
        // Некоторые браузеры не поддерживают permissions API, продолжаем
        console.log("Permissions API не поддерживается, продолжаем запрос");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/mp4"
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        
        // Создаем URL для воспроизведения
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        
        setSelectedFile(null); // Сбрасываем файл если записали
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error("Ошибка записи:", event);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        alert("Произошла ошибка при записи. Попробуйте еще раз.");
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: unknown) {
      console.error("Ошибка доступа к микрофону:", error);
      setIsRecording(false);
      
      let errorMessage = "Не удалось получить доступ к микрофону.";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage = 
            "Доступ к микрофону запрещен.\n\n" +
            "Пожалуйста:\n" +
            "1. Нажмите на иконку замка в адресной строке браузера\n" +
            "2. Разрешите доступ к микрофону\n" +
            "3. Обновите страницу и попробуйте снова";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          errorMessage = "Микрофон не найден. Убедитесь, что микрофон подключен и включен.";
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          errorMessage = 
            "Микрофон уже используется другим приложением.\n\n" +
            "Закройте другие приложения, использующие микрофон, и попробуйте снова.";
        } else {
          errorMessage = `Ошибка: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const loadLameJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && (window as any).lamejs) {
        resolve((window as any).lamejs);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";
      script.onload = () => resolve((window as any).lamejs);
      script.onerror = () => reject(new Error("Не удалось загрузить библиотеку конвертации"));
      document.head.appendChild(script);
    });
  };

  const convertWebmToMp3 = async (webmBlob: Blob): Promise<File> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    try {
      // Пытаемся использовать lamejs для конвертации в MP3
      const Lame = await loadLameJs();
      
      const mp3encoder = new Lame.Mp3Encoder(
        audioBuffer.numberOfChannels,
        audioBuffer.sampleRate,
        128 // bitrate
      );

      // Конвертируем float32 в int16
      const samples: Int16Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channelData = audioBuffer.getChannelData(i);
        const int16Array = new Int16Array(channelData.length);
        for (let j = 0; j < channelData.length; j++) {
          int16Array[j] = Math.max(-32768, Math.min(32767, channelData[j] * 32768));
        }
        samples.push(int16Array);
      }

      const mp3Data: BlobPart[] = [];
      const sampleBlockSize = 1152;
      
      for (let i = 0; i < samples[0].length; i += sampleBlockSize) {
        const left = samples[0].subarray(i, i + sampleBlockSize);
        const right = audioBuffer.numberOfChannels > 1 
          ? samples[1].subarray(i, i + sampleBlockSize)
          : left;
        const mp3buf = mp3encoder.encodeBuffer(left, right);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }

      const mp3Blob = new Blob(mp3Data, { type: "audio/mpeg" });
      return new File([mp3Blob], "recording.mp3", { type: "audio/mpeg" });
    } catch (error) {
      // Fallback: если lamejs не загрузился, конвертируем в WAV
      console.warn("Не удалось использовать lamejs, используем WAV формат:", error);
      const wavBlob = audioBufferToWav(audioBuffer);
      // Отправляем как WAV с расширением mp3 (сервер может конвертировать)
      return new File([wavBlob], "recording.mp3", { type: "audio/mpeg" });
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      alert("Введите название голоса");
      return;
    }

    // Проверка лимита в демо-режиме
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: voicesData } = await supabase
          .from("voices")
          .select("id")
          .eq("uid", user.id);

        if (voicesData && voicesData.length >= 3) {
          alert("В демо-режиме можно создать максимум 3 голоса");
          return;
        }
      }
    } catch (error) {
      console.error("[VoiceCreateModal] Ошибка проверки лимита:", error);
    }

    // Запускаем прогресс-бар сразу при нажатии на кнопку
    setIsUploading(true);
    setIsWaiting(true);
    startProgressLoop();

    let audioFile: File | null = null;

    if (selectedFile) {
      // Если файл загружен, используем его как есть
      audioFile = selectedFile;
    } else if (recordedBlob) {
      // Если запись с микрофона, конвертируем webm в mp3
      try {
        audioFile = await convertWebmToMp3(recordedBlob);
      } catch (error) {
        console.error("[voices] Ошибка конвертации:", error);
        stopProgressLoop();
        setIsUploading(false);
        setIsWaiting(false);
        alert("Ошибка при конвертации записи. Попробуйте еще раз.");
        return;
      }
    } else {
      stopProgressLoop();
      setIsUploading(false);
      setIsWaiting(false);
      alert("Загрузите файл или запишите голос с микрофона");
      return;
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      stopProgressLoop();
      setIsUploading(false);
      setIsWaiting(false);
      alert(
        `Файл превышает лимит ${MAX_FILE_SIZE_MB} МБ. Размер файла: ${(audioFile.size / 1024 / 1024).toFixed(1)} МБ`,
      );
      return;
    }

    try {
      // Получаем UUID авторизованного пользователя
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Не удалось получить данные пользователя");
      }

      const formData = new FormData();
      formData.append("name", voiceName.trim());
      if (voiceDescription.trim()) {
        const trimmedDescription = voiceDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH);
        formData.append("description", trimmedDescription);
      }
      formData.append("file", audioFile);
      formData.append("uuid", user.id);

      const response = await fetch(
        "https://rueleven.ru/webhook/053aa1a5-396c-4cff-b9c4-a71ca8910a22",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Ошибка отправки: ${response.statusText}`);
      }

      // Отправляем вебхук с UUID пользователя при клонировании голоса
      try {
        await fetch("https://rueleven.ru/webhook/373bb6fa-8fae-49fd-83b6-b503e7f286c4", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uuid: user.id }),
        });
      } catch (webhookError) {
        // Логируем ошибку вебхука, но не прерываем процесс клонирования
        console.error("[VoiceCreateModal] Ошибка отправки вебхука UUID:", webhookError);
      }

      // Продолжаем ждать появления записи в таблице (прогресс-бар уже запущен)
      setIsUploading(false);

      // Ждем появления записи в таблице voices
      const timeoutMs = 30000; // 30 секунд максимум
      const pollDelayMs = 1000; // Проверяем каждую секунду
      const deadline = Date.now() + timeoutMs;
      let found = false;

      while (Date.now() < deadline && !found) {
        const { data, error } = await supabase
          .from("voices")
          .select("*")
          .eq("uid", user.id)
          .eq("name", voiceName.trim())
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          found = true;
          stopProgressLoop();
          setProgress(100);
          await new Promise((resolve) => setTimeout(resolve, 300)); // Небольшая задержка для завершения анимации
          setIsWaiting(false);
          await onVoiceCreated?.();
          closeModal();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
      }

      // Если не нашли за отведенное время
      stopProgressLoop();
      setIsWaiting(false);
      alert("Голос отправлен на обработку. Проверьте список голосов через несколько секунд.");
      await onVoiceCreated?.();
      closeModal();
    } catch (error) {
      console.error("[voices] Ошибка клонирования голоса:", error);
      stopProgressLoop();
      setIsUploading(false);
      setIsWaiting(false);
      alert(
        `Ошибка при клонировании голоса: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    }
  };

  const dropZoneClasses = `rounded-2xl border border-dashed border-purple-400/50 bg-purple-50/30 p-6 text-center transition-all duration-200 ${
    dragActive
      ? "shadow-lg -translate-y-0.5 border-purple-500"
      : "hover:shadow-md hover:-translate-y-0.5"
  }`;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-[32px] bg-white shadow-2xl">
        <div className="relative flex items-center justify-center border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Создать голос
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-6 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            disabled={isUploading || isRecording}
          >
            <span className="sr-only">Закрыть</span>✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="space-y-6 text-sm text-gray-600">
            <div>
              <label
                htmlFor="voice-name"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Название голоса
              </label>
              <input
                id="voice-name"
                value={voiceName}
                onChange={(event) => setVoiceName(event.target.value)}
                placeholder="Придумайте название голоса"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-400"
                disabled={isUploading || isRecording}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="voice-description"
                  className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Описание голоса <span className="text-gray-400">(необязательно)</span>
                </label>
                <span className={`text-xs ${
                  voiceDescription.length > MAX_DESCRIPTION_LENGTH 
                    ? "text-red-500" 
                    : "text-gray-400"
                }`}>
                  {voiceDescription.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <textarea
                id="voice-description"
                value={voiceDescription}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.length <= MAX_DESCRIPTION_LENGTH) {
                    setVoiceDescription(value);
                  }
                }}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Добавьте описание голоса"
                className="h-28 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-gray-400"
                disabled={isUploading || isRecording}
              />
            </div>

            {/* Загрузка файла */}
            <div
              className={dropZoneClasses}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-gray-700">
                <div className="rounded-2xl border border-purple-200 bg-white p-3 text-purple-500">
                  ↑
                </div>
                <p className="text-base font-semibold">
                  Перетащите аудио файл сюда
                </p>
                <p className="text-xs text-gray-500">MP3, WAV до 11 МБ</p>
                <button
                  type="button"
                  className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isRecording}
                >
                  Выбрать файл
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading || isRecording}
                />
              </div>
            </div>

            {/* Выбранный файл */}
            {selectedFile && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
                      🎵
                    </div>
                    <div>
                      <div className="font-medium">{selectedFile.name}</div>
                      <div className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 transition hover:text-red-500"
                    disabled={isUploading || isRecording}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Разделитель */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">или</span>
              </div>
            </div>

            {/* Запись с микрофона */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="rounded-full border-4 border-purple-200 bg-white p-4">
                  {isRecording ? (
                    <div className="h-12 w-12 animate-pulse rounded-full bg-red-500"></div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-purple-500"></div>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {isRecording ? "Идет запись..." : "Записать с микрофона"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {isRecording
                      ? "Нажмите остановить для завершения записи"
                      : "Нажмите начать для записи голоса"}
                  </p>
                </div>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                    disabled={isUploading || !!selectedFile}
                  >
                    Начать запись
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    Остановить запись
                  </button>
                )}
              </div>
            </div>

            {/* Записанный файл */}
            {recordedBlob && !isRecording && recordedAudioUrl && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-green-100 p-2 text-green-600">
                        ✓
                      </div>
                      <div>
                        <div className="font-medium">Запись завершена</div>
                        <div className="text-xs text-gray-500">
                          {(recordedBlob.size / 1024).toFixed(2)} КБ
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordedBlob(null);
                        if (recordedAudioUrl) {
                          URL.revokeObjectURL(recordedAudioUrl);
                        }
                        setRecordedAudioUrl(null);
                      }}
                      className="text-gray-400 transition hover:text-red-500"
                      disabled={isUploading}
                    >
                      ✕
                    </button>
                  </div>
                  {/* Аудио плеер */}
                  <div className="flex items-center gap-2 rounded-lg bg-white p-2">
                    <audio
                      ref={audioPlayerRef}
                      src={recordedAudioUrl}
                      controls
                      className="flex-1"
                      style={{ height: "32px" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-1 items-center gap-4">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={isUploading || isRecording || isWaiting}
            >
              Отмена
            </button>
            {(isUploading || isWaiting || progress > 0) && (
              <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 transition-[width] duration-100 ease-out"
                  style={{ width: `${progress}%` }}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleCloneVoice}
            disabled={
              isUploading ||
              isRecording ||
              isWaiting ||
              !voiceName.trim() ||
              (!selectedFile && !recordedBlob)
            }
            className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-300 sm:ml-auto"
          >
            {isUploading
              ? "Клонируем..."
              : isWaiting
                ? "Ожидаем..."
                : "Клонировать голос"}
          </button>
        </div>
      </div>
    </div>
  );
}

