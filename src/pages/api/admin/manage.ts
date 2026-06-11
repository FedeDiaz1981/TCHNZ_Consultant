import type { APIRoute } from "astro";
import { getForwardedRequestUrl } from "../../../lib/auth/http";
import { normalizeDistributionEmails, sendBlogDistributionEmail } from "../../../lib/portal/blog-email";
import { getCurrentPortalProfile } from "../../../lib/portal/admin";
import { getCurrentPortalModule } from "../../../lib/portal/hosts";
import { withPortalBasePath } from "../../../lib/portal/base-path";
import {
  isManagedClientLogo,
  removeManagedClientLogo,
  storeClientLogoUpload
} from "../../../lib/portal/client-logo-upload";
import { storeBlogImageUpload } from "../../../lib/portal/blog-image-upload";
import { getModuleContentSection } from "../../../lib/portal/modules";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function parseBoolean(value: FormDataEntryValue | null, fallback = false) {
  if (value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ["true", "1", "on", "yes"].includes(normalized);
}

function getBooleanField(formData: FormData, name: string, fallback = false) {
  const values = formData.getAll(name);
  if (values.length === 0) return fallback;
  return parseBoolean(values[values.length - 1], fallback);
}

function normalizeSlug(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

function splitTags(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitReferenceLinks(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function splitDistributionEmails(value: FormDataEntryValue | null) {
  return normalizeDistributionEmails(String(value ?? ""));
}

function splitMultiSelectValues(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function getDateTimeField(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function getRedirectTarget(request: Request, formData: FormData) {
  const fallback = "/admin";
  const requestedPath = String(formData.get("redirect_to") ?? "").trim();
  if (requestedPath.startsWith("/")) return requestedPath;

  const referer = request.headers.get("referer");
  if (!referer) return fallback;

  try {
    const refererUrl = new URL(referer);
    return `${refererUrl.pathname}${refererUrl.search}`;
  } catch {
    return fallback;
  }
}

function buildRedirect(request: Request, path: string, message: string, tone: "success" | "error") {
  const url = new URL(withPortalBasePath(path), getForwardedRequestUrl(request));
  url.searchParams.set("message", message);
  url.searchParams.set("tone", tone);
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString()
    }
  });
}

function buildRedirectWithParams(
  request: Request,
  path: string,
  message: string,
  tone: "success" | "error",
  extraParams: Record<string, string>
) {
  const url = new URL(withPortalBasePath(path), getForwardedRequestUrl(request));
  url.searchParams.set("message", message);
  url.searchParams.set("tone", tone);
  for (const [key, value] of Object.entries(extraParams)) {
    url.searchParams.set(key, value);
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString()
    }
  });
}

function getTextField(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function resolveDistributionRecipientEmails(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  module: string,
  baseEmails: string[],
  contactIds: string[],
  listIds: string[]
) {
  const resolvedEmails = new Set(baseEmails);

  if (contactIds.length > 0) {
    const { data: contacts, error: contactsError } = await supabase
      .from("distribution_contacts")
      .select("id, email")
      .eq("portal_module", module)
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("id", contactIds);

    if (contactsError) throw contactsError;
    (contacts ?? []).forEach((contact) => resolvedEmails.add(String(contact.email ?? "").trim()));
  }

  if (listIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("distribution_list_members")
      .select("distribution_contact_id, distribution_lists!inner(id, portal_module, deleted_at), distribution_contacts!inner(id, email, deleted_at)")
      .eq("distribution_lists.portal_module", module)
      .eq("distribution_lists.is_active", true)
      .eq("distribution_contacts.is_active", true)
      .is("distribution_lists.deleted_at", null)
      .is("distribution_contacts.deleted_at", null)
      .in("distribution_list_id", listIds);

    if (membersError) throw membersError;
    (members ?? []).forEach((member) => {
      const email = String((member as { distribution_contacts?: { email?: string } }).distribution_contacts?.email ?? "").trim();
      if (email) resolvedEmails.add(email);
    });
  }

  return Array.from(resolvedEmails).filter(Boolean);
}

async function hasConflictingDistributionContactEmail(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  module: string,
  email: string,
  excludeId?: string
) {
  let query = supabase
    .from("distribution_contacts")
    .select("id")
    .eq("portal_module", module)
    .ilike("email", email)
    .is("deleted_at", null)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function hasConflictingDistributionListName(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  module: string,
  name: string,
  excludeId?: string
) {
  let query = supabase
    .from("distribution_lists")
    .select("id")
    .eq("portal_module", module)
    .ilike("name", name)
    .is("deleted_at", null)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function replaceDistributionListMembers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  listId: string,
  memberIds: string[]
) {
  const { error: deleteError } = await supabase
    .from("distribution_list_members")
    .delete()
    .eq("distribution_list_id", listId);

  if (deleteError) throw deleteError;

  const uniqueMemberIds = Array.from(new Set(memberIds.filter(Boolean)));
  if (uniqueMemberIds.length === 0) return;

  const { error: insertError } = await supabase.from("distribution_list_members").insert(
    uniqueMemberIds.map((contactId) => ({
      distribution_list_id: listId,
      distribution_contact_id: contactId
    }))
  );

  if (insertError) throw insertError;
}

function isMissingDistributionColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message ?? error ?? "");
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code ?? "") : "";

  return (
    code === "42703" ||
    code === "PGRST204" ||
    /distribution_email_enabled|distribution_emails|distribution_last_sent_at/i.test(message)
  );
}

async function sendBlogPostDistributionIfRequested(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  blogPostId: string,
  payload: {
    title: string;
    slug: string;
    summary: string | null;
    content: string;
    coverImageUrl: string | null;
    authorName: string;
    tags: string[];
    referenceLinks: string[];
    publishedAt: string | null;
    distributionEmailEnabled: boolean;
    distributionEmails: string[];
    portalLabel: string;
    portalDescription: string;
    moduleName: string;
  }
) {
  if (!payload.distributionEmailEnabled || payload.distributionEmails.length === 0) {
    return null;
  }

  await sendBlogDistributionEmail({
    recipients: payload.distributionEmails,
    moduleName: payload.moduleName,
    title: payload.title,
    slug: payload.slug,
    summary: payload.summary,
    content: payload.content,
    coverImageUrl: payload.coverImageUrl,
    authorName: payload.authorName,
    tags: payload.tags,
    referenceLinks: payload.referenceLinks,
    publishedAt: payload.publishedAt,
    portalLabel: payload.portalLabel,
    portalDescription: payload.portalDescription
  });

  const { error } = await supabase
    .from("blog_posts")
    .update({ distribution_last_sent_at: new Date().toISOString() })
    .eq("id", blogPostId);

  if (error) {
    console.error("No pudimos guardar la marca de envio del articulo.", error);
  }

  return true;
}

async function hasConflictingBlogSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  slug: string,
  excludeId?: string
) {
  let query = supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvRows(csvContent: string) {
  const normalized = csvContent.replace(/\uFEFF/g, "").trim();
  if (!normalized) return [];
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = parseCsvLine(lines[lineIndex]);
    const row: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      row[header] = String(cells[headerIndex] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

async function ensureAdmin(context: Parameters<APIRoute>[0]) {
  const supabase = createSupabaseServerClient(context);
  const portalModule = getCurrentPortalModule(getForwardedRequestUrl(context.request));
  const contentSection = getModuleContentSection(portalModule);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: buildRedirect(context.request, "/login", "Inicia sesion para continuar.", "error")
    };
  }

  const profile = await getCurrentPortalProfile(supabase, user.id);
  if (!profile || profile.role !== "admin" || !profile.portalModules.includes(portalModule)) {
    return {
      ok: false as const,
      response: buildRedirect(
        context.request,
        "/clientes/aplicaciones",
        "No tienes permisos de administracion.",
        "error"
      )
    };
  }

  return { ok: true as const, supabase, user, profile, portalModule, contentSection };
}

export const POST: APIRoute = async (context) => {
  const authorization = await ensureAdmin(context);
  if (!authorization.ok) return authorization.response;

  const { supabase, user, portalModule, contentSection } = authorization;
  const formData = await context.request.formData();
  const action = String(formData.get("intent") ?? formData.get("action") ?? "").trim();
  const redirectTo = getRedirectTarget(context.request, formData);

  try {
    switch (action) {
      case "create-client": {
        const name = String(formData.get("name") ?? "").trim();
        const slug = normalizeSlug(formData.get("slug"));
        const isActive = getBooleanField(formData, "is_active", true);

        if (!name || !slug) {
          return buildRedirect(context.request, redirectTo, "Completa nombre y slug del consultor.", "error");
        }

        const uploadedLogoUrl = await storeClientLogoUpload(formData.get("logo_file"), { slug });

        const { error } = await supabase
          .from("clients")
          .insert({
            name,
            slug,
            portal_module: portalModule,
            logo_url: uploadedLogoUrl,
            is_active: isActive
          })
          .select("id")
          .single();

        if (error) {
          if (uploadedLogoUrl) {
            await removeManagedClientLogo(uploadedLogoUrl);
          }

          throw error;
        }

        return buildRedirect(context.request, redirectTo, "Consultor creado correctamente.", "success");
      }

      case "update-client": {
        const clientId = String(formData.get("client_id") ?? "").trim();
        const name = String(formData.get("name") ?? "").trim();
        const slug = normalizeSlug(formData.get("slug"));
        const currentLogoUrl = String(formData.get("current_logo_url") ?? "").trim() || null;
        const isActive = getBooleanField(formData, "is_active", false);

        if (!clientId || !name || !slug) {
          return buildRedirect(context.request, redirectTo, "Faltan datos para actualizar el consultor.", "error");
        }

        const uploadedLogoUrl = await storeClientLogoUpload(formData.get("logo_file"), {
          slug,
          clientId
        });
        const logoUrl = uploadedLogoUrl ?? currentLogoUrl;

        const { error } = await supabase
          .from("clients")
          .update({
            name,
            slug,
            logo_url: logoUrl,
            is_active: isActive
          })
          .eq("id", clientId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null);

        if (error) {
          if (uploadedLogoUrl) {
            await removeManagedClientLogo(uploadedLogoUrl);
          }

          throw error;
        }

        if (currentLogoUrl && currentLogoUrl !== logoUrl && isManagedClientLogo(currentLogoUrl)) {
          await removeManagedClientLogo(currentLogoUrl);
        }

        return buildRedirect(context.request, redirectTo, "Consultor actualizado.", "success");
      }

      case "delete-client": {
        const clientId = getTextField(formData, "client_id");
        const currentLogoUrl = getTextField(formData, "current_logo_url") || null;

        if (!clientId) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No pudimos identificar el consultor a eliminar.",
            "error"
          );
        }

        const { data: clientToDelete, error: clientLookupError } = await supabase
          .from("clients")
          .select("id, slug")
          .eq("id", clientId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null)
          .maybeSingle();

        if (clientLookupError) throw clientLookupError;

        if (!clientToDelete) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No encontramos el consultor a eliminar.",
            "error"
          );
        }

        const deletedAt = new Date().toISOString();
        const archivedSlug = `${clientToDelete.slug}--deleted-${Date.now()}`;

        const [
          { error: membershipsError },
          { error: accessError },
          { error: archiveError }
        ] = await Promise.all([
          supabase.from("client_memberships").update({ is_active: false }).eq("client_id", clientId),
          supabase
            .from("client_application_access")
            .update({ is_enabled: false })
            .eq("client_id", clientId),
          supabase
            .from("clients")
            .update({
              is_active: false,
              deleted_at: deletedAt,
              slug: archivedSlug
            })
            .eq("id", clientId)
            .eq("portal_module", portalModule)
        ]);

        if (membershipsError) throw membershipsError;
        if (accessError) throw accessError;
        if (archiveError) throw archiveError;

        if (currentLogoUrl && isManagedClientLogo(currentLogoUrl)) {
          try {
            await removeManagedClientLogo(currentLogoUrl);
          } catch (logoCleanupError) {
            console.error("El consultor se elimino, pero no pudimos limpiar su logo gestionado.", logoCleanupError);
          }
        }

        return buildRedirect(
          context.request,
          redirectTo,
          "Consultor eliminado de la lista correctamente.",
          "success"
        );
      }

      case "update-profile": {
        const profileId = String(formData.get("profile_id") ?? "").trim();
        const fullName = String(formData.get("full_name") ?? "").trim() || null;
        const role = String(formData.get("role") ?? "").trim();
        const isActive = getBooleanField(formData, "is_active", false);

        if (!profileId || !role) {
          return buildRedirect(context.request, redirectTo, "Faltan datos para actualizar el usuario.", "error");
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            role,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", profileId);

        if (error) throw error;
        return buildRedirect(context.request, redirectTo, "Usuario actualizado.", "success");
      }

      case "create-user": {
        const email = getTextField(formData, "email").toLowerCase();
        const fullName = getTextField(formData, "full_name") || null;
        const isActive = getBooleanField(formData, "is_active", true);
        const isAdmin = getBooleanField(formData, "is_admin", false);
        const clientId = getTextField(formData, "client_id");
        const membershipIsActive = getBooleanField(formData, "membership_is_active", true);
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirm_password") ?? "");

        if (!email || !email.includes("@")) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Ingresa un email valido para crear el usuario.",
            "error"
          );
        }

        if (!password || !confirmPassword) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Completa y confirma la contrasena inicial del usuario.",
            "error"
          );
        }

        if (password.length < 8) {
          return buildRedirect(
            context.request,
            redirectTo,
            "La contrasena debe tener al menos 8 caracteres.",
            "error"
          );
        }

        if (password !== confirmPassword) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Las contrasenas no coinciden.",
            "error"
          );
        }

        if (!isAdmin && !clientId) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Selecciona un consultor o marca la opcion de administrador.",
            "error"
          );
        }

        const nextRole = isAdmin ? "admin" : "client_user";
        const adminSupabase = createSupabaseAdminClient();
        let createdUserId: string | null = null;

        try {
          const { data: createdUserData, error: createUserError } =
            await adminSupabase.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                portal_password_defined: true,
                ...(fullName ? { full_name: fullName } : {})
              }
            });

          if (createUserError) throw createUserError;

          const createdUser = createdUserData.user;
          if (!createdUser) {
            throw new Error("No pudimos crear el usuario en Auth.");
          }

          createdUserId = createdUser.id;

        const { error: profileError } = await adminSupabase.from("profiles").upsert(
          {
            id: createdUserId,
            email,
            full_name: fullName,
            role: nextRole,
            portal_modules: [portalModule],
            is_active: isActive,
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        );

          if (profileError) throw profileError;

          if (!isAdmin && clientId) {
            const { error: membershipError } = await adminSupabase
              .from("client_memberships")
              .upsert(
                {
                  client_id: clientId,
                  user_id: createdUserId,
                  role: "member",
                  is_active: membershipIsActive
                },
                { onConflict: "client_id,user_id" }
              );

            if (membershipError) throw membershipError;
          }
        } catch (error) {
          if (createdUserId) {
            const { error: cleanupError } = await adminSupabase.auth.admin.deleteUser(createdUserId);
            if (cleanupError) {
              console.error("No pudimos revertir el usuario creado tras un error.", cleanupError);
            }
          }

          throw error;
        }

        return buildRedirect(context.request, redirectTo, "Usuario creado.", "success");
      }

      case "save-user-settings": {
        const profileId = getTextField(formData, "profile_id");
        const fullName = getTextField(formData, "full_name") || null;
        const isActive = getBooleanField(formData, "is_active", false);
        const isAdmin = getBooleanField(formData, "is_admin", false);
        const clientId = getTextField(formData, "client_id");
        const membershipRole = "member";
        const membershipIsActive = getBooleanField(formData, "membership_is_active", true);

        if (!profileId) {
          return buildRedirect(context.request, redirectTo, "Faltan datos para actualizar el usuario.", "error");
        }

        const nextRole = isAdmin ? "admin" : "client_user";

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            role: nextRole,
            portal_modules: [portalModule],
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", profileId);

        if (profileError) throw profileError;

        if (!clientId && !isAdmin) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Selecciona el consultor del usuario o marca la opcion de administrador.",
            "error"
          );
        }

        if (!clientId) {
          return buildRedirect(context.request, redirectTo, "Usuario actualizado.", "success");
        }

        const { data: existingMemberships, error: existingMembershipsError } = await supabase
          .from("client_memberships")
          .select("id, client_id")
          .eq("user_id", profileId);

        if (existingMembershipsError) throw existingMembershipsError;

        const selectedMembership = (existingMemberships ?? []).find(
          (membership) => membership.client_id === clientId
        );

        if (selectedMembership) {
          const { error } = await supabase
            .from("client_memberships")
            .update({
              role: membershipRole,
              is_active: membershipIsActive
            })
            .eq("id", selectedMembership.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("client_memberships").insert({
            client_id: clientId,
            user_id: profileId,
            role: membershipRole,
            is_active: membershipIsActive
          });

          if (error) throw error;
        }

        const membershipsToDeactivate = (existingMemberships ?? [])
          .filter((membership) => membership.client_id !== clientId)
          .map((membership) => membership.id);

        if (membershipsToDeactivate.length > 0) {
          const { error } = await supabase
            .from("client_memberships")
            .update({ is_active: false })
            .in("id", membershipsToDeactivate);

          if (error) throw error;
        }

        return buildRedirect(context.request, redirectTo, "Usuario actualizado.", "success");
      }

      case "delete-user": {
        const profileId = getTextField(formData, "profile_id");

        if (!profileId) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No pudimos identificar el usuario a eliminar.",
            "error"
          );
        }

        if (profileId === user.id) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No puedes eliminar tu propio usuario desde la sesion actual.",
            "error"
          );
        }

        const { data: profileToDelete, error: profileLookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", profileId)
          .is("deleted_at", null)
          .maybeSingle();

        if (profileLookupError) throw profileLookupError;

        if (!profileToDelete) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No encontramos el usuario a eliminar.",
            "error"
          );
        }

        const deletedAt = new Date().toISOString();

        const [{ error: membershipsError }, { error: profileError }] = await Promise.all([
          supabase.from("client_memberships").update({ is_active: false }).eq("user_id", profileId),
          supabase
            .from("profiles")
            .update({
              is_active: false,
              deleted_at: deletedAt,
              updated_at: deletedAt
            })
            .eq("id", profileId)
        ]);

        if (membershipsError) throw membershipsError;
        if (profileError) throw profileError;

        return buildRedirect(
          context.request,
          redirectTo,
          "Usuario eliminado de la lista correctamente.",
          "success"
        );
      }

      case "update-user-password": {
        const profileId = getTextField(formData, "profile_id");
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirm_password") ?? "");

        if (!profileId || !password || !confirmPassword) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Completa y confirma la contrasena del usuario.",
            "error"
          );
        }

        if (password.length < 8) {
          return buildRedirect(
            context.request,
            redirectTo,
            "La contrasena debe tener al menos 8 caracteres.",
            "error"
          );
        }

        if (password !== confirmPassword) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Las contrasenas no coinciden.",
            "error"
          );
        }

        const adminSupabase = createSupabaseAdminClient();
        const { data: userData, error: getUserError } = await adminSupabase.auth.admin.getUserById(profileId);

        if (getUserError) throw getUserError;

        const { error } = await adminSupabase.auth.admin.updateUserById(profileId, {
          password,
          user_metadata: {
            ...(userData.user?.user_metadata ?? {}),
            portal_password_defined: true
          }
        });

        if (error) throw error;

        return buildRedirect(context.request, redirectTo, "Contrasena actualizada.", "success");
      }

      case "upsert-membership": {
        const clientId = String(formData.get("client_id") ?? "").trim();
        const userId = String(formData.get("user_id") ?? "").trim();
        const role = "member";
        const isActive = getBooleanField(formData, "is_active", true);

        if (!clientId || !userId) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Selecciona consultor y usuario para guardar la membresia.",
            "error"
          );
        }

        const { data: existingMembership } = await supabase
          .from("client_memberships")
          .select("id")
          .eq("client_id", clientId)
          .eq("user_id", userId)
          .maybeSingle();

        const operation = existingMembership
          ? supabase
              .from("client_memberships")
              .update({ role, is_active: isActive })
              .eq("id", existingMembership.id)
          : supabase.from("client_memberships").insert({
              client_id: clientId,
              user_id: userId,
              role,
              is_active: isActive
            });

        const { error } = await operation;
        if (error) throw error;

        return buildRedirect(context.request, redirectTo, "Membresia guardada.", "success");
      }

      case "create-application": {
        const name = String(formData.get("name") ?? "").trim();
        const slug = normalizeSlug(formData.get("slug"));
        const url = String(formData.get("url") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim() || null;
        const icon = String(formData.get("icon") ?? "").trim() || null;
        const category = String(formData.get("category") ?? "").trim() || "General";
        const areaTags = splitTags(formData.get("area_tags"));
        const accessTier = String(formData.get("access_tier") ?? "").trim() || "included";
        const availabilityStatus =
          String(formData.get("availability_status") ?? "").trim() || "available";
        const badgeLabel = String(formData.get("badge_label") ?? "").trim() || null;
        const sortOrder = Number(formData.get("sort_order") ?? 0) || 0;
        const isActive = getBooleanField(formData, "is_active", true);

        if (!name || !slug || !url) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Completa nombre, slug y URL de la aplicacion.",
            "error"
          );
        }

        const { error } = await supabase.from("applications").insert({
          name,
          slug,
          url,
          portal_module: portalModule,
          description,
          icon,
          category,
          area_tags: areaTags,
          access_tier: accessTier,
          availability_status: availabilityStatus,
          badge_label: badgeLabel,
          sort_order: sortOrder,
          is_active: isActive
        });

        if (error) throw error;
        return buildRedirect(context.request, redirectTo, "Aplicacion creada.", "success");
      }

      case "update-application": {
        const applicationId = String(formData.get("application_id") ?? "").trim();
        const name = String(formData.get("name") ?? "").trim();
        const slug = normalizeSlug(formData.get("slug"));
        const url = String(formData.get("url") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim() || null;
        const icon = String(formData.get("icon") ?? "").trim() || null;
        const category = String(formData.get("category") ?? "").trim() || "General";
        const areaTags = splitTags(formData.get("area_tags"));
        const accessTier = String(formData.get("access_tier") ?? "").trim() || "included";
        const availabilityStatus =
          String(formData.get("availability_status") ?? "").trim() || "available";
        const badgeLabel = String(formData.get("badge_label") ?? "").trim() || null;
        const sortOrder = Number(formData.get("sort_order") ?? 0) || 0;
        const isActive = getBooleanField(formData, "is_active", false);

        if (!applicationId || !name || !slug || !url) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Faltan datos para actualizar la aplicacion.",
            "error"
          );
        }

        const { error } = await supabase
          .from("applications")
          .update({
            name,
            slug,
            url,
            description,
            icon,
            category,
            area_tags: areaTags,
            access_tier: accessTier,
            availability_status: availabilityStatus,
            badge_label: badgeLabel,
            sort_order: sortOrder,
            is_active: isActive
          })
          .eq("id", applicationId)
          .is("deleted_at", null);

        if (error) throw error;
        return buildRedirect(context.request, redirectTo, "Aplicacion actualizada.", "success");
      }

      case "delete-application": {
        const applicationId = String(formData.get("application_id") ?? "").trim();

        if (!applicationId) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No pudimos resolver la aplicacion a eliminar.",
            "error"
          );
        }

        const { data: application, error: applicationError } = await supabase
          .from("applications")
          .select("id, slug")
          .eq("id", applicationId)
          .is("deleted_at", null)
          .maybeSingle();

        if (applicationError) throw applicationError;

        if (!application) {
          return buildRedirect(
            context.request,
            redirectTo,
            "La aplicacion ya no se encuentra disponible en la lista.",
            "error"
          );
        }

        const deletedAt = new Date().toISOString();
        const archivedSlug = `${application.slug}--deleted-${Date.now()}`;

        const { error: disableAccessError } = await supabase
          .from("client_application_access")
          .update({ is_enabled: false })
          .eq("application_id", applicationId);

        if (disableAccessError) throw disableAccessError;

        const { error: deleteError } = await supabase
          .from("applications")
          .update({
            slug: archivedSlug,
            is_active: false,
            availability_status: "disabled",
            deleted_at: deletedAt
          })
          .eq("id", applicationId)
          .is("deleted_at", null);

        if (deleteError) throw deleteError;

        return buildRedirect(
          context.request,
          redirectTo,
          "Aplicacion eliminada de la lista correctamente.",
          "success"
        );
      }

      case "create-distribution-contact": {
        const email = getTextField(formData, "email").toLowerCase();
        const displayName = getTextField(formData, "display_name") || null;
        const notes = getTextField(formData, "notes") || null;
        const isActive = getBooleanField(formData, "is_active", true);

        if (!email) {
          return buildRedirect(context.request, redirectTo, "Completa el correo electronico.", "error");
        }

        const duplicate = await hasConflictingDistributionContactEmail(supabase, portalModule, email);
        if (duplicate) {
          return buildRedirect(context.request, redirectTo, "Ese correo ya existe en la lista.", "error");
        }

        const { error } = await supabase.from("distribution_contacts").insert({
          portal_module: portalModule,
          email,
          display_name: displayName,
          notes,
          is_active: isActive,
          created_by: user.id,
          updated_at: new Date().toISOString()
        });

        if (error) throw error;

        return buildRedirect(context.request, redirectTo, "Correo guardado.", "success");
      }

      case "update-distribution-contact": {
        const contactId = getTextField(formData, "contact_id");
        const email = getTextField(formData, "email").toLowerCase();
        const displayName = getTextField(formData, "display_name") || null;
        const notes = getTextField(formData, "notes") || null;
        const isActive = getBooleanField(formData, "is_active", true);

        if (!contactId || !email) {
          return buildRedirect(context.request, redirectTo, "Faltan datos para actualizar el correo.", "error");
        }

        const duplicate = await hasConflictingDistributionContactEmail(supabase, portalModule, email, contactId);
        if (duplicate) {
          return buildRedirect(context.request, redirectTo, "Ese correo ya existe en la lista.", "error");
        }

        const { error } = await supabase
          .from("distribution_contacts")
          .update({
            email,
            display_name: displayName,
            notes,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", contactId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null);

        if (error) throw error;

        return buildRedirect(context.request, redirectTo, "Correo actualizado.", "success");
      }

      case "delete-distribution-contact": {
        const contactId = getTextField(formData, "contact_id");

        if (!contactId) {
          return buildRedirect(context.request, redirectTo, "No pudimos resolver el correo a eliminar.", "error");
        }

        const deletedAt = new Date().toISOString();
        const { error } = await supabase
          .from("distribution_contacts")
          .update({
            is_active: false,
            deleted_at: deletedAt,
            updated_at: deletedAt
          })
          .eq("id", contactId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null);

        if (error) throw error;

        const { error: membershipError } = await supabase
          .from("distribution_list_members")
          .delete()
          .eq("distribution_contact_id", contactId);

        if (membershipError) throw membershipError;

        return buildRedirect(context.request, redirectTo, "Correo eliminado de la lista.", "success");
      }

      case "create-distribution-list": {
        const name = getTextField(formData, "name");
        const description = getTextField(formData, "description") || null;
        const isActive = getBooleanField(formData, "is_active", true);
        const memberIds = splitMultiSelectValues(formData, "member_ids");

        if (!name) {
          return buildRedirect(context.request, redirectTo, "Completa el nombre de la lista.", "error");
        }

        const duplicate = await hasConflictingDistributionListName(supabase, portalModule, name);
        if (duplicate) {
          return buildRedirect(context.request, redirectTo, "Ya existe una lista con ese nombre.", "error");
        }

        const { data: createdList, error } = await supabase
          .from("distribution_lists")
          .insert({
            portal_module: portalModule,
            name,
            description,
            is_active: isActive,
            created_by: user.id,
            updated_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (error) throw error;
        if (!createdList) throw new Error("No pudimos recuperar la lista recien creada.");

        await replaceDistributionListMembers(supabase, createdList.id, memberIds);

        return buildRedirect(context.request, redirectTo, "Lista creada.", "success");
      }

      case "update-distribution-list": {
        const listId = getTextField(formData, "list_id");
        const name = getTextField(formData, "name");
        const description = getTextField(formData, "description") || null;
        const isActive = getBooleanField(formData, "is_active", true);
        const memberIds = splitMultiSelectValues(formData, "member_ids");

        if (!listId || !name) {
          return buildRedirect(context.request, redirectTo, "Faltan datos para actualizar la lista.", "error");
        }

        const duplicate = await hasConflictingDistributionListName(supabase, portalModule, name, listId);
        if (duplicate) {
          return buildRedirect(context.request, redirectTo, "Ya existe una lista con ese nombre.", "error");
        }

        const { error } = await supabase
          .from("distribution_lists")
          .update({
            name,
            description,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", listId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null);

        if (error) throw error;

        await replaceDistributionListMembers(supabase, listId, memberIds);

        return buildRedirect(context.request, redirectTo, "Lista actualizada.", "success");
      }

      case "delete-distribution-list": {
        const listId = getTextField(formData, "list_id");

        if (!listId) {
          return buildRedirect(context.request, redirectTo, "No pudimos resolver la lista a eliminar.", "error");
        }

        const deletedAt = new Date().toISOString();
        const { error } = await supabase
          .from("distribution_lists")
          .update({
            is_active: false,
            deleted_at: deletedAt,
            updated_at: deletedAt
          })
          .eq("id", listId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null);

        if (error) throw error;

        const { error: membershipError } = await supabase
          .from("distribution_list_members")
          .delete()
          .eq("distribution_list_id", listId);

        if (membershipError) throw membershipError;

        return buildRedirect(context.request, redirectTo, "Lista eliminada.", "success");
      }

      case "create-blog-post": {
        const title = getTextField(formData, "title");
        const slug = normalizeSlug(formData.get("slug"));
        const content = getTextField(formData, "content");
        const summary = getTextField(formData, "summary") || null;
        const uploadedCoverImageUrl = await storeBlogImageUpload(formData.get("cover_image_file"), {
          slugHint: `${slug || "blog"}-cover`
        });
        const coverImageUrl = uploadedCoverImageUrl ? withPortalBasePath(uploadedCoverImageUrl) : null;
        const authorName = getTextField(formData, "author_name") || "Equipo Technized";
        const tags = splitTags(formData.get("tags"));
        const referenceLinks = splitReferenceLinks(formData.get("reference_links"));
        const status = getTextField(formData, "status") === "published" ? "published" : "draft";
        const isFeatured = getBooleanField(formData, "is_featured", false);
        const distributionEmailEnabled = getBooleanField(formData, "distribution_email_enabled", false);
        const distributionEmails = splitDistributionEmails(formData.get("distribution_emails"));
        const distributionContactIds = splitMultiSelectValues(formData, "distribution_contact_ids");
        const distributionListIds = splitMultiSelectValues(formData, "distribution_list_ids");
        const publishedAt =
          status === "published"
            ? getDateTimeField(formData, "published_at") ?? new Date().toISOString()
            : null;
        const shouldSendDistributionEmail = distributionEmailEnabled && status === "published";

        if (!title || !slug || !content) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Completa titulo, slug y contenido del articulo.",
            "error"
          );
        }

        const recipientEmails = shouldSendDistributionEmail
          ? await resolveDistributionRecipientEmails(
              supabase,
              portalModule,
              distributionEmails,
              distributionContactIds,
              distributionListIds
            )
          : distributionEmails;

        if (shouldSendDistributionEmail && recipientEmails.length === 0) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Activa la lista de distribucion antes de enviar el articulo por email.",
            "error"
          );
        }

        const slugConflict = await hasConflictingBlogSlug(supabase, slug);
        if (slugConflict) {
          return buildRedirect(
            context.request,
            redirectTo,
            "El slug ya existe en otro articulo. Usa un slug unico para poder guardar.",
            "error"
          );
        }

        const basePostPayload = {
          title,
          slug,
          portal_module: portalModule,
          content_section: contentSection ?? "training",
          summary,
          content,
          cover_image_url: coverImageUrl,
          author_name: authorName,
          tags,
          reference_links: referenceLinks,
          status,
          is_featured: isFeatured,
          published_at: publishedAt,
          created_by: user.id,
          updated_at: new Date().toISOString()
        };

        const postPayloadWithDistribution = {
          ...basePostPayload,
          distribution_email_enabled: distributionEmailEnabled,
          distribution_emails: distributionEmails,
          distribution_contact_ids: distributionContactIds,
          distribution_list_ids: distributionListIds
        };

        let createPostQuery = supabase
          .from("blog_posts")
          .insert(postPayloadWithDistribution)
          .select("id")
          .single();

        let { data: createdPost, error } = await createPostQuery;

        if (error && isMissingDistributionColumnError(error)) {
          const fallback = await supabase.from("blog_posts").insert(basePostPayload).select("id").single();
          createdPost = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        if (!createdPost) {
          throw new Error("No pudimos recuperar el articulo recien creado.");
        }

        if (shouldSendDistributionEmail) {
          try {
            await sendBlogPostDistributionIfRequested(supabase, createdPost.id, {
              title,
              slug,
              summary,
              content,
              coverImageUrl,
              authorName,
              tags,
              referenceLinks,
              publishedAt,
              distributionEmailEnabled,
              distributionEmails: recipientEmails,
              portalLabel: contentSection === "training" ? "Training del portal" : "Blog del portal",
              portalDescription:
                contentSection === "training"
                  ? "Contenido privado de training de Technized."
                  : "Contenido privado de blog de Technized.",
              moduleName: portalModule
            });
          } catch (sendError) {
            console.error("No pudimos enviar el articulo por email.", sendError);
            return buildRedirect(
              context.request,
              redirectTo,
              "Articulo guardado, pero no pudimos enviar el email de distribucion.",
              "error"
            );
          }
        }

        return buildRedirect(context.request, redirectTo, "Articulo guardado.", "success");
      }

      case "update-blog-post": {
        const blogPostId = getTextField(formData, "blog_post_id");
        const title = getTextField(formData, "title");
        const slug = normalizeSlug(formData.get("slug"));
        const content = getTextField(formData, "content");
        const summary = getTextField(formData, "summary") || null;
        const currentCoverImageUrl = getTextField(formData, "current_cover_image_url") || null;
        const uploadedCoverImageUrl = await storeBlogImageUpload(formData.get("cover_image_file"), {
          slugHint: `${slug || "blog"}-cover`
        });
        const coverImageUrl = uploadedCoverImageUrl
          ? withPortalBasePath(uploadedCoverImageUrl)
          : currentCoverImageUrl;
        const authorName = getTextField(formData, "author_name") || "Equipo Technized";
        const tags = splitTags(formData.get("tags"));
        const referenceLinks = splitReferenceLinks(formData.get("reference_links"));
        const status = getTextField(formData, "status") === "published" ? "published" : "draft";
        const isFeatured = getBooleanField(formData, "is_featured", false);
        const distributionEmailEnabled = getBooleanField(formData, "distribution_email_enabled", false);
        const distributionEmails = splitDistributionEmails(formData.get("distribution_emails"));
        const distributionContactIds = splitMultiSelectValues(formData, "distribution_contact_ids");
        const distributionListIds = splitMultiSelectValues(formData, "distribution_list_ids");
        const currentPublishedAt = getTextField(formData, "current_published_at") || null;
        const publishedAt =
          status === "published"
            ? getDateTimeField(formData, "published_at") ??
              currentPublishedAt ??
              new Date().toISOString()
            : null;
        const shouldSendDistributionEmail = distributionEmailEnabled && status === "published";

        if (!blogPostId || !title || !slug || !content) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Faltan datos para actualizar el articulo.",
            "error"
          );
        }

        const recipientEmails = shouldSendDistributionEmail
          ? await resolveDistributionRecipientEmails(
              supabase,
              portalModule,
              distributionEmails,
              distributionContactIds,
              distributionListIds
            )
          : distributionEmails;

        if (shouldSendDistributionEmail && recipientEmails.length === 0) {
          return buildRedirect(
            context.request,
            redirectTo,
            "Activa la lista de distribucion antes de enviar el articulo por email.",
            "error"
          );
        }

        const slugConflict = await hasConflictingBlogSlug(supabase, slug, blogPostId);
        if (slugConflict) {
          return buildRedirect(
            context.request,
            redirectTo,
            "El slug ya existe en otro articulo. Cambialo para guardar los cambios.",
            "error"
          );
        }

        const baseUpdatePayload = {
          title,
          slug,
          summary,
          content,
          cover_image_url: coverImageUrl,
          author_name: authorName,
          tags,
          reference_links: referenceLinks,
          status,
          is_featured: isFeatured,
          published_at: publishedAt,
          updated_at: new Date().toISOString()
        };

        const updatePayloadWithDistribution = {
          ...baseUpdatePayload,
          distribution_email_enabled: distributionEmailEnabled,
          distribution_emails: distributionEmails,
          distribution_contact_ids: distributionContactIds,
          distribution_list_ids: distributionListIds
        };

        let updatePostQuery = supabase
          .from("blog_posts")
          .update(updatePayloadWithDistribution)
          .eq("id", blogPostId)
          .eq("portal_module", portalModule)
          .is("deleted_at", null);

        let { error } = await updatePostQuery;

        if (error && isMissingDistributionColumnError(error)) {
          const fallback = await supabase
            .from("blog_posts")
            .update(baseUpdatePayload)
            .eq("id", blogPostId)
            .eq("portal_module", portalModule)
            .is("deleted_at", null);

          error = fallback.error;
        }

        if (error) throw error;

        if (shouldSendDistributionEmail) {
          try {
            await sendBlogPostDistributionIfRequested(supabase, blogPostId, {
              title,
              slug,
              summary,
              content,
              coverImageUrl,
              authorName,
              tags,
              referenceLinks,
              publishedAt,
              distributionEmailEnabled,
              distributionEmails: recipientEmails,
              portalLabel: contentSection === "training" ? "Training del portal" : "Blog del portal",
              portalDescription:
                contentSection === "training"
                  ? "Contenido privado de training de Technized."
                  : "Contenido privado de blog de Technized.",
              moduleName: portalModule
            });
          } catch (sendError) {
            console.error("No pudimos enviar el articulo por email.", sendError);
            return buildRedirect(
              context.request,
              redirectTo,
              "Articulo guardado, pero no pudimos enviar el email de distribucion.",
              "error"
            );
          }
        }

        return buildRedirect(context.request, redirectTo, "Articulo actualizado.", "success");
      }

      case "delete-blog-post": {
        const blogPostId = getTextField(formData, "blog_post_id");

        if (!blogPostId) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No pudimos resolver el articulo a eliminar.",
            "error"
          );
        }

        const { data: blogPost, error: blogPostLookupError } = await supabase
          .from("blog_posts")
          .select("id, slug")
          .eq("id", blogPostId)
          .is("deleted_at", null)
          .maybeSingle();

        if (blogPostLookupError) throw blogPostLookupError;

        if (!blogPost) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No encontramos el articulo a eliminar.",
            "error"
          );
        }

        const deletedAt = new Date().toISOString();
        const archivedSlug = `${blogPost.slug}--deleted-${Date.now()}`;

        const { error } = await supabase
          .from("blog_posts")
          .update({
            slug: archivedSlug,
            status: "draft",
            is_featured: false,
            deleted_at: deletedAt,
            updated_at: deletedAt
          })
          .eq("id", blogPostId)
          .is("deleted_at", null);

        if (error) throw error;

        return buildRedirect(
          context.request,
          redirectTo,
          "Articulo eliminado de la lista correctamente.",
          "success"
        );
      }

      case "upload-blog-image": {
        const imageUrl = await storeBlogImageUpload(formData.get("image"), {
          slugHint: getTextField(formData, "slug") || "blog"
        });

        if (!imageUrl) {
          return new Response(JSON.stringify({ ok: false, message: "No recibimos ninguna imagen." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ ok: true, imageUrl: withPortalBasePath(imageUrl) }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      case "upsert-access": {
        const clientId = String(formData.get("client_id") ?? "").trim();
        const applicationId = String(formData.get("application_id") ?? "").trim();
        const isEnabled = getBooleanField(formData, "is_enabled", false);

        if (!clientId || !applicationId) {
          return buildRedirect(context.request, redirectTo, "No pudimos resolver el acceso solicitado.", "error");
        }

        const { data: existingAccess } = await supabase
          .from("client_application_access")
          .select("id")
          .eq("client_id", clientId)
          .eq("application_id", applicationId)
          .maybeSingle();

        const operation = existingAccess
          ? supabase
              .from("client_application_access")
              .update({ is_enabled: isEnabled })
              .eq("id", existingAccess.id)
          : supabase.from("client_application_access").insert({
              client_id: clientId,
              application_id: applicationId,
              is_enabled: isEnabled
            });

        const { error } = await operation;
        if (error) throw error;

        return buildRedirect(context.request, redirectTo, "Acceso actualizado.", "success");
      }

      case "bulk-import": {
        const maxReportedRowErrors = 80;
        const mode = getTextField(formData, "mode") === "commit" ? "commit" : "preview";
        const clientsCsvFile = formData.get("clients_csv");
        const usersCsvFile = formData.get("users_csv");

        const clientsCsv =
          clientsCsvFile instanceof File ? await clientsCsvFile.text() : getTextField(formData, "clients_csv_text");
        const usersCsv =
          usersCsvFile instanceof File ? await usersCsvFile.text() : getTextField(formData, "users_csv_text");

        const report = {
          mode,
          clients: {
            total: 0,
            processed: 0,
            created: 0,
            updated: 0,
            errors: 0
          },
          users: {
            total: 0,
            processed: 0,
            created: 0,
            updated: 0,
            errors: 0
          },
          rowErrors: [] as Array<{ entity: "client" | "user"; row: number; message: string }>
        };

        const clientsRows = parseCsvRows(clientsCsv);
        const usersRows = parseCsvRows(usersCsv);
        report.clients.total = clientsRows.length;
        report.users.total = usersRows.length;

        if (clientsRows.length === 0 && usersRows.length === 0) {
          return buildRedirect(
            context.request,
            redirectTo,
            "No encontramos filas para procesar. Carga al menos un CSV con datos.",
            "error"
          );
        }

        const { data: existingClients, error: existingClientsError } = await supabase
          .from("clients")
          .select("id, slug, name")
          .eq("portal_module", portalModule)
          .is("deleted_at", null);
        if (existingClientsError) throw existingClientsError;

        const clientsBySlug = new Map((existingClients ?? []).map((client) => [client.slug, client]));
        const newlyCreatedOrUpdatedClientsBySlug = new Map<string, string>();

        for (let index = 0; index < clientsRows.length; index += 1) {
          const row = clientsRows[index];
          const rowNumber = index + 2;
          const name = String(row.name ?? "").trim();
          const slug = String(row.slug ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-_]/g, "");
          const isActive = parseBoolean((row.is_active ?? "true") as unknown as FormDataEntryValue, true);

          if (!name || !slug) {
            report.clients.errors += 1;
            if (report.rowErrors.length < maxReportedRowErrors) {
              report.rowErrors.push({
                entity: "client",
                row: rowNumber,
                message: "Faltan columnas requeridas: name y/o slug."
              });
            }
            continue;
          }

          try {
            const existingClient = clientsBySlug.get(slug);

            if (mode === "commit") {
              if (existingClient) {
                const { error: updateError } = await supabase
                  .from("clients")
                  .update({
                    name,
                    is_active: isActive
                  })
                  .eq("id", existingClient.id)
                  .eq("portal_module", portalModule)
                  .is("deleted_at", null);
                if (updateError) throw updateError;
                report.clients.updated += 1;
                newlyCreatedOrUpdatedClientsBySlug.set(slug, existingClient.id);
              } else {
                const { data: createdClient, error: createError } = await supabase
                  .from("clients")
                  .insert({
                    name,
                    slug,
                    is_active: isActive,
                    portal_module: portalModule
                  })
                  .select("id, slug, name")
                  .single();
                if (createError) throw createError;
                report.clients.created += 1;
                if (createdClient) {
                  clientsBySlug.set(createdClient.slug, createdClient);
                  newlyCreatedOrUpdatedClientsBySlug.set(createdClient.slug, createdClient.id);
                }
              }
            } else {
              if (existingClient) {
                report.clients.updated += 1;
                newlyCreatedOrUpdatedClientsBySlug.set(slug, existingClient.id);
              } else {
                report.clients.created += 1;
              }
            }

            report.clients.processed += 1;
          } catch (error) {
            report.clients.errors += 1;
            if (report.rowErrors.length < maxReportedRowErrors) {
              report.rowErrors.push({
                entity: "client",
                row: rowNumber,
                message: error instanceof Error ? error.message : "No pudimos procesar esta fila de consultor."
              });
            }
          }
        }

        const { data: existingProfiles, error: existingProfilesError } = await supabase
          .from("profiles")
          .select("id, email, role, is_active");
        if (existingProfilesError) throw existingProfilesError;
        const profilesByEmail = new Map(
          (existingProfiles ?? []).map((profile) => [String(profile.email ?? "").toLowerCase(), profile])
        );

        const adminSupabase = createSupabaseAdminClient();

        for (let index = 0; index < usersRows.length; index += 1) {
          const row = usersRows[index];
          const rowNumber = index + 2;
          const email = String(row.email ?? "").trim().toLowerCase();
          const fullName = String(row.full_name ?? "").trim() || null;
          const password = String(row.password ?? "").trim();
          const isAdmin = parseBoolean((row.is_admin ?? "false") as unknown as FormDataEntryValue, false);
          const clientSlug = String(row.client_slug ?? "").trim().toLowerCase();
          const isActive = parseBoolean((row.is_active ?? "true") as unknown as FormDataEntryValue, true);

          if (!email || (!isAdmin && !clientSlug)) {
            report.users.errors += 1;
            if (report.rowErrors.length < maxReportedRowErrors) {
              report.rowErrors.push({
                entity: "user",
                row: rowNumber,
                message: "Faltan columnas requeridas: email y client_slug (si no es admin)."
              });
            }
            continue;
          }

          const referencedClientId =
            clientsBySlug.get(clientSlug)?.id ?? newlyCreatedOrUpdatedClientsBySlug.get(clientSlug) ?? null;

          if (!isAdmin && !referencedClientId) {
            report.users.errors += 1;
            if (report.rowErrors.length < maxReportedRowErrors) {
              report.rowErrors.push({
                entity: "user",
                row: rowNumber,
                message: `No encontramos client_slug "${clientSlug}" en consultores activos.`
              });
            }
            continue;
          }

          try {
            const existingProfile = profilesByEmail.get(email);
            let profileId = existingProfile?.id ?? "";
            const nextRole = isAdmin ? "admin" : "client_user";

            if (mode === "commit") {
              if (!existingProfile) {
                const generatedPassword = password || `Tmp-${crypto.randomUUID()}-A1!`;
                const { data: createdUserData, error: createUserError } = await adminSupabase.auth.admin.createUser({
                  email,
                  password: generatedPassword,
                  email_confirm: true,
                  user_metadata: { full_name: fullName ?? undefined }
                });
                if (createUserError) throw createUserError;
                profileId = createdUserData.user.id;
                report.users.created += 1;
              } else {
                profileId = existingProfile.id;
                report.users.updated += 1;
              }

              const { error: profileUpsertError } = await supabase.from("profiles").upsert(
                {
                  id: profileId,
                  email,
                  full_name: fullName,
                  role: nextRole,
                  is_active: isActive
                },
                { onConflict: "id" }
              );
              if (profileUpsertError) throw profileUpsertError;

              if (!isAdmin && referencedClientId) {
                const { error: membershipError } = await supabase.from("client_memberships").upsert(
                  {
                    user_id: profileId,
                    client_id: referencedClientId,
                    role: "member",
                    is_active: isActive
                  },
                  { onConflict: "user_id,client_id" }
                );
                if (membershipError) throw membershipError;
              }
            } else if (existingProfile) {
              report.users.updated += 1;
            } else {
              report.users.created += 1;
            }

            report.users.processed += 1;
          } catch (error) {
            report.users.errors += 1;
            if (report.rowErrors.length < maxReportedRowErrors) {
              report.rowErrors.push({
                entity: "user",
                row: rowNumber,
                message: error instanceof Error ? error.message : "No pudimos procesar esta fila de usuario."
              });
            }
          }
        }

        const tone: "success" | "error" =
          report.rowErrors.length > 0 && report.clients.processed + report.users.processed === 0 ? "error" : "success";

        const summaryMessage =
          mode === "preview"
            ? `Validacion completada. Filas procesables: ${report.clients.processed + report.users.processed}. Errores: ${report.clients.errors + report.users.errors}.`
            : `Importacion ejecutada. Procesados: ${report.clients.processed + report.users.processed}. Errores: ${report.clients.errors + report.users.errors}.`;

        return buildRedirectWithParams(context.request, redirectTo, summaryMessage, tone, {
          import_report: JSON.stringify(report)
        });
      }

      default:
        return buildRedirect(context.request, redirectTo, "Accion no reconocida.", "error");
    }
  } catch (error) {
    console.error("No pudimos completar la accion de administracion.", error);
    if (action === "upload-blog-image") {
      const message =
        error instanceof Error ? error.message : "No pudimos subir la imagen en este momento.";
      return new Response(JSON.stringify({ ok: false, message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const customMessage =
      error instanceof Error
        ? /^El logo /i.test(error.message) || /^Missing SUPABASE_SERVICE_ROLE_KEY/i.test(error.message)
          ? error.message
          : /already been registered/i.test(error.message) || /already registered/i.test(error.message)
            ? "Ya existe un usuario registrado con ese email."
            : null
        : null;

    return buildRedirect(
      context.request,
      redirectTo,
      customMessage ?? "Ocurrio un error guardando los cambios. Revisa los datos e intenta nuevamente.",
      "error"
    );
  }
};
