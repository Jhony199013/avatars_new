import type { ReactNode } from "react";
import Image from "next/image";

type EmptyStateProps = {
  title?: string;
  description?: string;
  imageSrc?: string;
  children?: ReactNode;
};

const defaultTitleText = "Ничего нет…";
const defaultDescriptionText = "Будто в открытом космосе...";
const defaultImageSrc = "/Cosmo.png";

export function EmptyState({
  title = defaultTitleText,
  description = defaultDescriptionText,
  imageSrc = defaultImageSrc,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex w-full max-w-[1350px] min-h-[350px] flex-col items-center gap-6 rounded-3xl px-16 pt-6 pb-10 text-center">
      <div className="relative h-48 w-48 max-w-full">
        <Image
          src={imageSrc}
          alt={title || defaultTitleText}
          fill
          sizes="(max-width: 768px) 60vw, 224px"
          className="object-contain drop-shadow-xl"
          priority
        />
      </div>
      {(title || description) && (
      <div className="space-y-2">
          {title && <p className="text-2xl font-semibold text-gray-900">{title}</p>}
          {description && <p className="text-gray-600">{description}</p>}
      </div>
      )}
      {children}
    </div>
  );
}

