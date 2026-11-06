// AXEL'S PLAY - Database Type Stubs
// Replace this file with the output of: npx supabase gen types typescript

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
      profiles: {
        Row: {
          id:           string
          email:        string
          display_name: string
          role:         'teacher' | 'student' | 'admin'
          avatar_url:   string | null
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id:            string
          email:         string
          display_name:  string
          role?:         'teacher' | 'student' | 'admin'
          avatar_url?:   string | null
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          id?:           string
          email?:        string
          display_name?: string
          role?:         'teacher' | 'student' | 'admin'
          avatar_url?:   string | null
          updated_at?:   string
        }
      }
      games: {
        Row: {
          id:              string
          teacher_id:      string
          title:           string
          description:     string | null
          cover_image_url: string | null
          mode:            string
          settings:        Json
          is_public:       boolean
          play_count:      number
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:             string
          teacher_id:      string
          title:           string
          description?:    string | null
          cover_image_url?: string | null
          mode?:           string
          settings?:       Json
          is_public?:      boolean
          play_count?:     number
          created_at?:     string
          updated_at?:     string
        }
        Update: {
          title?:          string
          description?:    string | null
          cover_image_url?: string | null
          mode?:           string
          settings?:       Json
          is_public?:      boolean
          play_count?:     number
          updated_at?:     string
        }
      }
      questions: {
        Row: {
          id:          string
          game_id:     string
          type:        string
          text:        string
          image_url:   string | null
          audio_url:   string | null
          video_url:   string | null
          answers:     Json
          time_limit:  number
          points:      number
          order_index: number
          explanation: string | null
          tags:        string[] | null
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:         string
          game_id:     string
          type:        string
          text:        string
          image_url?:  string | null
          audio_url?:  string | null
          video_url?:  string | null
          answers:     Json
          time_limit?: number
          points?:     number
          order_index: number
          explanation?: string | null
          tags?:       string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?:        string
          text?:        string
          image_url?:   string | null
          answers?:     Json
          time_limit?:  number
          points?:      number
          order_index?: number
          explanation?: string | null
          tags?:        string[] | null
          updated_at?:  string
        }
      }
      sessions: {
        Row: {
          id:               string
          game_id:          string
          teacher_id:       string
          code:             string
          status:           string
          current_question: number
          started_at:       string | null
          ended_at:         string | null
          created_at:       string
        }
        Insert: {
          id?:              string
          game_id:          string
          teacher_id:       string
          code:             string
          status?:          string
          current_question?: number
          started_at?:      string | null
          ended_at?:        string | null
          created_at?:      string
        }
        Update: {
          status?:           string
          current_question?: number
          started_at?:       string | null
          ended_at?:         string | null
        }
      }
      participants: {
        Row: {
          id:         string
          session_id: string
          user_id:    string | null
          nickname:   string
          avatar_url: string | null
          score:      number
          streak:     number
          is_active:  boolean
          joined_at:  string
        }
        Insert: {
          id?:        string
          session_id: string
          user_id?:   string | null
          nickname:   string
          avatar_url?: string | null
          score?:     number
          streak?:    number
          is_active?: boolean
          joined_at?: string
        }
        Update: {
          score?:     number
          streak?:    number
          is_active?: boolean
        }
      }
      answers: {
        Row: {
          id:             string
          session_id:     string
          participant_id: string
          question_id:    string
          answer_id:      string | null
          text_answer:    string | null
          is_correct:     boolean
          points:         number
          time_ms:        number
          answered_at:    string
        }
        Insert: {
          id?:            string
          session_id:     string
          participant_id: string
          question_id:    string
          answer_id?:     string | null
          text_answer?:   string | null
          is_correct:     boolean
          points:         number
          time_ms:        number
          answered_at?:   string
        }
        Update: Record<string, never>
      }
    }
    Views:  Record<string, never>
    Functions: Record<string, never>
    Enums:  Record<string, never>
  }
}
