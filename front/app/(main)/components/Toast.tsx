"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "error" | "success";
}

export function Toast({
  message,
  isVisible,
  onClose,
  type = "error",
}: ToastProps) {
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [isVisible, onClose]);

  if (!isVisible || !message) {
    return null;
  }

  const baseStyles =
    "fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-slide-in-right";
  const typeStyles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-green-200 bg-green-50 text-green-800";

  return (
    <div className={`${baseStyles} ${typeStyles}`}>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 transition hover:text-gray-600"
        aria-label="Закрыть уведомление"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

