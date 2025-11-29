"use client";

export function AvatarsEmptyState() {
  return (
    <div className="group relative flex flex-col items-center justify-center py-8 text-center sm:py-12">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 transition-transform group-hover:scale-110 sm:mb-6 sm:h-20 sm:w-20 md:h-24 md:w-24">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-blue-600 sm:h-10 sm:w-10 md:h-12 md:w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">
        Нет аватаров
      </h3>
      <p className="max-w-sm text-xs text-gray-600 sm:text-sm">
        Создайте аватар для начала работы с видео
      </p>
    </div>
  );
}

