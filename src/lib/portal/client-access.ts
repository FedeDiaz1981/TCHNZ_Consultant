import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortalModule } from "./modules";
import { withPortalBasePath } from "./base-path";

export type PortalClient = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type PortalApplication = {
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
};

export type PortalBlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverImageUrl: string | null;
  authorName: string;
  tags: string[];
  referenceLinks: string[];
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
};

function mapApplication(application: {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string | null;
  icon: string | null;
  category?: string | null;
  area_tags?: string[] | null;
  access_tier?: "included" | "premium" | "featured" | "new" | null;
  availability_status?: "available" | "coming_soon" | "disabled" | null;
  badge_label?: string | null;
  sort_order?: number | null;
}) {
  return {
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
    sortOrder: application.sort_order ?? 0
  } satisfies PortalApplication;
}

function mapBlogPost(post: {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  cover_image_url: string | null;
  author_name: string | null;
  tags: string[] | null;
  reference_links: string[] | null;
  is_featured: boolean | null;
  published_at: string | null;
  created_at: string;
}) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary ?? null,
    content: post.content,
    coverImageUrl: post.cover_image_url ? withPortalBasePath(post.cover_image_url) : null,
    authorName: post.author_name ?? "Equipo Technized",
    tags: post.tags ?? [],
    referenceLinks: post.reference_links ?? [],
    isFeatured: post.is_featured ?? false,
    publishedAt: post.published_at ?? null,
    createdAt: post.created_at
  } satisfies PortalBlogPost;
}

export async function getCurrentPortalClient(
  supabase: SupabaseClient,
  userId: string,
  module: PortalModule
) {
  const baseQuery = () =>
    supabase
      .from("clients")
      .select(
        `
          id,
          name,
          slug,
          client_memberships!inner (
            user_id,
            is_active
          )
        `
      )
      .eq("client_memberships.user_id", userId)
      .eq("client_memberships.is_active", true)
      .eq("portal_module", module)
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

  const { data, error } = await supabase
    .from("clients")
    .select(
      `
        id,
        name,
        slug,
        logo_url,
        client_memberships!inner (
          user_id,
          is_active
        )
      `
    )
    .eq("client_memberships.user_id", userId)
    .eq("client_memberships.is_active", true)
    .eq("portal_module", module)
    .eq("is_active", true)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    const { data: fallbackData, error: fallbackError } = await baseQuery();

    if (fallbackError) {
      console.error("No pudimos resolver la entidad actual del portal.", error);
      return null;
    }

    if (!fallbackData) {
      return null;
    }

    return {
      id: fallbackData.id,
      name: fallbackData.name,
      slug: fallbackData.slug,
      logoUrl: null
    } satisfies PortalClient;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url ?? null
  } satisfies PortalClient;
}

export async function getAuthorizedApplications(
  supabase: SupabaseClient,
  clientId: string,
  module: PortalModule
) {
  const baseQuery = () =>
    supabase
      .from("applications")
      .select(
        `
          id,
          name,
          slug,
          url,
          description,
          icon,
          sort_order,
          client_application_access!inner (
            client_id,
            is_enabled
          )
        `
      )
      .eq("client_application_access.client_id", clientId)
      .eq("client_application_access.is_enabled", true)
      .eq("portal_module", module)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        id,
        name,
        slug,
        url,
        description,
        icon,
        category,
        area_tags,
        access_tier,
        availability_status,
        badge_label,
        sort_order,
        client_application_access!inner (
          client_id,
          is_enabled
        )
      `
    )
    .eq("client_application_access.client_id", clientId)
    .eq("client_application_access.is_enabled", true)
    .eq("portal_module", module)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    const { data: fallbackData, error: fallbackError } = await baseQuery();

    if (fallbackError) {
      console.error("No pudimos resolver las herramientas autorizadas del modulo.", error);
      return [];
    }

    return (fallbackData ?? []).map((application) =>
      mapApplication({
        ...application,
        category: "General",
        area_tags: [],
        access_tier: "included",
        availability_status: "available",
        badge_label: null
      })
    ) satisfies PortalApplication[];
  }

  return (data ?? []).map(mapApplication) satisfies PortalApplication[];
}

export async function getPublicModuleApplications(
  supabase: SupabaseClient,
  module: PortalModule
) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        id,
        name,
        slug,
        url,
        description,
        icon,
        category,
        area_tags,
        access_tier,
        availability_status,
        badge_label,
        sort_order
      `
    )
    .eq("portal_module", module)
    .eq("is_active", true)
    .neq("availability_status", "disabled")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("No pudimos resolver las herramientas publicas del modulo.", error);
    return [] satisfies PortalApplication[];
  }

  return (data ?? []).map(mapApplication) satisfies PortalApplication[];
}

export async function getPortalBlogPosts(
  supabase: SupabaseClient,
  module: PortalModule,
  contentSection: "blog" | "training" = "blog"
) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, summary, content, cover_image_url, author_name, tags, reference_links, is_featured, published_at, created_at"
    )
    .eq("portal_module", module)
    .eq("content_section", contentSection)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("No pudimos resolver los articulos publicados del modulo.", error);
    return [] satisfies PortalBlogPost[];
  }

  return (data ?? []).map(mapBlogPost) satisfies PortalBlogPost[];
}

export async function getPortalBlogPostBySlug(
  supabase: SupabaseClient,
  module: PortalModule,
  slug: string,
  contentSection: "blog" | "training" = "blog"
) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, summary, content, cover_image_url, author_name, tags, reference_links, is_featured, published_at, created_at"
    )
    .eq("portal_module", module)
    .eq("content_section", contentSection)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("No pudimos resolver el contenido solicitado del modulo.", error);
    return null;
  }

  if (!data) return null;
  return mapBlogPost(data);
}
