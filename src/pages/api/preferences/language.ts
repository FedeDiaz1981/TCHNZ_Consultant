import type { APIRoute } from "astro";
import { getForwardedRequestUrl } from "../../../lib/auth/http";
import {
  customerLocaleCookieName,
  getCustomerLanguageCookieOptions,
  isCustomerLocale
} from "../../../lib/i18n/customers";
import { withPortalBasePath } from "../../../lib/portal/base-path";

function getRedirectTarget(requestUrl: URL, redirectTo: string | null) {
  const fallbackPath = withPortalBasePath("/");

  if (!redirectTo) {
    return fallbackPath;
  }

  if (redirectTo.startsWith("/")) {
    return redirectTo;
  }

  try {
    const parsed = new URL(redirectTo, requestUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallbackPath;
  }
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const nextLocale = formData.get("lang");
  const redirectTo = formData.get("redirectTo");
  const requestUrl = getForwardedRequestUrl(request);
  const target = getRedirectTarget(
    requestUrl,
    typeof redirectTo === "string" ? redirectTo : null
  );

  if (isCustomerLocale(nextLocale)) {
    cookies.set(
      customerLocaleCookieName,
      nextLocale,
      getCustomerLanguageCookieOptions(requestUrl)
    );
  }

  return redirect(target, 303);
};
