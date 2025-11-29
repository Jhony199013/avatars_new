"use client";

import { useEffect, useState } from "react";

interface EditAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void | Promise<void>;
  currentName: string;
  isSaving?: boolean;
}

export function EditAvatarModal({
  isOpen,
  onClose,
  onConfirm,
  currentName,
  isSaving = false,
}: EditAvatarModalProps) {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!newName.trim()) {
      return;
    }
    await onConfirm(newName.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSaving && newName.trim()) {
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Редактировать имя
        </h2>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          placeholder="Введите новое имя"
          className="mb-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 outline-none transition focus:border-gray-400 disabled:opacity-50"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || !newName.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

