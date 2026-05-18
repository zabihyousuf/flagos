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
      bug_reports: {
        Row: {
          created_at: string | null
          description: string
          id: string
          image_urls: string[] | null
          page_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          image_urls?: string[] | null
          page_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          image_urls?: string[] | null
          page_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_urls: string[] | null
          page_url: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          page_url?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          page_url?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      field_settings: {
        Row: {
          created_at: string | null
          default_defense_starter_count: number | null
          default_ghost_defense_play_id: string | null
          default_offense_starter_count: number | null
          default_play_type: string | null
          default_play_view: string | null
          default_player_label_on_canvas: string | null
          endzone_size: number
          field_length: number
          field_width: number
          first_down: number | null
          id: string
          line_of_scrimmage: number
          replay_auto_play: boolean | null
          replay_loop: boolean | null
          show_ghost_defense_by_default: boolean | null
          show_player_names_on_canvas: boolean | null
          sidebar_start_collapsed: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_defense_starter_count?: number | null
          default_ghost_defense_play_id?: string | null
          default_offense_starter_count?: number | null
          default_play_type?: string | null
          default_play_view?: string | null
          default_player_label_on_canvas?: string | null
          endzone_size?: number
          field_length?: number
          field_width?: number
          first_down?: number | null
          id?: string
          line_of_scrimmage?: number
          replay_auto_play?: boolean | null
          replay_loop?: boolean | null
          show_ghost_defense_by_default?: boolean | null
          show_player_names_on_canvas?: boolean | null
          sidebar_start_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          default_defense_starter_count?: number | null
          default_ghost_defense_play_id?: string | null
          default_offense_starter_count?: number | null
          default_play_type?: string | null
          default_play_view?: string | null
          default_player_label_on_canvas?: string | null
          endzone_size?: number
          field_length?: number
          field_width?: number
          first_down?: number | null
          id?: string
          line_of_scrimmage?: number
          replay_auto_play?: boolean | null
          replay_loop?: boolean | null
          show_ghost_defense_by_default?: boolean | null
          show_player_names_on_canvas?: boolean | null
          sidebar_start_collapsed?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_settings_default_ghost_defense_play_id_fkey"
            columns: ["default_ghost_defense_play_id"]
            isOneToOne: false
            referencedRelation: "plays"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string | null
          defense_attributes: Json | null
          defense_positions: string[] | null
          defense_starter: boolean
          height: number | null
          id: string
          linked_user_id: string | null
          name: string
          number: number
          offense_attributes: Json | null
          offense_positions: string[] | null
          offense_starter: boolean
          photo_url: string | null
          universal_attributes: Json | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          defense_attributes?: Json | null
          defense_positions?: string[] | null
          defense_starter?: boolean
          height?: number | null
          id?: string
          linked_user_id?: string | null
          name: string
          number: number
          offense_attributes?: Json | null
          offense_positions?: string[] | null
          offense_starter?: boolean
          photo_url?: string | null
          universal_attributes?: Json | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          defense_attributes?: Json | null
          defense_positions?: string[] | null
          defense_starter?: boolean
          height?: number | null
          id?: string
          linked_user_id?: string | null
          name?: string
          number?: number
          offense_attributes?: Json | null
          offense_positions?: string[] | null
          offense_starter?: boolean
          photo_url?: string | null
          universal_attributes?: Json | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      plays: {
        Row: {
          canvas_data: Json | null
          created_at: string | null
          formation: string | null
          id: string
          name: string
          play_type: string
          playbook_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canvas_data?: Json | null
          created_at?: string | null
          formation?: string | null
          id?: string
          name: string
          play_type?: string
          playbook_id: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          canvas_data?: Json | null
          created_at?: string | null
          formation?: string | null
          id?: string
          name?: string
          play_type?: string
          playbook_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plays_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      play_favorites: {
        Row: {
          created_at: string
          id: string
          play_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          play_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          play_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_favorites_play_id_fkey"
            columns: ["play_id"]
            isOneToOne: false
            referencedRelation: "plays"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string | null
          default_team_id: string | null
          display_name: string | null
          id: string
          is_app_admin: boolean
          tutorial_completed_at: string | null
          updated_at: string | null
          welcome_plan_prompt_seen_at: string | null
        }
        Insert: {
          account_type?: string
          created_at?: string | null
          default_team_id?: string | null
          display_name?: string | null
          id: string
          is_app_admin?: boolean
          tutorial_completed_at?: string | null
          updated_at?: string | null
          welcome_plan_prompt_seen_at?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string | null
          default_team_id?: string | null
          display_name?: string | null
          id?: string
          is_app_admin?: boolean
          tutorial_completed_at?: string | null
          updated_at?: string | null
          welcome_plan_prompt_seen_at?: string | null
        }
        Relationships: []
      }
      shared_plays: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          play_formation: string | null
          play_id: string
          play_name: string
          play_snapshot: Json
          play_type: string
          share_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          play_formation?: string | null
          play_id: string
          play_name: string
          play_snapshot: Json
          play_type: string
          share_token?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          play_formation?: string | null
          play_id?: string
          play_name?: string
          play_snapshot?: Json
          play_type?: string
          share_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_plays_play_id_fkey"
            columns: ["play_id"]
            isOneToOne: false
            referencedRelation: "plays"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_insights: {
        Row: {
          created_at: string
          id: string
          insights: Json
          job_id: string
          model: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: Json
          job_id: string
          model?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insights?: Json
          job_id?: string
          model?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "sim_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_metadata: Json | null
          job_type: string
          progress: number
          progress_label: string
          result_ref: string | null
          started_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id: string
          job_metadata?: Json | null
          job_type: string
          progress?: number
          progress_label?: string
          result_ref?: string | null
          started_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_metadata?: Json | null
          job_type?: string
          progress?: number
          progress_label?: string
          result_ref?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sim_recordings: {
        Row: {
          carrier_id: string | null
          created_at: string
          forced_target_id: string | null
          highlight_type: string
          id: string
          job_id: string
          outcome: string
          pass_completed: boolean | null
          play_success: boolean | null
          receiver_id: string | null
          recording_json: Json
          scenario_id: string
          scenario_label: string | null
          throw_distance: number | null
          thrower_id: string | null
          ticks: number | null
          time_elapsed_seconds: number | null
          yards_after_catch: number | null
          yards_gained: number | null
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string
          forced_target_id?: string | null
          highlight_type: string
          id?: string
          job_id: string
          outcome: string
          pass_completed?: boolean | null
          play_success?: boolean | null
          receiver_id?: string | null
          recording_json: Json
          scenario_id: string
          scenario_label?: string | null
          throw_distance?: number | null
          thrower_id?: string | null
          ticks?: number | null
          time_elapsed_seconds?: number | null
          yards_after_catch?: number | null
          yards_gained?: number | null
        }
        Update: {
          carrier_id?: string | null
          created_at?: string
          forced_target_id?: string | null
          highlight_type?: string
          id?: string
          job_id?: string
          outcome?: string
          pass_completed?: boolean | null
          play_success?: boolean | null
          receiver_id?: string | null
          recording_json?: Json
          scenario_id?: string
          scenario_label?: string | null
          throw_distance?: number | null
          thrower_id?: string | null
          ticks?: number | null
          time_elapsed_seconds?: number | null
          yards_after_catch?: number | null
          yards_gained?: number | null
        }
        Relationships: []
      }
      sim_results: {
        Row: {
          created_at: string
          id: string
          job_id: string
          result_json: Json
        }
        Insert: {
          created_at?: string
          id: string
          job_id: string
          result_json: Json
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          result_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sim_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sim_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          defense_position: string | null
          defense_starter: boolean
          defense_starter_locked: boolean | null
          id: string
          offense_position: string | null
          offense_starter: boolean
          offense_starter_locked: boolean | null
          player_id: string
          team_id: string
        }
        Insert: {
          defense_position?: string | null
          defense_starter?: boolean
          defense_starter_locked?: boolean | null
          id?: string
          offense_position?: string | null
          offense_starter?: boolean
          offense_starter_locked?: boolean | null
          player_id: string
          team_id: string
        }
        Update: {
          defense_position?: string | null
          defense_starter?: boolean
          defense_starter_locked?: boolean | null
          id?: string
          offense_position?: string | null
          offense_starter?: boolean
          offense_starter_locked?: boolean | null
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_playbooks: {
        Row: {
          created_at: string
          id: string
          playbook_id: string
          shared_by: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          playbook_id: string
          shared_by: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          playbook_id?: string
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_playbooks_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_playbooks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          player_id: string | null
          role: string
          team_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          player_id?: string | null
          role?: string
          team_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          player_id?: string | null
          role?: string
          team_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_invites_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_job_team_shares: {
        Row: {
          created_at: string
          id: string
          job_id: string
          shared_by: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          shared_by: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_job_team_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sim_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sim_job_team_shares_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_joinable: boolean
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_joinable?: boolean
          name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_joinable?: boolean
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
