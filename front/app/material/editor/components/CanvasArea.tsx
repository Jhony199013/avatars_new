"use client";

import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import type { AspectRatio, CanvasElement, AvatarOption, MediaAsset } from "./types";
import { AvatarCanvas } from "./AvatarCanvas";
import { MediaCanvasWrapper } from "./MediaCanvasWrapper";
import { LayersPanel } from "./LayersPanel";
import { useImageAspectRatio } from "./useImageAspectRatio";
import { CosmoLoader } from "@/components/ui/CosmoLoader";

// Размеры канвы в пикселях
const CANVAS_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

type CanvasAreaProps = {
  aspectRatio: AspectRatio;
  elements: CanvasElement[];
  mediaAssets: MediaAsset[];
  avatar: AvatarOption | null;
  avatarPosition: { x: number; y: number };
  avatarSize: { width: number; height: number };
  avatarZIndex?: number;
  avatarLocked?: boolean;
  onElementPositionChange: (
    elementId: string,
    coords: { x: number; y: number },
  ) => void;
  onElementSizeChange: (
    elementId: string,
    size: { width: number; height: number },
  ) => void;
  onRemoveElement: (elementId: string) => void;
  onReorderLayers: (newOrder: string[]) => void;
  onAvatarPositionChange: (coords: { x: number; y: number }) => void;
  onAvatarSizeChange: (size: { width: number; height: number }) => void;
  onAlignAvatars?: () => void;
  onAddMediaAsset: (file: File) => void;
  onUseMediaAsset: (assetId: string) => void;
  onUseMediaAssetAtPosition?: (assetId: string, x: number, y: number) => void;
  onRemoveMediaAsset: (assetId: string) => void;
  onRemoveAvatar: () => void;
  onToggleAvatarLock: () => void;
  isUploadingMedia?: boolean;
};

export function CanvasArea({
  aspectRatio,
  elements,
  mediaAssets,
  avatar,
  avatarPosition,
  avatarSize,
  avatarZIndex,
  avatarLocked,
  onElementPositionChange,
  onElementSizeChange,
  onRemoveElement,
  onReorderLayers,
  onAvatarPositionChange,
  onAvatarSizeChange,
  onAlignAvatars,
  onAddMediaAsset,
  onUseMediaAsset,
  onUseMediaAssetAtPosition,
  onRemoveMediaAsset,
  onRemoveAvatar,
  onToggleAvatarLock,
  isUploadingMedia = false,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layersButtonRef = useRef<HTMLButtonElement>(null);
  const layersPanelRef = useRef<HTMLDivElement>(null);
  const mediaButtonRef = useRef<HTMLButtonElement>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const layersCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);
  const [draggedMediaAssetId, setDraggedMediaAssetId] = useState<string | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);

  const mediaUsageOnScene = useMemo(() => {
    return elements.reduce<Record<string, number>>((acc, element) => {
      if (element.type === "media" && element.assetId) {
        acc[element.assetId] = (acc[element.assetId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [elements]);

  // Закрытие меню слоев при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isLayersPanelOpen &&
        layersButtonRef.current &&
        layersPanelRef.current &&
        !layersButtonRef.current.contains(event.target as Node) &&
        !layersPanelRef.current.contains(event.target as Node)
      ) {
        setIsLayersPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLayersPanelOpen]);

  // Закрытие меню медиа при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMediaPanelOpen &&
        mediaButtonRef.current &&
        mediaPanelRef.current &&
        !mediaButtonRef.current.contains(event.target as Node) &&
        !mediaPanelRef.current.contains(event.target as Node)
      ) {
        setIsMediaPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMediaPanelOpen]);

  // Обработчики для автоматического закрытия меню слоев
  const handleLayersMouseEnter = () => {
    if (layersCloseTimeoutRef.current) {
      clearTimeout(layersCloseTimeoutRef.current);
      layersCloseTimeoutRef.current = null;
    }
  };

  const handleLayersMouseLeave = () => {
    layersCloseTimeoutRef.current = setTimeout(() => {
      setIsLayersPanelOpen(false);
    }, 500);
  };

  // Обработчики для автоматического закрытия меню медиа
  const handleMediaMouseEnter = () => {
    if (mediaCloseTimeoutRef.current) {
      clearTimeout(mediaCloseTimeoutRef.current);
      mediaCloseTimeoutRef.current = null;
    }
  };

  const handleMediaMouseLeave = () => {
    mediaCloseTimeoutRef.current = setTimeout(() => {
      setIsMediaPanelOpen(false);
    }, 500);
  };

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (layersCloseTimeoutRef.current) {
        clearTimeout(layersCloseTimeoutRef.current);
      }
      if (mediaCloseTimeoutRef.current) {
        clearTimeout(mediaCloseTimeoutRef.current);
      }
    };
  }, []);
  const [dragOverlay, setDragOverlay] = useState<{ id: string; x: number; y: number } | null>(null);
  const [avatarDragOverlay, setAvatarDragOverlay] = useState<{ x: number; y: number } | null>(null);
  const [snapPoint, setSnapPoint] = useState<{ x: number | null; y: number | null; type: string } | null>(null);
  const [avatarSizeOverlay, setAvatarSizeOverlay] = useState<{ width: number; height: number } | null>(null);

  const canvasSize = CANVAS_SIZES[aspectRatio];
  
  // Получаем пропорции изображения аватара для правильного масштабирования
  const avatarImageAspectRatio = useImageAspectRatio(avatar?.photo ?? null);
  
  // Получаем пропорции изображений медиа элементов
  const mediaImageAspectRatios = useMemo(() => {
    const ratios: Record<string, number | null> = {};
    elements.forEach((element) => {
      if (element.imageUrl) {
        ratios[element.id] = null; // Будет установлено через хук
      }
    });
    return ratios;
  }, [elements]);

  // Определяем линии привязки
  const snapLines = useMemo(() => {
    const snapDistance = 160; // Расстояние от углов
    return {
      vertical: [snapDistance, canvasSize.width - snapDistance, canvasSize.width / 2],
      horizontal: [snapDistance, canvasSize.height - snapDistance, canvasSize.height / 2],
    };
  }, [canvasSize]);

  // Определяем точки привязки (пересечения линий)
  const snapPoints = useMemo(() => {
    const snapDistance = 160;
    return [
      { x: snapDistance, y: snapDistance, type: 'top-left' },
      { x: canvasSize.width - snapDistance, y: snapDistance, type: 'top-right' },
      { x: snapDistance, y: canvasSize.height - snapDistance, type: 'bottom-left' },
      { x: canvasSize.width - snapDistance, y: canvasSize.height - snapDistance, type: 'bottom-right' },
      { x: canvasSize.width / 2, y: canvasSize.height / 2, type: 'center' },
    ];
  }, [canvasSize]);

  // Проверка привязки к линиям и точкам
  const checkSnap = useCallback((x: number, y: number, threshold: number = 20) => {
    let snapX: number | null = null;
    let snapY: number | null = null;
    let snapType = '';

    // Проверяем привязку к вертикальным линиям
    for (const lineX of snapLines.vertical) {
      if (Math.abs(x - lineX) <= threshold) {
        snapX = lineX;
        break;
      }
    }

    // Проверяем привязку к горизонтальным линиям
    for (const lineY of snapLines.horizontal) {
      if (Math.abs(y - lineY) <= threshold) {
        snapY = lineY;
        break;
      }
    }

    // Проверяем привязку к точкам (пересечениям линий)
    for (const point of snapPoints) {
      const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
      if (distance <= threshold) {
        // Если попали в точку, используем координаты точки
        snapX = point.x;
        snapY = point.y;
        snapType = point.type;
        break;
      }
    }

    // Если есть привязка хотя бы по одной оси
    if (snapX !== null || snapY !== null) {
      return {
        x: snapX,
        y: snapY,
        type: snapType || (snapX !== null && snapY !== null ? 'intersection' : snapX !== null ? 'vertical' : 'horizontal'),
      };
    }

    return null;
  }, [snapLines, snapPoints]);

  // Конвертирует пиксели канвы в пиксели экрана
  const canvasToScreen = useCallback((canvasPx: number, dimension: "width" | "height") => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const screenSize = dimension === "width" ? rect.width : rect.height;
    const canvasSizePx = dimension === "width" ? canvasSize.width : canvasSize.height;
    return (canvasPx / canvasSizePx) * screenSize;
  }, [canvasSize]);

  // Конвертирует пиксели экрана в пиксели канвы
  const screenToCanvas = useCallback((screenPx: number, dimension: "width" | "height") => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const screenSize = dimension === "width" ? rect.width : rect.height;
    const canvasSizePx = dimension === "width" ? canvasSize.width : canvasSize.height;
    return (screenPx / screenSize) * canvasSizePx;
  }, [canvasSize]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, element: CanvasElement) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const initialX = element.x;
      const initialY = element.y;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaXScreen = moveEvent.clientX - startX;
        const deltaYScreen = moveEvent.clientY - startY;

        // Конвертируем смещение экрана в пиксели канвы
        const deltaX = screenToCanvas(deltaXScreen, "width");
        const deltaY = screenToCanvas(deltaYScreen, "height");

        // Вычисляем новую позицию центра элемента с учетом смещения мыши
        let nextX = initialX + deltaX;
        let nextY = initialY + deltaY;

        // Ограничиваем позицию так, чтобы элемент не выходил за границы канвы
        const halfWidth = element.width / 2;
        const halfHeight = element.height / 2;

        nextX = Math.min(
          canvasSize.width - halfWidth,
          Math.max(halfWidth, nextX),
        );
        nextY = Math.min(
          canvasSize.height - halfHeight,
          Math.max(halfHeight, nextY),
        );

        setDragOverlay({ id: element.id, x: nextX, y: nextY });
        onElementPositionChange(element.id, { x: nextX, y: nextY });
      };

      const handlePointerUp = () => {
        setDragOverlay(null);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [onElementPositionChange, screenToCanvas, canvasSize],
  );

  const getAvatarRenderDimensions = useCallback(() => {
    const width = avatarSize.width;
    const height = avatarImageAspectRatio ? width / avatarImageAspectRatio : avatarSize.height;
    return { width, height };
  }, [avatarSize, avatarImageAspectRatio]);

  const clampAvatarPosition = useCallback(
    (position: { x: number; y: number }, width: number, height: number) => {
      const clampCoord = (value: number, halfSize: number, canvasDimension: number) => {
        if (!Number.isFinite(halfSize) || halfSize <= 0) {
          return Math.min(Math.max(value, 0), canvasDimension);
        }
        if (halfSize >= canvasDimension / 2) {
          return canvasDimension / 2;
        }
        const min = halfSize;
        const max = canvasDimension - halfSize;
        return Math.min(max, Math.max(min, value));
      };

      return {
        x: clampCoord(position.x, width / 2, canvasSize.width),
        y: clampCoord(position.y, height / 2, canvasSize.height),
      };
    },
    [canvasSize],
  );

  useEffect(() => {
    if (!avatar) return;
    const { width, height } = getAvatarRenderDimensions();
    const clamped = clampAvatarPosition(avatarPosition, width, height);
    if (clamped.x !== avatarPosition.x || clamped.y !== avatarPosition.y) {
      onAvatarPositionChange(clamped);
    }
  }, [avatar, avatarPosition, clampAvatarPosition, getAvatarRenderDimensions, onAvatarPositionChange]);

  const handleAvatarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const { width: avatarWidth, height: avatarHeight } = getAvatarRenderDimensions();
      const initialClamped = clampAvatarPosition(avatarPosition, avatarWidth, avatarHeight);
      let initialX = initialClamped.x;
      let initialY = initialClamped.y;

      if (initialX !== avatarPosition.x || initialY !== avatarPosition.y) {
        onAvatarPositionChange(initialClamped);
      }

      let rafId: number | null = null;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
          const deltaXScreen = moveEvent.clientX - startX;
          const deltaYScreen = moveEvent.clientY - startY;

          // Конвертируем смещение экрана в пиксели канвы
          const deltaX = screenToCanvas(deltaXScreen, "width");
          const deltaY = screenToCanvas(deltaYScreen, "height");

          // Вычисляем новую позицию центра аватара
          let nextX = initialX + deltaX;
          let nextY = initialY + deltaY;

          // Проверяем привязку к линиям и точкам
          const snap = checkSnap(nextX, nextY);
          if (snap) {
            // Фиксируем координаты только если есть привязка по соответствующей оси
            if (snap.x !== null) {
              nextX = snap.x;
            }
            if (snap.y !== null) {
              nextY = snap.y;
            }
            setSnapPoint(snap);
          } else {
            setSnapPoint(null);
          }

          // Ограничиваем позицию так, чтобы центр аватара не выходил за границы канвы
          nextX = Math.max(0, Math.min(canvasSize.width, nextX));
          nextY = Math.max(0, Math.min(canvasSize.height, nextY));

          setAvatarDragOverlay({ x: nextX, y: nextY });
          const clamped = clampAvatarPosition({ x: nextX, y: nextY }, avatarWidth, avatarHeight);
          nextX = clamped.x;
          nextY = clamped.y;

          onAvatarPositionChange({ x: nextX, y: nextY });
          rafId = null;
        });
      };

      const handlePointerUp = () => {
        setAvatarDragOverlay(null);
        setSnapPoint(null);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [
      avatarPosition,
      onAvatarPositionChange,
      screenToCanvas,
      canvasSize,
      checkSnap,
      clampAvatarPosition,
      getAvatarRenderDimensions,
    ],
  );

  const handleAvatarResizeStart = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      corner: "top-left" | "top-right" | "bottom-left" | "bottom-right",
    ) => {
      event.preventDefault();
      event.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const initialWidth = avatarSize.width;
      // Высота вычисляется автоматически на основе ширины и пропорций изображения
      const initialHeight = avatarImageAspectRatio 
        ? initialWidth / avatarImageAspectRatio 
        : avatarSize.height;
      const initialX = avatarPosition.x;
      const initialY = avatarPosition.y;

      // Вычисляем начальную позицию угла в пикселях канвы
      const centerX = initialX;
      const centerY = initialY;
      const halfWidth = initialWidth / 2;
      const halfHeight = initialHeight / 2;
      
      let initialCornerX: number, initialCornerY: number;
      if (corner === "top-left") {
        initialCornerX = centerX - halfWidth;
        initialCornerY = centerY - halfHeight;
      } else if (corner === "top-right") {
        initialCornerX = centerX + halfWidth;
        initialCornerY = centerY - halfHeight;
      } else if (corner === "bottom-left") {
        initialCornerX = centerX - halfWidth;
        initialCornerY = centerY + halfHeight;
      } else {
        // bottom-right
        initialCornerX = centerX + halfWidth;
        initialCornerY = centerY + halfHeight;
      }

      // Начальное расстояние от центра до угла (для расчета масштаба)
      const initialDistance = Math.sqrt(
        Math.pow(initialCornerX - centerX, 2) + Math.pow(initialCornerY - centerY, 2),
      );

      let rafId: number | null = null;

      setAvatarSizeOverlay({ width: initialWidth, height: initialHeight });

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
          const deltaXScreen = moveEvent.clientX - startX;
          const deltaYScreen = moveEvent.clientY - startY;

          // Конвертируем смещение экрана в пиксели канвы
          const deltaX = screenToCanvas(deltaXScreen, "width");
          const deltaY = screenToCanvas(deltaYScreen, "height");

          // Вычисляем новую позицию угла в пикселях канвы
          const newCornerX = initialCornerX + deltaX;
          const newCornerY = initialCornerY + deltaY;

          // Вычисляем новое расстояние от центра до угла
          const newDistance = Math.sqrt(
            Math.pow(newCornerX - centerX, 2) + Math.pow(newCornerY - centerY, 2),
          );

          // Масштабируем на основе изменения расстояния
          const scale = newDistance / initialDistance;
          
          // Вычисляем новую ширину
          let newWidth = initialWidth * scale;
          
          // Вычисляем высоту автоматически на основе ширины и пропорций изображения
          let newHeight = avatarImageAspectRatio 
            ? newWidth / avatarImageAspectRatio 
            : initialHeight * scale;

          // Ограничиваем минимальный и максимальный размер в пикселях
          const minSizePx = Math.min(canvasSize.width, canvasSize.height) * 0.05; // минимум 5% от меньшей стороны
          const maxSizePx = Math.min(canvasSize.width, canvasSize.height) * 0.95; // максимум 95% от меньшей стороны
          
          // Ограничиваем ширину
          if (newWidth > maxSizePx) {
            newWidth = maxSizePx;
            newHeight = avatarImageAspectRatio ? newWidth / avatarImageAspectRatio : newHeight;
          }
          if (newWidth < minSizePx) {
            newWidth = minSizePx;
            newHeight = avatarImageAspectRatio ? newWidth / avatarImageAspectRatio : newHeight;
          }
          
          // Ограничиваем высоту (если она слишком большая)
          if (newHeight > maxSizePx) {
            newHeight = maxSizePx;
            newWidth = avatarImageAspectRatio ? newHeight * avatarImageAspectRatio : newWidth;
          }
          if (newHeight < minSizePx) {
            newHeight = minSizePx;
            newWidth = avatarImageAspectRatio ? newHeight * avatarImageAspectRatio : newWidth;
          }

          setAvatarSizeOverlay({ width: newWidth, height: newHeight });
          onAvatarSizeChange({ width: newWidth, height: newHeight });

          const clampedPosition = clampAvatarPosition(avatarPosition, newWidth, newHeight);
          if (clampedPosition.x !== avatarPosition.x || clampedPosition.y !== avatarPosition.y) {
            onAvatarPositionChange(clampedPosition);
          }
          rafId = null;
        });
      };

      const handlePointerUp = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setAvatarSizeOverlay(null);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [
      avatarPosition,
      avatarSize,
      onAvatarSizeChange,
      screenToCanvas,
      canvasSize,
      avatarImageAspectRatio,
      clampAvatarPosition,
      onAvatarPositionChange,
    ],
  );

  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Редактор</p>
          <p className="text-xs text-gray-500">
            Соотношение сторон {aspectRatio}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  Array.from(files).forEach((file) => {
                    onAddMediaAsset(file);
                  });
                }
                // Сброс input для возможности повторной загрузки того же файла
                if (e.target) {
                  e.target.value = "";
                }
              }}
            />
            <div className="relative">
              <button
                ref={mediaButtonRef}
                type="button"
                onClick={() => {
                  if (mediaCloseTimeoutRef.current) {
                    clearTimeout(mediaCloseTimeoutRef.current);
                    mediaCloseTimeoutRef.current = null;
                  }
                  setIsMediaPanelOpen(!isMediaPanelOpen);
                }}
                onMouseEnter={handleMediaMouseEnter}
                onMouseLeave={handleMediaMouseLeave}
                className="flex h-9 min-w-[100px] items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 text-xs font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                <span className="text-base leading-none">＋</span> Медиа
              </button>
              {isMediaPanelOpen && (
                <div
                  ref={mediaPanelRef}
                  onMouseEnter={handleMediaMouseEnter}
                  onMouseLeave={handleMediaMouseLeave}
                  className="absolute right-0 top-full z-50 mt-2 w-[416px] rounded-xl border border-gray-200 bg-white shadow-lg"
                >
                  <div className="p-4">
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Медиа</h2>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setIsMediaPanelOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-3 transition hover:border-gray-400 hover:bg-gray-50"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <span className="text-xl">＋</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900">Добавить медиа</p>
                          <p className="text-xs text-gray-500">Загрузить изображение</p>
                        </div>
                      </button>
                      {mediaAssets.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-500">
                          Нет добавленных медиа
                        </p>
                      ) : (
                        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                          {mediaAssets.map((asset, index) => {
                            const usageCount = mediaUsageOnScene[asset.id] ?? 0;
                            return (
                              <div
                                key={asset.id}
                                draggable
                                onDragStart={(e) => {
                                  setDraggedMediaAssetId(asset.id);
                                  e.dataTransfer.effectAllowed = "copy";
                                  e.dataTransfer.setData("text/plain", asset.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedMediaAssetId(null);
                                  setIsDraggingOverCanvas(false);
                                }}
                                className="flex items-center gap-3 rounded-xl border-2 border-gray-200 p-3 transition hover:border-gray-300 cursor-move"
                              >
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">
                                  {index + 1}
                                </div>
                                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                  {asset.imageUrl ? (
                                    <img
                                      src={asset.imageUrl}
                                      alt={asset.label}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                                      📄
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{asset.label}</p>
                                  {usageCount > 0 ? (
                                    <p className="text-xs text-gray-500">
                                      На слайде: {usageCount}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500">Не используется</p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    draggable={false}
                                    onDragStart={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      onUseMediaAsset(asset.id);
                                      setIsMediaPanelOpen(false);
                                    }}
                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 border border-gray-200 hover:bg-gray-50 transition"
                                  >
                                    На слайд
                                  </button>
                                  <button
                                    type="button"
                                    draggable={false}
                                    onDragStart={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      onRemoveMediaAsset(asset.id);
                                    }}
                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                    aria-label="Удалить медиа из библиотеки"
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
          <div className="flex items-center gap-2">
          <div className="relative">
            <button
              ref={layersButtonRef}
              type="button"
              onClick={() => {
                if (layersCloseTimeoutRef.current) {
                  clearTimeout(layersCloseTimeoutRef.current);
                  layersCloseTimeoutRef.current = null;
                }
                setIsLayersPanelOpen(!isLayersPanelOpen);
              }}
              onMouseEnter={handleLayersMouseEnter}
              onMouseLeave={handleLayersMouseLeave}
              className="flex h-9 min-w-[100px] items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 text-xs font-semibold text-gray-900 transition hover:bg-gray-50"
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4 flex-shrink-0"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Слои
          </button>
          {isLayersPanelOpen && (
            <div
              onMouseEnter={handleLayersMouseEnter}
              onMouseLeave={handleLayersMouseLeave}
            >
              <LayersPanel
                isOpen={isLayersPanelOpen}
                onClose={() => setIsLayersPanelOpen(false)}
                elements={elements}
                avatar={avatar}
                avatarZIndex={avatarZIndex}
                avatarLocked={avatarLocked}
                onReorderLayers={onReorderLayers}
                onToggleAvatarLock={onToggleAvatarLock}
                panelRef={layersPanelRef}
              />
            </div>
              )}
            </div>
            {onAlignAvatars && (
              <button
                type="button"
                onClick={onAlignAvatars}
                className="flex h-9 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-4 text-xs font-semibold text-gray-900 transition hover:bg-gray-50"
                title="Выровнять аватар по первому слайду"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                Выровнять аватар
              </button>
          )}
        </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full w-full items-center justify-center p-2">
          <div
            ref={canvasRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedMediaAssetId) {
                setIsDraggingOverCanvas(true);
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDragLeave={(e) => {
              // Проверяем, что мы действительно покинули канву, а не перешли на дочерний элемент
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                const x = e.clientX;
                const y = e.clientY;
                if (
                  x < rect.left ||
                  x > rect.right ||
                  y < rect.top ||
                  y > rect.bottom
                ) {
                  setIsDraggingOverCanvas(false);
                }
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOverCanvas(false);
              
              if (!draggedMediaAssetId || !onUseMediaAssetAtPosition) return;
              
              const canvas = canvasRef.current;
              if (!canvas) return;
              
              const rect = canvas.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              
              // Конвертируем координаты экрана в координаты канвы
              const canvasX = screenToCanvas(x, "width");
              const canvasY = screenToCanvas(y, "height");
              
              onUseMediaAssetAtPosition(draggedMediaAssetId, canvasX, canvasY);
              setDraggedMediaAssetId(null);
            }}
            className={`relative overflow-visible rounded-2xl bg-white border-2 border-dashed transition ${
              isDraggingOverCanvas ? "border-blue-400 bg-blue-50" : "border-gray-300"
            }`}
            style={{ 
              aspectRatio: aspectRatio === "16:9" ? "16 / 9" : "9 / 16",
              width: aspectRatio === "16:9" ? "100%" : "auto",
              height: aspectRatio === "9:16" ? "100%" : "auto",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            {/* Направляющие линии при привязке */}
            {snapPoint && (
              <>
                {/* Вертикальная линия - показываем только если есть привязка по X */}
                {snapPoint.x !== null && (
                  <div
                    className="absolute z-40 pointer-events-none"
                    style={{
                      left: `${(snapPoint.x / canvasSize.width) * 100}%`,
                      top: 0,
                      width: '1px',
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      opacity: 0.5,
                    }}
                  />
                )}
                {/* Горизонтальная линия - показываем только если есть привязка по Y */}
                {snapPoint.y !== null && (
                  <div
                    className="absolute z-40 pointer-events-none"
                    style={{
                      left: 0,
                      top: `${(snapPoint.y / canvasSize.height) * 100}%`,
                      width: '100%',
                      height: '1px',
                      backgroundColor: '#3b82f6',
                      opacity: 0.5,
                    }}
                  />
                )}
              </>
            )}

            {/* Отображаем все элементы отсортированные по zIndex (меньший zIndex = ниже, больший = выше) */}
            {[
              ...elements.map((el) => ({ type: "element" as const, data: el, zIndex: el.zIndex ?? 0 })),
              ...(avatar ? [{ type: "avatar" as const, data: avatar, zIndex: avatarZIndex ?? 9999 }] : []),
            ]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((item) => {
                if (item.type === "avatar") {
                  return (
                    <AvatarCanvas
                      key="avatar"
                      avatar={item.data}
                      position={avatarPosition}
                      size={avatarSize}
                      canvasSize={canvasSize}
                      sizeOverlay={avatarSizeOverlay}
                      positionOverlay={avatarDragOverlay}
                      onRemove={onRemoveAvatar}
                      onPointerDown={handleAvatarPointerDown}
                      onResizeStart={handleAvatarResizeStart}
                    />
                  );
                }

                const element = item.data;
                if (element.imageUrl) {
                  return (
                    <MediaCanvasWrapper
                      key={element.id}
                      element={element}
                      canvasSize={canvasSize}
                      onRemove={() => onRemoveElement(element.id)}
                      onPointerDown={(event) => handlePointerDown(event, element)}
                      onResizeStart={() => {}}
                      screenToCanvas={screenToCanvas}
                      onElementSizeChange={onElementSizeChange}
                      positionOverlay={
                        dragOverlay && dragOverlay.id === element.id
                          ? { x: dragOverlay.x, y: dragOverlay.y }
                          : null
                      }
                    />
                  );
                }

                // Плейсхолдер для элементов без изображения
                const leftPercent = (element.x / canvasSize.width) * 100;
                const topPercent = (element.y / canvasSize.height) * 100;
                const widthPercent = (element.width / canvasSize.width) * 100;
                const heightPercent = (element.height / canvasSize.height) * 100;

                return (
                  <div
                    key={element.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(event) => handlePointerDown(event, element)}
                    className="absolute cursor-grab rounded-2xl border-2 border-gray-300 bg-white text-center text-xs font-semibold text-gray-900 shadow-md transition hover:border-gray-900 active:cursor-grabbing overflow-hidden"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      transform: "translate(-50%, -50%)",
                      background: "#f3f4f6",
                    }}
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center px-2">
                      <span className="text-sm text-gray-900">{element.label}</span>
                      <span className="text-[10px] text-gray-500">Медиа</span>
                    </div>
                  </div>
                );
              })}

            {/* Индикатор загрузки медиа */}
            {isUploadingMedia && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                  <CosmoLoader ariaLabel="Загрузка медиа файла..." />
                  <p className="text-sm font-medium text-gray-700">Загрузка медиа файла...</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

