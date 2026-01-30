export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      affiliates: {
        Row: {
          id: string;
          clerk_user_id: string | null;
          email: string;
          first_name: string | null;
          last_name: string | null;
          status: string;
          tier: string;
          commission_rate: number;
          referral_code: string;
          discount_code: string | null;
          shopify_discount_id: string | null;
          paypal_email: string | null;
          instagram_handle: string | null;
          tiktok_handle: string | null;
          youtube_channel: string | null;
          website_url: string | null;
          bio: string | null;
          total_referrals: number;
          total_revenue: number;
          total_commission_earned: number;
          total_commission_paid: number;
          balance_owed: number;
          created_at: string;
          updated_at: string;
          approved_at: string | null;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          clerk_user_id?: string | null;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          status?: string;
          tier?: string;
          commission_rate?: number;
          referral_code: string;
          discount_code?: string | null;
          shopify_discount_id?: number | null;
          paypal_email?: string | null;
          instagram_handle?: string | null;
          tiktok_handle?: string | null;
          youtube_channel?: string | null;
          website_url?: string | null;
          bio?: string | null;
          total_referrals?: number;
          total_revenue?: number;
          total_commission_earned?: number;
          total_commission_paid?: number;
          balance_owed?: number;
          created_at?: string;
          updated_at?: string;
          approved_at?: string | null;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          clerk_user_id?: string | null;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          status?: string;
          tier?: string;
          commission_rate?: number;
          referral_code?: string;
          discount_code?: string | null;
          shopify_discount_id?: number | null;
          paypal_email?: string | null;
          instagram_handle?: string | null;
          tiktok_handle?: string | null;
          youtube_channel?: string | null;
          website_url?: string | null;
          bio?: string | null;
          total_referrals?: number;
          total_revenue?: number;
          total_commission_earned?: number;
          total_commission_paid?: number;
          balance_owed?: number;
          created_at?: string;
          updated_at?: string;
          approved_at?: string | null;
          last_login_at?: string | null;
        };
      };
      referred_customers: {
        Row: {
          id: string;
          affiliate_id: string | null;
          shopify_customer_id: number | null;
          recharge_customer_id: number | null;
          email: string;
          first_order_id: number | null;
          first_order_date: string | null;
          first_order_total: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          affiliate_id?: string | null;
          shopify_customer_id?: number | null;
          recharge_customer_id?: number | null;
          email: string;
          first_order_id?: number | null;
          first_order_date?: string | null;
          first_order_total?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          affiliate_id?: string | null;
          shopify_customer_id?: number | null;
          recharge_customer_id?: number | null;
          email?: string;
          first_order_id?: number | null;
          first_order_date?: string | null;
          first_order_total?: number | null;
          created_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          affiliate_id: string | null;
          customer_id: string | null;
          order_id: string;
          order_source: string;
          order_number: string | null;
          order_date: string;
          order_subtotal: number;
          order_total: number;
          commission_rate: number;
          commission_amount: number;
          status: string;
          is_recurring: boolean;
          created_at: string;
          approved_at: string | null;
          paid_at: string | null;
          payout_id: string | null;
        };
        Insert: {
          id?: string;
          affiliate_id?: string | null;
          customer_id?: string | null;
          order_id: string;
          order_source: string;
          order_number?: string | null;
          order_date: string;
          order_subtotal: number;
          order_total: number;
          commission_rate: number;
          commission_amount: number;
          status?: string;
          is_recurring?: boolean;
          created_at?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          payout_id?: string | null;
        };
        Update: {
          id?: string;
          affiliate_id?: string | null;
          customer_id?: string | null;
          order_id?: string;
          order_source?: string;
          order_number?: string | null;
          order_date?: string;
          order_subtotal?: number;
          order_total?: number;
          commission_rate?: number;
          commission_amount?: number;
          status?: string;
          is_recurring?: boolean;
          created_at?: string;
          approved_at?: string | null;
          paid_at?: string | null;
          payout_id?: string | null;
        };
      };
      payouts: {
        Row: {
          id: string;
          affiliate_id: string | null;
          amount: number;
          method: string;
          paypal_email: string | null;
          paypal_batch_id: string | null;
          paypal_payout_item_id: string | null;
          status: string;
          failure_reason: string | null;
          created_at: string;
          processed_at: string | null;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          affiliate_id?: string | null;
          amount: number;
          method?: string;
          paypal_email?: string | null;
          paypal_batch_id?: string | null;
          paypal_payout_item_id?: string | null;
          status?: string;
          failure_reason?: string | null;
          created_at?: string;
          processed_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          affiliate_id?: string | null;
          amount?: number;
          method?: string;
          paypal_email?: string | null;
          paypal_batch_id?: string | null;
          paypal_payout_item_id?: string | null;
          status?: string;
          failure_reason?: string | null;
          created_at?: string;
          processed_at?: string | null;
          completed_at?: string | null;
          notes?: string | null;
        };
      };
      tiers: {
        Row: {
          id: string;
          name: string;
          slug: string;
          min_referrals: number;
          commission_rate: number;
          description: string | null;
          perks: string[] | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          min_referrals: number;
          commission_rate: number;
          description?: string | null;
          perks?: string[] | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          min_referrals?: number;
          commission_rate?: number;
          description?: string | null;
          perks?: string[] | null;
          sort_order?: number;
        };
      };
      marketing_assets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          asset_type: string;
          file_url: string;
          thumbnail_url: string | null;
          min_tier: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          asset_type: string;
          file_url: string;
          thumbnail_url?: string | null;
          min_tier?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          asset_type?: string;
          file_url?: string;
          thumbnail_url?: string | null;
          min_tier?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          affiliate_id: string | null;
          action: string;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          affiliate_id?: string | null;
          action: string;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          affiliate_id?: string | null;
          action?: string;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      system_errors: {
        Row: {
          id: string;
          error_type: string;
          severity: string;
          message: string;
          stack_trace: string | null;
          source: string;
          endpoint: string | null;
          affiliate_id: string | null;
          order_id: string | null;
          payout_id: string | null;
          request_payload: Json | null;
          response_payload: Json | null;
          http_status: number | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          error_type: string;
          severity?: string;
          message: string;
          stack_trace?: string | null;
          source: string;
          endpoint?: string | null;
          affiliate_id?: string | null;
          order_id?: string | null;
          payout_id?: string | null;
          request_payload?: Json | null;
          response_payload?: Json | null;
          http_status?: number | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          error_type?: string;
          severity?: string;
          message?: string;
          stack_trace?: string | null;
          source?: string;
          endpoint?: string | null;
          affiliate_id?: string | null;
          order_id?: string | null;
          payout_id?: string | null;
          request_payload?: Json | null;
          response_payload?: Json | null;
          http_status?: number | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      check_tier_upgrade: {
        Args: { affiliate_uuid: string };
        Returns: void;
      };
      recalculate_affiliate_stats: {
        Args: { affiliate_uuid: string };
        Returns: void;
      };
    };
  };
}

// Convenience types
export type Affiliate = Database["public"]["Tables"]["affiliates"]["Row"];
export type ReferredCustomer = Database["public"]["Tables"]["referred_customers"]["Row"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type Payout = Database["public"]["Tables"]["payouts"]["Row"];
export type Tier = Database["public"]["Tables"]["tiers"]["Row"];
export type MarketingAsset = Database["public"]["Tables"]["marketing_assets"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
export type SystemError = Database["public"]["Tables"]["system_errors"]["Row"];
