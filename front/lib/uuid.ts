/**
 * Генерирует UUID v4
 * Использует crypto.randomUUID() если доступно, иначе fallback реализацию
 */
export function generateUUID(): string {
  // Проверяем доступность crypto.randomUUID (поддерживается в современных браузерах и Node.js 14.17+)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback реализация для старых браузеров/окружений
  // RFC4122 версия 4 UUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

