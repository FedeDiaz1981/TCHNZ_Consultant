import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
const portalBasePath = normalizeBasePath(process.env.PUBLIC_PORTAL_BASE_PATH, "/consultant");

function normalizeBasePath(value, fallback) {
  const configured = value === undefined ? fallback : value;
  const normalized = configured.trim();
  if (!normalized || normalized === "/") return "/";

  return `/${normalized.replace(/^\/+|\/+$/g, "")}`;
}

export default defineConfig({
  base: portalBasePath,
  output: "server",
  adapter: isVercel ? vercel() : node({ mode: "standalone" }),
  security: {
    checkOrigin: false,
    allowedDomains: [
      { hostname: "**.vercel.app", protocol: "https" },
      { hostname: "technized.com", protocol: "https" },
      { hostname: "www.technized.com", protocol: "https" },
      { hostname: "technized.store", protocol: "https" },
      { hostname: "technized.store", protocol: "http" },
      { hostname: "**.consultant.technized.store", protocol: "https" },
      { hostname: "consultant.technized.store", protocol: "https" },
      { hostname: "consultant.technized.store", protocol: "http" },
      { hostname: "localhost", protocol: "http" },
      { hostname: "127.0.0.1", protocol: "http" }
    ]
  },
  integrations: [react(), tailwind({ applyBaseStyles: false })]
});
