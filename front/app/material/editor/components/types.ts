export type AspectRatio = "16:9" | "9:16";

export type AvatarOption = {
  id: string;
  name: string;
  photo: string;
  image_key: string;
  hey_gen_id: string | null;
  group_id: string | null;
};

export type VoiceOption = {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  voice_id?: string | null;
};

export type CanvasElementType = "avatar" | "media";

export type MediaAsset = {
  id: string;
  label: string;
  imageUrl: string;
  s3Key?: string; // S3 ключ для удаления файла из хранилища
  createdAt: number;
};

export type CanvasElement = {
  id: string;
  type: CanvasElementType;
  label: string;
  color: string;
  x: number; // координата центра элемента по X в пикселях относительно канвы (1920x1080 для 16:9, 1080x1920 для 9:16)
  y: number; // координата центра элемента по Y в пикселях относительно канвы
  width: number; // ширина в пикселях относительно канвы
  height: number; // высота в пикселях относительно канвы
  imageUrl?: string; // URL загруженного изображения для медиа элементов
  assetId?: string; // ссылка на медиа ассет из библиотеки
  zIndex?: number; // порядок слоя (больше = выше)
  crop?: {
    x: number; // процент от левого края фото
    y: number; // процент от верхнего края фото
    width: number; // процент ширины фото
    height: number; // процент высоты фото
  };
};

export type Scene = {
  id: string;
  title: string;
  script: string;
  avatarId: string | null;
  voiceId: string | null;
  elements: CanvasElement[];
  avatarPosition?: { x: number; y: number }; // позиция центра аватара в пикселях относительно канвы
  avatarSize?: { width: number; height: number }; // размер в пикселях относительно канвы
  avatarZIndex?: number; // порядок слоя аватара (больше = выше)
  avatarLocked?: boolean; // заблокирован ли аватар от перетаскивания
};

