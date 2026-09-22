import type { Metadata, Viewport } from "next";
import { Golos_Text, Manrope } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "АВА-занятия",
  description: "Учёт занятий и прогресса детей по методике АВА",
  applicationName: "АВА-занятия",
  // Внутренний сервис: в поиске ему не место.
  robots: { index: false, follow: false },
  // Открывается с домашнего экрана как приложение, без адресной строки.
  appleWebApp: { capable: true, title: "АВА-занятия", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6b4fa0",
  viewportFit: "cover", // экраны с вырезом: учитываем безопасные отступы
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${golos.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
