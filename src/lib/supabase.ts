import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser - used with Clerk's Supabase integration
// The Clerk-Supabase integration automatically handles JWT tokens
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server client with service role for admin operations (webhooks, etc.)
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Client for use in Server Components with Clerk auth token
// Uses the accessToken option for third-party auth (recommended pattern)
export function createAuthenticatedClient(getToken: () => Promise<string | null>) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      const token = await getToken();
      return token ?? '';
    },
  });
}
