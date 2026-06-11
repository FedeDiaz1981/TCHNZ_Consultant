import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import { getSharedCookieDomain } from "../portal/hosts";
import { supabaseAnonKey, supabaseUrl } from "./env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) {
        return [];
      }

      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (!name) {
        return [];
      }

      return [
        {
          name,
          value: decodeURIComponent(value)
        }
      ];
    });
}

export function createSupabaseServerClient({
  request,
  cookies
}: {
  request: Request;
  cookies: AstroCookies;
}) {
  const requestUrl = new URL(request.url);
  const sharedCookieDomain = getSharedCookieDomain(requestUrl);

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") ?? "";
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, {
            ...options,
            path: options.path ?? "/",
            domain: sharedCookieDomain ?? options.domain
          });
        });
      }
    }
  });
}
