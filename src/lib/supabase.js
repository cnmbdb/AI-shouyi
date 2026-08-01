import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabaseAuthFlowType = Capacitor.isNativePlatform() ? "pkce" : "implicit";

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        flowType: supabaseAuthFlowType,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase 尚未配置");
  return supabase;
}

export function authRedirect(path) {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = import.meta.env.DEV ? window.location.origin : configuredOrigin || window.location.origin;
  return new URL(path, `${origin}/`).toString();
}
