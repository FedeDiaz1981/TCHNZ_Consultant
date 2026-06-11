const fallbackPortalBasePath = "/consultant";

function normalizePortalBasePath(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || normalized === "/") return "";

  return `/${normalized.replace(/^\/+|\/+$/g, "")}`;
}

export const portalBasePath = normalizePortalBasePath(
  import.meta.env.PUBLIC_PORTAL_BASE_PATH ?? fallbackPortalBasePath
);

export function withPortalBasePath(pathname: string) {
  if (!portalBasePath || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return pathname;
  }

  if (pathname === "/") return portalBasePath;
  if (pathname === portalBasePath || pathname.startsWith(`${portalBasePath}/`)) {
    return pathname;
  }

  return `${portalBasePath}${pathname}`;
}

export function stripPortalBasePath(pathname: string) {
  if (!portalBasePath) return pathname;
  if (pathname === portalBasePath) return "/";
  if (pathname.startsWith(`${portalBasePath}/`)) {
    return pathname.slice(portalBasePath.length) || "/";
  }

  return pathname;
}

export function isPortalBasePathRoot(pathname: string) {
  return Boolean(portalBasePath) && (pathname === portalBasePath || pathname === `${portalBasePath}/`);
}
