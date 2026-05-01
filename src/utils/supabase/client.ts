import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseOptions = {
  auth: {
    experimental: {
      passkey: true,
    },
  },
} as NonNullable<Parameters<typeof createBrowserClient>[2]>;

export function createClient() {
  if (!supabaseUrl || !supabaseKey) return null;

  return createBrowserClient(supabaseUrl, supabaseKey, supabaseOptions);
}
