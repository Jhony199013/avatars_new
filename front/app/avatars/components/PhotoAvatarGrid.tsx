"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import type { PhotoAvatarRow } from "../servers/UploadAvatar";
import { DeletePhotoAvatar } from "../servers/DeletePhotoAvatar";
import { UpdateAvatarName } from "../servers/UpdateAvatarName";
import { DeleteAvatarModal } from "./DeleteAvatarModal";
import { EditAvatarModal } from "./EditAvatarModal";

interface PhotoAvatarGridProps {
  avatars: PhotoAvatarRow[];
  currentUserId?: string | null;
  onAvatarDeleted?: () => void | Promise<void>;
}

export function PhotoAvatarGrid({
  avatars,
  currentUserId,
  onAvatarDeleted,
}: PhotoAvatarGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [avatarToDelete, setAvatarToDelete] = useState<{
    avatar: PhotoAvatarRow;
    key: string;
  } | null>(null);
  const [avatarToEdit, setAvatarToEdit] = useState<{
    avatar: PhotoAvatarRow;
    key: string;
  } | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const closeMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Закрываем меню при клике вне его
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

  const handleEditClick = (avatar: PhotoAvatarRow, key: string) => {
    setOpenMenuId(null);
    setAvatarToEdit({ avatar, key });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (avatar: PhotoAvatarRow, key: string) => {
    setOpenMenuId(null);
    if (!currentUserId) {
      alert("Не удалось определить пользователя");
      return;
    }
    setAvatarToDelete({ avatar, key });
    setIsDeleteModalOpen(true);
  };

  const handleEditConfirm = async (newName: string) => {
    if (!avatarToEdit || !currentUserId || !avatarToEdit.avatar.id) {
      return;
    }

    const { avatar, key } = avatarToEdit;
    
    // Проверяем наличие id после деструктуризации
    if (!avatar.id) {
      return;
    }

    try {
      setEditingId(key);
      const result = await UpdateAvatarName({
        uid: currentUserId,
        recordId: avatar.id,
        newName,
      });

      if (!result.success) {
        throw new Error(result.error || "Не удалось обновить имя");
      }

      setIsEditModalOpen(false);
      setAvatarToEdit(null);
      await onAvatarDeleted?.();
    } catch (error) {
      console.error("[avatars] Ошибка редактирования:", error);
      alert(
        `Ошибка при редактировании: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!avatarToDelete || !currentUserId) {
      return;
    }

    const { avatar, key } = avatarToDelete;

    try {
      setDeletingId(key);
      const result = await DeletePhotoAvatar({
        uid: currentUserId,
        recordId: avatar.id ?? null,
        groupId: avatar.group_id ?? avatar.hey_gen_id ?? null,
        imageKey: avatar.image_key,
      });

      if (!result.success) {
        throw new Error(result.error || "Не удалось удалить аватар");
      }

      setIsDeleteModalOpen(false);
      setAvatarToDelete(null);
      await onAvatarDeleted?.();
    } catch (error) {
      console.error("[avatars] Ошибка удаления:", error);
      alert(
        `Ошибка при удалении: ${
          error instanceof Error ? error.message : "Неизвестная ошибка"
        }`
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setAvatarToDelete(null);
  };

  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setAvatarToEdit(null);
  };

  return (
    <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {avatars.map((avatar) => {
        const key =
          avatar.id ??
          avatar.hey_gen_id ??
          avatar.group_id ??
          `${avatar.uid}-${avatar.image_key}`;

        const isHovered = hoveredCardId === key;
        const showMenuButton = isHovered || openMenuId === key;

        return (
          <article
            key={key}
            className="group relative rounded-3xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg"
            onMouseLeave={() => {
              setHoveredCardId(null);
              // Закрываем меню через 1 секунду после ухода курсора
              if (closeMenuTimeoutRef.current) {
                clearTimeout(closeMenuTimeoutRef.current);
              }
              closeMenuTimeoutRef.current = setTimeout(() => {
                if (openMenuId === key) {
                  setOpenMenuId(null);
                }
              }, 500);
            }}
            onMouseEnter={() => {
              setHoveredCardId(key);
              // Отменяем закрытие меню если курсор вернулся
              if (closeMenuTimeoutRef.current) {
                clearTimeout(closeMenuTimeoutRef.current);
                closeMenuTimeoutRef.current = null;
              }
            }}
          >
            <p className="mb-3 text-center text-xl font-semibold text-gray-900">
              {avatar.name}
            </p>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
              <Image
                src={avatar.photo}
                alt={`Фото аватара ${avatar.name}`}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-contain"
                unoptimized
              />
              {/* Три точки меню */}
              <div className="absolute right-3 top-3">
              <button
                type="button"
                  onClick={(e) => handleMenuClick(key, e)}
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
                {openMenuId === key && (
                  <div
                    ref={(el) => {
                      menuRefs.current[key] = el;
                    }}
                    className="absolute right-0 top-10 z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => handleEditClick(avatar, key)}
                      disabled={editingId === key || deletingId === key}
                      className="w-full rounded-t-lg px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(avatar, key)}
                      disabled={editingId === key || deletingId === key}
                      className="w-full rounded-b-lg px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
            {avatar.created_at && (
              <p className="mt-3 text-center text-xs text-gray-400">
                {new Intl.DateTimeFormat("ru-RU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(avatar.created_at))}
              </p>
            )}
          </article>
        );
      })}
      <DeleteAvatarModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        avatarName={avatarToDelete?.avatar.name ?? ""}
        isDeleting={avatarToDelete !== null && deletingId === avatarToDelete.key}
      />
      <EditAvatarModal
        isOpen={isEditModalOpen}
        onClose={handleEditCancel}
        onConfirm={handleEditConfirm}
        currentName={avatarToEdit?.avatar.name ?? ""}
        isSaving={avatarToEdit !== null && editingId === avatarToEdit.key}
      />
    </div>
  );
}
