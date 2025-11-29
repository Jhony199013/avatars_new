"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { MaterialEditor } from "./components/MaterialEditor";

function MaterialEditorWrapper() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      <MaterialEditor />
    </div>
  );
}

export default function MaterialEditorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Загрузка...</div>}>
      <MaterialEditorWrapper />
    </Suspense>
  );
}

