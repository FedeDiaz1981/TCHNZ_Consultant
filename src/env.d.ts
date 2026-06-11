/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { PortalProfile } from "./lib/portal/admin";
import type { PortalModule, PortalSection } from "./lib/portal/modules";

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_HOME_URL?: string;
  readonly PUBLIC_PORTAL_BASE_DOMAIN?: string;
  readonly PUBLIC_PORTAL_DEFAULT_MODULE?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  readonly TURNSTILE_SECRET_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    user: User | null;
    profile: PortalProfile | null;
    portalModule: PortalModule;
    portalSection: PortalSection;
  }
}
