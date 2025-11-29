"use client";

import type { CanvasElement } from "./types";
import { useImageAspectRatio } from "./useImageAspectRatio";

type MediaCanvasProps = {
  element: CanvasElement;
  canvasSize: { width: number; height: number };
  sizeOverlay?: { width: number; height: number } | null;
  positionOverlay?: { x: number; y: number } | null;
  onRemove: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStart: (
    event: React.PointerEvent<HTMLDivElement>,
    corner: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  ) => void;
};

export function MediaCanvas({
  element,
  canvasSize,
  sizeOverlay,
  positionOverlay,
  onRemove,
  onPointerDown,
  onResizeStart,
}: MediaCanvasProps) {
  if (!element.imageUrl) return null;

  // Определяем соотношение сторон изображения
  const imageAspectRatio = useImageAspectRatio(element.imageUrl);

  // Конвертируем пиксели канвы в проценты для отображения
  const leftPercent = (element.x / canvasSize.width) * 100;
  const topPercent = (element.y / canvasSize.height) * 100;
  const widthPercent = (element.width / canvasSize.width) * 100;

  const resizeHandles: Array<{
    corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    cursor: string;
    position: string;
  }> = [
    { corner: "top-left", cursor: "cursor-nwse-resize", position: "top-0 left-0" },
    { corner: "top-right", cursor: "cursor-nesw-resize", position: "top-0 right-0" },
    { corner: "bottom-left", cursor: "cursor-nesw-resize", position: "bottom-0 left-0" },
    { corner: "bottom-right", cursor: "cursor-nwse-resize", position: "bottom-0 right-0" },
  ];

  return (
    <div
      className="group absolute cursor-grab active:cursor-grabbing"
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        aspectRatio: imageAspectRatio ? `${imageAspectRatio} / 1` : undefined,
        transform: "translate(-50%, -50%)",
      }}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
    >
      {/* Изображение медиа */}
      <img
        src={element.imageUrl}
        alt={element.label}
        className="w-full h-full object-cover"
      />
      
      {/* Маркеры масштабирования по углам */}
      {resizeHandles.map(({ corner, cursor, position }) => (
        <div
          key={corner}
          className={`absolute h-5 w-5 rounded-full bg-white border-2 border-gray-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:border-gray-900 hover:scale-125 ${cursor} ${position}`}
          style={{
            transform: corner === "top-left" 
              ? "translate(-50%, -50%)" 
              : corner === "top-right"
              ? "translate(50%, -50%)"
              : corner === "bottom-left"
              ? "translate(-50%, 50%)"
              : "translate(50%, 50%)",
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, corner);
          }}
          role="button"
          tabIndex={0}
        />
      ))}

      {/* Кнопка удаления */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-0 top-0 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 z-10"
        style={{
          width: `${Math.min(40, Math.max(24, Math.min(element.width, element.height) * 0.08))}px`,
          height: `${Math.min(40, Math.max(24, Math.min(element.width, element.height) * 0.08))}px`,
          transform: 'translate(50%, -50%)',
        }}
        aria-label="Удалить медиа"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="w-full h-full p-1"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {(sizeOverlay || positionOverlay) && (
        <div className="absolute bottom-0 left-1/2 z-50 flex translate-y-full -translate-x-1/2 flex-col items-center gap-1">
          {sizeOverlay && (
            <div className="rounded-lg bg-black/80 px-2 py-1 text-xs font-mono text-white shadow-lg inline-flex items-center gap-3 whitespace-nowrap h-7">
              В:&nbsp;{Math.round(sizeOverlay.height)}&nbsp;px&nbsp;&nbsp;Ш:&nbsp;{Math.round(sizeOverlay.width)}&nbsp;px
            </div>
          )}
          {positionOverlay && (
            <div className="rounded-lg bg-black/80 px-2 py-1 text-xs font-mono text-white shadow-lg inline-flex items-center gap-3 whitespace-nowrap h-7">
              X:&nbsp;{Math.round(positionOverlay.x)}&nbsp;px&nbsp;&nbsp;Y:&nbsp;{Math.round(positionOverlay.y)}&nbsp;px
            </div>
          )}
        </div>
      )}
    </div>
  );
}

