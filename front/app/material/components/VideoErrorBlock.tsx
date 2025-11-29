"use client";

import { useState } from "react";
import { DeleteVideo } from "../servers/DeleteVideo";

interface VideoErrorBlockProps {
  videoId: string;
  videoTitle: string;
  userId: string;
  onDeleted: () => void;
}

export function VideoErrorBlock({
  videoId,
  videoTitle,
  userId,
  onDeleted,
}: VideoErrorBlockProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    if (!confirm("Вы уверены, что хотите удалить это видео?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await DeleteVideo(userId, videoTitle, null);
      if (result.success) {
        onDeleted();
      } else {
        alert(`Ошибка при удалении: ${result.error}`);
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("[VideoErrorBlock] Ошибка удаления:", error);
      alert("Произошла ошибка при удалении видео");
      setIsDeleting(false);
    }
  };

  // Убираем UUID из названия для отображения
  const displayTitle = videoTitle.split("_").slice(0, -1).join("_") || videoTitle;

  return (
    <div className="group relative rounded-3xl border border-red-200 bg-white p-6 shadow-sm ring-1 ring-red-100 transition-all duration-300">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-md transition-all duration-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        aria-label="Удалить видео"
      >
        {isDeleting ? (
          <svg
            className="h-4 w-4 animate-spin"
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
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </button>

      <div className="mb-4 pr-10">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {displayTitle}
        </h3>
      </div>

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
            Ошибка генерации видео
          </p>
          <p className="text-xs text-red-700">
            Генерация заняла более 3 часов. Попробуйте создать видео заново.
          </p>
        </div>
      </div>
    </div>
  );
}

