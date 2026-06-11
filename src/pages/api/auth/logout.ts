import type { APIRoute } from "astro";
import { createRedirectResponse, getForwardedRequestUrl } from "../../../lib/auth/http";
import { buildAuthUrl } from "../../../lib/portal/hosts";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

async function logout(context: Parameters<APIRoute>[0]) {
  const supabase = createSupabaseServerClient(context);
  await supabase.auth.signOut();
  return createRedirectResponse(buildAuthUrl(getForwardedRequestUrl(context.request), "/login"));
}

export const GET: APIRoute = logout;
export const POST: APIRoute = logout;
