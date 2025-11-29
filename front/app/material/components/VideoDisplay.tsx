"use client";

import { useState, useRef, useEffect } from "react";
import { EditVideoModal } from "./EditVideoModal";
import { DeleteVideoModal } from "./DeleteVideoModal";

interface VideoDisplayProps {
  videoTitle: string;
  videoUrl: string;
  videoId: string;
  userId: string;
  onDeleted?: () => void | Promise<void>;
  onUpdated?: () => void | Promise<void>;
}

export function VideoDisplay({ 
  videoTitle, 
  videoUrl, 
  videoId,
  userId,
  onDeleted,
  onUpdated,
}: VideoDisplayProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const closeMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Убираем UUID из названия для отображения
  const displayTitle = videoTitle.split("_").slice(0, -1).join("_") || videoTitle;

  // Закрываем меню при клике вне его (только если модальное окно не открыто)
  useEffect(() => {
    if (isEditModalOpen) return;

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
  }, [openMenuId, isEditModalOpen]);

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (closeMenuTimeoutRef.current) {
        clearTimeout(closeMenuTimeoutRef.current);
      }
    };
  }, []);

  const handleMenuClick = (key: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === key ? null : key);
  };

  const handleEditClick = () => {
    setOpenMenuId(null);
    setHoveredCardId(null);
    // Очищаем таймер закрытия меню
    if (closeMenuTimeoutRef.current) {
      clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
    // Небольшая задержка перед открытием модального окна, чтобы меню успело закрыться
    setTimeout(() => {
      setIsEditModalOpen(true);
    }, 100);
  };

  const handleEditConfirm = async (newTitle: string) => {
    if (!newTitle.trim()) {
      return;
    }

    try {
      setIsEditing(true);
      const { UpdateVideoTitle } = await import("../servers/UpdateVideoTitle");
      const result = await UpdateVideoTitle({
        uid: userId,
        oldVideoTitle: videoTitle,
        newVideoTitle: newTitle.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || "Не удалось обновить название");
      }

      setIsEditModalOpen(false);
      await onUpdated?.();
    } catch (error) {
      console.error("[VideoDisplay] Ошибка редактирования:", error);
      alert(
        `Ошибка при редактировании: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
  };

  const handleDeleteClick = () => {
    setOpenMenuId(null);
    setHoveredCardId(null);
    // Очищаем таймер закрытия меню
    if (closeMenuTimeoutRef.current) {
      clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
    // Небольшая задержка перед открытием модального окна
    setTimeout(() => {
      setIsDeleteModalOpen(true);
    }, 100);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      const { DeleteVideo } = await import("../servers/DeleteVideo");
      const result = await DeleteVideo(userId, videoTitle, videoUrl);

      if (!result.success) {
        throw new Error(result.error || "Не удалось удалить видео");
      }

      setIsDeleteModalOpen(false);
      await onDeleted?.();
    } catch (error) {
      console.error("[VideoDisplay] Ошибка удаления:", error);
      alert(
        `Ошибка при удалении: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  const isHovered = hoveredCardId === videoId && !isEditModalOpen && !isDeleteModalOpen;
  const showMenuButton = (isHovered || openMenuId === videoId) && !isEditModalOpen && !isDeleteModalOpen;

  return (
    <div 
      className={`group relative rounded-3xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-black/5 transition-all duration-300 ${
        isEditModalOpen || isDeleteModalOpen ? "" : "hover:-translate-y-2 hover:shadow-lg"
      }`}
      onMouseLeave={!isEditModalOpen && !isDeleteModalOpen ? () => {
        setHoveredCardId(null);
        // Закрываем меню через 1 секунду после ухода курсора
        if (closeMenuTimeoutRef.current) {
          clearTimeout(closeMenuTimeoutRef.current);
        }
        closeMenuTimeoutRef.current = setTimeout(() => {
          if (openMenuId === videoId && !isEditModalOpen) {
            setOpenMenuId(null);
          }
        }, 500);
      } : undefined}
      onMouseEnter={!isEditModalOpen && !isDeleteModalOpen ? () => {
        setHoveredCardId(videoId);
        // Отменяем закрытие меню если курсор вернулся
        if (closeMenuTimeoutRef.current) {
          clearTimeout(closeMenuTimeoutRef.current);
          closeMenuTimeoutRef.current = null;
        }
      } : undefined}
    >
      <div className="mb-4 relative">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-10">
          {displayTitle}
        </h3>
        {/* Три точки меню */}
        <div className="absolute right-0 top-0 z-10">
          <button
            type="button"
            onClick={(e) => handleMenuClick(videoId, e)}
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-md transition-all duration-200 hover:bg-white hover:text-gray-900 ${
              showMenuButton ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Меню"
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
          {/* Выпадающее меню */}
          {openMenuId === videoId && (
            <div
              ref={(el) => {
                menuRefs.current[videoId] = el;
              }}
              className="absolute right-0 top-10 z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              <button
                type="button"
                onClick={handleEditClick}
                disabled={isEditing}
                className="w-full rounded-t-lg px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isEditing || isDeleting}
                className="w-full rounded-b-lg px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100">
        <video
          src={videoUrl}
          controls
          className="h-full w-full object-contain"
        />
      </div>
      <EditVideoModal
        isOpen={isEditModalOpen}
        onClose={handleEditCancel}
        onConfirm={handleEditConfirm}
        currentTitle={displayTitle}
        isSaving={isEditing}
      />
      <DeleteVideoModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        videoTitle={displayTitle}
        isDeleting={isDeleting}
      />
    </div>
  );
}


