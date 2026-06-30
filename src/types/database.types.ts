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
      brand_apify_config: {
        Row: {
          apify_task_id: string
          brand_id: string
          created_at: string
          id: string
          is_enabled: boolean
          last_dataset_id: string | null
          last_error: string | null
          last_run_id: string | null
          last_synced_at: string | null
          updated_at: string
        }
        Insert: {
          apify_task_id: string
          brand_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_dataset_id?: string | null
          last_error?: string | null
          last_run_id?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          apify_task_id?: string
          brand_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_dataset_id?: string | null
          last_error?: string | null
          last_run_id?: string | null
          last_synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_apify_config_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          accent_color_1: string | null
          accent_color_2: string | null
          brand_id: string
          font_file_paths: Json | null
          font_source: string | null
          font_specimen_path: string | null
          id: string
          logo_dark_path: string | null
          logo_light_path: string | null
          primary_color_1: string | null
          primary_color_2: string | null
          secondary_color_1: string | null
          secondary_color_2: string | null
          typography: string | null
          updated_at: string
        }
        Insert: {
          accent_color_1?: string | null
          accent_color_2?: string | null
          brand_id: string
          font_file_paths?: Json | null
          font_source?: string | null
          font_specimen_path?: string | null
          id?: string
          logo_dark_path?: string | null
          logo_light_path?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          typography?: string | null
          updated_at?: string
        }
        Update: {
          accent_color_1?: string | null
          accent_color_2?: string | null
          brand_id?: string
          font_file_paths?: Json | null
          font_source?: string | null
          font_specimen_path?: string | null
          id?: string
          logo_dark_path?: string | null
          logo_light_path?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          typography?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_products: {
        Row: {
          accent_color_1: string | null
          accent_color_2: string | null
          attributes: string | null
          brand_id: string
          cached_product_context: Json | null
          context_cached_at: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          name: string
          price: string | null
          primary_color_1: string | null
          primary_color_2: string | null
          product_url: string | null
          secondary_color_1: string | null
          secondary_color_2: string | null
          selling_points: string | null
          target_audience: string | null
        }
        Insert: {
          accent_color_1?: string | null
          accent_color_2?: string | null
          attributes?: string | null
          brand_id: string
          cached_product_context?: Json | null
          context_cached_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          name: string
          price?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          product_url?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          selling_points?: string | null
          target_audience?: string | null
        }
        Update: {
          accent_color_1?: string | null
          accent_color_2?: string | null
          attributes?: string | null
          brand_id?: string
          cached_product_context?: Json | null
          context_cached_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          name?: string
          price?: string | null
          primary_color_1?: string | null
          primary_color_2?: string | null
          product_url?: string | null
          secondary_color_1?: string | null
          secondary_color_2?: string | null
          selling_points?: string | null
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_research_summaries: {
        Row: {
          brand_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_research_summaries_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_scripts: {
        Row: {
          brand_id: string
          created_at: string
          elevenlabs_model: string | null
          final_text: string | null
          id: string
          llm_model: string | null
          prompt_config: Json
          raw_text: string | null
          transcript_id: string
          tts_provider: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          elevenlabs_model?: string | null
          final_text?: string | null
          id?: string
          llm_model?: string | null
          prompt_config?: Json
          raw_text?: string | null
          transcript_id: string
          tts_provider?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          elevenlabs_model?: string | null
          final_text?: string | null
          id?: string
          llm_model?: string | null
          prompt_config?: Json
          raw_text?: string | null
          transcript_id?: string
          tts_provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_scripts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_scripts_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_videos: {
        Row: {
          apify_run_id: string | null
          author_handle: string | null
          brand_id: string
          comments: number | null
          cover_url: string | null
          created_at: string
          id: string
          likes: number | null
          scrape_status: string
          scraped_at: string | null
          shares: number | null
          status: string
          tiktok_url: string
          video_id: string | null
          views: number | null
        }
        Insert: {
          apify_run_id?: string | null
          author_handle?: string | null
          brand_id: string
          comments?: number | null
          cover_url?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          scrape_status?: string
          scraped_at?: string | null
          shares?: number | null
          status?: string
          tiktok_url: string
          video_id?: string | null
          views?: number | null
        }
        Update: {
          apify_run_id?: string | null
          author_handle?: string | null
          brand_id?: string
          comments?: number | null
          cover_url?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          scrape_status?: string
          scraped_at?: string | null
          shares?: number | null
          status?: string
          tiktok_url?: string
          video_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_videos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_prompts: {
        Row: {
          concept_id: string
          created_at: string | null
          description: string | null
          id: string
          label: string
          prompt: string
          reference_images: string[] | null
          requires_competitor: boolean | null
          updated_at: string | null
        }
        Insert: {
          concept_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          prompt?: string
          reference_images?: string[] | null
          requires_competitor?: boolean | null
          updated_at?: string | null
        }
        Update: {
          concept_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          prompt?: string
          reference_images?: string[] | null
          requires_competitor?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_audios: {
        Row: {
          brand_id: string
          created_at: string
          duration_secs: number | null
          id: string
          script_id: string
          storage_path: string | null
          vbee_audio_url: string | null
          voice_preset_id: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          duration_secs?: number | null
          id?: string
          script_id: string
          storage_path?: string | null
          vbee_audio_url?: string | null
          voice_preset_id?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          duration_secs?: number | null
          id?: string
          script_id?: string
          storage_path?: string | null
          vbee_audio_url?: string | null
          voice_preset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_audios_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_audios_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "brand_scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_audios_voice_preset_id_fkey"
            columns: ["voice_preset_id"]
            isOneToOne: false
            referencedRelation: "voice_presets"
            referencedColumns: ["id"]
          },
        ]
      }
      kie_task_results: {
        Row: {
          created_at: string
          error_message: string | null
          image_url: string | null
          raw_payload: Json | null
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          image_url?: string | null
          raw_payload?: Json | null
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          image_url?: string | null
          raw_payload?: Json | null
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
        }
        Relationships: []
      }
      persona_profiles: {
        Row: {
          angle: string | null
          brand_id: string
          created_at: string
          deleted_at: string | null
          emotion: string | null
          id: string
          pain: string | null
          research_summary_id: string | null
          source: string
          title: string
        }
        Insert: {
          angle?: string | null
          brand_id: string
          created_at?: string
          deleted_at?: string | null
          emotion?: string | null
          id?: string
          pain?: string | null
          research_summary_id?: string | null
          source: string
          title: string
        }
        Update: {
          angle?: string | null
          brand_id?: string
          created_at?: string
          deleted_at?: string | null
          emotion?: string | null
          id?: string
          pain?: string | null
          research_summary_id?: string | null
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_profiles_research_summary_id_fkey"
            columns: ["research_summary_id"]
            isOneToOne: false
            referencedRelation: "brand_research_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_platform_admin: boolean
          last_login_at: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_platform_admin?: boolean
          last_login_at?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_platform_admin?: boolean
          last_login_at?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_ads: {
        Row: {
          brand_id: string
          concept: string | null
          created_at: string
          headline: string | null
          id: string
          image_url: string
          product_id: string | null
          prompt: string | null
          source: string
          storage_path: string
        }
        Insert: {
          brand_id: string
          concept?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          image_url: string
          product_id?: string | null
          prompt?: string | null
          source?: string
          storage_path: string
        }
        Update: {
          brand_id?: string
          concept?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          image_url?: string
          product_id?: string | null
          prompt?: string | null
          source?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_ads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_ads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "brand_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stealth_scenes: {
        Row: {
          best_for_audiences: string[]
          best_for_products: string[]
          brand_id: string
          category: string
          created_at: string
          description: string
          id: string
          name: string
          placement_method: string
          scene_id: string
          updated_at: string
        }
        Insert: {
          best_for_audiences?: string[]
          best_for_products?: string[]
          brand_id: string
          category: string
          created_at?: string
          description: string
          id?: string
          name: string
          placement_method: string
          scene_id: string
          updated_at?: string
        }
        Update: {
          best_for_audiences?: string[]
          best_for_products?: string[]
          brand_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          placement_method?: string
          scene_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stealth_scenes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          created_at: string
          edited_text: string | null
          id: string
          raw_text: string | null
          updated_at: string
          video_id: string
          whisper_status: string
        }
        Insert: {
          created_at?: string
          edited_text?: string | null
          id?: string
          raw_text?: string | null
          updated_at?: string
          video_id: string
          whisper_status?: string
        }
        Update: {
          created_at?: string
          edited_text?: string | null
          id?: string
          raw_text?: string | null
          updated_at?: string
          video_id?: string
          whisper_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "competitor_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          encrypted_key: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          encrypted_key: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          encrypted_key?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_concepts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          owner_user_id: string
          prompt: string
          reference_images: string[]
          requires_competitor: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          owner_user_id: string
          prompt: string
          reference_images?: string[]
          requires_competitor?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          owner_user_id?: string
          prompt?: string
          reference_images?: string[]
          requires_competitor?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_concepts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_presets: {
        Row: {
          brand_id: string
          created_at: string
          display_name: string
          id: string
          is_default: boolean
          pause_config: Json | null
          pitch: number
          speed: number
          voice_code: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          display_name: string
          id?: string
          is_default?: boolean
          pause_config?: Json | null
          pitch?: number
          speed?: number
          voice_code: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean
          pause_config?: Json | null
          pitch?: number
          speed?: number
          voice_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_presets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_ratings: {
        Row: {
          brand_id: string
          id: string
          note: string | null
          rated_at: string
          score: number
          vbee_voice_code: string
        }
        Insert: {
          brand_id: string
          id?: string
          note?: string | null
          rated_at?: string
          score: number
          vbee_voice_code: string
        }
        Update: {
          brand_id?: string
          id?: string
          note?: string | null
          rated_at?: string
          score?: number
          vbee_voice_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_ratings_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      upsert_competitor_videos: {
        Args: { p_apify_run_id?: string; p_brand_id: string; p_videos: Json }
        Returns: number
      }
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
