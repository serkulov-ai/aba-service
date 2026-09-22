"use client";

import { useEffect } from "react";

// Включаем сохранение оболочки только в собранной версии: в режиме разработки
// это мешает обновлять код на лету.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Без него сервис работает как обычно — просто без экрана «нет интернета».
    });
  }, []);

  return null;
}
