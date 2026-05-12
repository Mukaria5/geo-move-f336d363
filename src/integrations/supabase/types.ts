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
      bookings: {
        Row: {
          client_id: string
          created_at: string
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_price: number | null
          final_price: number | null
          id: string
          machinery_type: string | null
          notes: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          status: string
          truck_id: string | null
          updated_at: string
          weight_tons: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          machinery_type?: string | null
          notes?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          status?: string
          truck_id?: string | null
          updated_at?: string
          weight_tons?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_price?: number | null
          final_price?: number | null
          id?: string
          machinery_type?: string | null
          notes?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          status?: string
          truck_id?: string | null
          updated_at?: string
          weight_tons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_path: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["doc_status"]
          uploaded_at: string
          user_id: string
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_path: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          user_id: string
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_path?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          capacity_tons: number | null
          created_at: string
          is_online: boolean
          license_no: string | null
          national_id_no: string | null
          plate: string | null
          updated_at: string
          user_id: string
          vehicle_make: string | null
          vehicle_model: string | null
          verified: boolean
          years_experience: number | null
        }
        Insert: {
          capacity_tons?: number | null
          created_at?: string
          is_online?: boolean
          license_no?: string | null
          national_id_no?: string | null
          plate?: string | null
          updated_at?: string
          user_id: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          verified?: boolean
          years_experience?: number | null
        }
        Update: {
          capacity_tons?: number | null
          created_at?: string
          is_online?: boolean
          license_no?: string | null
          national_id_no?: string | null
          plate?: string | null
          updated_at?: string
          user_id?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          verified?: boolean
          years_experience?: number | null
        }
        Relationships: []
      }
      fleet_companies: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          fleet_size: number | null
          kra_pin: string | null
          registration_no: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          fleet_size?: number | null
          kra_pin?: string | null
          registration_no?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          fleet_size?: number | null
          kra_pin?: string | null
          registration_no?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarded: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarded?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trucks: {
        Row: {
          base_price: number
          capacity_tons: number
          created_at: string
          current_lat: number | null
          current_lng: number | null
          driver_id: string | null
          fleet_owner_user_id: string | null
          id: string
          is_available: boolean
          is_online: boolean
          location_updated_at: string | null
          notes: string | null
          owner_id: string
          plate: string
          price_per_km: number
          truck_model: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          base_price?: number
          capacity_tons?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          driver_id?: string | null
          fleet_owner_user_id?: string | null
          id?: string
          is_available?: boolean
          is_online?: boolean
          location_updated_at?: string | null
          notes?: string | null
          owner_id: string
          plate: string
          price_per_km?: number
          truck_model: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          base_price?: number
          capacity_tons?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          driver_id?: string | null
          fleet_owner_user_id?: string | null
          id?: string
          is_available?: boolean
          is_online?: boolean
          location_updated_at?: string | null
          notes?: string | null
          owner_id?: string
          plate?: string
          price_per_km?: number
          truck_model?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trucks_fleet_owner_user_id_fkey"
            columns: ["fleet_owner_user_id"]
            isOneToOne: false
            referencedRelation: "fleet_companies"
            referencedColumns: ["user_id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "client" | "driver" | "fleet" | "admin"
      doc_status: "pending" | "approved" | "rejected"
      doc_type:
        | "national_id"
        | "driving_license"
        | "truck_logbook"
        | "insurance"
        | "ntsa_inspection"
        | "company_registration"
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
      app_role: ["client", "driver", "fleet", "admin"],
      doc_status: ["pending", "approved", "rejected"],
      doc_type: [
        "national_id",
        "driving_license",
        "truck_logbook",
        "insurance",
        "ntsa_inspection",
        "company_registration",
      ],
    },
  },
} as const
