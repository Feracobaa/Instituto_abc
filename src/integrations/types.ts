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
      academic_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      grade_records: {
        Row: {
          achievements: string | null
          comments: string | null
          created_at: string
          grade: number
          id: string
          period_id: string
          student_id: string
          subject_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          comments?: string | null
          created_at?: string
          grade: number
          id?: string
          period_id: string
          student_id: string
          subject_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          comments?: string | null
          created_at?: string
          grade?: number
          id?: string
          period_id?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_records_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      preescolar_evaluations: {
        Row: {
          id: string
          student_id: string
          dimension: string
          period_id: string
          teacher_id: string | null
          fortalezas: string | null
          debilidades: string | null
          recomendaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          dimension: string
          period_id: string
          teacher_id?: string | null
          fortalezas?: string | null
          debilidades?: string | null
          recomendaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          dimension?: string
          period_id?: string
          teacher_id?: string | null
          fortalezas?: string | null
          debilidades?: string | null
          recomendaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preescolar_evaluations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preescolar_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["accounting_category_enum"]
          created_at: string
          description: string | null
          id: string
          inventory_item_id: string | null
          movement_type: Database["public"]["Enums"]["accounting_movement_type"]
          period_month: string
          teacher_id: string | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["accounting_category_enum"]
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type: Database["public"]["Enums"]["accounting_movement_type"]
          period_month: string
          teacher_id?: string | null
          transaction_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["accounting_category_enum"]
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type?: Database["public"]["Enums"]["accounting_movement_type"]
          period_month?: string
          teacher_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          acquisition_date: string
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          outstanding_debt: number
          payment_mode: Database["public"]["Enums"]["inventory_payment_mode"]
          total_cost: number
          updated_at: string
        }
        Insert: {
          acquisition_date: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          outstanding_debt?: number
          payment_mode?: Database["public"]["Enums"]["inventory_payment_mode"]
          total_cost: number
          updated_at?: string
        }
        Update: {
          acquisition_date?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          outstanding_debt?: number
          payment_mode?: Database["public"]["Enums"]["inventory_payment_mode"]
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_date: string | null
          end_time: string
          grade_id: string
          id: string
          start_date: string | null
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_date?: string | null
          end_time: string
          grade_id: string
          id?: string
          start_date?: string | null
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_date?: string | null
          end_time?: string
          grade_id?: string
          id?: string
          start_date?: string | null
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          attendance_date: string
          created_at: string
          grade_id: string
          id: string
          justification_note: string | null
          period_id: string
          status: Database["public"]["Enums"]["attendance_status_enum"]
          student_id: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          grade_id: string
          id?: string
          justification_note?: string | null
          period_id: string
          status: Database["public"]["Enums"]["attendance_status_enum"]
          student_id: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          grade_id?: string
          id?: string
          justification_note?: string | null
          period_id?: string
          status?: Database["public"]["Enums"]["attendance_status_enum"]
          student_id?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "academic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardian_accounts: {
        Row: {
          created_at: string
          id: string
          last_credentials_issued_at: string
          must_change_password: boolean
          onboarding_completed_at: string | null
          student_id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_credentials_issued_at?: string
          must_change_password?: boolean
          onboarding_completed_at?: string | null
          student_id: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          last_credentials_issued_at?: string
          must_change_password?: boolean
          onboarding_completed_at?: string | null
          student_id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardian_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tuition_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          period_month: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          period_month: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          period_month?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tuition_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tuition_profiles: {
        Row: {
          charge_end_month: string | null
          charge_start_month: string
          created_at: string
          id: string
          monthly_tuition: number
          notes: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          charge_end_month?: string | null
          charge_start_month: string
          created_at?: string
          id?: string
          monthly_tuition: number
          notes?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          charge_end_month?: string | null
          charge_start_month?: string
          created_at?: string
          id?: string
          monthly_tuition?: number
          notes?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tuition_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          full_name: string
          grade_id: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          full_name: string
          grade_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string
          grade_id?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          grade_level: number | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          grade_level?: number | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          grade_level?: number | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_grade_assignments: {
        Row: {
          created_at: string | null
          grade_id: string
          id: string
          is_group_director: boolean
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          grade_id: string
          id?: string
          is_group_director?: boolean
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          grade_id?: string
          id?: string
          is_group_director?: boolean
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_grade_assignments_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_grade_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      accounting_ledger: {
        Row: {
          amount: number
          category_label: string
          created_at: string
          description: string | null
          inventory_item_id: string | null
          movement_id: string
          movement_type: Database["public"]["Enums"]["accounting_movement_type"]
          period_month: string
          student_id: string | null
          teacher_id: string | null
          transaction_date: string
        }
        Relationships: []
      }
      student_tuition_month_status: {
        Row: {
          expected_amount: number
          paid_amount: number
          pending_amount: number
          period_month: string
          status: string
          student_id: string
          student_name: string
        }
        Relationships: []
      }
      student_tuition_summary: {
        Row: {
          pending_months: number
          student_id: string
          student_name: string
          total_expected: number
          total_paid: number
          total_pending: number
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_assign_tuition_profiles: {
        Args: {
          p_charge_end_month?: string | null
          p_charge_start_month: string
          p_monthly_tuition: number
          p_overwrite?: boolean
        }
        Returns: number
      }
      get_student_report_snapshot: {
        Args: { p_period_id: string; p_student_id: string }
        Returns: Json
      }
      save_student_attendance: {
        Args: {
          p_attendance_date: string
          p_grade_id: string
          p_rows: Json
          p_subject_id: string
          p_teacher_id: string
        }
        Returns: number
      }
      register_student_payment: {
        Args: {
          p_amount: number
          p_notes?: string | null
          p_payment_date: string
          p_period_month: string
          p_student_id: string
        }
        Returns: Database["public"]["Tables"]["student_tuition_payments"]["Row"]
      }
      is_user_contable: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_user_parent: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_user_profesor: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_user_rector: { Args: Record<PropertyKey, never>; Returns: boolean }
      update_guardian_profile: {
        Args: {
          p_address: string
          p_birth_date: string | null
          p_guardian_name: string
          p_guardian_phone: string
          p_mark_onboarding_complete?: boolean
        }
        Returns: Database["public"]["Tables"]["student_guardian_accounts"]["Row"]
      }
    }
    Enums: {
      attendance_status_enum: "present" | "absent" | "justified"
      accounting_category_enum:
        | "other_income"
        | "teacher_payment"
        | "rent"
        | "water"
        | "electricity"
        | "cleaning"
        | "inventory_purchase"
        | "repair"
        | "other_expense"
      accounting_movement_type: "income" | "expense"
      inventory_payment_mode: "paid" | "financed"
      user_role_enum: "rector" | "profesor" | "parent" | "admin" | "contable"
    }
    CompositeTypes: Record<never, never>
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
    Enums: {
      accounting_category_enum: [
        "other_income",
        "teacher_payment",
        "rent",
        "water",
        "electricity",
        "cleaning",
        "inventory_purchase",
        "repair",
        "other_expense",
      ],
      accounting_movement_type: ["income", "expense"],
      inventory_payment_mode: ["paid", "financed"],
      user_role_enum: ["rector", "profesor", "parent", "admin", "contable"],
    },
  },
} as const
