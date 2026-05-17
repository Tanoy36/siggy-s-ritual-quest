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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      banned_wallets: {
        Row: {
          created_at: string
          reason: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      riddles: {
        Row: {
          active: boolean
          badge_title: string
          clues: string[]
          correct_answer: string
          created_at: string
          creator_x_username: string
          description: string
          difficulty: string
          end_time: string
          id: string
          image_url: string | null
          main_hint: string
          max_winners: number
          start_time: string
          title: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          badge_title?: string
          clues?: string[]
          correct_answer: string
          created_at?: string
          creator_x_username?: string
          description: string
          difficulty?: string
          end_time?: string
          id?: string
          image_url?: string | null
          main_hint?: string
          max_winners?: number
          start_time?: string
          title: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          badge_title?: string
          clues?: string[]
          correct_answer?: string
          created_at?: string
          creator_x_username?: string
          description?: string
          difficulty?: string
          end_time?: string
          id?: string
          image_url?: string | null
          main_hint?: string
          max_winners?: number
          start_time?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      submissions: {
        Row: {
          answer: string
          badge_title: string | null
          completion_time_ms: number
          created_at: string
          id: string
          is_correct: boolean
          riddle_id: string
          signature: string | null
          tx_hash: string | null
          wallet_address: string
          x_avatar_seed: string
          x_username: string
          xp_earned: number
        }
        Insert: {
          answer: string
          badge_title?: string | null
          completion_time_ms?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          riddle_id: string
          signature?: string | null
          tx_hash?: string | null
          wallet_address: string
          x_avatar_seed: string
          x_username: string
          xp_earned?: number
        }
        Update: {
          answer?: string
          badge_title?: string | null
          completion_time_ms?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          riddle_id?: string
          signature?: string | null
          tx_hash?: string | null
          wallet_address?: string
          x_avatar_seed?: string
          x_username?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_riddle_id_fkey"
            columns: ["riddle_id"]
            isOneToOne: false
            referencedRelation: "riddles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_riddle_id_fkey"
            columns: ["riddle_id"]
            isOneToOne: false
            referencedRelation: "riddles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      riddles_public: {
        Row: {
          active: boolean | null
          badge_title: string | null
          clues: string[] | null
          created_at: string | null
          creator_x_username: string | null
          description: string | null
          difficulty: string | null
          end_time: string | null
          id: string | null
          image_url: string | null
          main_hint: string | null
          max_winners: number | null
          start_time: string | null
          title: string | null
          xp_reward: number | null
        }
        Insert: {
          active?: boolean | null
          badge_title?: string | null
          clues?: string[] | null
          created_at?: string | null
          creator_x_username?: string | null
          description?: string | null
          difficulty?: string | null
          end_time?: string | null
          id?: string | null
          image_url?: string | null
          main_hint?: string | null
          max_winners?: number | null
          start_time?: string | null
          title?: string | null
          xp_reward?: number | null
        }
        Update: {
          active?: boolean | null
          badge_title?: string | null
          clues?: string[] | null
          created_at?: string | null
          creator_x_username?: string | null
          description?: string | null
          difficulty?: string | null
          end_time?: string | null
          id?: string | null
          image_url?: string | null
          main_hint?: string | null
          max_winners?: number | null
          start_time?: string | null
          title?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
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
