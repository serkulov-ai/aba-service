import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Значок режима разработки закрывает кнопку «С» на телефоне. Ошибки всё равно показываются.
  devIndicators: false,
  // Разрешает открыть сервер разработки с телефона по адресу в домашней или рабочей сети.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],

  // Защитные заголовки: сервис нельзя встроить в чужую страницу, браузер не
  // угадывает типы файлов, адрес страницы не утекает на посторонние сайты.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
