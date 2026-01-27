"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabase(): SupabaseClient<Database> | null {
  const { session } = useSession();

  const supabase = useMemo(() => {
    if (!session) return null;

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // Get fresh token from Clerk for each request
          const token = await session.getToken({ template: "supabase" });

          const headers = new Headers(options.headers);
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }

          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [session]);

  return supabase;
}
