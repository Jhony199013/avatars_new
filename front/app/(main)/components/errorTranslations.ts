const translations = [
  {
    matchers: [
      "invalid login credentials",
      "invalid credentials",
      "invalid email or password",
    ],
    message: "Неверный email или пароль",
  },
  {
    matchers: ["email not confirmed", "email confirmation required"],
    message: "Email не подтверждён. Проверьте почту.",
  },
  {
    matchers: ["user not found"],
    message: "Пользователь не найден.",
  },
  {
    matchers: ["user already registered", "already registered", "email already"],
    message: "Пользователь с таким email уже зарегистрирован.",
  },
  {
    matchers: ["password too short", "at least 8 characters", "minimum length"],
    message: "Пароль слишком короткий. Минимум 8 символов.",
  },
  {
    matchers: ["weak password"],
    message: "Пароль слишком слабый.",
  },
  {
    matchers: ["invalid email", "malformed email"],
    message: "Некорректный email адрес.",
  },
  {
    matchers: ["network error", "fetch error"],
    message: "Ошибка сети. Проверьте подключение к интернету.",
  },
  {
    matchers: ["rate limit", "too many requests"],
    message: "Слишком много запросов. Попробуйте позже.",
  },
  {
    matchers: ["server error", "internal error"],
    message: "Ошибка сервера. Попробуйте позже.",
  },
];

export function translateError(message: string) {
  if (!message) {
    return "Произошла ошибка. Попробуйте ещё раз.";
  }

  const normalized = message.toLowerCase();
  const matched = translations.find(({ matchers }) =>
    matchers.some((matcher) => normalized.includes(matcher)),
  );

  return matched ? matched.message : message;
}

