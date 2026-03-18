import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const STORAGE_BUCKETS = {
  rc: 'rc-documents',
  do: 'do-documents',
  esg: 'esg-documents',
};

export function moduleKeyToBucket(moduleKey) {
  return STORAGE_BUCKETS[moduleKey?.toLowerCase()] || STORAGE_BUCKETS.rc;
}


function isLocalhostUrl(value) {
  if (!value) return false;
  return /localhost|127\.0\.0\.1/.test(value);
}

export function getOAuthRedirectUrl() {
  const explicitAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "");
  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  // In production, prefer the live origin if VITE_APP_URL still points to localhost.
  const base = origin && !isLocalhostUrl(origin)
    ? (isLocalhostUrl(explicitAppUrl) ? origin : (explicitAppUrl || origin))
    : (explicitAppUrl || origin);

  return base ? `${base}/auth/callback` : undefined;
}

export function getAuthDebugInfo() {
  const explicitAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || "(no definida)";
  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "(sin window)";
  return {
    explicitAppUrl,
    origin,
    redirectUrl: getOAuthRedirectUrl() || "(sin redirect)",
  };
}
