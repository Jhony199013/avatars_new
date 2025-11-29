"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Toast } from "./Toast";
import { translateError } from "./errorTranslations";

type Mode = "login" | "register";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"error" | "success">("error");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
  });

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType("error");
    setIsToastVisible(true);
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType("success");
    setIsToastVisible(true);
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    if (field === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      let masked = "";
      if (digits.length > 0) {
        masked = "+7(";
        masked += digits.slice(0, 3);
        if (digits.length >= 3) masked += ")";
        if (digits.length > 3) masked += digits.slice(3, 6);
        if (digits.length >= 6) masked += "-";
        if (digits.length > 6) masked += digits.slice(6, 8);
        if (digits.length >= 8) masked += "-";
        if (digits.length > 8) masked += digits.slice(8, 10);
      }
      setForm((prev) => ({ ...prev, phone: masked }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setIsToastVisible(false);
  };

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (mode === "login") {
      return Boolean(form.email && form.password);
    }
    return (
      Boolean(form.email && form.password && form.confirmPassword) &&
      passwordRegex.test(form.password) &&
      form.password === form.confirmPassword
    );
  }, [form, mode, loading]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsToastVisible(false);

    if (mode === "register") {
      if (form.password !== form.confirmPassword) {
        showErrorToast("Пароли не совпадают");
        return;
      }
      if (!passwordRegex.test(form.password)) {
        showErrorToast(
          "Пароль: ≥8 символов, минимум одна заглавная, одна строчная и один спецсимвол",
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (signInError) throw signInError;
        showSuccessToast("Вход выполнен успешно");
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              firstName: form.firstName || null,
              lastName: form.lastName || null,
              company: form.company || null,
              phone: form.phone || null,
            },
          },
        });
        if (signUpError) throw signUpError;
        showSuccessToast("Регистрация выполнена успешно");
      }

      document.cookie = "app-auth=1; path=/; max-age=604800";

      router.push("/avatars");
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Не удалось выполнить запрос";
      showErrorToast(translateError(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mx-auto mt-16 w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-black">
          {mode === "login" ? "Вход в сервис" : "Регистрация"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <input
                type="text"
                placeholder="Имя"
                value={form.firstName}
                onChange={(event) =>
                  handleChange("firstName", event.currentTarget.value)
                }
                className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
              />
              <input
                type="text"
                placeholder="Фамилия (необязательно)"
                value={form.lastName}
                onChange={(event) =>
                  handleChange("lastName", event.currentTarget.value)
                }
                className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
              />
              <input
                type="text"
                placeholder="Компания (необязательно)"
                value={form.company}
                onChange={(event) =>
                  handleChange("company", event.currentTarget.value)
                }
                className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
              />
              <input
                type="tel"
                placeholder="+7(XXX)XXX-XX-XX"
                value={form.phone}
                onChange={(event) =>
                  handleChange("phone", event.currentTarget.value)
                }
                className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
              />
            </>
          )}

          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(event) =>
              handleChange("email", event.currentTarget.value)
            }
            required
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(event) =>
              handleChange("password", event.currentTarget.value)
            }
            required
            className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
          />

          {mode === "register" && (
            <input
              type="password"
              placeholder="Подтвердите пароль"
              value={form.confirmPassword}
              onChange={(event) =>
                handleChange("confirmPassword", event.currentTarget.value)
              }
              required
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition focus:border-black"
            />
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
          {loading
            ? mode === "login"
              ? "Выполняем вход..."
              : "Создаём аккаунт..."
            : mode === "login"
            ? "Войти"
            : "Зарегистрироваться"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-black">
          {mode === "login" ? (
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium underline-offset-4 hover:underline"
            >
              Нет аккаунта? Зарегистрироваться
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium underline-offset-4 hover:underline"
            >
              Уже есть аккаунт? Войти
            </button>
          )}
        </div>
      </div>

      <Toast
        message={toastMessage || ""}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
        type={toastType}
      />
    </>
  );
}

