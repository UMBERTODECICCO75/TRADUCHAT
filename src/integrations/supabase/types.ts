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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      call_sessions: {
        Row: {
          answer: string | null
          callee_id: string
          callee_name: string
          caller_id: string
          caller_name: string
          created_at: string
          expires_at: string
          id: string
          mode: string
          offer: string
          status: string
        }
        Insert: {
          answer?: string | null
          callee_id: string
          callee_name: string
          caller_id: string
          caller_name: string
          created_at?: string
          expires_at?: string
          id?: string
          mode: string
          offer: string
          status?: string
        }
        Update: {
          answer?: string | null
          callee_id?: string
          callee_name?: string
          caller_id?: string
          caller_name?: string
          created_at?: string
          expires_at?: string
          id?: string
          mode?: string
          offer?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_translations: {
        Row: {
          created_at: string
          id: string
          original_text: string
          recipient_id: string
          recipient_name: string
          sender_id: string
          sender_name: string
          target_language: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_text: string
          recipient_id: string
          recipient_name?: string
          sender_id: string
          sender_name?: string
          target_language: string
          translated_text: string
        }
        Update: {
          created_at?: string
          id?: string
          original_text?: string
          recipient_id?: string
          recipient_name?: string
          sender_id?: string
          sender_name?: string
          target_language?: string
          translated_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_translations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_translations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          created_at: string
          id: string
          members: string[]
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          members?: string[]
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          members?: string[]
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          audio_path: string | null
          body: string
          chat_key: string
          created_at: string
          id: string
          original: string | null
          recipient_id: string | null
          sender_id: string
          target_lang: string | null
        }
        Insert: {
          audio_path?: string | null
          body: string
          chat_key: string
          created_at?: string
          id?: string
          original?: string | null
          recipient_id?: string | null
          sender_id: string
          target_lang?: string | null
        }
        Update: {
          audio_path?: string | null
          body?: string
          chat_key?: string
          created_at?: string
          id?: string
          original?: string | null
          recipient_id?: string | null
          sender_id?: string
          target_lang?: string | null
        }
        Relationships: []
      }
      chat_photos: {
        Row: {
          chat_key: string
          created_at: string
          id: string
          path: string
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          chat_key: string
          created_at?: string
          id?: string
          path: string
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          chat_key?: string
          created_at?: string
          id?: string
          path?: string
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      chat_preferences: {
        Row: {
          archived: boolean
          chat_key: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          chat_key: string
          user_id: string
        }
        Update: {
          archived?: boolean
          chat_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          city: string | null
          created_at: string
          id: string
          incognito: boolean
          my_lang: string
          notifications_enabled: boolean
          status_text: string
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          id: string
          incognito?: boolean
          my_lang?: string
          notifications_enabled?: boolean
          status_text?: string
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          id?: string
          incognito?: boolean
          my_lang?: string
          notifications_enabled?: boolean
          status_text?: string
          username?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      video_room_members: {
        Row: {
          room_id: string
          user_id: string
        }
        Insert: {
          room_id: string
          user_id: string
        }
        Update: {
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_rooms: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_rooms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      answer_peer_call: {
        Args: { call_id: string; session_answer: string }
        Returns: {
          answer: string | null
          callee_id: string
          callee_name: string
          caller_id: string
          caller_name: string
          created_at: string
          expires_at: string
          id: string
          mode: string
          offer: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      call_directory: {
        Args: { search_text?: string }
        Returns: {
          id: string
          username: string
        }[]
      }
      can_read_contact_avatar: {
        Args: { photo_path: string }
        Returns: boolean
      }
      contact_avatar: { Args: { profile_name: string }; Returns: string }
      create_video_room: {
        Args: { invited_ids: string[]; room_name: string }
        Returns: string
      }
      finish_peer_call: {
        Args: { call_id: string; decline?: boolean }
        Returns: undefined
      }
      keep_peer_call: { Args: { call_id: string }; Returns: undefined }
      start_peer_call: {
        Args: { call_mode: string; peer_id: string; session_offer: string }
        Returns: {
          answer: string | null
          callee_id: string
          callee_name: string
          caller_id: string
          caller_name: string
          created_at: string
          expires_at: string
          id: string
          mode: string
          offer: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "call_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
