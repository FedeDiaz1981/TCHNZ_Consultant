import type { APIRoute } from "astro";
import { createRedirectResponse, getForwardedRequestUrl, redirectWithFlash } from "../../../lib/auth/http";
import { withPortalBasePath } from "../../../lib/portal/base-path";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    return redirectWithFlash(
      context.request,
      "/reset-password",
      "error",
      "Completa y confirma tu nueva contrasena."
    );
  }

  if (password.length < 8) {
    return redirectWithFlash(
      context.request,
      "/reset-password",
      "error",
      "La nueva contrasena debe tener al menos 8 caracteres."
    );
  }

  if (password !== confirmPassword) {
    return redirectWithFlash(
      context.request,
      "/reset-password",
      "error",
      "Las contrasenas no coinciden."
    );
  }

  const supabase = createSupabaseServerClient(context);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithFlash(
      context.request,
      "/forgot-password",
      "error",
      "El enlace de recuperacion no es valido o ya expiro."
    );
  }

  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    console.error("Supabase updateUser failed during password reset", {
      userId: user.id,
      message: error.message,
      status: error.status,
      code: "code" in error ? error.code : null,
      name: error.name
    });

    return redirectWithFlash(
      context.request,
      "/reset-password",
      "error",
      "No pudimos actualizar tu contrasena. Solicita un nuevo enlace e intenta otra vez."
    );
  }

  await supabase.auth.signOut();

  const loginUrl = new URL(withPortalBasePath("/login"), getForwardedRequestUrl(context.request));
  loginUrl.searchParams.set("message", "Tu contrasena fue actualizada. Inicia sesion con la nueva clave.");

  return createRedirectResponse(loginUrl);
};
