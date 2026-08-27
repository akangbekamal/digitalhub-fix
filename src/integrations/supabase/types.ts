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
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          created_at: string
          ends_at: string | null
          id: string
          is_published: boolean
          link_label: string | null
          link_url: string | null
          message: string
          placement: string
          priority: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_published?: boolean
          link_label?: string | null
          link_url?: string | null
          message: string
          placement?: string
          priority?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_published?: boolean
          link_label?: string | null
          link_url?: string | null
          message?: string
          placement?: string
          priority?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          per_user_limit: number
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          per_user_limit?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          per_user_limit?: number
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      digital_deliveries: {
        Row: {
          created_at: string
          customer_email: string
          delivery_status: string
          error_message: string | null
          id: string
          inventory_id: string
          order_id: string | null
          product_name: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          inventory_id: string
          order_id?: string | null
          product_name: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          delivery_status?: string
          error_message?: string | null
          id?: string
          inventory_id?: string
          order_id?: string | null
          product_name?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_deliveries_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "digital_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_inventory: {
        Row: {
          account_email: string | null
          account_notes: string | null
          account_password: string | null
          account_type: string | null
          account_username: string | null
          activation_url: string | null
          country_region: string | null
          created_at: string
          customer_delivery_notes: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          date_sold: string | null
          delivery_status: string | null
          description: string | null
          discount: number | null
          download_url: string | null
          duration: string | null
          email_access_url: string | null
          expiry_date: string | null
          final_selling_price: number | null
          id: string
          inventory_id: string | null
          login_url: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          payment_status: string | null
          plan_package: string | null
          product_category: string | null
          product_id: string | null
          product_name: string
          product_sku: string | null
          product_type: string
          profit: number | null
          purchase_date: string | null
          purchase_reference: string | null
          qr_code: string | null
          quantity: number | null
          recovery_info: string | null
          renewal_date: string | null
          replacement_eligible: boolean | null
          selling_price: number | null
          special_instructions: string | null
          staff_notes: string | null
          start_date: string | null
          status: string
          subscription_type: string | null
          supplier_cost: number | null
          supplier_id: string | null
          supplier_notes: string | null
          two_fa_info: string | null
          updated_at: string
          warranty_expiry_date: string | null
          warranty_period: string | null
          warranty_start_date: string | null
          warranty_status: string | null
        }
        Insert: {
          account_email?: string | null
          account_notes?: string | null
          account_password?: string | null
          account_type?: string | null
          account_username?: string | null
          activation_url?: string | null
          country_region?: string | null
          created_at?: string
          customer_delivery_notes?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_sold?: string | null
          delivery_status?: string | null
          description?: string | null
          discount?: number | null
          download_url?: string | null
          duration?: string | null
          email_access_url?: string | null
          expiry_date?: string | null
          final_selling_price?: number | null
          id?: string
          inventory_id?: string | null
          login_url?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payment_status?: string | null
          plan_package?: string | null
          product_category?: string | null
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          product_type: string
          profit?: number | null
          purchase_date?: string | null
          purchase_reference?: string | null
          qr_code?: string | null
          quantity?: number | null
          recovery_info?: string | null
          renewal_date?: string | null
          replacement_eligible?: boolean | null
          selling_price?: number | null
          special_instructions?: string | null
          staff_notes?: string | null
          start_date?: string | null
          status?: string
          subscription_type?: string | null
          supplier_cost?: number | null
          supplier_id?: string | null
          supplier_notes?: string | null
          two_fa_info?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
          warranty_period?: string | null
          warranty_start_date?: string | null
          warranty_status?: string | null
        }
        Update: {
          account_email?: string | null
          account_notes?: string | null
          account_password?: string | null
          account_type?: string | null
          account_username?: string | null
          activation_url?: string | null
          country_region?: string | null
          created_at?: string
          customer_delivery_notes?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_sold?: string | null
          delivery_status?: string | null
          description?: string | null
          discount?: number | null
          download_url?: string | null
          duration?: string | null
          email_access_url?: string | null
          expiry_date?: string | null
          final_selling_price?: number | null
          id?: string
          inventory_id?: string | null
          login_url?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          payment_status?: string | null
          plan_package?: string | null
          product_category?: string | null
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          product_type?: string
          profit?: number | null
          purchase_date?: string | null
          purchase_reference?: string | null
          qr_code?: string | null
          quantity?: number | null
          recovery_info?: string | null
          renewal_date?: string | null
          replacement_eligible?: boolean | null
          selling_price?: number | null
          special_instructions?: string | null
          staff_notes?: string | null
          start_date?: string | null
          status?: string
          subscription_type?: string | null
          supplier_cost?: number | null
          supplier_id?: string | null
          supplier_notes?: string | null
          two_fa_info?: string | null
          updated_at?: string
          warranty_expiry_date?: string | null
          warranty_period?: string | null
          warranty_start_date?: string | null
          warranty_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          created_at: string
          download_count: number
          expires_at: string | null
          file_path: string | null
          id: string
          is_active: boolean
          max_downloads: number
          order_id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          expires_at?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          max_downloads?: number
          order_id: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          download_count?: number
          expires_at?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          max_downloads?: number
          order_id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      inventory_access_links: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          link_name: string
          link_type: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          link_name: string
          link_type?: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          link_name?: string
          link_type?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_access_links_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "digital_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          adjustment: number
          admin_id: string | null
          created_at: string
          id: string
          new_qty: number
          previous_qty: number
          product_id: string
          reason: string | null
        }
        Insert: {
          adjustment: number
          admin_id?: string | null
          created_at?: string
          id?: string
          new_qty: number
          previous_qty: number
          product_id: string
          reason?: string | null
        }
        Update: {
          adjustment?: number
          admin_id?: string | null
          created_at?: string
          id?: string
          new_qty?: number
          previous_qty?: number
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchases: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          purchase_date: string
          purchase_reference: string | null
          supplier_cost: number
          supplier_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          purchase_date?: string
          purchase_reference?: string | null
          supplier_cost?: number
          supplier_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          purchase_date?: string
          purchase_reference?: string | null
          supplier_cost?: number
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchases_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "digital_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "inventory_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suppliers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string
          supplier_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name: string
          supplier_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string
          supplier_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_warranties: {
        Row: {
          claim_reason: string | null
          created_at: string
          id: string
          inventory_id: string
          replacement_eligible: boolean
          resolution: string | null
          status: string
          updated_at: string
          warranty_expiry_date: string | null
          warranty_period: string | null
          warranty_start_date: string | null
        }
        Insert: {
          claim_reason?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          replacement_eligible?: boolean
          resolution?: string | null
          status?: string
          updated_at?: string
          warranty_expiry_date?: string | null
          warranty_period?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          claim_reason?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          replacement_eligible?: boolean
          resolution?: string | null
          status?: string
          updated_at?: string
          warranty_expiry_date?: string | null
          warranty_period?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warranties_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "digital_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          inventory_id: string | null
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          inventory_id?: string | null
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "digital_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_note: string | null
          customer_phone: string
          discount: number
          id: string
          order_number: string
          payment_status: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string
          discount?: number
          id?: string
          order_number?: string
          payment_status?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string
          discount?: number
          id?: string
          order_number?: string
          payment_status?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          order_id: string
          proof_path: string | null
          reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_number: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method?: string
          order_id: string
          proof_path?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          order_id?: string
          proof_path?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          delivery_info: string
          description: string
          discount_price: number | null
          download_expiry_hours: number
          download_limit: number
          features: string[]
          file_path: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          product_type: string
          rating_avg: number
          rating_count: number
          sku: string | null
          slug: string
          sold_count: number
          stock: number
          tags: string[]
          unlimited_stock: boolean
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          delivery_info?: string
          description?: string
          discount_price?: number | null
          download_expiry_hours?: number
          download_limit?: number
          features?: string[]
          file_path?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          product_type?: string
          rating_avg?: number
          rating_count?: number
          sku?: string | null
          slug: string
          sold_count?: number
          stock?: number
          tags?: string[]
          unlimited_stock?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          delivery_info?: string
          description?: string
          discount_price?: number | null
          download_expiry_hours?: number
          download_limit?: number
          features?: string[]
          file_path?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          product_type?: string
          rating_avg?: number
          rating_count?: number
          sku?: string | null
          slug?: string
          sold_count?: number
          stock?: number
          tags?: string[]
          unlimited_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          admin_note: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_banned: boolean
          phone: string | null
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          admin_note?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_banned?: boolean
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          admin_note?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_banned?: boolean
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          order_id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          order_id: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          body: string
          is_published: boolean
          key: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          is_published?: boolean
          key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          is_published?: boolean
          key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_path: string | null
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_path?: string | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_path?: string | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          internal_note: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          internal_note?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          internal_note?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_digital_deliveries: {
        Args: never
        Returns: {
          account_email: string
          account_password: string
          account_type: string
          account_username: string
          activation_url: string
          country_region: string
          created_at: string
          delivered_at: string
          delivery_id: string
          delivery_status: string
          download_url: string
          duration: string
          email_access_url: string
          expiry_date: string
          inventory_id: string
          login_url: string
          order_id: string
          plan_package: string
          product_name: string
          qr_code: string
          recovery_info: string
          renewal_date: string
          start_date: string
          subscription_type: string
          two_fa_info: string
          warranty_expiry_date: string
          warranty_period: string
          warranty_start_date: string
          warranty_status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      release_digital_inventory: {
        Args: { p_order_id: string }
        Returns: number
      }
      reserve_digital_inventory: {
        Args: { p_inventory_id: string; p_order_id: string }
        Returns: boolean
      }
      update_expired_inventory_warranties: { Args: never; Returns: number }
    }
    Enums: {
      app_role:
        | "customer"
        | "admin"
        | "super_admin"
        | "support_admin"
        | "product_admin"
        | "order_admin"
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
      app_role: [
        "customer",
        "admin",
        "super_admin",
        "support_admin",
        "product_admin",
        "order_admin",
      ],
    },
  },
} as const
