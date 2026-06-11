import type { APIRoute } from "astro";
import { getRecoveryConfirmUrl } from "../../../lib/auth/public";
import { getForwardedRequestUrl, redirectWithFlash } from "../../../lib/auth/http";
import { buildAuthUrl } from "../../../lib/portal/hosts";
import { verifyTurnstileToken } from "../../../lib/auth/turnstile";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!email) {
    return redirectWithFlash(context.request, "/forgot-password", "error", "Completa tu email.");
  }

  const captchaResult = await verifyTurnstileToken(context.request, captchaToken);

  if (!captchaResult.success) {
    return redirectWithFlash(
      context.request,
      "/forgot-password",
      "error",
      "No pudimos validar el captcha. Intenta nuevamente."
    );
  }

  const supabase = createSupabaseServerClient(context);
  const recoveryConfirmUrl = getRecoveryConfirmUrl(
    buildAuthUrl(getForwardedRequestUrl(context.request), "/auth/confirm")
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: recoveryConfirmUrl.toString()
  });

  if (error) {
    console.error("Supabase resetPasswordForEmail failed", {
      email,
      message: error.message,
      status: error.status,
      code: "code" in error ? error.code : null,
      name: error.name
    });

    return redirectWithFlash(
      context.request,
      "/forgot-password",
      "error",
      "No pudimos enviar el enlace de recuperacion. Intenta nuevamente en unos minutos."
    );
  }

  return redirectWithFlash(
    context.request,
    "/forgot-password",
    "message",
    "Si el email existe, enviamos un enlace para restablecer tu clave."
  );
};
