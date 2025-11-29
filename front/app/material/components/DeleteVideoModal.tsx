"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface DeleteVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  videoTitle: string;
  isDeleting?: boolean;
}

export function DeleteVideoModal({
  isOpen,
  onClose,
  onConfirm,
  videoTitle,
  isDeleting = false,
}: DeleteVideoModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseMove={(e) => {
        e.stopPropagation();
      }}
    >
      <div 
        className="mx-4 w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Удаление видео
        </h2>
        <p className="mb-6 text-gray-600">
          Вы действительно хотите удалить видео «{videoTitle}»?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Удаляем..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}




