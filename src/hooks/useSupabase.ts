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

    // Use the accessToken option for third-party auth (recommended pattern)
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        const token = await session.getToken({ template: "supabase" });
        return token ?? '';
      },
    });
  }, [session]);

  return supabase;
}
