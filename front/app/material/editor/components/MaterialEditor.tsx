"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

import { EditorSidebar } from "./EditorSidebar";
import { Timeline } from "./Timeline";
import { CanvasArea } from "./CanvasArea";
import { CreateVideoTemp, CreateVideo } from "../servers/CreateVideoRecord";
import { UploadMedia } from "../servers/UploadMedia";
import { DeleteMedia } from "../servers/DeleteMedia";
import { generateUUID } from "@/lib/uuid";
import type {
  AspectRatio,
  AvatarOption,
  Scene,
  VoiceOption,
  CanvasElement,
  MediaAsset,
} from "./types";

const createScene = (index: number): Scene => ({
  id: generateUUID(),
  title: `Слайд ${index}`,
  script: "",
  avatarId: null,
  voiceId: null,
  elements: [],
});

export function MaterialEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialScenes = useMemo(() => [createScene(1)], []);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [videoTitle, setVideoTitle] = useState("Новое видео");
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState<string>(
    initialScenes[0].id,
  );
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [initialParamsApplied, setInitialParamsApplied] = useState(false);
  const [videoCount, setVideoCount] = useState<number | null>(null);

  // Функция для обновления списка аватаров
  const refreshAvatars = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("photo_avatars")
      .select("*")
      .eq("uid", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MaterialEditor] Ошибка загрузки аватаров:", error);
    } else {
      setAvatars(
        (data ?? []).map((avatar) => ({
          id: avatar.id ?? "",
          name: avatar.name,
          photo: avatar.photo,
          image_key: avatar.image_key,
          hey_gen_id: avatar.hey_gen_id,
          group_id: avatar.group_id,
        })),
      );
    }
  };

  // Функция для обновления списка голосов
  const refreshVoices = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("voices")
      .select("*")
      .eq("uid", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MaterialEditor] Ошибка загрузки голосов:", error);
    } else {
      setVoices(
        (data ?? [])
          .filter((voice) => voice.url && voice.name)
          .map((voice) => ({
            id: voice.id ?? "",
            name: voice.name,
            url: voice.url,
            description: voice.description,
            voice_id: voice.voice_id ?? null,
          })),
      );
    }
  };

  const activeScene = scenes.find((scene) => scene.id === activeSceneId);

  useEffect(() => {
    const fetchAvatars = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("photo_avatars")
        .select("*")
        .eq("uid", user.id)
        .eq("status", "done")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[MaterialEditor] Ошибка загрузки аватаров:", error);
      } else {
        setAvatars(
          (data ?? []).map((avatar) => ({
            id: avatar.id ?? "",
            name: avatar.name,
            photo: avatar.photo,
            image_key: avatar.image_key,
            hey_gen_id: avatar.hey_gen_id,
            group_id: avatar.group_id,
          })),
        );
      }
      setIsLoadingAvatars(false);
    };

    fetchAvatars();
  }, []);

  useEffect(() => {
    const fetchVoices = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("voices")
        .select("*")
        .eq("uid", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[MaterialEditor] Ошибка загрузки голосов:", error);
      } else {
        setVoices(
          (data ?? [])
            .filter((voice) => voice.url && voice.name)
            .map((voice) => ({
              id: voice.id ?? "",
              name: voice.name,
              url: voice.url,
              description: voice.description,
              voice_id: voice.voice_id ?? null,
            })),
        );
      }
      setIsLoadingVoices(false);
    };

    fetchVoices();
  }, []);

  // Загружаем количество видео для проверки лимита
  useEffect(() => {
    const fetchVideoCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("videos")
        .select("id")
        .eq("uid", user.id);

      if (error) {
        console.error("[MaterialEditor] Ошибка загрузки количества видео:", error);
      } else {
        setVideoCount(data?.length ?? 0);
      }
    };

    fetchVideoCount();
  }, []);

  // Применяем параметры из URL после загрузки аватаров и голосов
  useEffect(() => {
    if (
      !isLoadingAvatars &&
      !isLoadingVoices &&
      !initialParamsApplied &&
      avatars.length > 0 &&
      voices.length > 0
    ) {
      const avatarId = searchParams.get("avatarId");
      const voiceId = searchParams.get("voiceId");

      if (avatarId || voiceId) {
        setScenes((prev) => {
          const firstScene = prev[0];
          if (!firstScene) return prev;

          const updatedScene: Scene = {
            ...firstScene,
            avatarId: avatarId && avatars.some((a) => a.id === avatarId) ? avatarId : firstScene.avatarId,
            voiceId: voiceId && voices.some((v) => v.id === voiceId) ? voiceId : firstScene.voiceId,
          };

          return [updatedScene, ...prev.slice(1)];
        });
        setInitialParamsApplied(true);
      } else {
        setInitialParamsApplied(true);
      }
    }
  }, [
    isLoadingAvatars,
    isLoadingVoices,
    initialParamsApplied,
    avatars,
    voices,
    searchParams,
  ]);

  const handleSceneUpdate = (sceneId: string, updater: (scene: Scene) => Scene) =>
    setScenes((prev) =>
      prev.map((scene) => (scene.id === sceneId ? updater(scene) : scene)),
    );

  // Константы размеров канвы в пикселях
  const CANVAS_SIZES: Record<AspectRatio, { width: number; height: number }> = {
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
  };

  // Рассчитывает начальный размер аватара в пикселях (35% от высоты канвы)
  const getInitialAvatarSize = (ratio: AspectRatio): { width: number; height: number } => {
    const canvasSize = CANVAS_SIZES[ratio];
    
    // Высота аватара = 35% от высоты канвы в пикселях
    const avatarHeightPercent = 0.35;
    const height = canvasSize.height * avatarHeightPercent;
    
    // Типичное соотношение сторон аватара (ширина к высоте)
    const avatarAspectRatio = 3 / 4;
    
    // Ширина рассчитывается на основе соотношения сторон аватара
    const width = height * avatarAspectRatio;
    
    return { width, height };
  };

  // Конвертирует координаты из одного соотношения сторон в другое
  const convertCoordinates = (
    coords: { x: number; y: number },
    fromRatio: AspectRatio,
    toRatio: AspectRatio,
  ): { x: number; y: number } => {
    if (fromRatio === toRatio) return coords;

    const fromSize = CANVAS_SIZES[fromRatio];
    const toSize = CANVAS_SIZES[toRatio];

    // Конвертируем в проценты относительно исходной канвы
    const xPercent = coords.x / fromSize.width;
    const yPercent = coords.y / fromSize.height;

    // Применяем проценты к новой канве
    return {
      x: xPercent * toSize.width,
      y: yPercent * toSize.height,
    };
  };

  // Конвертирует размеры из одного соотношения сторон в другое
  const convertSize = (
    size: { width: number; height: number },
    fromRatio: AspectRatio,
    toRatio: AspectRatio,
  ): { width: number; height: number } => {
    if (fromRatio === toRatio) return size;

    const fromSize = CANVAS_SIZES[fromRatio];
    const toSize = CANVAS_SIZES[toRatio];

    // Конвертируем в проценты относительно исходной канвы
    const widthPercent = size.width / fromSize.width;
    const heightPercent = size.height / fromSize.height;

    // Применяем проценты к новой канве
    return {
      width: widthPercent * toSize.width,
      height: heightPercent * toSize.height,
    };
  };

  const handleAddScene = (afterSceneId?: string) => {
    // Ограничение: максимум 3 слайда в демо-режиме
    if (scenes.length >= 3) {
      return;
    }
    
    const newSceneId = generateUUID();
    setScenes((prev) => {
      const newIndex = afterSceneId
        ? prev.findIndex((s) => s.id === afterSceneId) + 1
        : prev.length;
      // Берем данные из активного слайда для копирования настроек (кроме текста)
      const activeScene = prev.find((s) => s.id === activeSceneId);
      const previousScene = afterSceneId
        ? prev.find((s) => s.id === afterSceneId)
        : prev[prev.length - 1];
      
      const newScene: Scene = {
        id: newSceneId,
        title: `Слайд ${newIndex + 1}`,
        script: "", // Текст не переносится в новый слайд
        avatarId: activeScene?.avatarId ?? previousScene?.avatarId ?? null,
        voiceId: activeScene?.voiceId ?? previousScene?.voiceId ?? null,
        elements: [], // Медиа не переносится в новый слайд, только аватар
        avatarPosition: activeScene?.avatarPosition ?? previousScene?.avatarPosition,
        avatarSize: activeScene?.avatarSize ?? previousScene?.avatarSize,
        avatarZIndex: activeScene?.avatarZIndex ?? previousScene?.avatarZIndex,
      };
      
      if (afterSceneId) {
        const index = prev.findIndex((s) => s.id === afterSceneId);
        const updated = [...prev];
        updated.splice(index + 1, 0, newScene);
        return updated.map((scene, idx) => ({
          ...scene,
          title: `Слайд ${idx + 1}`,
        }));
      }
      
      return [...prev, newScene].map((scene, idx) => ({
        ...scene,
        title: `Слайд ${idx + 1}`,
      }));
    });
    
    setActiveSceneId(newSceneId);
  };

  const handleDeleteScene = (sceneId: string) => {
    setScenes((prev) => {
      const filtered = prev.filter((scene) => scene.id !== sceneId);
      if (filtered.length === 0) {
        const newScene = createScene(1);
        setActiveSceneId(newScene.id);
        return [newScene];
      }
      if (activeSceneId === sceneId) {
        const currentIndex = prev.findIndex((scene) => scene.id === sceneId);
        const newActiveIndex = Math.max(0, currentIndex - 1);
        setActiveSceneId(filtered[newActiveIndex]?.id ?? filtered[0].id);
      }
      return filtered.map((scene, index) => ({
        ...scene,
        title: `Слайд ${index + 1}`,
      }));
    });
  };

  const handleScriptChange = (value: string) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({ ...scene, script: value }));
  };

  const handleVoiceChange = (voiceId: string | null) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({ ...scene, voiceId }));
  };

  const handleAvatarChange = (avatarId: string | null) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => {
      if (avatarId && !scene.avatarPosition) {
        // При первом добавлении аватара устанавливаем начальную позицию и размер
        const initialSize = getInitialAvatarSize(aspectRatio);
        const canvasSize = CANVAS_SIZES[aspectRatio];
        // Аватар по умолчанию имеет большой zIndex (выше всех элементов)
        const maxZIndex = Math.max(...scene.elements.map((el) => el.zIndex ?? 0), 0);
        return {
          ...scene,
          avatarId,
          avatarPosition: { x: canvasSize.width / 2, y: canvasSize.height / 2 }, // центр канвы
          avatarSize: initialSize,
          avatarZIndex: maxZIndex + 1,
        };
      }
      return { ...scene, avatarId };
    });
  };

  const handleRemoveAvatar = () => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      avatarId: null,
      avatarPosition: undefined,
      avatarSize: undefined,
    }));
  };

  const handleAvatarPositionChange = (coords: { x: number; y: number }) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      avatarPosition: coords,
    }));
  };

  const handleAvatarSizeChange = (size: { width: number; height: number }) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      avatarSize: size,
    }));
  };

  const addAssetToScene = (sceneId: string, asset: MediaAsset) => {
    const canvasSize = CANVAS_SIZES[aspectRatio];
    handleSceneUpdate(sceneId, (scene) => {
      const mediaIndex = scene.elements.filter((element) => element.type === "media").length + 1;
      const elementWidth = canvasSize.width * 0.28;
      const elementHeight = canvasSize.height * 0.34;
      const maxElementZIndex = scene.elements.reduce((max, el) => Math.max(max, el.zIndex ?? 0), 0);
      const maxZIndex = Math.max(maxElementZIndex, scene.avatarZIndex ?? 0);

      const newElement: CanvasElement = {
        id: `media-${scene.id}-${mediaIndex}-${Date.now()}`,
        type: "media",
        label: asset.label,
        color: "#1fb6ff",
        width: elementWidth,
        height: elementHeight,
        x: canvasSize.width / 2,
        y: canvasSize.height / 2,
        imageUrl: asset.imageUrl,
        assetId: asset.id,
        zIndex: maxZIndex + 1,
      };

      return {
        ...scene,
        elements: [...scene.elements, newElement],
      };
    });
  };

  const handleAddMediaAsset = async (file: File) => {
    if (!activeScene) return;
    if (!file) return;
    if (isUploadingMedia) return; // Предотвращаем множественные загрузки

    setIsUploadingMedia(true);
    try {
      // Получаем UUID залогиненного пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        alert("Не удалось определить пользователя, авторизуйтесь повторно.");
        return;
      }

      // Загружаем файл на сервер
      const uploadResult = await UploadMedia(file, user.id);

      if (!uploadResult.success) {
        alert(`Ошибка загрузки файла: ${uploadResult.error}`);
        return;
      }

      // Создаем медиа ассет с URL из S3
      const newAsset: MediaAsset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: file.name || `Медиа ${mediaAssets.length + 1}`,
        imageUrl: uploadResult.url,
        s3Key: uploadResult.key, // Сохраняем S3 ключ для последующего удаления
        createdAt: Date.now(),
      };

      setMediaAssets((prev) => [...prev, newAsset]);
      addAssetToScene(activeScene.id, newAsset);
    } catch (error) {
      console.error("[MaterialEditor] Ошибка при добавлении медиа:", error);
      alert("Произошла ошибка при загрузке файла");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleAddExistingAssetToScene = (assetId: string) => {
    if (!activeScene) return;
    const asset = mediaAssets.find((item) => item.id === assetId);
    if (!asset) return;
    addAssetToScene(activeScene.id, asset);
  };

  const addAssetToSceneAtPosition = (sceneId: string, asset: MediaAsset, x: number, y: number) => {
    const canvasSize = CANVAS_SIZES[aspectRatio];
    handleSceneUpdate(sceneId, (scene) => {
      const mediaIndex = scene.elements.filter((element) => element.type === "media").length + 1;
      const elementWidth = canvasSize.width * 0.28;
      const elementHeight = canvasSize.height * 0.34;
      const maxElementZIndex = scene.elements.reduce((max, el) => Math.max(max, el.zIndex ?? 0), 0);
      const maxZIndex = Math.max(maxElementZIndex, scene.avatarZIndex ?? 0);

      const newElement: CanvasElement = {
        id: `media-${scene.id}-${mediaIndex}-${Date.now()}`,
        type: "media",
        label: asset.label,
        color: "#1fb6ff",
        width: elementWidth,
        height: elementHeight,
        x: Math.max(0, Math.min(canvasSize.width, x)),
        y: Math.max(0, Math.min(canvasSize.height, y)),
        imageUrl: asset.imageUrl,
        assetId: asset.id,
        zIndex: maxZIndex + 1,
      };

      return {
        ...scene,
        elements: [...scene.elements, newElement],
      };
    });
  };

  const handleRemoveMediaAsset = (assetId: string) => {
    // Находим ассет для удаления
    const assetToRemove = mediaAssets.find((asset) => asset.id === assetId);
    
    if (!assetToRemove) {
      return; // Ассет уже удален или не найден
    }

    // Сохраняем данные для удаления
    const s3KeyToDelete = assetToRemove.s3Key;
    const imageUrlToRevoke = assetToRemove.imageUrl;

    // Удаляем ассет из состояния сразу
    setMediaAssets((prev) => prev.filter((asset) => asset.id !== assetId));

    // Удаляем элементы из всех сцен сразу
    setScenes((prevScenes) =>
      prevScenes.map((scene) => ({
        ...scene,
        elements: scene.elements.filter((element) => element.assetId !== assetId),
      })),
    );

    // Удаляем blob URL если это локальный файл
    if (imageUrlToRevoke?.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrlToRevoke);
    }

    // Удаляем файл из S3 параллельно (без await)
    if (s3KeyToDelete) {
      DeleteMedia(s3KeyToDelete).catch((error) => {
        console.error("[MaterialEditor] Ошибка при удалении файла из S3:", error);
      });
    }
  };

  const handleElementPositionChange = (elementId: string, coords: { x: number; y: number }) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      elements: scene.elements.map((element) =>
        element.id === elementId ? { ...element, ...coords } : element,
      ),
    }));
  };

  const handleElementSizeChange = (elementId: string, size: { width: number; height: number }) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      elements: scene.elements.map((element) =>
        element.id === elementId ? { ...element, ...size } : element,
      ),
    }));
  };

  const handleRemoveElement = (elementId: string) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      elements: scene.elements.filter((element) => element.id !== elementId),
    }));
  };

  const handleReorderLayers = (newOrder: string[]) => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => {
      // Первый в списке (index 0) = больший zIndex = выше на канве
      // Обновляем zIndex для всех элементов и аватара
      const updatedElements = scene.elements.map((element) => {
        const index = newOrder.indexOf(element.id);
        // Первый элемент (index 0) получает zIndex = newOrder.length, последний получает 1
        const zIndex = index !== -1 ? newOrder.length - index : element.zIndex ?? 0;
        return {
          ...element,
          zIndex,
        };
      });
      
      // Обновляем zIndex для аватара
      const avatarIndex = newOrder.indexOf("avatar");
      const avatarZIndex = avatarIndex !== -1 ? newOrder.length - avatarIndex : scene.avatarZIndex ?? 9999;
      
      return {
        ...scene,
        elements: updatedElements,
        avatarZIndex,
      };
    });
  };

  const handleToggleAvatarLock = () => {
    if (!activeScene) return;
    handleSceneUpdate(activeScene.id, (scene) => ({
      ...scene,
      avatarLocked: !scene.avatarLocked,
    }));
  };

  // Функция для выравнивания аватаров по первому слайду
  const handleAlignAvatars = () => {
    if (scenes.length === 0) return;
    
    const firstScene = scenes[0];
    if (!firstScene.avatarId || !firstScene.avatarPosition || !firstScene.avatarSize) {
      alert("В первом слайде должен быть аватар с заданными позицией и размером");
      return;
    }

    const referencePosition = firstScene.avatarPosition;
    const referenceSize = firstScene.avatarSize;

    // Применяем координаты и размер из первого слайда ко всем остальным
    setScenes((prev) =>
      prev.map((scene, index) => {
        if (index === 0) return scene; // Первый слайд не трогаем
        if (!scene.avatarId) return scene; // Пропускаем слайды без аватара
        
        return {
          ...scene,
          avatarPosition: referencePosition,
          avatarSize: referenceSize,
        };
      }),
    );
  };

  // Функция для получения оригинальных размеров изображения
  const getImageDimensions = (imageUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      // Используем window.Image чтобы избежать конфликта с импортом Image из Next.js
      const img = document.createElement("img");
      
      // Устанавливаем таймаут для загрузки
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Таймаут загрузки изображения: ${imageUrl}`));
      }, 15000); // 15 секунд таймаут
      
      img.onload = () => {
        clearTimeout(timeout);
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        
        if (width > 0 && height > 0) {
          console.log(`Размеры изображения получены: ${imageUrl} - ${width}x${height}`);
          resolve({ width, height });
        } else {
          reject(new Error(`Неверные размеры изображения: ${imageUrl}`));
        }
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.error(`Ошибка загрузки изображения: ${imageUrl}`, error);
        reject(new Error(`Не удалось загрузить изображение: ${imageUrl}`));
      };
      
      // Устанавливаем src после настройки обработчиков
      img.src = imageUrl;
    });
  };

  // Функция для подготовки данных слайда для вебхука
  const prepareSlideData = async (scene: Scene, slideNumber: number) => {
    const canvasSize = CANVAS_SIZES[aspectRatio];
    const slideData: any = {
      slide_number: slideNumber,
      canvas_size: {
        width: canvasSize.width,
        height: canvasSize.height,
      },
      aspect_ratio: aspectRatio,
      script: scene.script,
      voice_id: scene.voiceId ? voices.find((v) => v.id === scene.voiceId)?.voice_id ?? null : null,
      elements: [],
    };

    // Обрабатываем аватар
    if (scene.avatarId && scene.avatarPosition && scene.avatarSize) {
      const avatar = avatars.find((a) => a.id === scene.avatarId);
      if (avatar && avatar.photo) {
        console.log(`Загрузка размеров аватара для слайда ${slideNumber}: ${avatar.photo}`);
        try {
          const originalDimensions = await getImageDimensions(avatar.photo);
          console.log(`Размеры аватара получены для слайда ${slideNumber}:`, originalDimensions);
          slideData.elements.push({
            media_type: "avatar",
            type: "avatar",
            id: scene.avatarId,
            position: {
              x: scene.avatarPosition.x,
              y: scene.avatarPosition.y,
            },
            original_resolution: {
              width: originalDimensions.width,
              height: originalDimensions.height,
            },
            canvas_resolution: {
              width: scene.avatarSize.width,
              height: scene.avatarSize.height,
            },
            z_index: scene.avatarZIndex ?? 0,
            image_url: avatar.photo,
            hey_gen_id: avatar.hey_gen_id,
          });
        } catch (error) {
          console.error(`Ошибка при получении размеров аватара для слайда ${slideNumber}:`, error);
          console.error(`URL аватара: ${avatar.photo}`);
          // Добавляем аватар без оригинальных размеров
          slideData.elements.push({
            media_type: "avatar",
            type: "avatar",
            id: scene.avatarId,
            position: {
              x: scene.avatarPosition.x,
              y: scene.avatarPosition.y,
            },
            original_resolution: null,
            canvas_resolution: {
              width: scene.avatarSize.width,
              height: scene.avatarSize.height,
            },
            z_index: scene.avatarZIndex ?? 0,
            image_url: avatar.photo,
            hey_gen_id: avatar.hey_gen_id,
          });
        }
      }
    }

    // Обрабатываем медиа элементы
    for (const element of scene.elements) {
      if (element.type === "media") {
        // Используем S3 URL из MediaAsset, если есть assetId
        let mediaImageUrl = element.imageUrl;
        if (element.assetId) {
          const mediaAsset = mediaAssets.find((asset) => asset.id === element.assetId);
          if (mediaAsset?.imageUrl) {
            mediaImageUrl = mediaAsset.imageUrl; // Используем актуальный S3 URL
          }
        }

        if (!mediaImageUrl) {
          console.warn(`Медиа элемент ${element.id} не имеет URL, пропускаем`);
          continue;
        }

        console.log(`Загрузка размеров медиа для слайда ${slideNumber}: ${mediaImageUrl}`);
        try {
          const originalDimensions = await getImageDimensions(mediaImageUrl);
          console.log(`Размеры медиа получены для слайда ${slideNumber}:`, originalDimensions);
          slideData.elements.push({
            media_type: "media",
            type: "media",
            id: element.id,
            label: element.label,
            position: {
              x: element.x,
              y: element.y,
            },
            original_resolution: {
              width: originalDimensions.width,
              height: originalDimensions.height,
            },
            canvas_resolution: {
              width: element.width,
              height: element.height,
            },
            z_index: element.zIndex ?? 0,
            image_url: mediaImageUrl, // Используем S3 URL
            crop: element.crop || null,
          });
        } catch (error) {
          console.error(`Ошибка при получении размеров медиа для слайда ${slideNumber}:`, error);
          console.error(`URL медиа: ${mediaImageUrl}`);
          // Добавляем медиа без оригинальных размеров
          slideData.elements.push({
            media_type: "media",
            type: "media",
            id: element.id,
            label: element.label,
            position: {
              x: element.x,
              y: element.y,
            },
            original_resolution: null,
            canvas_resolution: {
              width: element.width,
              height: element.height,
            },
            z_index: element.zIndex ?? 0,
            image_url: mediaImageUrl, // Используем S3 URL
            crop: element.crop || null,
          });
        }
      }
    }

    // Сортируем элементы: сначала аватары, потом медиа, внутри каждой группы по z_index
    slideData.elements.sort((a: any, b: any) => {
      // Аватары всегда идут первыми
      if (a.media_type === "avatar" && b.media_type !== "avatar") {
        return -1;
      }
      if (a.media_type !== "avatar" && b.media_type === "avatar") {
        return 1;
      }
      // Внутри одной группы (оба аватары или оба медиа) сортируем по z_index
      return a.z_index - b.z_index;
    });

    return slideData;
  };

  // Функция для отправки вебхука с данными всех слайдов
  const handleGenerate = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Получаем UUID залогиненного пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userUuid = user?.id;
      if (!userUuid) {
        alert("Не удалось определить пользователя, авторизуйтесь повторно.");
        setIsGenerating(false);
        return;
      }

      // Проверка лимита в демо-режиме: максимум 3 видео
      const { data: videosData } = await supabase
        .from("videos")
        .select("id")
        .eq("uid", userUuid);

      if (videosData && videosData.length >= 3) {
        alert("В демо-режиме можно сгенерировать максимум 3 видео");
        setIsGenerating(false);
        return;
      }

      const slidesData = [];
      
      // Подготавливаем данные для каждого слайда
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const slideNumberMatch = scene.title.match(/\d+/);
        const slideNumber = slideNumberMatch ? parseInt(slideNumberMatch[0], 10) : i + 1;
        
        const slideData = await prepareSlideData(scene, slideNumber);
        slidesData.push(slideData);
      }

      // Генерируем уникальный UUID для видео
      const videoUuid = generateUUID();
      // Добавляем UUID к названию видео через подчеркивание
      const videoTitleWithUuid = `${videoTitle}_${videoUuid}`;

      // Сохраняем данные в таблицу video_temp
      const saveResult = await CreateVideoTemp(videoTitleWithUuid, slidesData, userUuid);
      if (!saveResult.success) {
        console.error("[MaterialEditor] Ошибка при сохранении в video_temp:", saveResult.error);
        // Не прерываем процесс, просто логируем ошибку
      } else {
        console.log("[MaterialEditor] Данные успешно сохранены в video_temp, ID:", saveResult.id);
      }

      // Создаем запись в таблице videos со статусом "generate"
      const videoResult = await CreateVideo(userUuid, videoTitleWithUuid);
      if (!videoResult.success) {
        console.error("[MaterialEditor] Ошибка при создании записи в videos:", videoResult.error);
        // Не прерываем процесс, просто логируем ошибку
      } else {
        console.log("[MaterialEditor] Запись успешно создана в videos, ID:", videoResult.id);
      }

      // Отправляем вебхук
      const response = await fetch("https://rueleven.ru/webhook/2c6c697f-78cd-4eb2-bf01-2f00827b965d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_title: videoTitleWithUuid,
          aspect_ratio: aspectRatio,
          slides: slidesData,
          uuid: userUuid,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      console.log("Вебхук успешно отправлен:", slidesData);
      
      // Обновляем счетчик видео после успешной генерации
      if (videoCount !== null) {
        setVideoCount(videoCount + 1);
      }
      
      // Перенаправляем на страницу material после успешной генерации
      router.push("/material");
    } catch (error) {
      console.error("Ошибка при отправке вебхука:", error);
      alert("Произошла ошибка при отправке данных. Проверьте консоль для подробностей.");
      setIsGenerating(false);
    }
  };

  // Проверяем, можно ли сгенерировать (для активного слайда)
  const canGenerate = useMemo(() => {
    if (!activeScene) return false;
    // Проверка лимита в демо-режиме: максимум 3 видео
    if (videoCount !== null && videoCount >= 3) {
      return false;
    }
    // Проверяем, есть ли текст хотя бы на одном слайде
    const hasTextOnAnySlide = scenes.some(scene => scene.script && scene.script.trim().length > 0);
    return !!(
      videoTitle.trim() &&
      activeScene.avatarId &&
      activeScene.voiceId &&
      (activeScene.script.trim() || hasTextOnAnySlide)
    );
  }, [activeScene, videoTitle, scenes, videoCount]);

  return (
    <section className="flex h-screen w-full flex-col gap-4 px-4 pb-6 pt-4 sm:px-6 lg:gap-6 lg:pb-8">
      <div className="flex items-center justify-between gap-4 pb-2">
        <button
          type="button"
          onClick={async () => {
            // Получаем UUID залогиненного пользователя
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const userUuid = user?.id || null;

            // Отправляем вебхук для каждого слайда перед переходом назад
            for (let i = 0; i < scenes.length; i++) {
              const scene = scenes[i];
              if (!scene.voiceId) continue;

              // Находим выбранный голос и получаем его voice_id из таблицы
              const selectedVoice = voices.find((voice) => voice.id === scene.voiceId);
              if (!selectedVoice || !selectedVoice.voice_id) continue;

              // Извлекаем номер слайда из title (например, "Слайд 1" -> 1)
              const slideNumberMatch = scene.title.match(/\d+/);
              const slideNumber = slideNumberMatch ? parseInt(slideNumberMatch[0], 10) : i + 1;

              try {
                await fetch("https://rueleven.ru/webhook/8c42bae1-807d-40fa-b795-42897b4ec5b2", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    slide_number: slideNumber,
                    voice_id: selectedVoice.voice_id,
                    uuid: userUuid,
                  }),
                });
                console.log(`Вебхук отправлен для слайда ${slideNumber}`);
              } catch (error) {
                console.error(`Ошибка при отправке вебхука для слайда ${slideNumber}:`, error);
              }
            }

            router.push("/material");
          }}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
            canGenerate && !isGenerating
              ? "bg-green-600 hover:bg-green-500"
              : "bg-gray-300 cursor-not-allowed"
          }`}
          title={videoCount !== null && videoCount >= 3 ? "В демо-режиме можно сгенерировать максимум 3 видео" : undefined}
        >
          {isGenerating ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Генерация...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Сгенерировать
            </>
          )}
        </button>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Демо-режим
            </p>
            <p className="mt-1 text-xs text-amber-700">
              В демо-режиме доступно максимум 3 слайда и 500 символов текста на слайд
            </p>
          </div>
        </div>
      </div>
      <div className="flex h-full min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[629px_minmax(0,1fr)] lg:items-stretch lg:gap-6">
        <div className="flex min-h-0 flex-1 flex-col lg:min-h-0 lg:h-full">
          <EditorSidebar
            aspectRatio={aspectRatio}
            onAspectRatioChange={(newRatio) => {
              // Конвертируем координаты всех элементов и аватара при изменении соотношения сторон
              const oldRatio = aspectRatio;
              setScenes((prevScenes) =>
                prevScenes.map((scene) => {
                  const updatedScene = { ...scene };

                  // Конвертируем позицию и размер аватара
                  if (updatedScene.avatarPosition && updatedScene.avatarSize) {
                    updatedScene.avatarPosition = convertCoordinates(
                      updatedScene.avatarPosition,
                      oldRatio,
                      newRatio,
                    );
                    updatedScene.avatarSize = convertSize(
                      updatedScene.avatarSize,
                      oldRatio,
                      newRatio,
                    );
                  }

                  // Конвертируем координаты всех элементов
                  updatedScene.elements = updatedScene.elements.map((element) => {
                    const newPosition = convertCoordinates(
                      { x: element.x, y: element.y },
                      oldRatio,
                      newRatio,
                    );
                    const newSize = convertSize(
                      { width: element.width, height: element.height },
                      oldRatio,
                      newRatio,
                    );
                    return {
                      ...element,
                      x: newPosition.x,
                      y: newPosition.y,
                      width: newSize.width,
                      height: newSize.height,
                    };
                  });

                  return updatedScene;
                }),
              );
              setAspectRatio(newRatio);
            }}
            videoTitle={videoTitle}
            onVideoTitleChange={setVideoTitle}
            avatars={avatars}
            isLoadingAvatars={isLoadingAvatars}
            voices={voices}
            isLoadingVoices={isLoadingVoices}
            scenes={scenes}
            activeSceneId={activeSceneId}
            onSelectScene={setActiveSceneId}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            onSceneVoiceChange={(sceneId, voiceId) => {
              handleSceneUpdate(sceneId, (scene) => ({ ...scene, voiceId }));
            }}
            onSceneScriptChange={(sceneId, script) => {
              handleSceneUpdate(sceneId, (scene) => ({ ...scene, script }));
            }}
            onSceneAvatarChange={(sceneId, avatarId) => {
              const scene = scenes.find((s) => s.id === sceneId);
              if (!scene) return;
              
              if (avatarId && !scene.avatarPosition) {
                // При первом добавлении аватара устанавливаем начальную позицию и размер
                const initialSize = getInitialAvatarSize(aspectRatio);
                const canvasSize = CANVAS_SIZES[aspectRatio];
                const maxZIndex = Math.max(...scene.elements.map((el) => el.zIndex ?? 0), 0);
                handleSceneUpdate(sceneId, (s) => ({
                  ...s,
                  avatarId,
                  avatarPosition: { x: canvasSize.width / 2, y: canvasSize.height / 2 },
                  avatarSize: initialSize,
                  avatarZIndex: maxZIndex + 1,
                }));
              } else {
                handleSceneUpdate(sceneId, (s) => ({ ...s, avatarId }));
              }
            }}
            onRefreshAvatars={refreshAvatars}
            onRefreshVoices={refreshVoices}
            onApplyCreatedAvatar={(sceneId, avatarId) => {
              const scene = scenes.find((s) => s.id === sceneId);
              if (!scene) return;
              
              // При применении созданного аватара устанавливаем начальную позицию и размер
              const initialSize = getInitialAvatarSize(aspectRatio);
              const canvasSize = CANVAS_SIZES[aspectRatio];
              const maxZIndex = Math.max(...scene.elements.map((el) => el.zIndex ?? 0), 0);
              handleSceneUpdate(sceneId, (s) => ({
                ...s,
                avatarId,
                avatarPosition: { x: canvasSize.width / 2, y: canvasSize.height / 2 },
                avatarSize: initialSize,
                avatarZIndex: maxZIndex + 1,
              }));
            }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex-1 min-h-0">
            <CanvasArea
              aspectRatio={aspectRatio}
              elements={activeScene?.elements ?? []}
              avatar={
                activeScene?.avatarId
                  ? avatars.find((a) => a.id === activeScene.avatarId) ?? null
                  : null
              }
              avatarPosition={
                activeScene?.avatarPosition ?? {
                  x: CANVAS_SIZES[aspectRatio].width / 2,
                  y: CANVAS_SIZES[aspectRatio].height / 2,
                }
              }
              avatarSize={activeScene?.avatarSize ?? getInitialAvatarSize(aspectRatio)}
              avatarZIndex={activeScene?.avatarZIndex}
              avatarLocked={activeScene?.avatarLocked}
              onElementPositionChange={handleElementPositionChange}
              onElementSizeChange={handleElementSizeChange}
              onRemoveElement={handleRemoveElement}
              onReorderLayers={handleReorderLayers}
              onAvatarPositionChange={handleAvatarPositionChange}
              onAvatarSizeChange={handleAvatarSizeChange}
              onAlignAvatars={handleAlignAvatars}
              onAddMediaAsset={handleAddMediaAsset}
              mediaAssets={mediaAssets}
              onUseMediaAsset={handleAddExistingAssetToScene}
              isUploadingMedia={isUploadingMedia}
              onUseMediaAssetAtPosition={(assetId, x, y) => {
                if (!activeScene) return;
                const asset = mediaAssets.find((item) => item.id === assetId);
                if (!asset) return;
                addAssetToSceneAtPosition(activeScene.id, asset, x, y);
              }}
              onRemoveMediaAsset={handleRemoveMediaAsset}
              onRemoveAvatar={handleRemoveAvatar}
              onToggleAvatarLock={handleToggleAvatarLock}
            />
          </div>
          <div className="min-h-[220px] lg:min-h-[240px]">
            <Timeline
              scenes={scenes}
              activeSceneId={activeSceneId}
              onSelectScene={setActiveSceneId}
              onAddScene={handleAddScene}
              avatars={avatars}
              aspectRatio={aspectRatio}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

