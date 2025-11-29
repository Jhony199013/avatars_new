"use client";

export function VoicesEmptyState() {
  return (
    <div className="group relative flex flex-col items-center justify-center py-8 text-center sm:py-12">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 transition-transform group-hover:scale-110 sm:mb-6 sm:h-20 sm:w-20 md:h-24 md:w-24">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-purple-600 sm:h-10 sm:w-10 md:h-12 md:w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">
        Нет голосов
      </h3>
      <p className="max-w-sm text-xs text-gray-600 sm:text-sm">
        Создайте голос для использования в видео
      </p>
    </div>
  );
}

