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
      booking_photos: {
        Row: {
          booking_id: string
          created_at: string
          driver_id: string
          file_path: string
          id: string
          kind: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_id: string
          file_path: string
          id?: string
          kind: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_id?: string
          file_path?: string
          id?: string
          kind?: string
        }
        Relationships: []
      }
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
      client_activity: {
        Row: {
          actor_id: string | null
          client_id: string
          created_at: string
          detail: string | null
          id: string
          kind: string
          ref_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          client_id: string
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          ref_id?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          client_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          ref_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          position: string | null
          preferred_method: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          position?: string | null
          preferred_method?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          position?: string | null
          preferred_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          expires_on: string | null
          file_path: string
          id: string
          kind: string
          label: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_on?: string | null
          file_path: string
          id?: string
          kind: string
          label?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_on?: string | null
          file_path?: string
          id?: string
          kind?: string
          label?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          author_id: string | null
          body: string
          client_id: string
          created_at: string
          edit_count: number
          edited_at: string | null
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          client_id: string
          created_at?: string
          edit_count?: number
          edited_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          client_id?: string
          created_at?: string
          edit_count?: number
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_code: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          currency: string
          customer_since: string
          id: string
          industry: string | null
          last_order_at: string | null
          logo_url: string | null
          name: string
          notes: string | null
          outstanding_balance: number
          owner_id: string
          payment_method: string | null
          payment_terms: string | null
          status: Database["public"]["Enums"]["client_status"]
          tax_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_code?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          currency?: string
          customer_since?: string
          id?: string
          industry?: string | null
          last_order_at?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          outstanding_balance?: number
          owner_id: string
          payment_method?: string | null
          payment_terms?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tax_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_code?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          currency?: string
          customer_since?: string
          id?: string
          industry?: string | null
          last_order_at?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          outstanding_balance?: number
          owner_id?: string
          payment_method?: string | null
          payment_terms?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tax_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
      driver_documents: {
        Row: {
          created_at: string
          driver_id: string
          expires_on: string | null
          file_path: string
          id: string
          kind: string
          label: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          expires_on?: string | null
          file_path: string
          id?: string
          kind: string
          label?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          expires_on?: string | null
          file_path?: string
          id?: string
          kind?: string
          label?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
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
      driver_status_events: {
        Row: {
          actor_id: string | null
          created_at: string
          driver_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["driver_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          driver_id: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["driver_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
        }
        Relationships: [
          {
            foreignKeyName: "driver_status_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          assigned_truck_id: string | null
          blood_group: string | null
          branch: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          current_order_id: string | null
          date_of_birth: string | null
          department: string | null
          distance_km: number
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          employment_status: string
          employment_type: string | null
          full_name: string
          gender: string | null
          hire_date: string | null
          hours_driven: number
          id: string
          licence_class: string | null
          licence_expiry: string | null
          licence_issue_date: string | null
          licence_no: string | null
          location_updated_at: string | null
          medical_expiry: string | null
          national_id_no: string | null
          notes: string | null
          on_time_trips: number
          owner_id: string
          passport_no: string | null
          phone: string | null
          photo_url: string | null
          rating: number
          status: Database["public"]["Enums"]["driver_status"]
          status_changed_at: string
          status_note: string | null
          total_trips: number
          updated_at: string
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          assigned_truck_id?: string | null
          blood_group?: string | null
          branch?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_order_id?: string | null
          date_of_birth?: string | null
          department?: string | null
          distance_km?: number
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          full_name: string
          gender?: string | null
          hire_date?: string | null
          hours_driven?: number
          id?: string
          licence_class?: string | null
          licence_expiry?: string | null
          licence_issue_date?: string | null
          licence_no?: string | null
          location_updated_at?: string | null
          medical_expiry?: string | null
          national_id_no?: string | null
          notes?: string | null
          on_time_trips?: number
          owner_id: string
          passport_no?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["driver_status"]
          status_changed_at?: string
          status_note?: string | null
          total_trips?: number
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          assigned_truck_id?: string | null
          blood_group?: string | null
          branch?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_order_id?: string | null
          date_of_birth?: string | null
          department?: string | null
          distance_km?: number
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_status?: string
          employment_type?: string | null
          full_name?: string
          gender?: string | null
          hire_date?: string | null
          hours_driven?: number
          id?: string
          licence_class?: string | null
          licence_expiry?: string | null
          licence_issue_date?: string | null
          licence_no?: string | null
          location_updated_at?: string | null
          medical_expiry?: string | null
          national_id_no?: string | null
          notes?: string | null
          on_time_trips?: number
          owner_id?: string
          passport_no?: string | null
          phone?: string | null
          photo_url?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["driver_status"]
          status_changed_at?: string
          status_note?: string | null
          total_trips?: number
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_assigned_truck_id_fkey"
            columns: ["assigned_truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          driver_id: string | null
          expense_date: string
          id: string
          notes: string | null
          order_id: string | null
          owner_id: string
          receipt_path: string | null
          truck_id: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          owner_id: string
          receipt_path?: string | null
          truck_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          owner_id?: string
          receipt_path?: string | null
          truck_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_documents: {
        Row: {
          client_id: string | null
          created_at: string
          file_path: string
          id: string
          invoice_id: string | null
          kind: string
          label: string | null
          owner_id: string
          payment_id: string | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          file_path: string
          id?: string
          invoice_id?: string | null
          kind?: string
          label?: string | null
          owner_id: string
          payment_id?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          file_path?: string
          id?: string
          invoice_id?: string | null
          kind?: string
          label?: string | null
          owner_id?: string
          payment_id?: string | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          invoice_id: string
          kind: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          invoice_id: string
          kind: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          invoice_id?: string
          kind?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          currency: string
          discount: number
          due_date: string
          extra_charges: number
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          order_id: string | null
          owner_id: string
          paid_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount?: number
          due_date?: string
          extra_charges?: number
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          owner_id: string
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount?: number
          due_date?: string
          extra_charges?: number
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          owner_id?: string
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          created_at: string
          file_path: string
          id: string
          kind: string
          label: string | null
          order_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          kind: string
          label?: string | null
          order_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          label?: string | null
          order_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          archived: boolean
          base_charge: number | null
          cargo_category: string | null
          cargo_dimensions: string | null
          cargo_name: string | null
          cargo_quantity: number | null
          cargo_weight_tons: number | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string
          crm_client_id: string | null
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string
          dropoff_at: string | null
          dropoff_contact_name: string | null
          dropoff_contact_phone: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_notes: string | null
          estimated_total: number | null
          eta_minutes: number | null
          extra_charges: number | null
          final_total: number | null
          fleet_owner_user_id: string | null
          fuel_surcharge: number | null
          id: string
          loading_fee: number | null
          offloading_fee: number | null
          order_number: string
          pickup_address: string
          pickup_at: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_notes: string | null
          price_per_km: number | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          toll_charges: number | null
          truck_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          base_charge?: number | null
          cargo_category?: string | null
          cargo_dimensions?: string | null
          cargo_name?: string | null
          cargo_quantity?: number | null
          cargo_weight_tons?: number | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by: string
          crm_client_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_at?: string | null
          dropoff_contact_name?: string | null
          dropoff_contact_phone?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_notes?: string | null
          estimated_total?: number | null
          eta_minutes?: number | null
          extra_charges?: number | null
          final_total?: number | null
          fleet_owner_user_id?: string | null
          fuel_surcharge?: number | null
          id?: string
          loading_fee?: number | null
          offloading_fee?: number | null
          order_number?: string
          pickup_address: string
          pickup_at?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_notes?: string | null
          price_per_km?: number | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          toll_charges?: number | null
          truck_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          base_charge?: number | null
          cargo_category?: string | null
          cargo_dimensions?: string | null
          cargo_name?: string | null
          cargo_quantity?: number | null
          cargo_weight_tons?: number | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string
          crm_client_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_at?: string | null
          dropoff_contact_name?: string | null
          dropoff_contact_phone?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_notes?: string | null
          estimated_total?: number | null
          eta_minutes?: number | null
          extra_charges?: number | null
          final_total?: number | null
          fleet_owner_user_id?: string | null
          fuel_surcharge?: number | null
          id?: string
          loading_fee?: number | null
          offloading_fee?: number | null
          order_number?: string
          pickup_address?: string
          pickup_at?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_notes?: string | null
          price_per_km?: number | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          toll_charges?: number | null
          truck_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_crm_client_id_fkey"
            columns: ["crm_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_fleet_owner_user_id_fkey"
            columns: ["fleet_owner_user_id"]
            isOneToOne: false
            referencedRelation: "fleet_companies"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string | null
          owner_id: string
          payment_date: string
          payment_number: string | null
          proof_path: string | null
          recorded_by: string | null
          reference_no: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string | null
          owner_id: string
          payment_date?: string
          payment_number?: string | null
          proof_path?: string | null
          recorded_by?: string | null
          reference_no?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string | null
          owner_id?: string
          payment_date?: string
          payment_number?: string | null
          proof_path?: string | null
          recorded_by?: string | null
          reference_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          axles: number | null
          base_price: number
          branch: string | null
          capacity_tons: number
          chassis_no: string | null
          color: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          current_order_id: string | null
          driver_id: string | null
          fleet_number: string | null
          fleet_owner_user_id: string | null
          fuel_level_pct: number | null
          fuel_type: string | null
          id: string
          insurance_expiry: string | null
          is_available: boolean
          is_online: boolean
          last_service_date: string | null
          location_updated_at: string | null
          make: string | null
          model: string | null
          next_service_date: string | null
          notes: string | null
          owner_id: string
          photo_url: string | null
          plate: string
          price_per_km: number
          road_licence_expiry: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          status_changed_at: string
          tracker_id: string | null
          tracker_provider: string | null
          tracker_sim: string | null
          tracker_status: string | null
          transmission: string | null
          truck_model: string
          updated_at: string
          vehicle_type: string | null
          verified: boolean
          weight_kg: number | null
          year: number | null
        }
        Insert: {
          axles?: number | null
          base_price?: number
          branch?: string | null
          capacity_tons?: number
          chassis_no?: string | null
          color?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_order_id?: string | null
          driver_id?: string | null
          fleet_number?: string | null
          fleet_owner_user_id?: string | null
          fuel_level_pct?: number | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          is_available?: boolean
          is_online?: boolean
          last_service_date?: string | null
          location_updated_at?: string | null
          make?: string | null
          model?: string | null
          next_service_date?: string | null
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          plate: string
          price_per_km?: number
          road_licence_expiry?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          status_changed_at?: string
          tracker_id?: string | null
          tracker_provider?: string | null
          tracker_sim?: string | null
          tracker_status?: string | null
          transmission?: string | null
          truck_model: string
          updated_at?: string
          vehicle_type?: string | null
          verified?: boolean
          weight_kg?: number | null
          year?: number | null
        }
        Update: {
          axles?: number | null
          base_price?: number
          branch?: string | null
          capacity_tons?: number
          chassis_no?: string | null
          color?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_order_id?: string | null
          driver_id?: string | null
          fleet_number?: string | null
          fleet_owner_user_id?: string | null
          fuel_level_pct?: number | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          is_available?: boolean
          is_online?: boolean
          last_service_date?: string | null
          location_updated_at?: string | null
          make?: string | null
          model?: string | null
          next_service_date?: string | null
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          plate?: string
          price_per_km?: number
          road_licence_expiry?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          status_changed_at?: string
          tracker_id?: string | null
          tracker_provider?: string | null
          tracker_sim?: string | null
          tracker_status?: string | null
          transmission?: string | null
          truck_model?: string
          updated_at?: string
          vehicle_type?: string | null
          verified?: boolean
          weight_kg?: number | null
          year?: number | null
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
      vehicle_documents: {
        Row: {
          created_at: string
          expires_on: string | null
          file_path: string
          id: string
          kind: string
          label: string | null
          truck_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          file_path: string
          id?: string
          kind: string
          label?: string | null
          truck_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          file_path?: string
          id?: string
          kind?: string
          label?: string | null
          truck_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_logs: {
        Row: {
          cost: number
          created_at: string
          created_by: string | null
          filled_at: string
          id: string
          litres: number
          odometer_km: number | null
          station: string | null
          truck_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          created_by?: string | null
          filled_at?: string
          id?: string
          litres?: number
          odometer_km?: number | null
          station?: string | null
          truck_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          created_by?: string | null
          filled_at?: string
          id?: string
          litres?: number
          odometer_km?: number | null
          station?: string | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_logs_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          next_due_date: string | null
          odometer_km: number | null
          service_date: string
          service_type: string
          status: string
          truck_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          next_due_date?: string | null
          odometer_km?: number | null
          service_date?: string
          service_type: string
          status?: string
          truck_id: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          next_due_date?: string | null
          odometer_km?: number | null
          service_date?: string
          service_type?: string
          status?: string
          truck_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_status_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          truck_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          truck_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_status_events_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "client" | "driver" | "fleet" | "admin" | "dispatcher"
      client_status: "active" | "preferred" | "inactive" | "suspended"
      client_type: "business" | "individual"
      doc_status: "pending" | "approved" | "rejected"
      doc_type:
        | "national_id"
        | "driving_license"
        | "truck_logbook"
        | "insurance"
        | "ntsa_inspection"
        | "company_registration"
      driver_status:
        | "available"
        | "assigned"
        | "driving"
        | "loading"
        | "offloading"
        | "rest_break"
        | "off_duty"
        | "on_leave"
        | "suspended"
      expense_category:
        | "fuel"
        | "maintenance"
        | "driver_allowance"
        | "tolls"
        | "accommodation"
        | "repairs"
        | "office"
        | "insurance"
        | "licences"
        | "other"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      order_status:
        | "pending"
        | "confirmed"
        | "assigned"
        | "en_route_pickup"
        | "arrived_pickup"
        | "loading"
        | "in_transit"
        | "delayed"
        | "arrived_dropoff"
        | "delivered"
        | "completed"
        | "cancelled"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "mobile_money"
        | "credit_card"
        | "cheque"
        | "other"
      vehicle_status:
        | "available"
        | "assigned"
        | "loading"
        | "on_trip"
        | "offloading"
        | "maintenance"
        | "out_of_service"
        | "offline"
        | "idle"
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
      app_role: ["client", "driver", "fleet", "admin", "dispatcher"],
      client_status: ["active", "preferred", "inactive", "suspended"],
      client_type: ["business", "individual"],
      doc_status: ["pending", "approved", "rejected"],
      doc_type: [
        "national_id",
        "driving_license",
        "truck_logbook",
        "insurance",
        "ntsa_inspection",
        "company_registration",
      ],
      driver_status: [
        "available",
        "assigned",
        "driving",
        "loading",
        "offloading",
        "rest_break",
        "off_duty",
        "on_leave",
        "suspended",
      ],
      expense_category: [
        "fuel",
        "maintenance",
        "driver_allowance",
        "tolls",
        "accommodation",
        "repairs",
        "office",
        "insurance",
        "licences",
        "other",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      order_status: [
        "pending",
        "confirmed",
        "assigned",
        "en_route_pickup",
        "arrived_pickup",
        "loading",
        "in_transit",
        "delayed",
        "arrived_dropoff",
        "delivered",
        "completed",
        "cancelled",
      ],
      payment_method: [
        "cash",
        "bank_transfer",
        "mobile_money",
        "credit_card",
        "cheque",
        "other",
      ],
      vehicle_status: [
        "available",
        "assigned",
        "loading",
        "on_trip",
        "offloading",
        "maintenance",
        "out_of_service",
        "offline",
        "idle",
      ],
    },
  },
} as const
