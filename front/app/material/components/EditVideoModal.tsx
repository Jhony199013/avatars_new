"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newTitle: string) => void | Promise<void>;
  currentTitle: string;
  isSaving?: boolean;
}

export function EditVideoModal({
  isOpen,
  onClose,
  onConfirm,
  currentTitle,
  isSaving = false,
}: EditVideoModalProps) {
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setNewTitle(currentTitle);
    }
  }, [isOpen, currentTitle]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = async () => {
    if (!newTitle.trim()) {
      return;
    }
    await onConfirm(newTitle.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSaving && newTitle.trim()) {
      handleConfirm();
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        // Предотвращаем всплытие событий мыши к карточке
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseMove={(e) => {
        // Предотвращаем всплытие событий мыши к карточке
        e.stopPropagation();
      }}
    >
      <div 
        className="mx-4 w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Редактировать название
        </h2>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          placeholder="Введите новое название"
          className="mb-6 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-base text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || !newTitle.trim()}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            {isSaving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

