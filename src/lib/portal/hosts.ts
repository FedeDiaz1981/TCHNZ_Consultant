import { publicSiteUrl } from "../auth/public";
import {
  isPortalBasePathRoot,
  portalBasePath,
  stripPortalBasePath,
  withPortalBasePath,
} from "./base-path";
import {
  getDefaultPortalModule,
  getModuleAuthHostname,
  getModuleContentSection,
  getModuleFromHostname,
  getModuleFromLocalPath,
  getModuleSectionHostname,
  getSectionFromHostname,
  getSectionFromLocalPath,
  isLocalPortalHostname,
  moduleHasManagement,
  moduleRequiresAuth,
  portalBaseDomain,
  type PortalModule,
  type PortalSection,
} from "./modules";

const authPagePaths = new Set(["/login", "/forgot-password", "/reset-password"]);
const singleHostSectionSegments: Partial<Record<PortalSection, string>> = {
  tools: "tools",
  blog: "blog",
  training: "training",
  management: "management",
};

function joinOrigin(protocol: string, hostname: string, port: string) {
  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

function getBaseProtocolAndPort() {
  const configuredUrl = new URL(publicSiteUrl);
  return {
    protocol: configuredUrl.protocol,
    hostname: configuredUrl.hostname,
    port: configuredUrl.port,
  };
}

const { protocol: baseProtocol, hostname: baseHostname, port: basePort } = getBaseProtocolAndPort();

export function supportsSectionHosts(url: URL) {
  if (isLocalPortalHostname(url.hostname)) return false;

  return url.hostname === portalBaseDomain || url.hostname.endsWith(`.${portalBaseDomain}`);
}

export function getCurrentPortalModule(url: URL): PortalModule {
  const pathname = stripPortalBasePath(url.pathname);

  if (isLocalPortalHostname(url.hostname)) {
    return getModuleFromLocalPath(pathname) ?? getDefaultPortalModule();
  }

  return getModuleFromHostname(url.hostname) ?? getDefaultPortalModule();
}

export function getCurrentPortalSection(url: URL): PortalSection {
  const pathname = stripPortalBasePath(url.pathname);

  if (isLocalPortalHostname(url.hostname)) {
    return getSectionFromSingleHostPath(pathname) ?? getSectionFromLocalPath(pathname) ?? "auth";
  }

  return getSectionFromSingleHostPath(pathname) ?? getSectionFromHostname(url.hostname) ?? "auth";
}

export function getSectionHostname(module: PortalModule, section: PortalSection) {
  if (portalBasePath) return baseHostname;
  return getModuleSectionHostname(module, section);
}

export function getSectionOrigin(module: PortalModule, section: PortalSection) {
  return joinOrigin(baseProtocol, getSectionHostname(module, section), basePort);
}

export function buildSectionUrl(module: PortalModule, section: PortalSection, pathname = "/") {
  return new URL(withPortalBasePath(pathname), getSectionOrigin(module, section));
}

export function buildAuthUrl(currentUrl: URL, pathname: string, module = getCurrentPortalModule(currentUrl)) {
  if (supportsSectionHosts(currentUrl)) {
    if (!moduleRequiresAuth(module)) {
      return buildSingleHostSectionUrl(module, "tools", "/");
    }

    return buildSingleHostSectionUrl(module, "auth", pathname);
  }

  return new URL(withPortalBasePath(pathname), currentUrl);
}

export function getSharedCookieDomain(currentUrl: URL) {
  if (!supportsSectionHosts(currentUrl)) return undefined;
  if (portalBasePath) return undefined;

  const module = getCurrentPortalModule(currentUrl);
  if (!moduleRequiresAuth(module)) return undefined;

  return `.${getModuleAuthHostname(module)}`;
}

function getSectionForInternalPath(module: PortalModule, pathname: string) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!moduleHasManagement(module)) return null;

    return {
      section: "management" as const,
      externalPath: pathname === "/admin" ? "/" : pathname.slice("/admin".length),
    };
  }

  if (pathname === "/clientes/aplicaciones" || pathname.startsWith("/clientes/aplicaciones/")) {
    return {
      section: "tools" as const,
      externalPath:
        pathname === "/clientes/aplicaciones" ? "/" : pathname.slice("/clientes/aplicaciones".length),
    };
  }

  const contentSection = getModuleContentSection(module);
  if (!contentSection) return null;

  if (pathname === "/clientes/blog" || pathname.startsWith("/clientes/blog/")) {
    return {
      section: contentSection,
      externalPath: pathname === "/clientes/blog" ? "/" : pathname.slice("/clientes/blog".length),
    };
  }

  return null;
}

export function mapInternalPathToSection(currentUrl: URL, pathname: string) {
  const module = getCurrentPortalModule(currentUrl);
  return getSectionForInternalPath(module, pathname);
}

function buildSingleHostSectionPath(section: PortalSection, externalPath = "/") {
  let sectionPath = externalPath;

  if (section === "auth") {
    return withPortalBasePath(sectionPath);
  }

  const sectionSegment = singleHostSectionSegments[section];
  if (!sectionSegment) return withPortalBasePath(sectionPath);

  sectionPath = externalPath === "/" ? `/${sectionSegment}` : `/${sectionSegment}${externalPath}`;
  return withPortalBasePath(sectionPath);
}

function buildSingleHostSectionUrl(module: PortalModule, section: PortalSection, externalPath = "/") {
  return new URL(buildSingleHostSectionPath(section, externalPath), getSectionOrigin(module, "auth"));
}

function buildLocalSectionPath(module: PortalModule, section: PortalSection, externalPath = "/") {
  void module;
  return buildSingleHostSectionPath(section, externalPath);
}

function getSectionFromSingleHostPath(pathname: string): PortalSection | null {
  const firstSegment = stripPortalBasePath(pathname).split("/").filter(Boolean)[0];
  if (!firstSegment) return null;

  const match = Object.entries(singleHostSectionSegments).find(([, segment]) => segment === firstSegment);
  return (match?.[0] as PortalSection | undefined) ?? null;
}

function getRewritePathForSingleHostSectionPath(pathname: string) {
  const strippedPathname = stripPortalBasePath(pathname);
  const section = getSectionFromSingleHostPath(strippedPathname);
  if (!section) return null;

  const parts = strippedPathname.split("/").filter(Boolean);
  const nestedPath = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "/";

  if (section === "management") {
    return nestedPath === "/" ? "/admin" : `/admin${nestedPath}`;
  }

  if (section === "tools") {
    return nestedPath === "/" ? "/clientes/aplicaciones" : `/clientes/aplicaciones${nestedPath}`;
  }

  if (section === "blog" || section === "training") {
    return nestedPath === "/" ? "/clientes/blog" : `/clientes/blog${nestedPath}`;
  }

  return null;
}

function getRewritePathForLocalSectionPath(pathname: string) {
  const module = getModuleFromLocalPath(pathname);
  const section = getSectionFromLocalPath(pathname);

  if (!module || !section) return null;

  const parts = pathname.split("/").filter(Boolean);
  const nestedPath = parts.length > 2 ? `/${parts.slice(2).join("/")}` : "/";

  if (section === "management") {
    return nestedPath === "/" ? "/admin" : `/admin${nestedPath}`;
  }

  if (section === "tools") {
    return nestedPath === "/" ? "/clientes/aplicaciones" : `/clientes/aplicaciones${nestedPath}`;
  }

  if (section === "blog" || section === "training") {
    return nestedPath === "/" ? "/clientes/blog" : `/clientes/blog${nestedPath}`;
  }

  return null;
}

export function getSectionHrefForPath(currentUrl: URL, internalPath: string) {
  const mapping = mapInternalPathToSection(currentUrl, internalPath);
  if (!mapping) {
    return withPortalBasePath(internalPath);
  }

  if (isLocalPortalHostname(currentUrl.hostname)) {
    return buildLocalSectionPath(getCurrentPortalModule(currentUrl), mapping.section, mapping.externalPath);
  }

  if (!supportsSectionHosts(currentUrl)) {
    return internalPath;
  }

  return buildSingleHostSectionUrl(
    getCurrentPortalModule(currentUrl),
    mapping.section,
    mapping.externalPath
  ).toString();
}

function isInternalOrSystemPath(pathname: string) {
  const strippedPathname = stripPortalBasePath(pathname);

  return (
    strippedPathname.startsWith("/api") ||
    strippedPathname.startsWith("/auth") ||
    strippedPathname.startsWith("/_astro") ||
    strippedPathname.startsWith("/assets") ||
    strippedPathname.startsWith("/scripts") ||
    authPagePaths.has(strippedPathname) ||
    strippedPathname === "/favicon.png" ||
    strippedPathname === "/favicon.svg"
  );
}

export function getCanonicalSectionUrl(currentUrl: URL) {
  const currentPathname = stripPortalBasePath(currentUrl.pathname);

  if (isPortalBasePathRoot(currentUrl.pathname)) {
    const target = buildSingleHostSectionUrl(getCurrentPortalModule(currentUrl), "tools", "/");
    target.search = currentUrl.search;
    return target;
  }

  if (isLocalPortalHostname(currentUrl.hostname)) {
    const localModule = getModuleFromLocalPath(currentPathname) ?? getDefaultPortalModule();

    if (currentPathname === `/${localModule}`) {
      const target = new URL(buildLocalSectionPath(localModule, "tools"), currentUrl);
      target.search = currentUrl.search;
      return target;
    }

    const mapping = getSectionForInternalPath(localModule, currentPathname);
    if (!mapping) return null;

    const target = new URL(
      buildLocalSectionPath(localModule, mapping.section, mapping.externalPath),
      currentUrl
    );
    target.search = currentUrl.search;

    if (target.pathname !== currentUrl.pathname) {
      return target;
    }

    return null;
  }

  if (!supportsSectionHosts(currentUrl)) return null;

  const currentModule = getCurrentPortalModule(currentUrl);
  const currentSection = getCurrentPortalSection(currentUrl);
  const currentAuthHostname = getSectionHostname(currentModule, "auth");

  if (currentSection !== "auth" && currentUrl.hostname !== currentAuthHostname) {
    const target = buildSingleHostSectionUrl(currentModule, currentSection, currentPathname);
    target.search = currentUrl.search;
    return target;
  }

  if (!moduleRequiresAuth(currentModule) && (currentSection === "auth" || authPagePaths.has(currentPathname) || currentPathname.startsWith("/auth/"))) {
    return buildSingleHostSectionUrl(currentModule, "tools", "/");
  }

  if (currentSection !== "auth" && (authPagePaths.has(currentPathname) || currentPathname.startsWith("/auth/"))) {
    const authTarget = buildSingleHostSectionUrl(currentModule, "auth", currentPathname);
    authTarget.search = currentUrl.search;
    return authTarget;
  }

  if (currentSection === "auth" && currentPathname === "/" && !moduleRequiresAuth(currentModule)) {
    return buildSingleHostSectionUrl(currentModule, "tools", "/");
  }

  const mapping = getSectionForInternalPath(currentModule, currentPathname);
  if (!mapping) return null;

  const target = buildSingleHostSectionUrl(currentModule, mapping.section, mapping.externalPath);
  target.search = currentUrl.search;

  if (target.hostname !== currentUrl.hostname || target.pathname !== currentUrl.pathname) {
    return target;
  }

  if (currentSection && currentSection !== mapping.section) {
    return target;
  }

  return null;
}

export function getRewritePathForSectionHost(currentUrl: URL) {
  const currentPathname = stripPortalBasePath(currentUrl.pathname);

  if (currentPathname !== currentUrl.pathname && isInternalOrSystemPath(currentPathname)) {
    return currentPathname;
  }

  if (isLocalPortalHostname(currentUrl.hostname)) {
    return getRewritePathForSingleHostSectionPath(currentPathname) ?? getRewritePathForLocalSectionPath(currentPathname);
  }

  if (!supportsSectionHosts(currentUrl)) return null;
  if (isInternalOrSystemPath(currentPathname)) return null;

  const singleHostRewritePath = getRewritePathForSingleHostSectionPath(currentPathname);
  if (singleHostRewritePath) return singleHostRewritePath;

  const currentSection = getCurrentPortalSection(currentUrl);
  if (!currentSection || currentSection === "auth") return null;

  if (currentSection === "management") {
    return currentPathname === "/" ? "/admin" : `/admin${currentPathname}`;
  }

  if (currentSection === "tools") {
    return currentPathname === "/"
      ? "/clientes/aplicaciones"
      : `/clientes/aplicaciones${currentPathname}`;
  }

  if (currentSection === "blog" || currentSection === "training") {
    return currentPathname === "/" ? "/clientes/blog" : `/clientes/blog${currentPathname}`;
  }

  return null;
}

export function getPortalRequestPathname(currentUrl: URL) {
  return stripPortalBasePath(currentUrl.pathname);
}
