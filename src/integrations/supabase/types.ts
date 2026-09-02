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
      daily_all_habits_completed: {
        Row: {
          completed_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      future_letters: {
        Row: {
          created_at: string
          deliver_at: string
          id: string
          kind: string
          message_encrypted: string
          opened_at: string | null
          replied_at: string | null
          reply_encrypted: string | null
          source_entry_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deliver_at: string
          id?: string
          kind: string
          message_encrypted: string
          opened_at?: string | null
          replied_at?: string | null
          reply_encrypted?: string | null
          source_entry_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deliver_at?: string
          id?: string
          kind?: string
          message_encrypted?: string
          opened_at?: string | null
          replied_at?: string | null
          reply_encrypted?: string | null
          source_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_letters_source_entry_id_fkey"
            columns: ["source_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          }
        ]
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          entry_text: string
          id: string
          mood: string
          reflection_answer: string | null
          reflection_question: string | null
          spotify_clip_end_seconds: number | null
          spotify_clip_start_seconds: number | null
          spotify_track_album: string | null
          spotify_track_artist: string | null
          spotify_track_image: string | null
          spotify_track_name: string | null
          spotify_track_uri: string | null
          status: string
          timestamp_started: string
          updated_at: string | null
          user_id: string
          weather_description: string | null
          weather_icon: string | null
          weather_location: string | null
          weather_temperature: number | null
        }
        Insert: {
          created_at?: string
          entry_text: string
          id?: string
          mood: string
          reflection_answer?: string | null
          reflection_question?: string | null
          spotify_clip_end_seconds?: number | null
          spotify_clip_start_seconds?: number | null
          spotify_track_album?: string | null
          spotify_track_artist?: string | null
          spotify_track_image?: string | null
          spotify_track_name?: string | null
          spotify_track_uri?: string | null
          status?: string
          timestamp_started?: string
          updated_at?: string | null
          user_id: string
          weather_description?: string | null
          weather_icon?: string | null
          weather_location?: string | null
          weather_temperature?: number | null
        }
        Update: {
          created_at?: string
          entry_text?: string
          id?: string
          mood?: string
          reflection_answer?: string | null
          reflection_question?: string | null
          spotify_clip_end_seconds?: number | null
          spotify_clip_start_seconds?: number | null
          spotify_track_album?: string | null
          spotify_track_artist?: string | null
          spotify_track_image?: string | null
          spotify_track_name?: string | null
          spotify_track_uri?: string | null
          status?: string
          timestamp_started?: string
          updated_at?: string | null
          user_id?: string
          weather_description?: string | null
          weather_icon?: string | null
          weather_location?: string | null
          weather_temperature?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          disable_song_blur: boolean
          disable_weather_effects: boolean
          first_name: string | null
          id: string
          last_name: string | null
          spotify_access_token: string | null
          spotify_is_premium: boolean | null
          spotify_refresh_token: string | null
          spotify_token_expires_at: string | null
          spotify_username: string | null
          temperature_unit: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          disable_song_blur?: boolean
          disable_weather_effects?: boolean
          first_name?: string | null
          id: string
          last_name?: string | null
          spotify_access_token?: string | null
          spotify_is_premium?: boolean | null
          spotify_refresh_token?: string | null
          spotify_token_expires_at?: string | null
          spotify_username?: string | null
          temperature_unit?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          disable_song_blur?: boolean
          disable_weather_effects?: boolean
          first_name?: string | null
          id?: string
          last_name?: string | null
          spotify_access_token?: string | null
          spotify_is_premium?: boolean | null
          spotify_refresh_token?: string | null
          spotify_token_expires_at?: string | null
          spotify_username?: string | null
          temperature_unit?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      spotify_credentials: {
        Row: {
          access_token: string
          created_at: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visit_logs: {
        Row: {
          city: string | null
          country: string | null
          id: string
          latitude: number | null
          longitude: number | null
          region: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_spotify_credentials: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_spotify_token_expired: { Args: { user_id: string }; Returns: boolean }
      update_profile_spotify_data:
        | {
            Args: {
              p_access_token: string
              p_expires_at: string
              p_refresh_token: string
              p_user_id: string
              p_username: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_access_token: string
              p_expires_at: string
              p_is_premium?: boolean
              p_refresh_token: string
              p_user_id: string
              p_username: string
            }
            Returns: boolean
          }
      update_spotify_credentials: {
        Args: {
          p_access_token: string
          p_expires_at: string
          p_refresh_token: string
          p_user_id: string
        }
        Returns: boolean
      }
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
