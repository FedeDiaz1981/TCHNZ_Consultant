import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import asanaXmlImporterHtml from "../../../assets/consultant-tools/asana-xml-importer.html?raw";
import dashboardMsProjectHtml from "../../../assets/consultant-tools/dashboard-ms-project.html?raw";
import totalDashHtml from "../../../assets/consultant-tools/totaldash.html?raw";
import { getForwardedRequestUrl } from "../../../lib/auth/http";
import {
  getAuthorizedApplications,
  getCurrentPortalClient,
  getPublicModuleApplications
} from "../../../lib/portal/client-access";
import { buildAuthUrl, getCurrentPortalModule, getSectionHrefForPath } from "../../../lib/portal/hosts";
import { moduleRequiresAuth } from "../../../lib/portal/modules";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

const embeddedTools = {
  "asana-xml-importer": {
    html: asanaXmlImporterHtml,
    applicationPath: "/clientes/aplicaciones/asana-xml-importer"
  },
  "dashboard-ms-project": {
    html: dashboardMsProjectHtml,
    applicationPath: "/clientes/aplicaciones/dashboard-ms-project"
  },
  totaldash: {
    html: totalDashHtml,
    applicationPath: "/clientes/aplicaciones/totaldash"
  }
} as const;

function normalizePortalPath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function injectTotalDashEntryChoice(
  html: string,
  payload: { url: string; key: string; email: string; tokenHash: string }
) {
  const appModuleTag =
    '<script type="module" crossorigin src="/consultant/consultant-tools/totaldash/assets/index-CY_M_wcA.js"></script>';

  const chooserModule = `
    <script type="module">
      const totalDashUrl = ${JSON.stringify(payload.url)};
      const totalDashKey = ${JSON.stringify(payload.key)};
      const currentEmail = ${JSON.stringify(payload.email)};
      const tokenHash = ${JSON.stringify(payload.tokenHash)};

      const loadTotalDashApp = () => {
        if (document.querySelector("[data-totaldash-app-loaded='1']")) return;
        const marker = document.createElement("meta");
        marker.setAttribute("data-totaldash-app-loaded", "1");
        document.head.appendChild(marker);

        const module = document.createElement("script");
        module.type = "module";
        module.crossOrigin = "anonymous";
        module.src = "/consultant/consultant-tools/totaldash/assets/index-CY_M_wcA.js";
        document.head.appendChild(module);
      };

      const removeChooser = () => {
        const chooser = document.getElementById("totaldash-entry-chooser");
        if (chooser) chooser.remove();
      };

      const openWithCurrentUser = async () => {
        try {
          const verifyResponse = await fetch(totalDashUrl + "/auth/v1/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: totalDashKey
            },
            body: JSON.stringify({
              type: "magiclink",
              email: currentEmail,
              token_hash: tokenHash
            })
          });

          if (!verifyResponse.ok) {
            const text = await verifyResponse.text();
            console.error("[TotalDash] verifyOtp failed:", verifyResponse.status, text);
          }
        } catch (error) {
          console.error("[TotalDash] verifyOtp network error:", error);
        } finally {
          removeChooser();
          loadTotalDashApp();
        }
      };

      const openWithAnotherAccount = () => {
        removeChooser();
        loadTotalDashApp();
      };

      const chooser = document.createElement("div");
      chooser.id = "totaldash-entry-chooser";
      chooser.innerHTML = \`
        <style>
          #totaldash-entry-chooser {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: grid;
            place-items: center;
            padding: 24px;
            background: radial-gradient(60% 50% at 50% 20%, rgba(118,54,140,.35), transparent 60%), rgba(8, 6, 14, .94);
            color: #f4f1f8;
            font-family: "Segoe UI", Tahoma, Arial, sans-serif;
          }
          .totaldash-entry-card {
            width: min(560px, 96vw);
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,.14);
            background: rgba(24,16,30,.9);
            box-shadow: 0 24px 64px rgba(0,0,0,.45);
            padding: 24px;
          }
          .totaldash-entry-card h2 {
            margin: 0 0 8px;
            font-size: 1.5rem;
          }
          .totaldash-entry-card p {
            margin: 0 0 18px;
            color: rgba(255,255,255,.78);
            line-height: 1.45;
          }
          .totaldash-entry-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .totaldash-entry-btn {
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 12px;
            min-height: 46px;
            padding: 0 14px;
            background: rgba(255,255,255,.06);
            color: #fff;
            font-size: .96rem;
            font-weight: 700;
            cursor: pointer;
          }
          .totaldash-entry-btn--primary {
            background: linear-gradient(180deg, #f8a63c, #eb7f18);
            color: #1c1208;
            border-color: transparent;
          }
          .totaldash-entry-email {
            color: #ffbf7f;
            font-weight: 800;
          }
        </style>
        <div class="totaldash-entry-card">
          <h2>Ingresar a TotalDash</h2>
          <p>
            Puedes continuar con tu usuario actual de Consultant
            <span class="totaldash-entry-email">\${currentEmail}</span>
            o iniciar sesión con otra cuenta de TotalDash.
          </p>
          <div class="totaldash-entry-actions">
            <button class="totaldash-entry-btn totaldash-entry-btn--primary" id="totaldash-continue-current">
              Continuar con usuario actual
            </button>
            <button class="totaldash-entry-btn" id="totaldash-login-other">
              Ingresar con otra cuenta
            </button>
          </div>
        </div>
      \`;

      document.body.appendChild(chooser);

      document
        .getElementById("totaldash-continue-current")
        ?.addEventListener("click", openWithCurrentUser);
      document
        .getElementById("totaldash-login-other")
        ?.addEventListener("click", openWithAnotherAccount);
    </script>
  `;

  if (html.includes(appModuleTag)) {
    return html.replace(appModuleTag, chooserModule);
  }

  return html.replace("</head>", `${chooserModule}</head>`);
}

export const GET: APIRoute = async (context) => {
  const toolKey = String(context.params.tool ?? "") as keyof typeof embeddedTools;
  const tool = embeddedTools[toolKey];

  if (!tool) {
    return new Response("Not found", { status: 404 });
  }

  const requestUrl = getForwardedRequestUrl(context.request);
  const portalModule = getCurrentPortalModule(requestUrl);
  const supabase = context.locals.supabase ?? createSupabaseServerClient(context);
  const requiresAuth = moduleRequiresAuth(portalModule);
  let authenticatedUserEmail = "";

  if (requiresAuth) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = buildAuthUrl(requestUrl, "/login");
      const location =
        loginUrl.hostname === "localhost" || loginUrl.hostname === "127.0.0.1"
          ? `${loginUrl.pathname}${loginUrl.search}`
          : loginUrl.toString();
      return context.redirect(location);
    }
    authenticatedUserEmail = user.email ?? "";

    const currentClient = await getCurrentPortalClient(supabase, user.id, portalModule);
    if (!currentClient) {
      return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
    }

    const applications = await getAuthorizedApplications(supabase, currentClient.id, portalModule);
    const allowedApplicationPaths = applications
      .filter((application) => application.availabilityStatus === "available")
      .map((application) => normalizePortalPath(application.url));

    if (!allowedApplicationPaths.includes(normalizePortalPath(tool.applicationPath))) {
      return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
    }
  } else {
    const applications = await getPublicModuleApplications(supabase, portalModule);
    const allowedApplicationPaths = applications
      .filter((application) => application.availabilityStatus === "available")
      .map((application) => normalizePortalPath(application.url));

    if (!allowedApplicationPaths.includes(normalizePortalPath(tool.applicationPath))) {
      return context.redirect(getSectionHrefForPath(requestUrl, "/clientes/aplicaciones"));
    }
  }

  let responseHtml = tool.html;
  if (toolKey === "totaldash" && authenticatedUserEmail) {
    const totalDashUrl = import.meta.env.TOTALDASH_SUPABASE_URL as string | undefined;
    const totalDashAnonKey = import.meta.env.TOTALDASH_SUPABASE_ANON_KEY as string | undefined;
    const totalDashServiceRoleKey = import.meta.env.TOTALDASH_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

    if (totalDashUrl && totalDashAnonKey && totalDashServiceRoleKey) {
      const totalDashAdmin = createClient(totalDashUrl, totalDashServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const temporaryPassword = `TD-${crypto.randomUUID()}-x9!`;
      const { error: createUserError } = await totalDashAdmin.auth.admin.createUser({
        email: authenticatedUserEmail,
        password: temporaryPassword,
        email_confirm: true
      });

      if (createUserError && !createUserError.message.toLowerCase().includes("already registered")) {
        console.error("[TotalDash SSO] createUser error:", createUserError.message);
      }

      const { data: linkData, error: linkError } = await totalDashAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: authenticatedUserEmail
      });

      const tokenHash = linkData?.properties?.hashed_token;
      if (linkError || !tokenHash) {
        console.error("[TotalDash SSO] generateLink error:", linkError?.message ?? "Missing token hash");
      } else {
        responseHtml = injectTotalDashEntryChoice(responseHtml, {
          url: totalDashUrl,
          key: totalDashAnonKey,
          email: authenticatedUserEmail,
          tokenHash
        });
      }
    }
  }

  return new Response(responseHtml, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN"
    }
  });
};
