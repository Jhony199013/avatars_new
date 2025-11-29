"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface VoiceCardProps {
  name: string;
  url: string;
  description?: string | null;
  menuSlot?: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function VoiceCard({
  name,
  url,
  description,
  menuSlot,
  onMouseEnter,
  onMouseLeave,
}: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formattedDescription = description?.trim() ?? "";

  const handlePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        alert("Ошибка воспроизведения аудио");
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <article
      className="group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {menuSlot}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handlePlay}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          aria-label={isPlaying ? "Остановить воспроизведение" : "Проиграть голос"}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-gray-900">{name}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        <span className="font-semibold text-gray-900">Описание:</span>{" "}
        {formattedDescription || "Не указано"}
      </p>
    </article>
  );
}

