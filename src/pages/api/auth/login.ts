import type { APIRoute } from "astro";
import { getCurrentPortalProfile } from "../../../lib/portal/admin";
import { createRedirectResponse, getForwardedRequestUrl, redirectWithFlash } from "../../../lib/auth/http";
import { getSectionHrefForPath } from "../../../lib/portal/hosts";
import { verifyTurnstileToken } from "../../../lib/auth/turnstile";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!email || !password) {
    return redirectWithFlash(context.request, "/login", "error", "Completa email y contrasena.");
  }

  const captchaResult = await verifyTurnstileToken(context.request, captchaToken);

  if (!captchaResult.success) {
    return redirectWithFlash(
      context.request,
      "/login",
      "error",
      "No pudimos validar el captcha. Intenta nuevamente."
    );
  }

  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Supabase signInWithPassword failed", {
      email,
      message: error.message,
      status: error.status,
      code: "code" in error ? error.code : null,
      name: error.name
    });

    let userMessage = "No pudimos iniciar sesion. Revisa tus credenciales.";

    if (/email not confirmed/i.test(error.message)) {
      userMessage = "Tu email todavia no fue confirmado en Supabase.";
    } else if (/invalid login credentials/i.test(error.message)) {
      userMessage = "Email o contrasena incorrectos.";
    }

    return redirectWithFlash(context.request, "/login", "error", userMessage);
  }

  const authenticatedUser = data.user;
  let authenticatedProfile = null;

  if (authenticatedUser) {
    authenticatedProfile = await getCurrentPortalProfile(supabase, authenticatedUser.id);

    if (!authenticatedProfile || !authenticatedProfile.isActive) {
      await supabase.auth.signOut();
      return redirectWithFlash(
        context.request,
        "/login",
        "error",
        "Tu usuario ya no se encuentra habilitado en el portal."
      );
    }
  }

  const redirectTarget =
    authenticatedProfile?.role === "admin"
      ? getSectionHrefForPath(getForwardedRequestUrl(context.request), "/admin")
      : getSectionHrefForPath(getForwardedRequestUrl(context.request), "/clientes/aplicaciones");

  return createRedirectResponse(redirectTarget);
};
