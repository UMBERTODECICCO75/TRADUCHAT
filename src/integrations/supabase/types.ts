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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string
          id: string
          note: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_support_requests: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_support_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_reminders: {
        Row: {
          call_requested_at: string | null
          created_at: string
          emailed_at: string | null
          id: string
          remind_at: string
          send_call: boolean
          send_email: boolean
          send_sms: boolean
          sms_sent_at: string | null
          text: string
          user_id: string
        }
        Insert: {
          call_requested_at?: string | null
          created_at?: string
          emailed_at?: string | null
          id: string
          remind_at: string
          send_call?: boolean
          send_email?: boolean
          send_sms?: boolean
          sms_sent_at?: string | null
          text: string
          user_id: string
        }
        Update: {
          call_requested_at?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          remind_at?: string
          send_call?: boolean
          send_email?: boolean
          send_sms?: boolean
          sms_sent_at?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_answer_requests: {
        Row: {
          answer: string | null
          created_at: string
          environment: string
          id: string
          question: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          environment: string
          id: string
          question: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          environment?: string
          id?: string
          question?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_answer_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_checkout_orders: {
        Row: {
          created_at: string
          environment: string
          id: string
          paddle_transaction_id: string | null
          price_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          paddle_transaction_id?: string | null
          price_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          paddle_transaction_id?: string | null
          price_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_checkout_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_adjustments: {
        Row: {
          adjustment_id: string
          created_at: string
          credits: number
          purchase_id: string
        }
        Insert: {
          adjustment_id: string
          created_at?: string
          credits: number
          purchase_id: string
        }
        Update: {
          adjustment_id?: string
          created_at?: string
          credits?: number
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_adjustments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "ai_credit_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_balances: {
        Row: {
          balance: number
          environment: string
          net_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          environment: string
          net_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          environment?: string
          net_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_purchases: {
        Row: {
          adjustment_snapshot: Json
          created_at: string
          credits: number
          environment: string
          id: string
          items: Json
          paddle_transaction_id: string
          price_id: string
          refunded_at: string | null
          refunded_credits: number
          user_id: string
        }
        Insert: {
          adjustment_snapshot?: Json
          created_at?: string
          credits: number
          environment?: string
          id?: string
          items?: Json
          paddle_transaction_id: string
          price_id: string
          refunded_at?: string | null
          refunded_credits?: number
          user_id: string
        }
        Update: {
          adjustment_snapshot?: Json
          created_at?: string
          credits?: number
          environment?: string
          id?: string
          items?: Json
          paddle_transaction_id?: string
          price_id?: string
          refunded_at?: string | null
          refunded_credits?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_wallets: {
        Row: {
          balance: number
          created_at: string
          free_granted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          free_granted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          free_granted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_hidden_items: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_hidden_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_hidden_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_hidden_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_streams: {
        Row: {
          ended_at: string | null
          id: string
          owner_id: string
          room_id: string
          started_at: string
          status: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          owner_id: string
          room_id: string
          started_at?: string
          status?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          owner_id?: string
          room_id?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      device_sessions: {
        Row: {
          created_at: string
          device_label: string
          device_type: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label: string
          device_type: string
          id: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string
          device_type?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_video_calls: {
        Row: {
          answered_at: string | null
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          room_id: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_video_calls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      group_video_events: {
        Row: {
          call_id: string
          created_at: string
          id: number
          payload: Json
          recipient_device: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: never
          payload: Json
          recipient_device: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: never
          payload?: Json
          recipient_device?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_video_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_video_members: {
        Row: {
          call_id: string
          device: string
          joined_at: string
          seen_at: string
          user_id: string
        }
        Insert: {
          call_id: string
          device: string
          joined_at?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          call_id?: string
          device?: string
          joined_at?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_video_members_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "group_video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_consent_events: {
        Row: {
          accepted: boolean
          consent_version: string
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          accepted: boolean
          consent_version?: string
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          accepted?: boolean
          consent_version?: string
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_login_identities: {
        Row: {
          phone: string
          user_id: string
        }
        Insert: {
          phone: string
          user_id: string
        }
        Update: {
          phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_login_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_stories: {
        Row: {
          caption: string
          created_at: string
          expires_at: string
          id: string
          image_path: string
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_path: string
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_seen_at: string | null
          nickname: string | null
          phone: string | null
          show_status: boolean
          status: string | null
          status_image_path: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          last_seen_at?: string | null
          nickname?: string | null
          phone?: string | null
          show_status?: boolean
          status?: string | null
          status_image_path?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string | null
          nickname?: string | null
          phone?: string | null
          show_status?: boolean
          status?: string | null
          status_image_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      room_call_signals: {
        Row: {
          call_id: string
          created_at: string
          id: number
          kind: string
          payload: Json
          recipient_id: string
          room_id: string
          sender_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: never
          kind: string
          payload?: Json
          recipient_id: string
          room_id: string
          sender_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: never
          kind?: string
          payload?: Json
          recipient_id?: string
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_call_signals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invites: {
        Row: {
          created_at: string
          id: string
          invitee_email: string
          invitee_user_id: string | null
          inviter_id: string
          responded_at: string | null
          room_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_email: string
          invitee_user_id?: string | null
          inviter_id: string
          responded_at?: string | null
          room_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_email?: string
          invitee_user_id?: string | null
          inviter_id?: string
          responded_at?: string | null
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          joined_at: string
          last_notified_at: string | null
          last_seen_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_notified_at?: string | null
          last_seen_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_notified_at?: string | null
          last_seen_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          audio_path: string | null
          created_at: string
          file_kind: string | null
          file_name: string | null
          file_path: string | null
          from_lang: string
          id: string
          image_path: string | null
          original: string
          room_id: string
          sender_id: string
          to_lang: string
          translation: string | null
          user_id: string | null
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          file_kind?: string | null
          file_name?: string | null
          file_path?: string | null
          from_lang: string
          id?: string
          image_path?: string | null
          original: string
          room_id: string
          sender_id: string
          to_lang: string
          translation?: string | null
          user_id?: string | null
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          file_kind?: string | null
          file_name?: string | null
          file_path?: string | null
          from_lang?: string
          id?: string
          image_path?: string | null
          original?: string
          room_id?: string
          sender_id?: string
          to_lang?: string
          translation?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          cover_path: string | null
          created_at: string
          id: string
          invite_only: boolean
          is_group: boolean
          lang_a: string
          lang_b: string
          name: string | null
          owner_id: string | null
          photo_path: string | null
          theme: string | null
          topic: string | null
        }
        Insert: {
          code: string
          cover_path?: string | null
          created_at?: string
          id?: string
          invite_only?: boolean
          is_group?: boolean
          lang_a?: string
          lang_b?: string
          name?: string | null
          owner_id?: string | null
          photo_path?: string | null
          theme?: string | null
          topic?: string | null
        }
        Update: {
          code?: string
          cover_path?: string | null
          created_at?: string
          id?: string
          invite_only?: boolean
          is_group?: boolean
          lang_a?: string
          lang_b?: string
          name?: string | null
          owner_id?: string | null
          photo_path?: string | null
          theme?: string | null
          topic?: string | null
        }
        Relationships: []
      }
      signup_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          phone?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          phone?: string
        }
        Relationships: []
      }
      stream_segments: {
        Row: {
          created_at: string
          id: string
          path: string
          seq: number
          stream_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          seq: number
          stream_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          seq?: number
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_segments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "community_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_cache: {
        Row: {
          created_at: string
          from_lang: string
          hits: number
          source_text: string
          to_lang: string
          translation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_lang: string
          hits?: number
          source_text: string
          to_lang: string
          translation: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_lang?: string
          hits?: number
          source_text?: string
          to_lang?: string
          translation?: string
          updated_at?: string
        }
        Relationships: []
      }
      translation_usage: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string
          from_lang: string
          id: string
          source_text: string
          to_lang: string
          translated_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_lang: string
          id?: string
          source_text: string
          to_lang: string
          translated_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_lang?: string
          id?: string
          source_text?: string
          to_lang?: string
          translated_text?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_call_events: {
        Row: {
          call_id: string
          created_at: string
          id: number
          payload: Json
          recipient_id: string
          sender_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: never
          payload: Json
          recipient_id: string
          sender_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: never
          payload?: Json
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      video_calls: {
        Row: {
          callee_device: string | null
          callee_id: string
          callee_seen: string | null
          caller_device: string
          caller_id: string
          caller_seen: string
          created_at: string
          ended_at: string | null
          id: string
          room_id: string
          status: string
        }
        Insert: {
          callee_device?: string | null
          callee_id: string
          callee_seen?: string | null
          caller_device: string
          caller_id: string
          caller_seen?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id: string
          status?: string
        }
        Update: {
          callee_device?: string | null
          callee_id?: string
          callee_seen?: string | null
          caller_device?: string
          caller_id?: string
          caller_seen?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_credit_adjustment: {
        Args: {
          p_adjustment_id: string
          p_credits: number
          p_purchase_id: string
        }
        Returns: number
      }
      bump_translation_usage: {
        Args: { _key: string; _limit: number; _window: string }
        Returns: boolean
      }
      claim_signup_code: {
        Args: { p_email: string; p_hash: string }
        Returns: string
      }
      consume_ai_credit: { Args: { p_user_id: string }; Returns: number }
      deduct_ai_credits: {
        Args: { p_credits: number; p_user_id: string }
        Returns: number
      }
      ensure_credit_balance: {
        Args: { p_environment: string; p_user_id: string }
        Returns: number
      }
      fulfill_credit_order: {
        Args: {
          p_credits: number
          p_environment: string
          p_items: Json
          p_order_id: string
          p_price_id: string
          p_transaction_id: string
        }
        Returns: number
      }
      get_cached_translation: {
        Args: { _from: string; _source: string; _to: string }
        Returns: string
      }
      grant_ai_credits: {
        Args: { p_credits: number; p_user_id: string }
        Returns: number
      }
      group_video_action: {
        Args: {
          p_action: string
          p_after?: number
          p_call?: string
          p_device: string
          p_payload?: Json
          p_room: string
          p_target?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_video_member: { Args: { p_room: string }; Returns: boolean }
      reconcile_purchase_adjustments: {
        Args: { p_purchase_id: string; p_snapshot: Json; p_target: number }
        Returns: number
      }
      recover_answer_credits: {
        Args: { p_environment: string; p_user_id: string }
        Returns: number
      }
      reserve_answer_credit: {
        Args: {
          p_environment: string
          p_question: string
          p_request_id: string
          p_user_id: string
        }
        Returns: Json
      }
      set_newsletter_consent: {
        Args: { p_accepted: boolean }
        Returns: {
          accepted: boolean
          consent_version: string
          created_at: string
          email: string
          id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "newsletter_consent_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_answer_credit: {
        Args: { p_answer?: string; p_request_id: string; p_user_id: string }
        Returns: number
      }
      store_cached_translation: {
        Args: {
          _from: string
          _source: string
          _to: string
          _translation: string
        }
        Returns: undefined
      }
      video_call_action: {
        Args: {
          p_action: string
          p_after?: number
          p_call?: string
          p_device: string
          p_payload?: Json
          p_room: string
          p_target?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
