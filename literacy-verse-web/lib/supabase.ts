import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && key && !url.includes("YOUR_PROJECT") && !key.includes("YOUR_")
  ? createClient(url, key)
  : null;

export const isSupabaseConfigured = Boolean(supabase);
