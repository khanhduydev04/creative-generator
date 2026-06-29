export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          is_platform_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          is_platform_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          is_platform_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          actor_id: string
          action: string
          target_user_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          action: string
          target_user_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          action?: string
          target_user_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          description: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          description?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          name?: string
          description?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_owner_user_id_fkey"
            columns: ["owner_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      concept_prompts: {
        Row: {
          id: string
          concept_id: string
          label: string
          description: string
          requires_competitor: boolean
          prompt: string
          reference_images: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          concept_id: string
          label: string
          description: string
          requires_competitor?: boolean
          prompt?: string
          reference_images?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          concept_id?: string
          label?: string
          description?: string
          requires_competitor?: boolean
          prompt?: string
          reference_images?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_products: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          images: string[]
          product_url: string | null
          cached_product_context: Record<string, unknown> | null
          context_cached_at: string | null
          primary_color_1: string | null
          primary_color_2: string | null
          secondary_color_1: string | null
          secondary_color_2: string | null
          accent_color_1: string | null
          accent_color_2: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          description?: string | null
          images: string[]
          product_url?: string | null
          cached_product_context?: Record<string, unknown> | null
          context_cached_at?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          accent_color_1?: string | null
          accent_color_2?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          description?: string | null
          images?: string[]
          product_url?: string | null
          cached_product_context?: Record<string, unknown> | null
          context_cached_at?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          accent_color_1?: string | null
          accent_color_2?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_products_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      brand_kits: {
        Row: {
          id: string
          brand_id: string
          typography: string | null
          font_source: 'google' | 'local' | null
          font_file_paths: Json | null
          font_specimen_path: string | null
          primary_color_1: string | null
          primary_color_2: string | null
          secondary_color_1: string | null
          secondary_color_2: string | null
          accent_color_1: string | null
          accent_color_2: string | null
          logo_light_path: string | null
          logo_dark_path: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          typography?: string | null
          font_source?: 'google' | 'local' | null
          font_file_paths?: Json | null
          font_specimen_path?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          accent_color_1?: string | null
          accent_color_2?: string | null
          logo_light_path?: string | null
          logo_dark_path?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          typography?: string | null
          font_source?: 'google' | 'local' | null
          font_file_paths?: Json | null
          font_specimen_path?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          accent_color_1?: string | null
          accent_color_2?: string | null
          logo_light_path?: string | null
          logo_dark_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      brand_research_summaries: {
        Row: {
          id: string
          brand_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_research_summaries_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      product_markets: {
        Row: {
          id: string
          product_id: string
          market_code: string
          market_label: string
          language: string
          sheet_url: string | null
          spreadsheet_id: string | null
          sheet_gid: number | null
          sheet_name: string | null
          cached_csv: string | null
          cached_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          market_code: string
          market_label: string
          language?: string
          sheet_url?: string | null
          spreadsheet_id?: string | null
          sheet_gid?: number | null
          sheet_name?: string | null
          cached_csv?: string | null
          cached_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          market_code?: string
          market_label?: string
          language?: string
          sheet_url?: string | null
          spreadsheet_id?: string | null
          sheet_gid?: number | null
          sheet_name?: string | null
          cached_csv?: string | null
          cached_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_markets_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "brand_products"
            referencedColumns: ["id"]
          }
        ]
      }
      persona_profiles: {
        Row: {
          id: string
          brand_id: string
          research_summary_id: string | null
          title: string
          pain: string | null
          angle: string | null
          emotion: string | null
          source: 'ai' | 'manual'
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          research_summary_id?: string | null
          title: string
          pain?: string | null
          angle?: string | null
          emotion?: string | null
          source: 'ai' | 'manual'
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          research_summary_id?: string | null
          title?: string
          pain?: string | null
          angle?: string | null
          emotion?: string | null
          source?: 'ai' | 'manual'
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_profiles_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_profiles_research_summary_id_fkey"
            columns: ["research_summary_id"]
            referencedRelation: "brand_research_summaries"
            referencedColumns: ["id"]
          }
        ]
      }
      stealth_scenes: {
        Row: {
          id: string
          brand_id: string
          scene_id: string
          category: string
          name: string
          description: string
          placement_method: string
          best_for_products: string[]
          best_for_audiences: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          scene_id: string
          category: string
          name: string
          description: string
          placement_method: string
          best_for_products?: string[]
          best_for_audiences?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          scene_id?: string
          category?: string
          name?: string
          description?: string
          placement_method?: string
          best_for_products?: string[]
          best_for_audiences?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stealth_scenes_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      generated_ads: {
        Row: {
          id: string
          persona_profile_id: string | null
          parent_ad_id: string | null
          title: string | null
          segment_label: string | null
          angle_label: string | null
          image_path: string
          generation_prompt: string | null
          metadata_json: Json | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          persona_profile_id?: string | null
          parent_ad_id?: string | null
          title?: string | null
          segment_label?: string | null
          angle_label?: string | null
          image_path: string
          generation_prompt?: string | null
          metadata_json?: Json | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          persona_profile_id?: string | null
          parent_ad_id?: string | null
          title?: string | null
          segment_label?: string | null
          angle_label?: string | null
          image_path?: string
          generation_prompt?: string | null
          metadata_json?: Json | null
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_ads_persona_profile_id_fkey"
            columns: ["persona_profile_id"]
            referencedRelation: "persona_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_ads_parent_ad_id_fkey"
            columns: ["parent_ad_id"]
            referencedRelation: "generated_ads"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_ads: {
        Row: {
          id: string
          brand_id: string
          product_id: string | null
          storage_path: string
          image_url: string
          headline: string | null
          concept: string | null
          prompt: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          product_id?: string | null
          storage_path: string
          image_url: string
          headline?: string | null
          concept?: string | null
          prompt?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          product_id?: string | null
          storage_path?: string
          image_url?: string
          headline?: string | null
          concept?: string | null
          prompt?: string | null
          source?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_ads_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_ads_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "brand_products"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
