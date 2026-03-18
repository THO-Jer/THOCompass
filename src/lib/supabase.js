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
