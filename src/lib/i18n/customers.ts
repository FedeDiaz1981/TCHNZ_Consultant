import { getSharedCookieDomain } from "../portal/hosts";

export const customerLocaleCookieName = "customers_lang";
export const customerLocales = ["es", "en"] as const;

export type CustomerLocale = (typeof customerLocales)[number];

export function isCustomerLocale(value: unknown): value is CustomerLocale {
  return typeof value === "string" && customerLocales.includes(value as CustomerLocale);
}

export function getCustomerLocale(
  url: URL,
  cookies: { get: (name: string) => { value: string } | undefined }
): CustomerLocale {
  const queryLocale = url.searchParams.get("lang");
  if (isCustomerLocale(queryLocale)) {
    return queryLocale;
  }

  const cookieLocale = cookies.get(customerLocaleCookieName)?.value;
  if (isCustomerLocale(cookieLocale)) {
    return cookieLocale;
  }

  return "es";
}

export function getCustomerIntlLocale(locale: CustomerLocale) {
  return locale === "en" ? "en-US" : "es-AR";
}

export function getCustomerLanguageCookieOptions(currentUrl: URL) {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: currentUrl.protocol === "https:",
    httpOnly: false,
    domain: getSharedCookieDomain(currentUrl)
  };
}

export const customerUi = {
  es: {
    localeLabel: "Idioma",
    portal: {
      areaPrivate: "Area privada",
      menu: "Menu",
      logout: "Cerrar sesion",
      navApplications: "Aplicaciones",
      navBlog: "Blog",
      clientLogoAlt: "Logo del consultor"
    },
    authShell: {
      footer: "Acceso a Technized Web Tools - Powered by BlatoRH"
    },
    turnstile: {
      title: "No soy un robot",
      idle: "Haz click para verificar.",
      loading: "Verificando...",
      verified: "Verificacion completada.",
      error: "Haz click para verificar.",
      notConfigured: "Falta configurar Turnstile para este portal.",
      validateError: "No pudimos validar el captcha. Intenta nuevamente.",
      expiredError: "La verificacion expiro. Haz click otra vez.",
      timeoutError: "La verificacion demoro demasiado. Intenta nuevamente.",
      loadError: "No pudimos cargar la verificacion. Recarga la pagina.",
      submitError: 'Marca "No soy un robot" para continuar.'
    },
    login: {
      title: "Technized Consultant",
      description: "Acceso privado para consultores Technized.",
      eyebrow: "Portal consultores",
      heading: "Portal privado de herramientas web para Consultores",
      copy: "Ingresa con tu cuenta para ver aplicaciones, herramientas y accesos asignados a tu organizacion.",
      signIn: "Inicio de sesion",
      cardHeading: "Ingresar",
      cardCopy: "Usa las credenciales habilitadas para tu consultora.",
      email: "Email",
      emailPlaceholder: "consultor@empresa.com",
      password: "Contrasena",
      forgotPassword: "Olvide mi contrasena",
      submit: "Ingresar"
    },
    forgotPassword: {
      title: "Recuperar Clave | Technized",
      description: "Solicita un enlace para restablecer tu clave de acceso.",
      eyebrow: "Recuperacion",
      heading: "Recupera tu acceso al portal",
      copy: "Te enviaremos un enlace seguro para definir una nueva clave.",
      overline: "Password reset",
      cardHeading: "Recuperar clave",
      cardCopy: "Completa tu email corporativo y valida el captcha para continuar.",
      email: "Email",
      submit: "Enviar enlace",
      backToLogin: "Volver a iniciar sesion"
    },
    resetPassword: {
      title: "Nueva Clave | Technized",
      description: "Define una nueva clave para recuperar tu acceso al portal.",
      eyebrow: "Seguridad",
      heading: "Define una nueva clave",
      copy: "Usa una clave nueva para recuperar el acceso a tus herramientas.",
      overline: "Password reset",
      cardHeading: "Nueva clave",
      readyCopy: "Ingresa una clave nueva para completar la recuperacion.",
      invalidCopy: "Necesitas abrir un enlace valido de recuperacion para continuar.",
      restoringAccess: "Restableciendo acceso para",
      newPassword: "Nueva contrasena",
      newPasswordPlaceholder: "Minimo 8 caracteres",
      confirmPassword: "Confirmar contrasena",
      confirmPasswordPlaceholder: "Repite tu nueva clave",
      submit: "Guardar nueva clave",
      requestNewLink: "Solicita un nuevo enlace de recuperacion desde el login para continuar.",
      requestNewLinkCta: "Solicitar nuevo enlace"
    },
    authRecovery: {
      title: "Validando acceso | Technized",
      description: "Estamos validando el enlace de acceso para que puedas definir tu clave.",
      eyebrow: "Acceso seguro",
      heading: "Validando tu enlace",
      copy: "Estamos preparando el acceso para que puedas definir tu clave en el portal.",
      waiting: "Un momento. Si el enlace es valido, te redirigiremos automaticamente.",
      initError: "No pudimos iniciar la validacion del enlace. Solicita uno nuevo.",
      invalidLink: "El enlace de recuperacion es invalido o ya expiro.",
      readyMessage: "Ahora puedes definir una nueva contrasena.",
      verifyError: "No pudimos validar el enlace de recuperacion. Solicita uno nuevo."
    },
    applications: {
      title: "Aplicaciones Consultores",
      description: "Catalogo privado de herramientas habilitadas para consultores.",
      noClient: "No encontramos un consultor activo asociado a esta cuenta. Cuando asignes la membresia en Supabase, aca van a aparecer el logo y las herramientas del consultor.",
      eyebrow: "Catalogo de Web Tools",
      heroKicker: "Web tools",
      heroTitle: "Herramientas",
      enabledTools: "Herramientas habilitadas",
      enabledToolsMeta: "Catalogo asignado a tu cuenta",
      readyTools: "Listas para usar",
      readyToolsMeta: "Acceso inmediato desde el portal",
      searchPlaceholder: "Buscar por nombre, categoria, descripcion o etiqueta",
      noTools: "Este consultor todavia no tiene herramientas habilitadas.",
      category: "Categoria",
      accessStatus: "Estado de acceso",
      areas: "Areas",
      all: "Todas",
      results: "Resultados",
      resultsSuffix: "herramientas",
      emptyFilter: "No encontramos herramientas que coincidan con esa busqueda o filtro. Proba limpiar criterios para volver a ver el catalogo completo.",
      defaultDescription: "Herramienta privada habilitada para este consultor.",
      accessAvailableNow: "Acceso disponible en este momento.",
      visibleNotEnabled: "Modulo visible, aun no habilitado para uso directo.",
      openTool: "Abrir herramienta",
      comingSoon: "Proximamente",
      noAccess: "Sin acceso",
      footer: "Technized Web Tools - Powered by BlatoRH",
      accessTier: {
        included: "Incluida",
        premium: "Premium",
        featured: "Destacada",
        new: "Nueva"
      },
      availability: {
        available: "Lista para usar",
        coming_soon: "Proximamente",
        disabled: "Sin acceso"
      }
    },
    blogList: {
      title: "Training Consultores",
      description: "Guias, novedades y contenido privado para consultores.",
      eyebrow: "Training del portal",
      heading: "Contenido, training y guias",
      copy: "Recorre articulos, anuncios y material de referencia pensado para acompanar a los consultores que operan dentro del portal Technized.",
      publications: "Recursos",
      publicationsMeta: "Disponibles para lectura",
      featured: "Destacadas",
      featuredMeta: "Curadas desde administracion",
      searchPlaceholder: "Buscar por titulo, autor, resumen o tag",
      noPosts: "Aun no hay contenidos publicados en training.",
      featuredArticle: "Guia destacada",
      featuredBadge: "Destacado",
      readArticle: "Abrir recurso",
      availableEntries: "Recursos disponibles",
      emptyFilter: "No encontramos articulos que coincidan con esa busqueda.",
      recentPublication: "Publicacion reciente",
      footer: "Technized Web Tools - Powered by BlatoRH"
    },
    blogDetail: {
      titleSuffix: "Training Consultores",
      descriptionFallback: "Contenido privado de training Technized para consultores.",
      backToBlog: "Volver a training",
      eyebrow: "Training del portal",
      featured: "Destacado",
      footer: "Technized Web Tools - Powered by BlatoRH"
    }
  },
  en: {
    localeLabel: "Language",
    portal: {
      areaPrivate: "Private area",
      menu: "Menu",
      logout: "Sign out",
      navApplications: "Tools",
      navBlog: "Blog",
      clientLogoAlt: "Consultant logo"
    },
    authShell: {
      footer: "Access to Technized Web Tools - Powered by BlatoRH"
    },
    turnstile: {
      title: "I'm not a robot",
      idle: "Click to verify.",
      loading: "Verifying...",
      verified: "Verification completed.",
      error: "Click to verify.",
      notConfigured: "Turnstile is not configured for this portal.",
      validateError: "We could not validate the captcha. Please try again.",
      expiredError: "The verification expired. Click again.",
      timeoutError: "The verification took too long. Please try again.",
      loadError: "We could not load the verification. Refresh the page.",
      submitError: 'Check "I\'m not a robot" to continue.'
    },
    login: {
      title: "Technized Consultant",
      description: "Private access for Technized consultants.",
      eyebrow: "Consultant portal",
      heading: "Private web tools portal for consultants",
      copy: "Sign in with your account to see the apps, tools and access assigned to your organization.",
      signIn: "Sign in",
      cardHeading: "Sign in",
      cardCopy: "Use the credentials enabled for your consulting firm.",
      email: "Email",
      emailPlaceholder: "consultant@company.com",
      password: "Password",
      forgotPassword: "I forgot my password",
      submit: "Sign in"
    },
    forgotPassword: {
      title: "Recover Password | Technized",
      description: "Request a link to reset your access password.",
      eyebrow: "Recovery",
      heading: "Recover your portal access",
      copy: "We will send you a secure link to set a new password.",
      overline: "Password reset",
      cardHeading: "Recover password",
      cardCopy: "Enter your corporate email and validate the captcha to continue.",
      email: "Email",
      submit: "Send link",
      backToLogin: "Back to sign in"
    },
    resetPassword: {
      title: "New Password | Technized",
      description: "Set a new password to regain access to the portal.",
      eyebrow: "Security",
      heading: "Set a new password",
      copy: "Use a new password to recover access to your tools.",
      overline: "Password reset",
      cardHeading: "New password",
      readyCopy: "Enter a new password to complete the recovery.",
      invalidCopy: "You need to open a valid recovery link to continue.",
      restoringAccess: "Resetting access for",
      newPassword: "New password",
      newPasswordPlaceholder: "At least 8 characters",
      confirmPassword: "Confirm password",
      confirmPasswordPlaceholder: "Repeat your new password",
      submit: "Save new password",
      requestNewLink: "Request a new recovery link from the login screen to continue.",
      requestNewLinkCta: "Request new link"
    },
    authRecovery: {
      title: "Validating access | Technized",
      description: "We are validating the access link so you can set your password.",
      eyebrow: "Secure access",
      heading: "Validating your link",
      copy: "We are preparing access so you can set your password in the portal.",
      waiting: "One moment. If the link is valid, we will redirect you automatically.",
      initError: "We could not start link validation. Request a new one.",
      invalidLink: "The recovery link is invalid or has expired.",
      readyMessage: "You can now set a new password.",
      verifyError: "We could not validate the recovery link. Request a new one."
    },
    applications: {
      title: "Consultant Applications",
      description: "Private catalog of tools enabled for consultants.",
      noClient: "We could not find an active consultant associated with this account. Once the membership is assigned in Supabase, the consultant logo and tools will appear here.",
      eyebrow: "Web Tools Catalog",
      heroKicker: "Web tools",
      heroTitle: "Tools",
      enabledTools: "Enabled tools",
      enabledToolsMeta: "Catalog assigned to your account",
      readyTools: "Ready to use",
      readyToolsMeta: "Immediate access from the portal",
      searchPlaceholder: "Search by name, category, description or tag",
      noTools: "This consultant does not have any tools enabled yet.",
      category: "Category",
      accessStatus: "Access status",
      areas: "Areas",
      all: "All",
      results: "Results",
      resultsSuffix: "tools",
      emptyFilter: "We could not find any tools matching that search or filter. Try clearing the criteria to see the full catalog again.",
      defaultDescription: "Private tool enabled for this consultant.",
      accessAvailableNow: "Access available right now.",
      visibleNotEnabled: "Module visible, not yet enabled for direct use.",
      openTool: "Open tool",
      comingSoon: "Coming soon",
      noAccess: "No access",
      footer: "Technized Web Tools - Powered by BlatoRH",
      accessTier: {
        included: "Included",
        premium: "Premium",
        featured: "Featured",
        new: "New"
      },
      availability: {
        available: "Ready to use",
        coming_soon: "Coming soon",
        disabled: "No access"
      }
    },
    blogList: {
      title: "Consultant Training",
      description: "Guides, updates and private content for consultants.",
      eyebrow: "Portal training",
      heading: "Content, training and guides",
      copy: "Browse articles, announcements and reference material designed to support consultants working inside the Technized portal.",
      publications: "Resources",
      publicationsMeta: "Available to read",
      featured: "Featured",
      featuredMeta: "Curated from administration",
      searchPlaceholder: "Search by title, author, summary or tag",
      noPosts: "There is no published training content yet.",
      featuredArticle: "Featured guide",
      featuredBadge: "Featured",
      readArticle: "Open resource",
      availableEntries: "Available resources",
      emptyFilter: "We could not find any articles matching that search.",
      recentPublication: "Recent publication",
      footer: "Technized Web Tools - Powered by BlatoRH"
    },
    blogDetail: {
      titleSuffix: "Consultant Training",
      descriptionFallback: "Private Technized training content for consultants.",
      backToBlog: "Back to training",
      eyebrow: "Portal training",
      featured: "Featured",
      footer: "Technized Web Tools - Powered by BlatoRH"
    }
  }
} as const;

export function getCustomerUi(locale: CustomerLocale) {
  return customerUi[locale];
}

const applicationCategoryTranslations = {
  general: { es: "General", en: "General" },
  operacion: { es: "Operacion", en: "Operations" },
  productividad: { es: "Productividad", en: "Productivity" },
  comunicacion: { es: "Comunicacion", en: "Communication" },
  "gestion de proyectos": { es: "Gestion de proyectos", en: "Project management" }
} as const;

const applicationTagTranslations = {
  asistencia: { es: "Asistencia", en: "Attendance" },
  dotacion: { es: "Dotacion", en: "Staffing" },
  reconversion: { es: "Reconversion", en: "Conversion" },
  "time tracking": { es: "Time Tracking", en: "Time Tracking" },
  comunicacion: { es: "Comunicacion", en: "Communication" },
  productividad: { es: "Productividad", en: "Productivity" },
  proyectos: { es: "Proyectos", en: "Projects" },
  asana: { es: "Asana", en: "Asana" },
  "ms project": { es: "MS Project", en: "MS Project" },
  consultoria: { es: "Consultoria", en: "Consulting" },
  dashboard: { es: "Dashboard", en: "Dashboard" },
  seguridad: { es: "Seguridad", en: "Security" },
  capacitacion: { es: "Capacitacion", en: "Training" }
} as const;

const applicationBadgeTranslations = {
  operativa: { es: "Operativa", en: "Operational" },
  destacada: { es: "Destacada", en: "Featured" },
  featured: { es: "Destacada", en: "Featured" },
  included: { es: "Incluida", en: "Included" },
  premium: { es: "Premium", en: "Premium" },
  nueva: { es: "Nueva", en: "New" },
  new: { es: "Nueva", en: "New" }
} as const;

const applicationDescriptionTranslations = {
  "tiempo-empleado": {
    es: "Procesamiento de presencias y ausencias para consultores.",
    en: "Attendance and absence processing for consultants."
  },
  "reconversion-fichadas": {
    es: "Reconversion y validacion de archivos Time Tracking para consultores.",
    en: "Time tracking file conversion and validation for consultants."
  },
  "reconversion-archivo": {
    es: "Reconversion y validacion de archivos Time Tracking para consultores.",
    en: "Time tracking file conversion and validation for consultants."
  },
  "asana-xml-importer": {
    es: "Importa XML de Microsoft Project hacia Asana con mapeo de campos y modo simulacion.",
    en: "Import Microsoft Project XML files into Asana with field mapping and dry-run mode."
  },
  "dashboard-ms-project": {
    es: "Analiza XML de Microsoft Project con KPIs, Gantt, comparativas y reportes ejecutivos.",
    en: "Analyze Microsoft Project XML files with KPIs, Gantt views, comparisons and executive reports."
  },
  totaldash: {
    es: "Dashboard operativo integral para proyectos, horas y analitica de consultoria.",
    en: "All-in-one operations dashboard for project tracking, time records and consulting analytics."
  },
  "cursos-seguridad": {
    es: "Biblioteca de cursos y recursos de seguridad para consultores.",
    en: "Security courses and awareness resources library for consultants."
  },
  novedades: {
    es: "Novedades, anuncios y contenido clave para equipos consultores.",
    en: "Updates, announcements and key content for consultant teams."
  },
  herramientas: {
    es: "Kit operativo y recursos de soporte para equipos consultores.",
    en: "Operational toolkit and support resources for consultant teams."
  }
} as const;

function normalizeApplicationTranslationKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getLocalizedApplicationCategory(locale: CustomerLocale, category: string) {
  const entry =
    applicationCategoryTranslations[
      normalizeApplicationTranslationKey(category) as keyof typeof applicationCategoryTranslations
    ];

  return entry?.[locale] ?? category;
}

export function getLocalizedApplicationTag(locale: CustomerLocale, tag: string) {
  const entry =
    applicationTagTranslations[
      normalizeApplicationTranslationKey(tag) as keyof typeof applicationTagTranslations
    ];

  return entry?.[locale] ?? tag;
}

export function getLocalizedApplicationBadge(
  locale: CustomerLocale,
  badgeLabel: string | null | undefined
) {
  if (!badgeLabel) return null;

  const entry =
    applicationBadgeTranslations[
      normalizeApplicationTranslationKey(badgeLabel) as keyof typeof applicationBadgeTranslations
    ];

  return entry?.[locale] ?? badgeLabel;
}

export function getLocalizedApplicationDescription(
  locale: CustomerLocale,
  slug: string,
  fallbackDescription: string | null | undefined
) {
  const entry =
    applicationDescriptionTranslations[
      normalizeApplicationTranslationKey(slug) as keyof typeof applicationDescriptionTranslations
    ];

  return entry?.[locale] ?? fallbackDescription ?? null;
}
