"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Scene, AvatarOption, AspectRatio, CanvasElement } from "./types";

const CANVAS_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

type CanvasThumbnailProps = {
  scene: Scene;
  avatars: AvatarOption[];
  aspectRatio: AspectRatio;
};

function CanvasThumbnail({ scene, avatars, aspectRatio }: CanvasThumbnailProps) {
  const canvasSize = CANVAS_SIZES[aspectRatio];

  const avatar = scene.avatarId ? avatars.find((a) => a.id === scene.avatarId) : null;

  const maxElementZIndex = scene.elements.reduce((max, element) => Math.max(max, element.zIndex ?? 0), 0);

  const layeredItems = [
    ...scene.elements.map((element) => ({
      type: "element" as const,
      data: element,
      zIndex: element.zIndex ?? 0,
    })),
    ...(avatar && scene.avatarPosition && scene.avatarSize
      ? [
          {
            type: "avatar" as const,
            data: avatar,
            zIndex: scene.avatarZIndex ?? maxElementZIndex + 1,
          },
        ]
      : []),
  ].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="absolute inset-0 bg-gray-50 overflow-hidden">
      {layeredItems.map((item) => {
        if (item.type === "avatar" && scene.avatarPosition && scene.avatarSize) {
          return (
            <div
              key="avatar"
              className="absolute"
              style={{
                left: `${(scene.avatarPosition.x / canvasSize.width) * 100}%`,
                top: `${(scene.avatarPosition.y / canvasSize.height) * 100}%`,
                width: `${(scene.avatarSize.width / canvasSize.width) * 100}%`,
                height: `${(scene.avatarSize.height / canvasSize.height) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <img src={avatar!.photo} alt={avatar!.name} className="w-full h-full object-cover" />
            </div>
          );
        }

        const element = item.data as CanvasElement;
        const leftPercent = (element.x / canvasSize.width) * 100;
        const topPercent = (element.y / canvasSize.height) * 100;
        const widthPercent = (element.width / canvasSize.width) * 100;
        const heightPercent = (element.height / canvasSize.height) * 100;

        return (
          <div
            key={element.id}
            className="absolute border border-gray-300 overflow-hidden"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: `${widthPercent}%`,
              height: `${heightPercent}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: element.imageUrl ? "transparent" : "#e5e7eb",
            }}
          >
            {element.imageUrl ? (
              <img src={element.imageUrl} alt={element.label} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

type TimelineProps = {
  scenes: Scene[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onAddScene: (afterSceneId?: string) => void;
  avatars: AvatarOption[];
  aspectRatio: AspectRatio;
};

export function Timeline({
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  avatars,
  aspectRatio,
}: TimelineProps) {
  const sceneRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredWarningId, setHoveredWarningId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const prevScenesLengthRef = useRef<number>(scenes.length);

  useEffect(() => {
    const activeButton = sceneRefs.current[activeSceneId];
    if (activeButton) {
      activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeSceneId]);

  useEffect(() => {
    // Автоматическая прокрутка к концу при добавлении нового слайда
    if (scenes.length > prevScenesLengthRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          left: container.scrollWidth,
          behavior: "smooth",
        });
      }, 100);
    }
    prevScenesLengthRef.current = scenes.length;
  }, [scenes.length]);

  // Проверяем, есть ли хотя бы один слайд с текстом
  const hasAnyText = scenes.some((scene) => scene.script && scene.script.trim() !== "");
  const tooltipText = hasAnyText 
    ? "Слайд будет сгенерирован без озвучки"
    : "Напишите текст хотя бы для одного слайда";

  return (
    <>
      {hoveredWarningId && tooltipPosition && (
        <div 
          className="fixed z-[9999] px-3 py-2 rounded-lg border border-gray-200 bg-white shadow-lg text-xs text-gray-700 whitespace-nowrap"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 8}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseEnter={() => setHoveredWarningId(hoveredWarningId)}
          onMouseLeave={() => {
            setHoveredWarningId(null);
            setTooltipPosition(null);
          }}
        >
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-200"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-[3px]">
              <div className="border-4 border-transparent border-t-white"></div>
            </div>
          </div>
        </div>
      )}
    <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div 
          ref={scrollContainerRef}
          className="flex w-full flex-1 flex-col gap-2 overflow-x-auto overflow-y-visible pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full min-h-0"
        >
          {/* Контейнер для предупреждений "Нет текста" */}
          <div className="flex flex-nowrap items-center gap-1">
            {scenes.map((scene, index) => {
              const hasNoText = !scene.script || scene.script.trim() === "";
              const isLast = index === scenes.length - 1;
              return (
                <div key={`warning-${scene.id}`} className="flex flex-shrink-0 items-center">
                  <div className="h-[28px] w-[180px] flex items-center justify-center relative group">
                    {hasNoText && (
                      <div 
                        className="flex items-center justify-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg cursor-help"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPosition({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                          setHoveredWarningId(scene.id);
                        }}
                        onMouseLeave={() => {
                          setHoveredWarningId(null);
                          setTooltipPosition(null);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-red-600 flex-shrink-0"
                        >
                          <path
                            d="M12 2L1 21h22L12 2z"
                            fill="currentColor"
                          />
                          <path
                            d="M11 10h2v4h-2v-4zm0 6h2v2h-2v-2z"
                            fill="white"
                          />
                        </svg>
                        <span className="text-xs font-medium text-red-700 whitespace-nowrap">Нет текста</span>
                      </div>
                    )}
                  </div>
                  {!isLast && <div className="w-[1px]" />}
                  {isLast && <div className="w-[80px]" />}
                </div>
              );
            })}
      </div>
          {/* Контейнер для карточек слайдов */}
          <div className="flex flex-nowrap items-center gap-1">
        {scenes.map((scene, index) => {
          const isActive = scene.id === activeSceneId;
          const isLast = index === scenes.length - 1;
          return (
              <div key={scene.id} className="flex items-center flex-shrink-0 relative">
                <div className="flex items-center relative">
              <button
                ref={(el) => {
                  sceneRefs.current[scene.id] = el;
                }}
                type="button"
                onClick={() => onSelectScene(scene.id)}
                className={`relative min-w-[180px] min-h-[120px] w-[180px] h-[120px] rounded-2xl border overflow-hidden transition ${
                  isActive
                    ? "border-gray-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <CanvasThumbnail
                  scene={scene}
                  avatars={avatars}
                  aspectRatio={aspectRatio}
                />
                {/* Номер слайда */}
                <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white">
                  {index + 1}
                </div>
              </button>
                  {/* Стрелка на стыке карточек */}
                  {!isLast && (
                    <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3 text-gray-600"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  )}
              {isLast && (
                <button
                  type="button"
                  onClick={() => {
                    if (scenes.length < 3) {
                      onAddScene(scene.id);
                    }
                  }}
                  disabled={scenes.length >= 3}
                  className="flex h-[120px] w-[80px] flex-shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-700 transition hover:bg-gray-200 active:scale-95 ml-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-100"
                  aria-label={scenes.length >= 3 ? "Максимальное количество слайдов (3) достигнуто" : "Добавить слайд"}
                  title={scenes.length >= 3 ? "Максимальное количество слайдов (3) достигнуто" : "Добавить слайд"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-8 w-8"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
                </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
    </>
  );
}

