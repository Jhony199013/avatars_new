"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutModal } from "./LogoutModal";
import { prefetchAvatarsData } from "@/lib/prefetchAvatars";

const navLinks = [
  { href: "/", label: "Главная" },
  { href: "/avatars", label: "Аватары" },
  { href: "/voices", label: "Голоса" },
  { href: "/material", label: "Материал" },
];

export function Header() {
  const pathname = usePathname();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg border-b border-gray-100">
        <div className="mx-auto flex h-full w-full max-w-[1350px] items-center px-6">
          <nav className="flex flex-1 items-center gap-8">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              const handleMouseEnter = () => {
                // Prefetch данные для страницы аватаров при наведении
                if ((href === "/avatars" || href === "/") && !isActive) {
                  prefetchAvatarsData();
                }
              };
              
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={handleMouseEnter}
                  prefetch={true}
                  className={`text-lg font-semibold transition ${
                    isActive
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-none justify-end">
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <div className="h-16" aria-hidden />
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
}

