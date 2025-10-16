import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Create Supabase client with service role key for server-side operations
// This bypasses RLS policies and should only be used in API routes
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Types matching our database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          telegram_id: number
          username: string | null
          first_name: string
          last_name: string
          fide_rating: number | null
          chesscom_rating: number | null
          lichess_rating: number | null
          chesscom_url: string | null
          lichess_url: string | null
          bio: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          telegram_id: number
          username?: string | null
          first_name: string
          last_name: string
          fide_rating?: number | null
          chesscom_rating?: number | null
          lichess_rating?: number | null
          chesscom_url?: string | null
          lichess_url?: string | null
          bio?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          telegram_id?: number
          username?: string | null
          first_name?: string
          last_name?: string
          fide_rating?: number | null
          chesscom_rating?: number | null
          lichess_rating?: number | null
          chesscom_url?: string | null
          lichess_url?: string | null
          bio?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: number
          title: string
          format: string
          points_win: number
          points_loss: number
          points_draw: number
          bye_points: number
          rounds: number
          tiebreakers: string
          team_mode: string
          allow_join: number
          allow_edit_results: number
          allow_danger_changes: number
          forbid_repeat_bye: number
          late_join_points: number
          hide_rating: number
          hide_new_rating: number
          compute_performance: number
          hide_color_names: number
          show_opponent_names: number
          creator_telegram_id: number | null
          archived: number
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          format?: string
          points_win?: number
          points_loss?: number
          points_draw?: number
          bye_points?: number
          rounds?: number
          tiebreakers?: string
          team_mode?: string
          allow_join?: number
          allow_edit_results?: number
          allow_danger_changes?: number
          forbid_repeat_bye?: number
          late_join_points?: number
          hide_rating?: number
          hide_new_rating?: number
          compute_performance?: number
          hide_color_names?: number
          show_opponent_names?: number
          creator_telegram_id?: number | null
          archived?: number
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          format?: string
          points_win?: number
          points_loss?: number
          points_draw?: number
          bye_points?: number
          rounds?: number
          tiebreakers?: string
          team_mode?: string
          allow_join?: number
          allow_edit_results?: number
          allow_danger_changes?: number
          forbid_repeat_bye?: number
          late_join_points?: number
          hide_rating?: number
          hide_new_rating?: number
          compute_performance?: number
          hide_color_names?: number
          show_opponent_names?: number
          creator_telegram_id?: number | null
          archived?: number
          created_at?: string
        }
      }
      tournament_participants: {
        Row: {
          id: number
          tournament_id: number
          user_id: number
          nickname: string
          created_at: string
        }
        Insert: {
          id?: number
          tournament_id: number
          user_id: number
          nickname: string
          created_at?: string
        }
        Update: {
          id?: number
          tournament_id?: number
          user_id?: number
          nickname?: string
          created_at?: string
        }
      }
      rounds: {
        Row: {
          id: number
          tournament_id: number
          number: number
          status: string
          created_at: string
          paired_at: string | null
          locked_at: string | null
        }
        Insert: {
          id?: number
          tournament_id: number
          number: number
          status?: string
          created_at?: string
          paired_at?: string | null
          locked_at?: string | null
        }
        Update: {
          id?: number
          tournament_id?: number
          number?: number
          status?: string
          created_at?: string
          paired_at?: string | null
          locked_at?: string | null
        }
      }
      matches: {
        Row: {
          id: number
          round_id: number
          white_participant_id: number | null
          black_participant_id: number | null
          board_no: number | null
          result: string
          score_white: number
          score_black: number
          source: string | null
          notes: string | null
        }
        Insert: {
          id?: number
          round_id: number
          white_participant_id?: number | null
          black_participant_id?: number | null
          board_no?: number | null
          result?: string
          score_white?: number
          score_black?: number
          source?: string | null
          notes?: string | null
        }
        Update: {
          id?: number
          round_id?: number
          white_participant_id?: number | null
          black_participant_id?: number | null
          board_no?: number | null
          result?: string
          score_white?: number
          score_black?: number
          source?: string | null
          notes?: string | null
        }
      }
      leaderboard: {
        Row: {
          id: number
          tournament_id: number
          participant_id: number
          nickname: string
          points: number
          rank: number
          created_at: string
        }
        Insert: {
          id?: number
          tournament_id: number
          participant_id: number
          nickname: string
          points: number
          rank: number
          created_at?: string
        }
        Update: {
          id?: number
          tournament_id?: number
          participant_id?: number
          nickname?: string
          points?: number
          rank?: number
          created_at?: string
        }
      }
    }
  }
}
