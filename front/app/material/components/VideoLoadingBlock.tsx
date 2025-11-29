"use client";

import { useEffect, useState } from "react";

interface VideoLoadingBlockProps {
  videoTitle: string;
  createdAt?: string;
}

export function VideoLoadingBlock({ videoTitle, createdAt }: VideoLoadingBlockProps) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Вычисляем время с момента создания
    const startTime = createdAt ? new Date(createdAt).getTime() : Date.now();
    const updateProgress = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - startTime);
      const elapsedMinutes = elapsed / (1000 * 60);
      setElapsedTime(elapsedMinutes);

      // Проверяем, прошло ли 3 часа
      const threeHours = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах
      if (elapsed >= threeHours) {
        setIsError(true);
        setProgress(100);
        return;
      }

      // Прогрессбар идет от 0 до 100% за 10 минут
      const tenMinutes = 10 * 60 * 1000; // 10 минут в миллисекундах
      const currentProgress = Math.min(100, (elapsed / tenMinutes) * 100);
      setProgress(currentProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000); // Обновляем каждую секунду

    return () => clearInterval(interval);
  }, [createdAt]);

  // Убираем UUID из названия для отображения
  const displayTitle = videoTitle.split("_").slice(0, -1).join("_") || videoTitle;

  return (
    <div className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 transition-all duration-300">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {displayTitle}
        </h3>
      </div>

      {isError ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              Генерация заняла более 3 часов
            </p>
            <p className="text-xs text-red-700">
              Статус будет обновлен автоматически. Попробуйте создать видео заново.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">Идет генерация видео</span>
              <span className="font-medium text-gray-900">
                {Math.floor(elapsedTime)} мин
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg
              className="h-4 w-4 animate-spin text-gray-400"
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
            <span>
              {progress >= 99
                ? "Нам понадобится больше времени для генерации видео."
                : "Это может занять до 10 минут. Страницу можно закрыть, видео появится после генерации."}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

