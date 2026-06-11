import { withPortalBasePath } from "../portal/base-path";

export const publicSiteUrl = import.meta.env.PUBLIC_SITE_URL;
export const publicHomeUrl = import.meta.env.PUBLIC_HOME_URL?.trim();
export const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;

function getConfiguredSiteUrl() {
  if (!publicSiteUrl) {
    throw new Error("Missing PUBLIC_SITE_URL environment variable.");
  }

  return new URL(publicSiteUrl);
}

export function buildPublicSiteUrl(pathname: string) {
  return new URL(withPortalBasePath(pathname), getConfiguredSiteUrl());
}

export function getConfiguredHomeUrl() {
  if (!publicHomeUrl) {
    return null;
  }

  try {
    return new URL(publicHomeUrl);
  } catch {
    return new URL(publicHomeUrl.startsWith("/") ? publicHomeUrl : `/${publicHomeUrl}`, getConfiguredSiteUrl());
  }
}

export function getRecoveryConfirmUrl(baseUrl?: URL) {
  const url = baseUrl ? new URL(baseUrl) : buildPublicSiteUrl("/auth/confirm");
  url.searchParams.set("next", withPortalBasePath("/reset-password"));
  return url;
}
