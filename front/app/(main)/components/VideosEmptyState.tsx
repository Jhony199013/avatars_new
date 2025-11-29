"use client";

interface VideosEmptyStateProps {
  onCreateClick: () => void;
}

export function VideosEmptyState({ onCreateClick }: VideosEmptyStateProps) {
  return (
    <div className="group relative flex flex-col items-center justify-center py-8 text-center sm:py-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 transition-transform group-hover:scale-110 sm:mb-6 sm:h-20 sm:w-20 md:h-24 md:w-24">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-green-600 sm:h-10 sm:w-10 md:h-12 md:w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">
          Создайте свое первое видео
        </h3>
        <p className="mb-4 max-w-sm text-xs text-gray-600 sm:mb-6 sm:text-sm">
          Используйте аватары и голоса для создания профессиональных видео с помощью нашего редактора
        </p>
        <button
          type="button"
          onClick={onCreateClick}
        className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg active:scale-95 sm:py-3"
        >
          Создать видео
        </button>
    </div>
  );
}

