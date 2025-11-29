"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { VoiceCard } from "./VoiceCard";
import { VoiceDeleteModal } from "./VoiceDeleteModal";
import { VoiceEditModal, type VoiceEditFormValues } from "./VoiceEditModal";
import { DeleteVoice } from "../servers/DeleteVoice";
import { UpdateVoice } from "../servers/UpdateVoice";

interface VoiceRow {
  id?: string;
  uid: string;
  name: string;
  url: string;
  created_at?: string;
  description?: string | null;
}

interface VoiceGridProps {
  voices: VoiceRow[];
  currentUserId?: string | null;
  onVoicesChanged?: () => void | Promise<void>;
}

export function VoiceGrid({
  voices,
  currentUserId,
  onVoicesChanged,
}: VoiceGridProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [voiceToDelete, setVoiceToDelete] = useState<{
    voice: VoiceRow;
    key: string;
  } | null>(null);
  const [voiceToEdit, setVoiceToEdit] = useState<{
    voice: VoiceRow;
    key: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const closeMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    return () => {
      if (closeMenuTimeoutRef.current) {
        clearTimeout(closeMenuTimeoutRef.current);
      }
    };
  }, []);

  if (voices.length === 0) {
    return null;
  }

  const validVoices = voices.filter((voice) => voice.url && voice.name);

  if (validVoices.length === 0) {
    console.warn("[VoiceGrid] Нет валидных голосов для отображения");
    return null;
  }

  const handleMenuClick = (key: string, event: ReactMouseEvent) => {
    event.stopPropagation();
    setOpenMenuId((prev) => (prev === key ? null : key));
  };

  const handleDeleteClick = (voice: VoiceRow, key: string) => {
    if (!currentUserId) {
      alert("Не удалось определить пользователя");
      return;
    }
    if (!voice.id) {
      alert("Не удалось определить идентификатор голоса");
      return;
    }
    setOpenMenuId(null);
    setVoiceToDelete({ voice, key });
    setIsDeleteModalOpen(true);
  };

  const handleEditClick = (voice: VoiceRow, key: string) => {
    if (!currentUserId) {
      alert("Не удалось определить пользователя");
      return;
    }
    if (!voice.id) {
      alert("Не удалось определить идентификатор голоса");
      return;
    }
    setOpenMenuId(null);
    setVoiceToEdit({ voice, key });
    setIsEditModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!voiceToDelete || !currentUserId || !voiceToDelete.voice.id) {
      return;
    }

    try {
      setDeletingId(voiceToDelete.voice.id);
      const result = await DeleteVoice({
        uid: currentUserId,
        voiceId: voiceToDelete.voice.id,
      });

      if (!result.success) {
        throw new Error(result.error || "Не удалось удалить голос");
      }

      setIsDeleteModalOpen(false);
      setVoiceToDelete(null);
      await onVoicesChanged?.();
    } catch (error) {
      console.error("[voices] Ошибка удаления:", error);
      alert(
        `Ошибка при удалении: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditConfirm = async ({ name, description }: VoiceEditFormValues) => {
    if (!voiceToEdit || !currentUserId || !voiceToEdit.voice.id) {
      return;
    }

    try {
      setEditingId(voiceToEdit.voice.id);
      const result = await UpdateVoice({
        uid: currentUserId,
        voiceId: voiceToEdit.voice.id,
        name,
        description,
      });

      if (!result.success) {
        throw new Error(result.error || "Не удалось обновить голос");
      }

      setIsEditModalOpen(false);
      setVoiceToEdit(null);
      await onVoicesChanged?.();
    } catch (error) {
      console.error("[voices] Ошибка редактирования:", error);
      alert(
        `Ошибка при редактировании: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setVoiceToDelete(null);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setVoiceToEdit(null);
  };

  return (
    <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {validVoices.map((voice) => {
        const key = voice.id ?? `${voice.uid}-${voice.name}`;
        const isHovered = hoveredCardId === key;
        const showMenuButton = isHovered || openMenuId === key;
        const isProcessing =
          !!voice.id &&
          (voice.id === deletingId || voice.id === editingId);

        const menuSlot = (
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={(event) => handleMenuClick(key, event)}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-md transition-all duration-200 hover:bg-white hover:text-gray-900 ${
                showMenuButton ? "opacity-100" : "opacity-0"
              }`}
              aria-label="Меню"
              disabled={isProcessing}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                className="h-4 w-4"
              >
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {openMenuId === key && (
              <div
                ref={(el) => {
                  menuRefs.current[key] = el;
                }}
                className="absolute right-0 top-10 z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => handleEditClick(voice, key)}
                  disabled={
                    isProcessing ||
                    !voice.id ||
                    !currentUserId
                  }
                  className="w-full rounded-t-lg px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(voice, key)}
                  disabled={
                    isProcessing ||
                    !voice.id ||
                    !currentUserId
                  }
                  className="w-full rounded-b-lg px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>
        );

        return (
          <VoiceCard
            key={key}
            name={voice.name}
            url={voice.url}
            description={voice.description}
            menuSlot={menuSlot}
            onMouseEnter={() => {
              setHoveredCardId(key);
              if (closeMenuTimeoutRef.current) {
                clearTimeout(closeMenuTimeoutRef.current);
                closeMenuTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              setHoveredCardId((current) => (current === key ? null : current));
              if (closeMenuTimeoutRef.current) {
                clearTimeout(closeMenuTimeoutRef.current);
              }
              closeMenuTimeoutRef.current = setTimeout(() => {
                if (openMenuId === key) {
                  setOpenMenuId(null);
                }
              }, 500);
            }}
          />
        );
      })}
      <VoiceDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        voiceName={voiceToDelete?.voice.name ?? ""}
        isDeleting={
          voiceToDelete?.voice.id !== undefined &&
          voiceToDelete.voice.id === deletingId
        }
      />
      <VoiceEditModal
        isOpen={isEditModalOpen}
        onClose={handleEditCancel}
        onConfirm={handleEditConfirm}
        currentName={voiceToEdit?.voice.name ?? ""}
        currentDescription={voiceToEdit?.voice.description ?? ""}
        isSaving={
          voiceToEdit?.voice.id !== undefined &&
          voiceToEdit.voice.id === editingId
        }
      />
    </div>
  );
}
