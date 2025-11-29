import { NextRequest, NextResponse } from "next/server";

const FALLBACK_AUDIO_BASE =
  "https://s3.twcstorage.ru/da2ac12a-41cc63a3-3ad9-4eee-a33a-7776f7973de7/temp/TTS";

const AUDIO_BASE_URL = process.env.TTS_AUDIO_BASE_URL ?? FALLBACK_AUDIO_BASE;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

const buildUpstreamUrl = ({
  userUuid,
  slideNumber,
  voiceId,
  cacheBuster,
}: {
  userUuid: string;
  slideNumber: string;
  voiceId: string;
  cacheBuster?: string | null;
}) => {
  const normalizedBase = AUDIO_BASE_URL.replace(/\/+$/, "");
  const userSegment = encodeURIComponent(userUuid);
  const slideSegment = encodeURIComponent(slideNumber);
  const voiceSegment = encodeURIComponent(voiceId);
  const base = `${normalizedBase}/${userSegment}/${slideSegment}_${voiceSegment}`;
  if (!cacheBuster) {
    return base;
  }
  return `${base}?t=${encodeURIComponent(cacheBuster)}`;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userUuid = searchParams.get("user");
  const slideNumber = searchParams.get("slide");
  const voiceId = searchParams.get("voice");
  const cacheBuster = searchParams.get("bust");

  if (!userUuid || !slideNumber || !voiceId) {
    return NextResponse.json(
      { error: "Требуются параметры user, slide и voice" },
      { status: 400 },
    );
  }

  const upstreamUrl = buildUpstreamUrl({
    userUuid,
    slideNumber,
    voiceId,
    cacheBuster,
  });

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
    });
  } catch (error) {
    console.error("Не удалось запросить аудио у S3:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить аудио" },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return NextResponse.json(
      { error: "Сервис аудио вернул ошибку" },
      { status: upstreamResponse.status || 502 },
    );
  }

  const headers = new Headers(upstreamResponse.headers);
  // Удаляем hop-by-hop заголовки и принудительно отключаем кэширование
  hopByHopHeaders.forEach((header) => headers.delete(header));
  headers.set("Cache-Control", "no-store");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}



















