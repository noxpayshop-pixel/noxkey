export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      casino_bets: {
        Row: {
          bet_amount: number
          created_at: string
          discord_username: string
          game: string
          id: string
          payout: number
          won: boolean
        }
        Insert: {
          bet_amount: number
          created_at?: string
          discord_username: string
          game: string
          id?: string
          payout?: number
          won?: boolean
        }
        Update: {
          bet_amount?: number
          created_at?: string
          discord_username?: string
          game?: string
          id?: string
          payout?: number
          won?: boolean
        }
        Relationships: []
      }
      discord_blacklist: {
        Row: {
          created_at: string
          discord_username: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          discord_username: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          discord_username?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      discord_users: {
        Row: {
          created_at: string | null
          discord_username: string
          id: string
          session_token: string | null
        }
        Insert: {
          created_at?: string | null
          discord_username: string
          id?: string
          session_token?: string | null
        }
        Update: {
          created_at?: string | null
          discord_username?: string
          id?: string
          session_token?: string | null
        }
        Relationships: []
      }
      gift_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          point_price: number
          stock: string[]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          point_price?: number
          stock?: string[]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          point_price?: number
          stock?: string[]
        }
        Relationships: []
      }
      ip_blacklist: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      ip_logs: {
        Row: {
          action: string
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          discord_username: string
          id: string
          ip_address: string
        }
        Insert: {
          action?: string
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          discord_username: string
          id?: string
          ip_address: string
        }
        Update: {
          action?: string
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          discord_username?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          discord_username: string
          expires_at: string
          id: string
          is_used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discord_username: string
          expires_at: string
          id?: string
          is_used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discord_username?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          ip_address: string | null
          page: string
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page?: string
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          page?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          discord_username: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          discord_username: string
          id?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          discord_username?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          max_bonus_points: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          max_bonus_points?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          max_bonus_points?: number | null
          name?: string
        }
        Relationships: []
      }
      redeem_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_redeemed: boolean | null
          product_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          product_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_redeemed?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeem_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          code: string
          created_at: string | null
          delivered_item: string | null
          discord: string
          email: string
          id: string
          product_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          delivered_item?: string | null
          discord: string
          email: string
          id?: string
          product_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          delivered_item?: string | null
          discord?: string
          email?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      replacement_requests: {
        Row: {
          admin_note: string | null
          created_at: string | null
          discord_username: string
          id: string
          problem_description: string
          problem_screenshot_url: string | null
          product_id: string
          redeem_code: string
          resolved_at: string | null
          status: string
          vouch_screenshot_url: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          discord_username: string
          id?: string
          problem_description: string
          problem_screenshot_url?: string | null
          product_id: string
          redeem_code: string
          resolved_at?: string | null
          status?: string
          vouch_screenshot_url?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          discord_username?: string
          id?: string
          problem_description?: string
          problem_screenshot_url?: string | null
          product_id?: string
          redeem_code?: string
          resolved_at?: string | null
          status?: string
          vouch_screenshot_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replacement_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string | null
          id: string
          is_claimed: boolean | null
          item: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_claimed?: boolean | null
          item: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_claimed?: boolean | null
          item?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_panel_config: {
        Row: {
          dropdown_placeholder: string | null
          dropdown_position: string | null
          embed_color: string
          embed_description: string
          embed_footer_text: string | null
          embed_image_url: string | null
          embed_thumbnail_url: string | null
          embed_title: string | null
          id: string
          panel_content: string | null
          ping_dm_message: string | null
          ticket_types: Json
          updated_at: string
          welcome_color: string | null
          welcome_description: string | null
          welcome_footer_text: string | null
          welcome_title: string | null
        }
        Insert: {
          dropdown_placeholder?: string | null
          dropdown_position?: string | null
          embed_color?: string
          embed_description?: string
          embed_footer_text?: string | null
          embed_image_url?: string | null
          embed_thumbnail_url?: string | null
          embed_title?: string | null
          id?: string
          panel_content?: string | null
          ping_dm_message?: string | null
          ticket_types?: Json
          updated_at?: string
          welcome_color?: string | null
          welcome_description?: string | null
          welcome_footer_text?: string | null
          welcome_title?: string | null
        }
        Update: {
          dropdown_placeholder?: string | null
          dropdown_position?: string | null
          embed_color?: string
          embed_description?: string
          embed_footer_text?: string | null
          embed_image_url?: string | null
          embed_thumbnail_url?: string | null
          embed_title?: string | null
          id?: string
          panel_content?: string | null
          ping_dm_message?: string | null
          ticket_types?: Json
          updated_at?: string
          welcome_color?: string | null
          welcome_description?: string | null
          welcome_footer_text?: string | null
          welcome_title?: string | null
        }
        Relationships: []
      }
      user_points: {
        Row: {
          casino_chance_modifier: number
          discord_username: string
          id: string
          points: number
          updated_at: string
        }
        Insert: {
          casino_chance_modifier?: number
          discord_username: string
          id?: string
          points?: number
          updated_at?: string
        }
        Update: {
          casino_chance_modifier?: number
          discord_username?: string
          id?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      vouch_submissions: {
        Row: {
          admin_note: string | null
          created_at: string | null
          discord_username: string
          id: string
          platform: string
          resolved_at: string | null
          screenshot_url: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          discord_username: string
          id?: string
          platform: string
          resolved_at?: string | null
          screenshot_url: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          discord_username?: string
          id?: string
          platform?: string
          resolved_at?: string | null
          screenshot_url?: string
          status?: string
        }
        Relationships: []
      }
      vouches: {
        Row: {
          created_at: string | null
          display_date: string
          id: string
          message: string | null
          rating: number
          source: string
        }
        Insert: {
          created_at?: string | null
          display_date?: string
          id?: string
          message?: string | null
          rating?: number
          source?: string
        }
        Update: {
          created_at?: string | null
          display_date?: string
          id?: string
          message?: string | null
          rating?: number
          source?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          discord: string
          email: string
          fulfilled_item: string | null
          id: string
          is_fulfilled: boolean | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          discord: string
          email: string
          fulfilled_item?: string | null
          id?: string
          is_fulfilled?: boolean | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          discord?: string
          email?: string
          fulfilled_item?: string | null
          id?: string
          is_fulfilled?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
