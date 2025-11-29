"use client";

import { useState, useMemo } from "react";
import type { CanvasElement, AvatarOption } from "./types";

type LayerItem = {
  id: string;
  type: "avatar" | "media";
  label: string;
  thumbnail?: string;
  zIndex: number;
};

type LayersPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  elements: CanvasElement[];
  avatar: AvatarOption | null;
  avatarZIndex?: number;
  avatarLocked?: boolean;
  onReorderLayers: (newOrder: string[]) => void;
  onToggleAvatarLock: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
};

export function LayersPanel({
  isOpen,
  onClose,
  elements,
  avatar,
  avatarZIndex,
  avatarLocked,
  onReorderLayers,
  onToggleAvatarLock,
  panelRef,
}: LayersPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Создаем список слоев: элементы и аватар отсортированные по zIndex (больший zIndex = выше = первый в списке)
  const layers: LayerItem[] = useMemo(() => {
    const allLayers: LayerItem[] = [
      ...elements.map((el) => ({
        id: el.id,
        type: "media" as const,
        label: el.label,
        thumbnail: el.imageUrl,
        zIndex: el.zIndex ?? 0,
      })),
      ...(avatar
        ? [
            {
              id: "avatar",
              type: "avatar" as const,
              label: avatar.name,
              thumbnail: avatar.photo,
              zIndex: avatarZIndex ?? 9999,
            },
          ]
        : []),
    ];
    return allLayers.sort((a, b) => b.zIndex - a.zIndex); // Больший zIndex = первый в списке
  }, [elements, avatar, avatarZIndex]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // Аватар не перетаскивается, если заблокирован
    if (id === "avatar" && avatarLocked) {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    // Нельзя перетаскивать на заблокированный аватар или перетаскивать заблокированный аватар
    if ((id === "avatar" && avatarLocked) || (draggedId === "avatar" && avatarLocked)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Нельзя перетаскивать на заблокированный аватар или перетаскивать заблокированный аватар
    if ((targetId === "avatar" && avatarLocked) || !draggedId || draggedId === targetId || (draggedId === "avatar" && avatarLocked)) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Используем актуальный список layers
    const currentLayers = [
      ...elements.map((el) => ({
        id: el.id,
        type: "media" as const,
        label: el.label,
        thumbnail: el.imageUrl,
        zIndex: el.zIndex ?? 0,
      })),
      ...(avatar
        ? [
            {
              id: "avatar",
              type: "avatar" as const,
              label: avatar.name,
              thumbnail: avatar.photo,
              zIndex: avatarZIndex ?? 9999,
            },
          ]
        : []),
    ].sort((a, b) => b.zIndex - a.zIndex);

    const draggedIndex = currentLayers.findIndex((l) => l.id === draggedId);
    const targetIndex = currentLayers.findIndex((l) => l.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Создаем новый порядок слоев
    const newLayers = [...currentLayers];
    const [draggedLayer] = newLayers.splice(draggedIndex, 1);
    newLayers.splice(targetIndex, 0, draggedLayer);

    // Обновляем zIndex: первый в списке (index 0) = больший zIndex = выше на канве
    const newOrder = newLayers.map((l) => l.id);
    onReorderLayers(newOrder);

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[416px] rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Слои</h2>
        </div>

        <div className="space-y-2">
          {layers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Нет элементов на канве
            </p>
          ) : (
            layers.map((layer, index) => {
              const isAvatar = layer.type === "avatar";
              const isLocked = isAvatar && avatarLocked;
              return (
              <div
                key={layer.id}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, layer.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 transition ${
                  draggedId === layer.id
                    ? "cursor-move opacity-50"
                    : dragOverId === layer.id && !isLocked
                    ? "cursor-move border-blue-500 bg-blue-50"
                    : isLocked
                    ? "cursor-default border-gray-200 bg-gray-50"
                    : "cursor-move border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">
                  {index + 1}
                </div>
                {layer.thumbnail ? (
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                    <img
                      src={layer.thumbnail}
                      alt={layer.label}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200">
                    <span className="text-xs text-gray-500">
                      {layer.type === "avatar" ? "👤" : "📄"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{layer.label}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {layer.type === "avatar" ? "Аватар" : "Медиа"}
                  </p>
                </div>
                 {isAvatar ? (
                   <button
                     type="button"
                     onClick={(e) => {
                       e.stopPropagation();
                       onToggleAvatarLock();
                     }}
                     className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                       avatarLocked
                         ? "bg-red-100 text-red-600 hover:bg-red-200"
                         : "bg-green-100 text-green-600 hover:bg-green-200"
                     }`}
                     aria-label={avatarLocked ? "Разблокировать аватар" : "Заблокировать аватар"}
                   >
                     {avatarLocked ? "Заблокирован" : "Разблокирован"}
                   </button>
                 ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-5 w-5 flex-shrink-0 text-gray-400"
                  >
                    <path d="M8 9h8M8 15h8" />
                  </svg>
                )}
              </div>
            );
            })
          )}
        </div>
      </div>
    </div>
  );
}

