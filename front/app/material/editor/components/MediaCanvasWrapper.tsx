"use client";

import { useCallback, useEffect, useState } from "react";
import type { CanvasElement } from "./types";
import { MediaCanvas } from "./MediaCanvas";
import { useImageAspectRatio } from "./useImageAspectRatio";

type MediaCanvasWrapperProps = {
  element: CanvasElement;
  canvasSize: { width: number; height: number };
  onRemove: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStart: (
    event: React.PointerEvent<HTMLDivElement>,
    corner: "top-left" | "top-right" | "bottom-left" | "bottom-right",
    imageAspectRatio: number,
  ) => void;
  screenToCanvas: (screenPx: number, dimension: "width" | "height") => number;
  onElementSizeChange: (elementId: string, size: { width: number; height: number }) => void;
  positionOverlay?: { x: number; y: number } | null;
};

export function MediaCanvasWrapper({
  element,
  canvasSize,
  onRemove,
  onPointerDown,
  onResizeStart,
  screenToCanvas,
  onElementSizeChange,
  positionOverlay,
}: MediaCanvasWrapperProps) {
  const imageAspectRatio = useImageAspectRatio(element.imageUrl ?? null);
  const [sizeOverlay, setSizeOverlay] = useState<{ width: number; height: number } | null>(null);

  // После загрузки пропорций гарантируем, что высота в состоянии соответствует фактической
  useEffect(() => {
    if (!imageAspectRatio) return;
    const expectedHeight = element.width / imageAspectRatio;
    const tolerance = 0.5; // избегаем бесконечных перерендеров из-за округлений
    if (Math.abs(expectedHeight - element.height) <= tolerance) return;
    onElementSizeChange(element.id, { width: element.width, height: expectedHeight });
  }, [imageAspectRatio, element.height, element.id, element.width, onElementSizeChange]);

  const handleResizeStart = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      corner: "top-left" | "top-right" | "bottom-left" | "bottom-right",
    ) => {
      if (!imageAspectRatio) return;
      
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const initialWidth = element.width;
      const initialHeight = initialWidth / imageAspectRatio;
      const initialX = element.x;
      const initialY = element.y;

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
        initialCornerX = centerX + halfWidth;
        initialCornerY = centerY + halfHeight;
      }

      const initialDistance = Math.sqrt(
        Math.pow(initialCornerX - centerX, 2) + Math.pow(initialCornerY - centerY, 2),
      );

      let rafId: number | null = null;

      setSizeOverlay({ width: element.width, height: initialHeight });

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
          const deltaXScreen = moveEvent.clientX - startX;
          const deltaYScreen = moveEvent.clientY - startY;

          const deltaX = screenToCanvas(deltaXScreen, "width");
          const deltaY = screenToCanvas(deltaYScreen, "height");

          const newCornerX = initialCornerX + deltaX;
          const newCornerY = initialCornerY + deltaY;

          const newDistance = Math.sqrt(
            Math.pow(newCornerX - centerX, 2) + Math.pow(newCornerY - centerY, 2),
          );

          const scale = newDistance / initialDistance;
          
          let newWidth = initialWidth * scale;
          let newHeight = newWidth / imageAspectRatio;

          const minSizePx = Math.min(canvasSize.width, canvasSize.height) * 0.05;
          const maxWidthPx = canvasSize.width; // Максимальная ширина = 100% ширины канвы
          const maxHeightPx = canvasSize.height; // Максимальная высота = 100% высоты канвы
          
          if (newWidth > maxWidthPx) {
            newWidth = maxWidthPx;
            newHeight = newWidth / imageAspectRatio;
          }
          if (newWidth < minSizePx) {
            newWidth = minSizePx;
            newHeight = newWidth / imageAspectRatio;
          }
          
          if (newHeight > maxHeightPx) {
            newHeight = maxHeightPx;
            newWidth = newHeight * imageAspectRatio;
          }
          if (newHeight < minSizePx) {
            newHeight = minSizePx;
            newWidth = newHeight * imageAspectRatio;
          }

          setSizeOverlay({ width: newWidth, height: newHeight });
          onElementSizeChange(element.id, { width: newWidth, height: newHeight });
          rafId = null;
        });
      };

      const handlePointerUp = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setSizeOverlay(null);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [element, imageAspectRatio, screenToCanvas, canvasSize, onElementSizeChange],
  );

  if (!imageAspectRatio) {
    return null;
  }

  return (
    <MediaCanvas
      element={element}
      canvasSize={canvasSize}
      sizeOverlay={sizeOverlay}
      positionOverlay={positionOverlay}
      onRemove={onRemove}
      onPointerDown={onPointerDown}
      onResizeStart={handleResizeStart}
    />
  );
}

