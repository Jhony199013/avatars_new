import { useEffect, useState } from "react";

/**
 * Хук для определения соотношения сторон изображения в рантайме
 * @param imageSrc - URL изображения
 * @returns Соотношение сторон (width / height) или null, если еще не загружено
 */
export function useImageAspectRatio(imageSrc: string | null): number | null {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!imageSrc) {
      setAspectRatio(null);
      return;
    }

    const img = new Image();
    
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectRatio(ratio);
    };

    img.onerror = () => {
      setAspectRatio(null);
    };

    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc]);

  return aspectRatio;
}

