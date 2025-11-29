# syntax=docker/dockerfile:1.6

############################################
# 1. BUILDER — собираем Next.js проект
############################################
FROM node:20 AS builder

WORKDIR /app

# Копируем package.json и lock-файл
COPY front/package.json front/package-lock.json ./front/

# Копируем весь фронт
COPY front ./front

WORKDIR /app/front

# Устанавливаем зависимости
RUN npm ci

# Build args → ENV (чтобы NEXT_PUBLIC_ попали в билд)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG HEYGEN_API_KEY
ARG S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ARG S3_ENDPOINT
ARG S3_BUCKET

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV HEYGEN_API_KEY=${HEYGEN_API_KEY}
ENV S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
ENV S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_BUCKET=${S3_BUCKET}
ENV NEXT_TELEMETRY_DISABLED=1

# Сборка Next.js (standalone)
RUN npm run build

############################################
# 2. RUNNER — минимальный образ для запуска
############################################
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Создаем пользователя
RUN addgroup --system nodejs && adduser --system --ingroup nodejs nextjs

# Папка public
COPY --from=builder /app/front/public ./public

# Standalone сервер
COPY --from=builder /app/front/.next/standalone ./

# Статика
COPY --from=builder /app/front/.next/static ./.next/static

# Переменные окружения для runtime (передаются через build args)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG HEYGEN_API_KEY
ARG S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ARG S3_ENDPOINT
ARG S3_BUCKET

# Устанавливаем переменные окружения в runtime контейнере
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV HEYGEN_API_KEY=${HEYGEN_API_KEY}
ENV S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
ENV S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_BUCKET=${S3_BUCKET}

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]