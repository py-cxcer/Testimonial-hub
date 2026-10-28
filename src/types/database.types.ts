export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          user_id: string;
          plan: "free" | "pro";
          status: string;
          billing_mode: "none" | "demo";
          demo_upgraded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan?: "free" | "pro";
          status?: string;
          billing_mode?: "none" | "demo";
          demo_upgraded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          plan?: "free" | "pro";
          status?: string;
          billing_mode?: "none" | "demo";
          demo_upgraded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      spaces: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          subtitle: string | null;
          prompt: string;
          slug: string;
          collect_rating: boolean;
          theme: "light" | "warm" | "dark";
          field_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          subtitle?: string | null;
          prompt: string;
          slug: string;
          collect_rating?: boolean;
          theme?: "light" | "warm" | "dark";
          field_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          subtitle?: string | null;
          prompt?: string;
          slug?: string;
          collect_rating?: boolean;
          theme?: "light" | "warm" | "dark";
          field_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      testimonials: {
        Row: {
          id: string;
          space_id: string;
          name: string;
          email: string;
          company_name: string | null;
          social_links: Json;
          profile_photo_url: string | null;
          content: string;
          rating: number | null;
          share_consent: boolean;
          consent_at: string | null;
          is_favorite: boolean;
          on_wall_of_love: boolean;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
          email_normalized: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          name: string;
          email: string;
          company_name?: string | null;
          social_links?: Json;
          profile_photo_url?: string | null;
          content: string;
          rating?: number | null;
          share_consent?: boolean;
          consent_at?: string | null;
          is_favorite?: boolean;
          on_wall_of_love?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          name?: string;
          email?: string;
          company_name?: string | null;
          social_links?: Json;
          profile_photo_url?: string | null;
          content?: string;
          rating?: number | null;
          share_consent?: boolean;
          consent_at?: string | null;
          is_favorite?: boolean;
          on_wall_of_love?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      embed_configs: {
        Row: {
          id: string;
          space_id: string;
          owner_id: string;
          layout: "masonry" | "carousel" | "marquee" | "single" | "badge";
          dark_mode: boolean;
          background_color: string;
          animation_enabled: boolean;
          show_rating: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          owner_id: string;
          layout?: "masonry" | "carousel" | "marquee" | "single" | "badge";
          dark_mode?: boolean;
          background_color?: string;
          animation_enabled?: boolean;
          show_rating?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          owner_id?: string;
          layout?: "masonry" | "carousel" | "marquee" | "single" | "badge";
          dark_mode?: boolean;
          background_color?: string;
          animation_enabled?: boolean;
          show_rating?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
