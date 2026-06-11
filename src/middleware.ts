import { defineMiddleware } from "astro:middleware";
import { getForwardedRequestUrl } from "./lib/auth/http";
import { getCurrentPortalProfile } from "./lib/portal/admin";
import {
  getAuthorizedApplications,
  getCurrentPortalClient,
  getPublicModuleApplications
} from "./lib/portal/client-access";
import {
  buildAuthUrl,
  getCurrentPortalModule,
  getCurrentPortalSection,
  getCanonicalSectionUrl,
  getPortalRequestPathname,
  getSectionHrefForPath,
  getRewritePathForSectionHost
} from "./lib/portal/hosts";
import { moduleHasManagement, moduleRequiresAuth } from "./lib/portal/modules";
import { createSupabaseServerClient } from "./lib/supabase/server";

function toSafeRedirectLocation(url: URL | string) {
  if (typeof url === "string") return url;
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return `${url.pathname}${url.search}`;
  }

  return url.toString();
}

function isAssetRequest(pathname: string) {
  return (
    pathname.startsWith("/_astro") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/scripts") ||
    pathname === "/favicon.png" ||
    pathname === "/favicon.svg"
  );
}

function normalizePortalPath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const requestUrl = getForwardedRequestUrl(context.request);
  const pathname = getPortalRequestPathname(requestUrl);
  const portalModule = getCurrentPortalModule(requestUrl);
  const portalSection = getCurrentPortalSection(requestUrl);
  const canonicalSectionUrl = getCanonicalSectionUrl(requestUrl);

  context.locals.portalModule = portalModule;
  context.locals.portalSection = portalSection;

  if (canonicalSectionUrl) {
    return context.redirect(toSafeRedirectLocation(canonicalSectionUrl));
  }

  const effectivePathname = getRewritePathForSectionHost(requestUrl) ?? pathname;

  if (isAssetRequest(pathname)) {
    return next();
  }

  const supabase = createSupabaseServerClient(context);
  context.locals.supabase = supabase;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  context.locals.user = user;
  context.locals.profile = null;

  if (user) {
    context.locals.profile = await getCurrentPortalProfile(supabase, user.id);
  }

  async function hasModuleMembership(userId: string) {
    const { count, error } = await supabase
      .from("client_memberships")
      .select("id, clients!inner(id)", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("clients.is_active", true)
      .eq("clients.portal_module", portalModule)
      .is("clients.deleted_at", null);

    if (error) {
      console.error("No pudimos validar la membresia del usuario para el modulo actual.", error);
      return false;
    }

    return (count ?? 0) > 0;
  }

  async function userCanAccessCurrentModule() {
    if (!user || !context.locals.profile?.isActive) return false;

    if (context.locals.profile.role === "admin") {
      return context.locals.profile.portalModules.includes(portalModule);
    }

    return hasModuleMembership(user.id);
  }

  if (user && (!context.locals.profile || !context.locals.profile.isActive)) {
    await supabase.auth.signOut();
    context.locals.user = null;
    context.locals.profile = null;

    const loginUrl = buildAuthUrl(requestUrl, "/login");
    loginUrl.searchParams.set(
      "error",
      "Tu usuario ya no se encuentra habilitado en el portal."
    );

    if (pathname !== "/login") {
      return context.redirect(toSafeRedirectLocation(loginUrl));
    }
  }

  if (effectivePathname.startsWith("/clientes") && moduleRequiresAuth(portalModule) && !user) {
    return context.redirect(toSafeRedirectLocation(buildAuthUrl(requestUrl, "/login")));
  }

  if (effectivePathname.startsWith("/clientes") && moduleRequiresAuth(portalModule) && user) {
    const hasAccess = await userCanAccessCurrentModule();
    if (!hasAccess) {
      await supabase.auth.signOut();
      return context.redirect(toSafeRedirectLocation(buildAuthUrl(requestUrl, "/login")));
    }
  }

  if (effectivePathname.startsWith("/admin")) {
    if (!moduleHasManagement(portalModule)) {
      return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
    }

    if (!user) {
      return context.redirect(toSafeRedirectLocation(buildAuthUrl(requestUrl, "/login")));
    }

    const canAccessManagement = await userCanAccessCurrentModule();

    if (
      !context.locals.profile ||
      context.locals.profile.role !== "admin" ||
      !canAccessManagement
    ) {
      return context.redirect(
        getSectionHrefForPath(requestUrl, "/clientes/aplicaciones")
      );
    }
  }

  if (!moduleRequiresAuth(portalModule) && (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password")) {
    return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
  }

  if (effectivePathname.startsWith("/clientes/aplicaciones/")) {
    const requestedApplicationPath = normalizePortalPath(effectivePathname);

    if (moduleRequiresAuth(portalModule)) {
      if (!user) {
        return context.redirect(toSafeRedirectLocation(buildAuthUrl(requestUrl, "/login")));
      }

      const currentClient = await getCurrentPortalClient(supabase, user.id, portalModule);
      if (!currentClient) {
        return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
      }

      const applications = await getAuthorizedApplications(supabase, currentClient.id, portalModule);
      const allowedApplicationPaths = applications
        .filter((application) => application.availabilityStatus === "available")
        .map((application) => normalizePortalPath(application.url));

      if (!allowedApplicationPaths.includes(requestedApplicationPath)) {
        return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
      }
    } else {
      const applications = await getPublicModuleApplications(supabase, portalModule);
      const allowedApplicationPaths = applications
        .filter((application) => application.availabilityStatus === "available")
        .map((application) => normalizePortalPath(application.url));

      if (!allowedApplicationPaths.includes(requestedApplicationPath)) {
        return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
      }
    }
  }

  if (pathname === "/login" && user) {
    const redirectUrl =
      context.locals.profile?.role === "admin" && context.locals.profile.portalModules.includes(portalModule) && moduleHasManagement(portalModule)
        ? getSectionHrefForPath(requestUrl, "/admin")
        : getSectionHrefForPath(requestUrl, "/clientes/aplicaciones");
    return context.redirect(redirectUrl);
  }

  if (effectivePathname !== requestUrl.pathname) {
    const rewriteUrl = new URL(effectivePathname + requestUrl.search, requestUrl);
    return next(rewriteUrl);
  }

  return next();
});
