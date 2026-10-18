import type { Listing, Reservation, ListingInput } from "./marketplace";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};
type Profile = {
  id: string;
  display_name: string;
  preferred_landmark:
    "nest" | "ikb" | "buchanan" | "sauder" | "totem" | "orchard" | "life";
  account_type: "student" | "business";
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      listings: Table<
        Listing,
        ListingInput & {
          seller_id: string;
          seller_name: string;
          available_quantity: number;
        }
      >;
      reservations: Table<
        Omit<Reservation, "listing" | "code"> & { idempotency_key: string }
      >;
      pickup_secrets: Table<{
        reservation_id: string;
        buyer_id: string;
        code: string;
        failed_attempts: number;
      }>;
      ai_usage: Table<{ user_id: string; hour: string; requests: number }>;
    };
    Views: Record<string, never>;
    Functions: {
      save_listing: {
        Args: { p_data: Json; p_id?: string | null };
        Returns: string;
      };
      remove_listing: { Args: { p_id: string }; Returns: undefined };
      relist_listing: {
        Args: {
          p_id: string;
          p_expires_at: string;
          p_food_confirmed?: boolean;
          p_food_details?: string | null;
        };
        Returns: string;
      };
      reserve_listing: {
        Args: { p_listing: string; p_quantity: number; p_key: string };
        Returns: string;
      };
      cancel_reservation: { Args: { p_id: string }; Returns: undefined };
      complete_pickup: {
        Args: { p_id: string; p_code: string };
        Returns: boolean;
      };
      impact_totals: { Args: Record<string, never>; Returns: Json };
      consume_ai_quota: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
