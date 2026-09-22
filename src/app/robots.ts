import type { MetadataRoute } from "next";

// Внутренний сервис с данными детей: поисковикам здесь делать нечего.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
