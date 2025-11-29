"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useState,
} from "react";

export interface VoiceEditFormValues {
  name: string;
  description: string;
}

const MAX_DESCRIPTION_LENGTH = 100;

interface VoiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: VoiceEditFormValues) => void | Promise<void>;
  currentName: string;
  currentDescription: string;
  isSaving?: boolean;
}

export function VoiceEditModal({
  isOpen,
  onClose,
  onConfirm,
  currentName,
  currentDescription,
  isSaving = false,
}: VoiceEditModalProps) {
  const [formValues, setFormValues] = useState<VoiceEditFormValues>({
    name: currentName,
    description: currentDescription,
  });

  useEffect(() => {
    if (isOpen) {
      setFormValues({
        name: currentName,
        description: currentDescription,
      });
    }
  }, [isOpen, currentName, currentDescription]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (!formValues.name.trim()) {
      return;
    }

    await onConfirm({
      name: formValues.name.trim(),
      description: formValues.description.trim().slice(0, MAX_DESCRIPTION_LENGTH),
    });
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const isTextarea = event.currentTarget.tagName === "TEXTAREA";
    if (
      event.key === "Enter" &&
      !isTextarea &&
      !isSaving &&
      formValues.name.trim()
    ) {
      event.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Редактировать голос
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="voice-name"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Имя
            </label>
            <input
              id="voice-name"
              type="text"
              value={formValues.name}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, name: event.target.value }))
              }
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              placeholder="Введите новое имя"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 outline-none transition focus:border-gray-400 disabled:opacity-50"
              autoFocus
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="voice-description"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Описание
              </label>
              <span className={`text-xs ${
                formValues.description.length > MAX_DESCRIPTION_LENGTH 
                  ? "text-red-500" 
                  : "text-gray-400"
              }`}>
                {formValues.description.length}/{MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              id="voice-description"
              value={formValues.description}
              onChange={(event) => {
                const value = event.target.value;
                if (value.length <= MAX_DESCRIPTION_LENGTH) {
                  setFormValues((prev) => ({
                    ...prev,
                    description: value,
                  }));
                }
              }}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              placeholder="Добавьте описание голоса"
              className="h-28 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base text-gray-900 outline-none transition focus:border-gray-400 disabled:opacity-50"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
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
            disabled={isSaving || !formValues.name.trim()}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}


