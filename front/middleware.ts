import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/", "/avatars", "/voices", "/material"];
const AUTH_COOKIE_NAME = "app-auth";

function isProtectedRoute(pathname: string) {
  // Главная страница должна быть точно "/", а не начинаться с "/"
  if (pathname === "/") {
    return true;
  }
  // Проверяем защищенные маршруты и их подмаршруты (например, /material/editor)
  return PROTECTED_ROUTES.some((route) => route !== "/" && pathname.startsWith(route));
}

function isAuthenticated(request: NextRequest) {
  const cookies = request.cookies.getAll();

  const hasSupabaseToken = cookies.some((cookie) =>
    cookie.name.includes("auth-token"),
  );

  const hasCustomAuthCookie = Boolean(
    cookies.find((cookie) => cookie.name === AUTH_COOKIE_NAME)?.value,
  );

  return hasSupabaseToken || hasCustomAuthCookie;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (!authenticated && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

