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
          institution_id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_periods_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          details: string | null
          id: string
          institution_id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          details?: string | null
          id?: string
          institution_id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          details?: string | null
          id?: string
          institution_id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["accounting_category_enum"]
          created_at: string
          description: string | null
          id: string
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
          inventory_item_id?: string | null
          movement_type?: Database["public"]["Enums"]["accounting_movement_type"]
          period_month?: string
          teacher_id?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
      grade_record_partials: {
        Row: {
          achievements: string | null
          activity_name: string | null
          comments: string | null
          created_at: string
          grade: number | null
          grade_record_id: string
          id: string
          institution_id: string
          partial_index: number
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          activity_name?: string | null
          comments?: string | null
          created_at?: string
          grade?: number | null
          grade_record_id: string
          id?: string
          institution_id?: string
          partial_index: number
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          activity_name?: string | null
          comments?: string | null
          created_at?: string
          grade?: number | null
          grade_record_id?: string
          id?: string
          institution_id?: string
          partial_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_record_partials_grade_record_id_fkey"
            columns: ["grade_record_id"]
            isOneToOne: false
            referencedRelation: "grade_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_record_partials_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_records: {
        Row: {
          achievements: string | null
          comments: string | null
          created_at: string
          grade: number
          id: string
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
          period_id?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_records_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "student_tuition_month_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grade_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_tuition_summary"
            referencedColumns: ["student_id"]
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
          institution_id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string
          level: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          level?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_memberships: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_default: boolean
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_default?: boolean
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_memberships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          institution_id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          institution_id: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          institution_id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          institution_id: string
          notes: string | null
          plan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          plan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_subscriptions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          acquisition_date: string
          created_at: string
          description: string | null
          id: string
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
          name?: string
          notes?: string | null
          outstanding_debt?: number
          payment_mode?: Database["public"]["Enums"]["inventory_payment_mode"]
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      preescolar_evaluations: {
        Row: {
          created_at: string
          debilidades: string | null
          dimension: string
          fortalezas: string | null
          id: string
          institution_id: string
          period_id: string
          recomendaciones: string | null
          student_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          debilidades?: string | null
          dimension: string
          fortalezas?: string | null
          id?: string
          institution_id?: string
          period_id: string
          recomendaciones?: string | null
          student_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          debilidades?: string | null
          dimension?: string
          fortalezas?: string | null
          id?: string
          institution_id?: string
          period_id?: string
          recomendaciones?: string | null
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preescolar_evaluations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "student_tuition_month_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "preescolar_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_tuition_summary"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "preescolar_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preescolar_evaluations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          institution_id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          institution_id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          institution_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          institution_id: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          institution_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          institution_id?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_modules: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_customer_accounts: {
        Row: {
          account_owner_user_id: string | null
          billing_status: string
          commercial_status: string
          contract_start_date: string | null
          created_at: string
          display_tag: string | null
          id: string
          institution_id: string
          is_first_customer: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_owner_user_id?: string | null
          billing_status?: string
          commercial_status?: string
          contract_start_date?: string | null
          created_at?: string
          display_tag?: string | null
          id?: string
          institution_id: string
          is_first_customer?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_owner_user_id?: string | null
          billing_status?: string
          commercial_status?: string
          contract_start_date?: string | null
          created_at?: string
          display_tag?: string | null
          id?: string
          institution_id?: string
          is_first_customer?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_customer_accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_onboarding_checklists: {
        Row: {
          access_delivered: boolean
          branding_configured: boolean
          created_at: string
          id: string
          institution_id: string
          plan_active: boolean
          tenant_created: boolean
          updated_at: string
        }
        Insert: {
          access_delivered?: boolean
          branding_configured?: boolean
          created_at?: string
          id?: string
          institution_id: string
          plan_active?: boolean
          tenant_created?: boolean
          updated_at?: string
        }
        Update: {
          access_delivered?: boolean
          branding_configured?: boolean
          created_at?: string
          id?: string
          institution_id?: string
          plan_active?: boolean
          tenant_created?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_onboarding_checklists_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_support_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          institution_id: string
          last_used_at: string
          reason: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          institution_id: string
          last_used_at?: string
          reason: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          institution_id?: string
          last_used_at?: string
          reason?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_support_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_modules: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module_id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "provider_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_read: boolean
          link_url: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_read?: boolean
          link_url?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          }
        ]
      }
      provider_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
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
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
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
            foreignKeyName: "schedules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
      institution_module_overrides: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_enabled: boolean
          module_id: string
          reason: string | null
          set_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_enabled: boolean
          module_id: string
          reason?: string | null
          set_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_enabled?: boolean
          module_id?: string
          reason?: string | null
          set_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_module_overrides_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_module_overrides_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "provider_modules"
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
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
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
            foreignKeyName: "student_attendance_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
            referencedRelation: "student_tuition_month_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_tuition_summary"
            referencedColumns: ["student_id"]
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
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
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
            foreignKeyName: "student_guardian_accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardian_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_tuition_month_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_guardian_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_tuition_summary"
            referencedColumns: ["student_id"]
          },
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
          institution_id: string
          notes: string | null
          payment_date: string
          period_month: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          institution_id?: string
          notes?: string | null
          payment_date: string
          period_month: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          institution_id?: string
          notes?: string | null
          payment_date?: string
          period_month?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tuition_payments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tuition_payments_profile_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_tuition_profiles"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_tuition_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_tuition_month_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_tuition_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_tuition_summary"
            referencedColumns: ["student_id"]
          },
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
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
          monthly_tuition?: number
          notes?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tuition_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tuition_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_tuition_month_status"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_tuition_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_tuition_summary"
            referencedColumns: ["student_id"]
          },
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
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
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
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
          institution_id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          grade_level?: number | null
          id?: string
          institution_id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          grade_level?: number | null
          id?: string
          institution_id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          monthly_price_cents: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_price_cents: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_price_cents?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_grade_assignments: {
        Row: {
          created_at: string | null
          grade_id: string
          id: string
          institution_id: string
          is_group_director: boolean
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          grade_id: string
          id?: string
          institution_id?: string
          is_group_director?: boolean
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          grade_id?: string
          id?: string
          institution_id?: string
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
            foreignKeyName: "teacher_grade_assignments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
          institution_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          institution_id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          institution_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
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
          institution_id: string
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
          institution_id?: string
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
          institution_id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          institution_id: string
          quantity: number
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          institution_id: string
          quantity?: number
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          institution_id?: string
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          institution_id: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Insert: {
          id?: string
          institution_id?: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Update: {
          id?: string
          institution_id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accounting_ledger: {
        Row: {
          amount: number | null
          category_label: string | null
          created_at: string | null
          description: string | null
          inventory_item_id: string | null
          movement_id: string | null
          movement_type:
            | Database["public"]["Enums"]["accounting_movement_type"]
            | null
          period_month: string | null
          student_id: string | null
          teacher_id: string | null
          transaction_date: string | null
        }
        Relationships: []
      }
      audit_by_user: {
        Row: {
          changed_by: string | null
          first_change: string | null
          last_change: string | null
          tables_list: string | null
          tables_modified: number | null
          total_changes: number | null
        }
        Relationships: []
      }
      audit_recent_changes: {
        Row: {
          action: string | null
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          record_id: string | null
          table_name: string | null
        }
        Relationships: []
      }
      audit_summary: {
        Row: {
          action: string | null
          change_count: number | null
          first_change: string | null
          last_change: string | null
          table_name: string | null
          unique_users: number | null
        }
        Relationships: []
      }
      audit_suspicious_activity: {
        Row: {
          changed_by: string | null
          changes_in_5_minutes: number | null
          first_change: string | null
          last_change: string | null
          table_name: string | null
        }
        Relationships: []
      }
      grade_records_audit_trail: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by_user_id: string | null
          id: string | null
          new_grade: string | null
          old_grade: string | null
          student_id: string | null
          subject_id: string | null
          teacher_id: string | null
        }
        Relationships: []
      }
      student_tuition_month_status: {
        Row: {
          expected_amount: number | null
          paid_amount: number | null
          pending_amount: number | null
          period_month: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
        }
        Relationships: []
      }
      student_tuition_summary: {
        Row: {
          pending_months: number | null
          student_id: string | null
          student_name: string | null
          total_expected: number | null
          total_paid: number | null
          total_pending: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_assign_tuition_profiles: {
        Args: {
          p_charge_end_month?: string
          p_charge_start_month: string
          p_monthly_tuition: number
          p_overwrite?: boolean
        }
        Returns: number
      }
      can_manage_attendance_context: {
        Args: { p_grade_id: string; p_subject_id: string; p_teacher_id: string }
        Returns: boolean
      }
      can_manage_grade_record: {
        Args: { p_grade_record_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      current_institution_id: { Args: never; Returns: string | null }
      get_current_institution_module_access: {
        Args: never
        Returns: {
          is_enabled: boolean
          module_code: string
          module_name: string
          source: string
        }[]
      }
      get_public_institution_branding: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_audit_history: {
        Args: { p_limit?: number; p_record_id: string; p_table_name: string }
        Returns: {
          action: string
          changed_at: string
          changed_by: string
          changes: string
          id: string
        }[]
      }
      get_changed_fields: {
        Args: { new_data: Json; old_data: Json }
        Returns: {
          field_name: string
          new_value: string
          old_value: string
        }[]
      }
      get_current_teacher_id: { Args: never; Returns: string }
      get_student_report_snapshot: {
        Args: { p_period_id: string; p_student_id: string }
        Returns: Json
      }
      is_provider_owner: { Args: never; Returns: boolean }
      is_module_enabled_for_current_institution: {
        Args: { p_module_code: string }
        Returns: boolean
      }
      is_module_enabled_for_institution: {
        Args: { p_institution_id?: string; p_module_code: string }
        Returns: boolean
      }
      is_user_contable: { Args: never; Returns: boolean }
      is_user_in_institution: {
        Args: { p_institution_id: string }
        Returns: boolean
      }
      is_user_parent: { Args: never; Returns: boolean }
      is_user_profesor: { Args: never; Returns: boolean }
      is_user_rector: { Args: never; Returns: boolean }
      provision_institution: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      provider_assign_user_role_by_email: {
        Args: {
          p_email: string
          p_full_name?: string
          p_institution_id: string
          p_make_default?: boolean
          p_role: Database["public"]["Enums"]["user_role_enum"]
        }
        Returns: string
      }
      provider_clear_institution_context: { Args: never; Returns: boolean }
      provider_create_institution: {
        Args: {
          p_billing_status?: string
          p_contract_start_date?: string
          p_display_name?: string
          p_name: string
          p_notes?: string
          p_period_end?: string
          p_period_start?: string
          p_plan_id?: string
          p_slug: string
          p_subscription_status?: string
        }
        Returns: string
      }
      provider_detect_identity_drift: {
        Args: never
        Returns: {
          email: string
          is_aligned: boolean
          issue: string | null
          membership_institution: string | null
          profile_institution: string | null
          role_institution: string | null
          teacher_institution: string | null
          user_id: string
        }[]
      }
      provider_get_support_context: {
        Args: never
        Returns: {
          institution_id: string
          institution_name: string
          institution_slug: string
          last_used_at: string
          reason: string
          session_id: string
          started_at: string
        }[]
      }
      provider_get_institution_modules: {
        Args: { p_institution_id: string }
        Returns: {
          effective_enabled: boolean
          effective_source: string
          module_code: string
          module_id: string
          module_name: string
          override_enabled: boolean | null
          plan_enabled: boolean | null
          plan_id: string | null
          plan_name: string | null
        }[]
      }
      provider_set_plan_module_access: {
        Args: {
          p_is_enabled: boolean
          p_module_code: string
          p_plan_id: string
          p_reason?: string
        }
        Returns: boolean
      }
      provider_set_institution_module_override: {
        Args: {
          p_institution_id: string
          p_is_enabled: boolean
          p_module_code: string
          p_reason?: string
        }
        Returns: boolean
      }
      provider_clear_institution_module_override: {
        Args: {
          p_institution_id: string
          p_module_code: string
          p_reason?: string
        }
        Returns: boolean
      }
      provider_link_rector_by_email: {
        Args: {
          p_email: string
          p_institution_id: string
          p_make_default?: boolean
        }
        Returns: string
      }
      provider_repair_identity_drift: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      provider_set_institution_context: {
        Args: { p_institution_id: string; p_reason: string }
        Returns: Database["public"]["Tables"]["provider_support_sessions"]["Row"]
      }
      purge_audit_logs: { Args: { p_keep_interval?: string }; Returns: number }
      recalculate_grade_record_final: {
        Args: { p_grade_record_id: string }
        Returns: undefined
      }
      register_student_payment: {
        Args: {
          p_amount: number
          p_notes?: string
          p_payment_date: string
          p_period_month: string
          p_student_id: string
        }
        Returns: {
          amount: number
          created_at: string
          id: string
          institution_id: string
          notes: string | null
          payment_date: string
          period_month: string
          student_id: string
        }
        SetofOptions: {
          from: "*"
          to: "student_tuition_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reset_student_tuition_profile: {
        Args: { p_student_id: string }
        Returns: number
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
      update_guardian_profile: {
        Args: {
          p_address: string
          p_birth_date: string
          p_guardian_name: string
          p_guardian_phone: string
          p_mark_onboarding_complete?: boolean
        }
        Returns: {
          created_at: string
          id: string
          institution_id: string
          last_credentials_issued_at: string
          must_change_password: boolean
          onboarding_completed_at: string | null
          student_id: string
          updated_at: string
          user_id: string
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "student_guardian_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
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
        | "internet"
        | "suplent_payment"
      accounting_movement_type: "income" | "expense"
      attendance_status_enum: "present" | "absent" | "justified"
      inventory_payment_mode: "paid" | "financed"
      user_role_enum: "rector" | "profesor" | "parent" | "admin" | "contable"
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
        "internet",
        "suplent_payment",
      ],
      accounting_movement_type: ["income", "expense"],
      attendance_status_enum: ["present", "absent", "justified"],
      inventory_payment_mode: ["paid", "financed"],
      user_role_enum: ["rector", "profesor", "parent", "admin", "contable"],
    },
  },
} as const
