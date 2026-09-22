// Сгенерировано из схемы Supabase (проект aba-service). Не править руками —
// после изменения схемы сгенерировать заново.

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
      assistants: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      child_targets: {
        Row: {
          child_id: string
          created_at: string
          created_by: string | null
          current_delay: number
          id: string
          mastered_at: string | null
          name: string
          notes: string
          position: number
          skill_id: string | null
          status: Database["public"]["Enums"]["target_status"]
          uses_rotation: boolean
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by?: string | null
          current_delay?: number
          id?: string
          mastered_at?: string | null
          name: string
          notes?: string
          position?: number
          skill_id?: string | null
          status?: Database["public"]["Enums"]["target_status"]
          uses_rotation?: boolean
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string | null
          current_delay?: number
          id?: string
          mastered_at?: string | null
          name?: string
          notes?: string
          position?: number
          skill_id?: string | null
          status?: Database["public"]["Enums"]["target_status"]
          uses_rotation?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "child_targets_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_targets_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          methods: string[]
          patronymic: string | null
          specialist_id: string | null
        }
        Insert: {
          birth_date: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          methods?: string[]
          patronymic?: string | null
          specialist_id?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          methods?: string[]
          patronymic?: string | null
          specialist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          ai_recommendations: string
          assistant_id: string | null
          behavior_note: string
          child_id: string
          finished_at: string | null
          general_note: string
          homework: string
          id: string
          parent_present: boolean
          parent_report: string
          skills_note: string
          specialist_id: string
          started_at: string
          status: Database["public"]["Enums"]["lesson_status"]
        }
        Insert: {
          ai_recommendations?: string
          assistant_id?: string | null
          behavior_note?: string
          child_id: string
          finished_at?: string | null
          general_note?: string
          homework?: string
          id?: string
          parent_present?: boolean
          parent_report?: string
          skills_note?: string
          specialist_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
        }
        Update: {
          ai_recommendations?: string
          assistant_id?: string | null
          behavior_note?: string
          child_id?: string
          finished_at?: string | null
          general_note?: string
          homework?: string
          id?: string
          parent_present?: boolean
          parent_report?: string
          skills_note?: string
          specialist_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lessons_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      skill_domains: {
        Row: {
          id: string
          name: string
          position: number
        }
        Insert: {
          id?: string
          name: string
          position?: number
        }
        Update: {
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      skills: {
        Row: {
          curator_comment: string
          domain_id: string
          id: string
          instruction: string
          materials: string
          name: string
          position: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          curator_comment?: string
          domain_id: string
          id?: string
          instruction?: string
          materials?: string
          name: string
          position?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          curator_comment?: string
          domain_id?: string
          id?: string
          instruction?: string
          materials?: string
          name?: string
          position?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "skill_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      target_events: {
        Row: {
          created_at: string
          created_by: string
          followed_suggestion: boolean | null
          from_delay: number | null
          id: string
          kind: Database["public"]["Enums"]["target_event_kind"]
          lesson_id: string | null
          target_id: string
          to_delay: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          followed_suggestion?: boolean | null
          from_delay?: number | null
          id?: string
          kind: Database["public"]["Enums"]["target_event_kind"]
          lesson_id?: string | null
          target_id: string
          to_delay?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          followed_suggestion?: boolean | null
          from_delay?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["target_event_kind"]
          lesson_id?: string | null
          target_id?: string
          to_delay?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "target_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "child_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_sessions: {
        Row: {
          correct_pct: number
          delay: number
          id: string
          independent_pct: number
          lesson_id: string
          recorded_at: string
          rotation_table: number | null
          target_id: string
          trials: string[]
        }
        Insert: {
          correct_pct: number
          delay: number
          id?: string
          independent_pct: number
          lesson_id: string
          recorded_at?: string
          rotation_table?: number | null
          target_id: string
          trials: string[]
        }
        Update: {
          correct_pct?: number
          delay?: number
          id?: string
          independent_pct?: number
          lesson_id?: string
          recorded_at?: string
          rotation_table?: number | null
          target_id?: string
          trials?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "target_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_sessions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "child_targets"
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
      lesson_status: "in_progress" | "finished"
      staff_role: "supervisor" | "specialist"
      target_event_kind: "delay_changed" | "mastered" | "reopened"
      target_status: "in_progress" | "mastered" | "paused"
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
      lesson_status: ["in_progress", "finished"],
      staff_role: ["supervisor", "specialist"],
      target_event_kind: ["delay_changed", "mastered", "reopened"],
      target_status: ["in_progress", "mastered", "paused"],
    },
  },
} as const
