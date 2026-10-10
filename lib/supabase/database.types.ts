// Généré par Supabase (generate_typescript_types) le 10 oct. 2026. À régénérer après chaque migration.
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
      audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      expense_targets: {
        Row: {
          category: Database["public"]["Enums"]["expense_category"]
          month: string
          target_cents: number
        }
        Insert: {
          category: Database["public"]["Enums"]["expense_category"]
          month: string
          target_cents: number
        }
        Update: {
          category?: Database["public"]["Enums"]["expense_category"]
          month?: string
          target_cents?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          created_by: string | null
          day: string
          floor_id: number | null
          hours: number
          id: string
          note: string | null
          subcategory: string
        }
        Insert: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          created_by?: string | null
          day?: string
          floor_id?: number | null
          hours?: number
          id?: string
          note?: string | null
          subcategory: string
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_by?: string | null
          day?: string
          floor_id?: number | null
          hours?: number
          id?: string
          note?: string | null
          subcategory?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          id: number
          name: string
          note: string | null
          short: string
        }
        Insert: {
          id: number
          name: string
          note?: string | null
          short: string
        }
        Update: {
          id?: number
          name?: string
          note?: string | null
          short?: string
        }
        Relationships: []
      }
      job_roles: {
        Row: {
          code: string
          label: string
          min_evening: number
          min_morning: number
          min_night: number
          sort: number
        }
        Insert: {
          code: string
          label: string
          min_evening?: number
          min_morning?: number
          min_night?: number
          sort: number
        }
        Update: {
          code?: string
          label?: string
          min_evening?: number
          min_morning?: number
          min_night?: number
          sort?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          floor_id: number | null
          full_name: string
          id: string
          job_code: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          floor_id?: number | null
          full_name: string
          id: string
          job_code?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          floor_id?: number | null
          full_name?: string
          id?: string
          job_code?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_job_code_fkey"
            columns: ["job_code"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["code"]
          },
        ]
      }
      resident_events: {
        Row: {
          day: string
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          label: string
          place: string | null
          resident_id: string
          start_min: number
        }
        Insert: {
          day: string
          id?: string
          kind: Database["public"]["Enums"]["event_kind"]
          label: string
          place?: string | null
          resident_id: string
          start_min: number
        }
        Update: {
          day?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          label?: string
          place?: string | null
          resident_id?: string
          start_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "resident_events_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_events_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "rooms_overview"
            referencedColumns: ["resident_id"]
          },
        ]
      }
      residents: {
        Row: {
          active: boolean
          away: boolean
          created_at: string
          display_name: string
          id: string
          room_id: string
        }
        Insert: {
          active?: boolean
          away?: boolean
          created_at?: string
          display_name: string
          id?: string
          room_id: string
        }
        Update: {
          active?: boolean
          away?: boolean
          created_at?: string
          display_name?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_status"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "residents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          floor_id: number
          id: string
          number: string
          wing: string
        }
        Insert: {
          floor_id: number
          id?: string
          number: string
          wing: string
        }
        Update: {
          floor_id?: number
          id?: string
          number?: string
          wing?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attendees: {
        Row: {
          id: string
          resident_id: string | null
          session_id: string
          signed_at: string | null
          staff_id: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
        }
        Insert: {
          id?: string
          resident_id?: string | null
          session_id: string
          signed_at?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
        }
        Update: {
          id?: string
          resident_id?: string | null
          session_id?: string
          signed_at?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "session_attendees_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendees_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "rooms_overview"
            referencedColumns: ["resident_id"]
          },
          {
            foreignKeyName: "session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendees_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          closed_at: string | null
          created_by: string | null
          day: string
          end_min: number
          id: string
          kind: Database["public"]["Enums"]["session_kind"]
          lead: string | null
          place: string | null
          start_min: number
          title: string
        }
        Insert: {
          closed_at?: string | null
          created_by?: string | null
          day: string
          end_min: number
          id?: string
          kind: Database["public"]["Enums"]["session_kind"]
          lead?: string | null
          place?: string | null
          start_min: number
          title: string
        }
        Update: {
          closed_at?: string | null
          created_by?: string | null
          day?: string
          end_min?: number
          id?: string
          kind?: Database["public"]["Enums"]["session_kind"]
          lead?: string | null
          place?: string | null
          start_min?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          day: string
          id: string
          kind: Database["public"]["Enums"]["shift_kind"]
          pause_start_min: number | null
          staff_id: string
        }
        Insert: {
          day: string
          id?: string
          kind: Database["public"]["Enums"]["shift_kind"]
          pause_start_min?: number | null
          staff_id: string
        }
        Update: {
          day?: string
          id?: string
          kind?: Database["public"]["Enums"]["shift_kind"]
          pause_start_min?: number | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          display_name: string
          floor_id: number | null
          id: string
          job_code: string
          profile_id: string | null
        }
        Insert: {
          active?: boolean
          display_name: string
          floor_id?: number | null
          id?: string
          job_code: string
          profile_id?: string | null
        }
        Update: {
          active?: boolean
          display_name?: string
          floor_id?: number | null
          id?: string
          job_code?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_job_code_fkey"
            columns: ["job_code"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          category: string
          id: string
          location_code: string
          max_qty: number
          min_qty: number
          name: string
          ordered_at: string | null
          qty: number
          unit: string
          weekly_use: number
        }
        Insert: {
          category: string
          id?: string
          location_code: string
          max_qty: number
          min_qty?: number
          name: string
          ordered_at?: string | null
          qty?: number
          unit: string
          weekly_use?: number
        }
        Update: {
          category?: string
          id?: string
          location_code?: string
          max_qty?: number
          min_qty?: number
          name?: string
          ordered_at?: string | null
          qty?: number
          unit?: string
          weekly_use?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["code"]
          },
        ]
      }
      stock_locations: {
        Row: {
          code: string
          label: string
          level: string
        }
        Insert: {
          code: string
          label: string
          level: string
        }
        Update: {
          code?: string
          label?: string
          level?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          at: string
          by_user: string | null
          delta: number
          id: string
          item_id: string
          reason: string | null
        }
        Insert: {
          at?: string
          by_user?: string | null
          delta: number
          id?: string
          item_id: string
          reason?: string | null
        }
        Update: {
          at?: string
          by_user?: string | null
          delta?: number
          id?: string
          item_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_by_user_fkey"
            columns: ["by_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_status"
            referencedColumns: ["id"]
          },
        ]
      }
      task_types: {
        Row: {
          code: string
          default_start_min: number
          duration_min: number
          job_code: string | null
          label: string
        }
        Insert: {
          code: string
          default_start_min: number
          duration_min: number
          job_code?: string | null
          label: string
        }
        Update: {
          code?: string
          default_start_min?: number
          duration_min?: number
          job_code?: string | null
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_types_job_code_fkey"
            columns: ["job_code"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["code"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          day: string
          done_at: string | null
          done_by: string | null
          end_min: number
          id: string
          label: string
          room_id: string
          start_min: number
          status: Database["public"]["Enums"]["task_status"]
          type_code: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          day?: string
          done_at?: string | null
          done_by?: string | null
          end_min: number
          id?: string
          label: string
          room_id: string
          start_min: number
          status?: Database["public"]["Enums"]["task_status"]
          type_code?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          day?: string
          done_at?: string | null
          done_by?: string | null
          end_min?: number
          id?: string
          label?: string
          room_id?: string
          start_min?: number
          status?: Database["public"]["Enums"]["task_status"]
          type_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_status"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["code"]
          },
        ]
      }
      time_clock: {
        Row: {
          day: string
          id: string
          in_at: string
          out_at: string | null
          staff_id: string
        }
        Insert: {
          day?: string
          id?: string
          in_at?: string
          out_at?: string | null
          staff_id: string
        }
        Update: {
          day?: string
          id?: string
          in_at?: string
          out_at?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_bookings: {
        Row: {
          created_by: string | null
          day: string
          driver_id: string | null
          id: string
          motif: string
          period: Database["public"]["Enums"]["booking_period"]
          vehicle_id: string
        }
        Insert: {
          created_by?: string | null
          day: string
          driver_id?: string | null
          id?: string
          motif: string
          period: Database["public"]["Enums"]["booking_period"]
          vehicle_id: string
        }
        Update: {
          created_by?: string | null
          day?: string
          driver_id?: string | null
          id?: string
          motif?: string
          period?: Database["public"]["Enums"]["booking_period"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_logs: {
        Row: {
          amount_cents: number
          created_by: string | null
          day: string
          driver_id: string | null
          id: string
          kind: string
          km: number
          label: string
          vehicle_id: string
        }
        Insert: {
          amount_cents?: number
          created_by?: string | null
          day?: string
          driver_id?: string | null
          id?: string
          kind: string
          km?: number
          label: string
          vehicle_id: string
        }
        Update: {
          amount_cents?: number
          created_by?: string | null
          day?: string
          driver_id?: string | null
          id?: string
          kind?: string
          km?: number
          label?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          ct_due: string | null
          id: string
          in_garage: boolean
          insurance_due: string | null
          model: string
          name: string
          next_service_km: number
          odometer: number
          plate: string
        }
        Insert: {
          ct_due?: string | null
          id?: string
          in_garage?: boolean
          insurance_due?: string | null
          model: string
          name: string
          next_service_km: number
          odometer: number
          plate: string
        }
        Update: {
          ct_due?: string | null
          id?: string
          in_garage?: boolean
          insurance_due?: string | null
          model?: string
          name?: string
          next_service_km?: number
          odometer?: number
          plate?: string
        }
        Relationships: []
      }
      visit_requests: {
        Row: {
          charter_accepted: boolean
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          persons: number
          resident_id: string | null
          resident_label: string
          slot_id: string
          status: Database["public"]["Enums"]["visit_status"]
          visitor_email: string
          visitor_name: string
        }
        Insert: {
          charter_accepted: boolean
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          persons: number
          resident_id?: string | null
          resident_label: string
          slot_id: string
          status?: Database["public"]["Enums"]["visit_status"]
          visitor_email: string
          visitor_name: string
        }
        Update: {
          charter_accepted?: boolean
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          persons?: number
          resident_id?: string | null
          resident_label?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["visit_status"]
          visitor_email?: string
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "rooms_overview"
            referencedColumns: ["resident_id"]
          },
          {
            foreignKeyName: "visit_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slot_availability"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "visit_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "visit_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_slots: {
        Row: {
          capacity: number
          day: string
          id: string
          start_min: number
        }
        Insert: {
          capacity?: number
          day: string
          id?: string
          start_min: number
        }
        Update: {
          capacity?: number
          day?: string
          id?: string
          start_min?: number
        }
        Relationships: []
      }
    }
    Views: {
      room_status: {
        Row: {
          day: string | null
          dot: string | null
          floor_id: number | null
          number: string | null
          room_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms_overview: {
        Row: {
          floor_id: number | null
          id: string | null
          number: string | null
          resident_id: string | null
          resident_name: string | null
          state: string | null
          wing: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_availability: {
        Row: {
          booked: number | null
          capacity: number | null
          day: string | null
          remaining: number | null
          slot_id: string | null
          start_min: number | null
        }
        Relationships: []
      }
      stock_status: {
        Row: {
          category: string | null
          days_left: number | null
          id: string | null
          level: string | null
          location_code: string | null
          max_qty: number | null
          min_qty: number | null
          name: string | null
          ordered_at: string | null
          qty: number | null
          unit: string | null
          weekly_use: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_location_code_fkey"
            columns: ["location_code"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["code"]
          },
        ]
      }
      task_progress: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          day: string | null
          done_at: string | null
          done_by: string | null
          effective_status: string | null
          end_min: number | null
          id: string | null
          label: string | null
          room_id: string | null
          start_min: number | null
          status: Database["public"]["Enums"]["task_status"] | null
          type_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_status"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role:
        | "admin"
        | "direction"
        | "cadre"
        | "soignant"
        | "animation"
        | "accueil"
        | "technique"
      attendance_status: "present" | "absent" | "excused"
      booking_period: "m" | "a" | "j"
      event_kind: "meal" | "ani" | "vis" | "coif" | "out"
      expense_category: "pet" | "tps" | "cout"
      session_kind: "formation" | "reunion" | "activite"
      shift_kind: "m" | "s" | "n" | "off" | "leave" | "abs"
      task_status: "todo" | "wip" | "done"
      visit_status: "pending" | "confirmed" | "refused"
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
      app_role: [
        "admin",
        "direction",
        "cadre",
        "soignant",
        "animation",
        "accueil",
        "technique",
      ],
      attendance_status: ["present", "absent", "excused"],
      booking_period: ["m", "a", "j"],
      event_kind: ["meal", "ani", "vis", "coif", "out"],
      expense_category: ["pet", "tps", "cout"],
      session_kind: ["formation", "reunion", "activite"],
      shift_kind: ["m", "s", "n", "off", "leave", "abs"],
      task_status: ["todo", "wip", "done"],
      visit_status: ["pending", "confirmed", "refused"],
    },
  },
} as const
