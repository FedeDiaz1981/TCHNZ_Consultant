export type PortalModule = "customers" | "consultant" | "comercial" | "support";
export type ManagedPortalSection = "tools" | "blog" | "training" | "management";
export type PortalSection = "auth" | ManagedPortalSection;

type PortalModuleConfig = {
  key: PortalModule;
  authSubdomain: string;
  name: {
    es: string;
    en: string;
  };
  entity: {
    singular: {
      es: string;
      en: string;
    };
    plural: {
      es: string;
      en: string;
    };
  };
  contentSection: "blog" | "training" | null;
  hasManagement: boolean;
  requiresAuth: boolean;
};

const localHostnames = new Set(["localhost", "127.0.0.1"]);

export const portalModules: Record<PortalModule, PortalModuleConfig> = {
  customers: {
    key: "customers",
    authSubdomain: "customers",
    name: {
      es: "Customers",
      en: "Customers",
    },
    entity: {
      singular: {
        es: "Cliente",
        en: "Customer",
      },
      plural: {
        es: "Clientes",
        en: "Customers",
      },
    },
    contentSection: "blog",
    hasManagement: true,
    requiresAuth: true,
  },
  consultant: {
    key: "consultant",
    authSubdomain: "consultant",
    name: {
      es: "Consultant",
      en: "Consultant",
    },
    entity: {
      singular: {
        es: "Consultor",
        en: "Consultant",
      },
      plural: {
        es: "Consultores",
        en: "Consultants",
      },
    },
    contentSection: "training",
    hasManagement: true,
    requiresAuth: true,
  },
  comercial: {
    key: "comercial",
    authSubdomain: "comercial",
    name: {
      es: "Comercial",
      en: "Commercial",
    },
    entity: {
      singular: {
        es: "Cuenta comercial",
        en: "Commercial account",
      },
      plural: {
        es: "Cuentas comerciales",
        en: "Commercial accounts",
      },
    },
    contentSection: null,
    hasManagement: true,
    requiresAuth: true,
  },
  support: {
    key: "support",
    authSubdomain: "support",
    name: {
      es: "Support",
      en: "Support",
    },
    entity: {
      singular: {
        es: "Cuenta support",
        en: "Support account",
      },
      plural: {
        es: "Cuentas support",
        en: "Support accounts",
      },
    },
    contentSection: "training",
    hasManagement: false,
    requiresAuth: false,
  },
};

export function getDefaultPortalModule(): PortalModule {
  const configuredModule = import.meta.env.PUBLIC_PORTAL_DEFAULT_MODULE?.trim() as
    | PortalModule
    | undefined;

  if (configuredModule && configuredModule in portalModules) {
    return configuredModule;
  }

  return "consultant";
}

export function getModuleFromLocalPath(pathname: string): PortalModule | null {
  const parts = pathname.split("/").filter(Boolean);
  const firstSegment = parts[0];

  if (firstSegment && firstSegment in portalModules) {
    return firstSegment as PortalModule;
  }

  return null;
}

export function getSectionFromLocalPath(pathname: string): PortalSection | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const section = parts[1];
  if (
    section === "tools" ||
    section === "blog" ||
    section === "training" ||
    section === "management"
  ) {
    return section;
  }

  return null;
}

function getConfiguredBaseDomain() {
  const configuredBaseDomain = import.meta.env.PUBLIC_PORTAL_BASE_DOMAIN?.trim();
  if (configuredBaseDomain) return configuredBaseDomain;

  const siteHostname = new URL(import.meta.env.PUBLIC_SITE_URL).hostname;
  if (localHostnames.has(siteHostname)) return siteHostname;

  const parts = siteHostname.split(".").filter(Boolean);
  if (parts.length <= 2) return siteHostname;

  return parts.slice(1).join(".");
}

export const portalBaseDomain = getConfiguredBaseDomain();

export function isLocalPortalHostname(hostname: string) {
  return localHostnames.has(hostname);
}

export function getPortalModuleConfig(module: PortalModule) {
  return portalModules[module];
}

export function getModuleAuthHostname(module: PortalModule) {
  if (isLocalPortalHostname(portalBaseDomain)) return portalBaseDomain;
  return `${portalModules[module].authSubdomain}.${portalBaseDomain}`;
}

export function getModuleSectionHostname(module: PortalModule, section: PortalSection) {
  if (section === "auth") return getModuleAuthHostname(module);
  return `${section}.${getModuleAuthHostname(module)}`;
}

export function getModuleFromHostname(hostname: string): PortalModule | null {
  if (isLocalPortalHostname(hostname)) return getDefaultPortalModule();

  const baseSuffix = `.${portalBaseDomain}`;
  if (!hostname.endsWith(baseSuffix)) return null;

  const withoutBase = hostname.slice(0, -baseSuffix.length);
  const parts = withoutBase.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  const moduleSubdomain = parts.length === 1 ? parts[0] : parts[1];

  return (
    (Object.values(portalModules).find((module) => module.authSubdomain === moduleSubdomain)?.key ??
      null)
  );
}

export function getSectionFromHostname(hostname: string): PortalSection | null {
  if (isLocalPortalHostname(hostname)) return "auth";

  const baseSuffix = `.${portalBaseDomain}`;
  if (!hostname.endsWith(baseSuffix)) return null;

  const withoutBase = hostname.slice(0, -baseSuffix.length);
  const parts = withoutBase.split(".").filter(Boolean);

  if (parts.length === 1) return "auth";
  return (parts[0] as PortalSection) ?? null;
}

export function moduleHasContentSection(module: PortalModule) {
  return portalModules[module].contentSection !== null;
}

export function moduleHasManagement(module: PortalModule) {
  return portalModules[module].hasManagement;
}

export function moduleRequiresAuth(module: PortalModule) {
  return portalModules[module].requiresAuth;
}

export function getModuleContentSection(module: PortalModule) {
  return portalModules[module].contentSection;
}

export function getModuleContentNavLabel(module: PortalModule, locale: "es" | "en" = "es") {
  const contentSection = getModuleContentSection(module);
  if (contentSection === "training") {
    return locale === "en" ? "Training" : "Training";
  }

  return locale === "en" ? "Blog" : "Blog";
}

export function getModuleToolsNavLabel(locale: "es" | "en" = "es") {
  return locale === "en" ? "Tools" : "Aplicaciones";
}
