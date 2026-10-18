"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { createBrowserClient } from "@supabase/ssr";
export const backendConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
let instance: SupabaseClient<Database> | undefined;
export function browserSupabase() {
  if (!backendConfigured())
    throw new Error(
      "Connect Supabase using .env.local to enable accounts and the live marketplace.",
    );
  return (instance ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ));
}
