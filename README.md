# Avatars New

Next.js приложение для работы с аватарами.

## Требования

- Node.js 20 или выше
- npm или yarn

## Установка

Установите зависимости (из корня проекта):

```bash
npm install
```

Или из папки `front`:

```bash
cd front
npm install
```

## Настройка переменных окружения

Создайте файл `.env.local` в папке `front` со следующими переменными:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
HEYGEN_API_KEY=your_heygen_api_key
```

## Запуск приложения

### Режим разработки

Из корня проекта выполните:

```bash
npm run dev
```

Или из папки `front`:

```bash
cd front
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

### Сборка для продакшена

Из корня проекта:

```bash
npm run build
npm start
```

## Быстрый запуск (Windows)

Вы можете использовать скрипт `start.bat` из корня проекта:

```bash
start.bat
```

Этот скрипт автоматически перейдет в папку `front`, установит зависимости (если нужно) и запустит сервер разработки.
