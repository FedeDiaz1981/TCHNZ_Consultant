import type { APIRoute } from "astro";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createRedirectResponse, getForwardedRequestUrl, redirectWithFlash } from "../../lib/auth/http";
import { getCustomerLocale, getCustomerUi } from "../../lib/i18n/customers";
import { withPortalBasePath } from "../../lib/portal/base-path";
import { createSupabaseServerClient } from "../../lib/supabase/server";

function getSafeNextPath(candidate: string | null) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return withPortalBasePath("/login");
  }

  return withPortalBasePath(candidate);
}

export const GET: APIRoute = async (context) => {
  const requestUrl = getForwardedRequestUrl(context.request);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const locale = getCustomerLocale(requestUrl, context.cookies);
  const ui = getCustomerUi(locale).authRecovery;
  const supabase = createSupabaseServerClient(context);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase exchangeCodeForSession failed", {
        message: error.message,
        status: error.status,
        code: "code" in error ? error.code : null,
        name: error.name
      });

      return redirectWithFlash(
        context.request,
        "/forgot-password",
        "error",
        ui.verifyError
      );
    }

    const redirectTo = new URL(nextPath, requestUrl);
    redirectTo.searchParams.set("message", ui.readyMessage);

    return createRedirectResponse(redirectTo);
  }

  if (!tokenHash || !type) {
    return redirectWithFlash(
      context.request,
      "/forgot-password",
      "error",
      ui.invalidLink
    );
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type
  });

  if (error) {
    console.error("Supabase verifyOtp failed", {
      type,
      message: error.message,
      status: error.status,
      code: "code" in error ? error.code : null,
      name: error.name
    });

    return redirectWithFlash(
      context.request,
      "/forgot-password",
      "error",
      ui.invalidLink
    );
  }

  const redirectTo = new URL(nextPath, requestUrl);
  redirectTo.searchParams.set("message", ui.readyMessage);

  return createRedirectResponse(redirectTo);
};
