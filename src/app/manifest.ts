import type { MetadataRoute } from "next";

// Описание приложения: с ним сервис ставится на домашний экран телефона
// и открывается без адресной строки браузера.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "АВА-занятия",
    short_name: "АВА",
    description: "Учёт занятий и прогресса детей по методике АВА",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ru",
    background_color: "#faf8f5",
    theme_color: "#6b4fa0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
