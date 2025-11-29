"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Header } from "@/components/ui/Header";
import { Dashboard } from "./components/Dashboard";
import { CosmoLoader } from "@/components/ui/CosmoLoader";

export const dynamic = 'force-dynamic';

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        
        if (!isMounted) return;

        if (error || !user) {
          router.push("/login");
          return;
        }

        setIsCheckingAuth(false);
      } catch (error) {
        console.error("[Home] Ошибка проверки авторизации:", error);
        if (isMounted) {
          router.push("/login");
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    // Таймаут на случай зависания
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("[Home] Таймаут проверки авторизации");
        setIsCheckingAuth(false);
        router.push("/login");
      }
    }, 5000); // 5 секунд таймаут

    checkAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {isCheckingAuth ? (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <CosmoLoader ariaLabel="Проверка авторизации..." />
        </div>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
