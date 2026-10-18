import "server-only";
import { serverSupabase } from "./supabase/server";
import { demoListings } from "./demo";
import type { Listing } from "./marketplace";
export async function getListings(): Promise<{
  listings: Listing[];
  demo: boolean;
  error?: string;
}> {
  const db = await serverSupabase();
  if (!db) return { listings: demoListings(), demo: true };
  const { data, error } = await db
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return {
      listings: [],
      demo: false,
      error:
        "The marketplace could not load. Check your connection and Supabase migration, then try again.",
    };
  return { listings: data as Listing[], demo: false };
}
export async function getListing(id: string): Promise<Listing | null> {
  if (id.startsWith("demo-"))
    return demoListings().find((l) => l.id === id) ?? null;
  const db = await serverSupabase();
  if (!db) return null;
  const { data } = await db
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Listing | null;
}
