import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../supabase/admin";
import type { PortalModule } from "./modules";
import { withPortalBasePath } from "./base-path";

export type PortalProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "client_user" | "collaborator";
  isActive: boolean;
  portalModules: PortalModule[];
  createdAt: string;
};

export type AdminOverview = {
  totalClients: number;
  activeClients: number;
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalApplications: number;
  activeApplications: number;
  enabledAccesses: number;
  activeMemberships: number;
};

export type AdminClientRecord = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  membershipsCount: number;
  managersCount: number;
  enabledApplicationsCount: number;
};

export type AdminUserMembership = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  role: "owner" | "manager" | "member";
  isActive: boolean;
};

export type AdminUserRecord = PortalProfile & {
  memberships: AdminUserMembership[];
  passwordStatus: "defined" | "missing" | "unknown";
  passwordDisplay: string;
};

export type AdminApplicationRecord = {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string | null;
  icon: string | null;
  category: string;
  areaTags: string[];
  accessTier: "included" | "premium" | "featured" | "new";
  availabilityStatus: "available" | "coming_soon" | "disabled";
  badgeLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  enabledClientsCount: number;
};

export type AdminBlogPostRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverImageUrl: string | null;
  authorName: string;
  tags: string[];
  referenceLinks: string[];
  status: "draft" | "published";
  isFeatured: boolean;
  distributionEmailEnabled: boolean;
  distributionEmails: string[];
  distributionLastSentAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminDistributionContactRecord = {
  id: string;
  email: string;
  displayName: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminDistributionListRecord = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberIds: string[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminAccessMatrix = {
  clients: Pick<AdminClientRecord, "id" | "name" | "slug" | "isActive">[];
  applications: Pick<
    AdminApplicationRecord,
    "id" | "name" | "slug" | "category" | "availabilityStatus" | "isActive"
  >[];
  enabledPairs: Set<string>;
};

function pairKey(clientId: string, applicationId: string) {
  return `${clientId}::${applicationId}`;
}

async function getAdminAuthUsersById() {
  try {
    const adminSupabase = createSupabaseAdminClient();
    const usersById = new Map<string, User>();
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });

      if (error) {
        throw error;
      }

      const users = data?.users ?? [];
      users.forEach((user) => usersById.set(user.id, user));

      if (users.length < perPage) {
        break;
      }

      page += 1;
    }

    return usersById;
  } catch (error) {
    console.error("No pudimos cargar el estado de credenciales de los usuarios.", error);
    return new Map<string, User>();
  }
}

function resolvePasswordState(authUser: User | undefined) {
  if (!authUser) {
    return {
      passwordStatus: "unknown" as const,
      passwordDisplay: "No disponible"
    };
  }

  const explicitFlag = authUser.user_metadata?.portal_password_defined;

  if (explicitFlag === false) {
    return {
      passwordStatus: "missing" as const,
      passwordDisplay: "Sin contrasena definida"
    };
  }

  if (explicitFlag === true || authUser.last_sign_in_at) {
    return {
      passwordStatus: "defined" as const,
      passwordDisplay: "No disponible por seguridad"
    };
  }

  return {
    passwordStatus: "missing" as const,
    passwordDisplay: "Sin contrasena definida"
  };
}

export async function getCurrentPortalProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, portal_modules, created_at")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("No pudimos resolver el perfil actual del portal.", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name ?? null,
    role: data.role,
    isActive: data.is_active,
    portalModules: data.portal_modules ?? [],
    createdAt: data.created_at
  } satisfies PortalProfile;
}

export async function getAdminOverview(supabase: SupabaseClient, module: PortalModule) {
  const [
    clientsTotal,
    clientsActive,
    usersTotal,
    usersActive,
    adminsTotal,
    appsTotal,
    appsActive,
    accessTotal,
    membershipsActive
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("portal_module", module)
      .is("deleted_at", null),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("portal_module", module)
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .contains("portal_modules", [module])
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .contains("portal_modules", [module])
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .contains("portal_modules", [module])
      .eq("role", "admin")
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("portal_module", module)
      .is("deleted_at", null),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("portal_module", module)
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("client_application_access")
      .select("id, clients!inner(id), applications!inner(id)", { count: "exact", head: true })
      .eq("is_enabled", true)
      .eq("clients.portal_module", module)
      .eq("applications.portal_module", module)
      .is("clients.deleted_at", null)
      .is("applications.deleted_at", null),
    supabase
      .from("client_memberships")
      .select("id, clients!inner(id)", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("clients.portal_module", module)
      .is("clients.deleted_at", null)
  ]);

  return {
    totalClients: clientsTotal.count ?? 0,
    activeClients: clientsActive.count ?? 0,
    totalUsers: usersTotal.count ?? 0,
    activeUsers: usersActive.count ?? 0,
    adminUsers: adminsTotal.count ?? 0,
    totalApplications: appsTotal.count ?? 0,
    activeApplications: appsActive.count ?? 0,
    enabledAccesses: accessTotal.count ?? 0,
    activeMemberships: membershipsActive.count ?? 0
  } satisfies AdminOverview;
}

export async function getAdminClients(supabase: SupabaseClient, module: PortalModule) {
  const [{ data: clients, error: clientsError }, { data: memberships }, { data: access }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name, slug, logo_url, is_active, created_at")
        .eq("portal_module", module)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_memberships")
        .select("client_id, role, is_active, clients!inner(id)")
        .eq("clients.portal_module", module)
        .is("clients.deleted_at", null),
      supabase
        .from("client_application_access")
        .select("client_id, is_enabled, clients!inner(id), applications!inner(id)")
        .eq("clients.portal_module", module)
        .eq("applications.portal_module", module)
        .is("clients.deleted_at", null)
        .is("applications.deleted_at", null)
    ]);

  if (clientsError) {
    console.error("No pudimos cargar los consultores para administracion.", clientsError);
    return [] satisfies AdminClientRecord[];
  }

  const membershipsByClient = new Map<string, { total: number; managers: number }>();
  (memberships ?? []).forEach((membership) => {
    const current = membershipsByClient.get(membership.client_id) ?? { total: 0, managers: 0 };
    if (membership.is_active) {
      current.total += 1;
      if (membership.role === "owner" || membership.role === "manager") {
        current.managers += 1;
      }
    }
    membershipsByClient.set(membership.client_id, current);
  });

  const accessByClient = new Map<string, number>();
  (access ?? []).forEach((item) => {
    if (!item.is_enabled) return;
    accessByClient.set(item.client_id, (accessByClient.get(item.client_id) ?? 0) + 1);
  });

  return (clients ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    slug: client.slug,
    logoUrl: client.logo_url ?? null,
    isActive: client.is_active,
    createdAt: client.created_at,
    membershipsCount: membershipsByClient.get(client.id)?.total ?? 0,
    managersCount: membershipsByClient.get(client.id)?.managers ?? 0,
    enabledApplicationsCount: accessByClient.get(client.id) ?? 0
  })) satisfies AdminClientRecord[];
}

export async function getAdminUsers(supabase: SupabaseClient, module: PortalModule) {
  const [
    { data: users, error: usersError },
    { data: memberships },
    { data: clients },
    authUsersById
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, role, is_active, portal_modules, created_at")
        .contains("portal_modules", [module])
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_memberships")
        .select("user_id, client_id, role, is_active, clients!inner(id)")
        .eq("clients.portal_module", module)
        .is("clients.deleted_at", null),
      supabase
        .from("clients")
        .select("id, name, slug")
        .eq("portal_module", module)
        .is("deleted_at", null),
      getAdminAuthUsersById()
    ]);

  if (usersError) {
    console.error("No pudimos cargar los usuarios para administracion.", usersError);
    return [] satisfies AdminUserRecord[];
  }

  const clientsById = new Map(
    (clients ?? []).map((client) => [client.id, { name: client.name, slug: client.slug }])
  );
  const membershipsByUser = new Map<string, AdminUserMembership[]>();

  (memberships ?? []).forEach((membership) => {
    if (!membership.is_active) return;

    const client = clientsById.get(membership.client_id);
    if (!client) return;

    const current = membershipsByUser.get(membership.user_id) ?? [];
    current.push({
      clientId: membership.client_id,
      clientName: client.name,
      clientSlug: client.slug,
      role: membership.role,
      isActive: membership.is_active
    });
    membershipsByUser.set(membership.user_id, current);
  });

  return (users ?? []).map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name ?? null,
    role: user.role,
    isActive: user.is_active,
    portalModules: user.portal_modules ?? [],
    createdAt: user.created_at,
    memberships: membershipsByUser.get(user.id) ?? [],
    ...resolvePasswordState(authUsersById.get(user.id))
  })) satisfies AdminUserRecord[];
}

export async function getAdminApplications(supabase: SupabaseClient, module: PortalModule) {
  const [{ data: applications, error: applicationsError }, { data: access }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, name, slug, url, description, icon, category, area_tags, access_tier, availability_status, badge_label, sort_order, is_active"
      )
      .eq("portal_module", module)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("client_application_access")
      .select("application_id, is_enabled, applications!inner(id)")
      .eq("applications.portal_module", module)
      .is("applications.deleted_at", null)
  ]);

  if (applicationsError) {
    console.error("No pudimos cargar las aplicaciones para administracion.", applicationsError);
    return [] satisfies AdminApplicationRecord[];
  }

  const enabledByApplication = new Map<string, number>();
  (access ?? []).forEach((item) => {
    if (!item.is_enabled) return;
    enabledByApplication.set(
      item.application_id,
      (enabledByApplication.get(item.application_id) ?? 0) + 1
    );
  });

  return (applications ?? []).map((application) => ({
    id: application.id,
    name: application.name,
    slug: application.slug,
    url: application.url,
    description: application.description ?? null,
    icon: application.icon ?? null,
    category: application.category ?? "General",
    areaTags: application.area_tags ?? [],
    accessTier: application.access_tier ?? "included",
    availabilityStatus: application.availability_status ?? "available",
    badgeLabel: application.badge_label ?? null,
    sortOrder: application.sort_order ?? 0,
    isActive: application.is_active,
    enabledClientsCount: enabledByApplication.get(application.id) ?? 0
  })) satisfies AdminApplicationRecord[];
}

export async function getAdminBlogPosts(
  supabase: SupabaseClient,
  module: PortalModule,
  contentSection: "blog" | "training"
) {
  const selectWithDistribution =
    "id, title, slug, summary, content, cover_image_url, author_name, tags, reference_links, status, is_featured, distribution_email_enabled, distribution_emails, distribution_contact_ids, distribution_list_ids, distribution_last_sent_at, published_at, created_at, updated_at";
  const selectWithoutDistribution =
    "id, title, slug, summary, content, cover_image_url, author_name, tags, reference_links, status, is_featured, published_at, created_at, updated_at";

  const fetchPosts = async (selectClause: string) =>
    supabase
      .from("blog_posts")
      .select(selectClause)
      .eq("portal_module", module)
      .eq("content_section", contentSection)
      .is("deleted_at", null)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

  let { data, error } = await fetchPosts(selectWithDistribution);

  if (error && ("code" in error ? error.code === "42703" : false)) {
    const fallback = await fetchPosts(selectWithoutDistribution);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("No pudimos cargar los articulos del blog para administracion.", error);
    return [] satisfies AdminBlogPostRecord[];
  }

  return (data ?? []).map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary ?? null,
    content: post.content,
    coverImageUrl: post.cover_image_url ? withPortalBasePath(post.cover_image_url) : null,
    authorName: post.author_name ?? "Equipo Technized",
    tags: post.tags ?? [],
    referenceLinks: post.reference_links ?? [],
    status: post.status ?? "draft",
    isFeatured: post.is_featured ?? false,
    distributionEmailEnabled: post.distribution_email_enabled ?? false,
    distributionEmails: post.distribution_emails ?? [],
    distributionContactIds: post.distribution_contact_ids ?? [],
    distributionListIds: post.distribution_list_ids ?? [],
    distributionLastSentAt: post.distribution_last_sent_at ?? null,
    publishedAt: post.published_at ?? null,
    createdAt: post.created_at,
    updatedAt: post.updated_at ?? post.created_at
  })) satisfies AdminBlogPostRecord[];
}

export async function getAdminDistributionContacts(supabase: SupabaseClient, module: PortalModule) {
  const { data, error } = await supabase
    .from("distribution_contacts")
    .select("id, email, display_name, notes, is_active, created_at, updated_at")
    .eq("portal_module", module)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("No pudimos cargar los correos de distribucion.", error);
    return [] satisfies AdminDistributionContactRecord[];
  }

  return (data ?? []).map((contact) => ({
    id: contact.id,
    email: contact.email,
    displayName: contact.display_name ?? null,
    notes: contact.notes ?? null,
    isActive: contact.is_active ?? true,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at ?? contact.created_at
  })) satisfies AdminDistributionContactRecord[];
}

export async function getAdminDistributionLists(supabase: SupabaseClient, module: PortalModule) {
  const [{ data: lists, error: listsError }, { data: members, error: membersError }] = await Promise.all([
    supabase
      .from("distribution_lists")
      .select("id, name, description, is_active, created_at, updated_at")
      .eq("portal_module", module)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("distribution_list_members")
      .select(
        "distribution_list_id, distribution_contact_id, distribution_lists!inner(id, portal_module, deleted_at), distribution_contacts!inner(id, email, deleted_at)"
      )
      .eq("distribution_lists.portal_module", module)
      .is("distribution_lists.deleted_at", null)
      .is("distribution_contacts.deleted_at", null)
  ]);

  if (listsError) {
    console.error("No pudimos cargar las listas de distribucion.", listsError);
    return [] satisfies AdminDistributionListRecord[];
  }

  if (membersError) {
    console.error("No pudimos cargar los miembros de las listas de distribucion.", membersError);
  }

  const membersByListId = new Map<string, { memberIds: string[]; memberCount: number }>();
  (members ?? []).forEach((member) => {
    const current = membersByListId.get(member.distribution_list_id) ?? { memberIds: [], memberCount: 0 };
    current.memberIds.push(member.distribution_contact_id);
    current.memberCount += 1;
    membersByListId.set(member.distribution_list_id, current);
  });

  return (lists ?? []).map((list) => {
    const membership = membersByListId.get(list.id) ?? { memberIds: [], memberCount: 0 };

    return {
      id: list.id,
      name: list.name,
      description: list.description ?? null,
      isActive: list.is_active ?? true,
      memberIds: membership.memberIds,
      memberCount: membership.memberCount,
      createdAt: list.created_at,
      updatedAt: list.updated_at ?? list.created_at
    };
  }) satisfies AdminDistributionListRecord[];
}

export async function getAdminAccessMatrix(supabase: SupabaseClient, module: PortalModule) {
  const [clients, applications, access] = await Promise.all([
    getAdminClients(supabase, module),
    getAdminApplications(supabase, module),
    supabase
      .from("client_application_access")
      .select("client_id, application_id, is_enabled, clients!inner(id), applications!inner(id)")
      .eq("clients.portal_module", module)
      .eq("applications.portal_module", module)
      .is("clients.deleted_at", null)
      .is("applications.deleted_at", null)
  ]);

  const enabledPairs = new Set<string>();
  (access.data ?? []).forEach((item) => {
    if (item.is_enabled) {
      enabledPairs.add(pairKey(item.client_id, item.application_id));
    }
  });

  return {
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      slug: client.slug,
      isActive: client.isActive
    })),
    applications: applications.map((application) => ({
      id: application.id,
      name: application.name,
      slug: application.slug,
      category: application.category,
      availabilityStatus: application.availabilityStatus,
      isActive: application.isActive
    })),
    enabledPairs
  } satisfies AdminAccessMatrix;
}

export function hasAccessPair(
  matrix: Pick<AdminAccessMatrix, "enabledPairs">,
  clientId: string,
  applicationId: string
) {
  return matrix.enabledPairs.has(pairKey(clientId, applicationId));
}
