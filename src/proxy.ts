import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Пускает дальше только вошедших и продлевает сессию на каждом переходе.
// Права (кто каких детей видит) проверяет база, здесь только вход.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Подпись пропуска проверяем на месте: к серверу базы идём, только когда
  // пропуск пора продлить (раз в час), а не на каждой странице.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/login";
  // Служебные файлы приложения и экран «нет интернета» открыты всем:
  // данных детей в них нет, а без них телефон не поставит сервис на домашний экран.
  if (["/offline", "/manifest.webmanifest", "/sw.js", "/robots.txt"].includes(path)) return response;

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
