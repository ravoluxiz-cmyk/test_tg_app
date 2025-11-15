/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Simple utility
const nowIso = () => new Date().toISOString()

// In-memory fallback store (dev/testing)
interface MemRow { [key: string]: any }
interface MemStore {
  users: MemRow[]
  tournaments: MemRow[]
  tournament_participants: MemRow[]
  rounds: MemRow[]
  matches: MemRow[]
  leaderboard: MemRow[]
  counters: Record<string, number>
}

function getGlobalStore(): MemStore {
  const g = globalThis as any
  if (!g.__MEM_SUPABASE_STORE__) {
    g.__MEM_SUPABASE_STORE__ = {
      users: [],
      tournaments: [],
      tournament_participants: [],
      rounds: [],
      matches: [],
      leaderboard: [],
      counters: { users: 0, tournaments: 0, tournament_participants: 0, rounds: 0, matches: 0, leaderboard: 0 }
    } as MemStore
  }
  return g.__MEM_SUPABASE_STORE__ as MemStore
}

class QueryBuilder {
  private table: keyof MemStore
  private store: MemStore
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private filters: Array<(row: MemRow) => boolean> = []
  private updateValues: MemRow | null = null
  private insertValues: MemRow | MemRow[] | null = null
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private wantSingle = false
  private selectClause: string | null = null

  constructor(table: keyof MemStore, store: MemStore) {
    this.table = table
    this.store = store
  }

  select(clause: string = '*') {
    this.action = 'select'
    this.selectClause = clause
    return this
  }

  insert(values: MemRow | MemRow[]) {
    this.action = 'insert'
    this.insertValues = values
    return this
  }

  update(values: MemRow) {
    this.action = 'update'
    this.updateValues = values
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((row) => (row as any)[column] === value)
    return this
  }

  ilike(column: string, pattern: string) {
    const needle = String(pattern).replace(/%/g, '').toLowerCase()
    this.filters.push((row) => {
      const v = String((row as any)[column] ?? '').toLowerCase()
      return needle ? v.includes(needle) : true
    })
    return this
  }

  order(column: string, opts: { ascending: boolean }) {
    this.orderBy = { column, ascending: !!opts?.ascending }
    return this
  }

  limit(n: number) {
    this.limitCount = n
    return this
  }

  single() {
    this.wantSingle = true
    return this
  }

  private applyFilters(rows: MemRow[]): MemRow[] {
    return this.filters.length ? rows.filter((r) => this.filters.every((f) => f(r))) : rows
  }

  private sortRows(rows: MemRow[]): MemRow[] {
    if (!this.orderBy) return rows
    const { column, ascending } = this.orderBy
    return rows.slice().sort((a, b) => {
      const av = (a as any)[column]
      const bv = (b as any)[column]
      if (av === bv) return 0
      if (av === undefined) return ascending ? 1 : -1
      if (bv === undefined) return ascending ? -1 : 1
      if (av < bv) return ascending ? -1 : 1
      return ascending ? 1 : -1
    })
  }

  private takeLimit(rows: MemRow[]): MemRow[] {
    if (this.limitCount == null) return rows
    return rows.slice(0, this.limitCount)
  }

  private execInsert(): { data: any; error: any } {
    if (!this.insertValues) return { data: null, error: null }
    const arr = Array.isArray(this.insertValues) ? this.insertValues : [this.insertValues]
    const target = (this.store[this.table] as MemRow[])
    const counterKey = this.table as string
    for (const row of arr) {
      const id = ++this.store.counters[counterKey]
      const data = {
        id,
        ...row,
        created_at: row.created_at ?? nowIso()
      }
      target.push(data)
    }
    const inserted = arr.length === 1 ? target[target.length - 1] : arr.map((_, i) => target[target.length - arr.length + i])
    return { data: inserted, error: null }
  }

  private execUpdate(): { data: any; error: any } {
    const target = (this.store[this.table] as MemRow[])
    const rows = this.applyFilters(target)
    if (!rows.length) return { data: null, error: null }
    const updated = rows.map((r) => {
      const newRow = { ...r, ...this.updateValues }
      Object.assign(r, newRow)
      return newRow
    })
    const data = this.wantSingle ? updated[0] : updated
    return { data, error: null }
  }

  private execDelete(): { data: any; error: any } {
    const target = (this.store[this.table] as MemRow[])
    const before = target.length
    const kept = target.filter((r) => !this.applyFilters([r]).length)
    ;(this.store[this.table] as MemRow[]) = kept
    const deleted = before - kept.length
    return { data: { deleted }, error: null }
  }

  private execSelect(): { data: any; error: any } {
    let rows = this.applyFilters(this.store[this.table] as MemRow[])
    rows = this.sortRows(rows)
    rows = this.takeLimit(rows)

    if (this.wantSingle) {
      const first = rows[0]
      if (!first) {
        // Mimic Supabase not-found error code used in db.ts
        return { data: null, error: { code: 'PGRST116', message: 'No rows found' } }
      }
      return { data: first, error: null }
    }
    return { data: rows, error: null }
  }

  // Emulate Supabase promise behavior
  then(onFulfilled: (value: { data: any; error: any }) => any, onRejected?: (reason: any) => any) {
    try {
      let result: { data: any; error: any }
      switch (this.action) {
        case 'insert':
          result = this.execInsert()
          break
        case 'update':
          result = this.execUpdate()
          break
        case 'delete':
          result = this.execDelete()
          break
        default:
          result = this.execSelect()
      }
      return Promise.resolve(onFulfilled(result))
    } catch (err) {
      return onRejected ? Promise.resolve(onRejected(err)) : Promise.reject(err)
    }
  }
}

function createMemoryClient() {
  const store = getGlobalStore()
  return {
    from(table: keyof MemStore) {
      return new QueryBuilder(table, store)
    }
  } as any
}

// Create Supabase client with service role key for server-side operations
// If env vars are present, use real client; otherwise fall back to in-memory client.
export const supabase: any = (() => {
  const hasReal = !!(supabaseUrl && supabaseServiceKey)
  if (hasReal) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  // Dev/testing fallback
  console.warn('[supabase] Using in-memory fallback. Provide NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use a real database.')
  return createMemoryClient()
})()

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
          rating: number
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
          rating?: number
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
          rating?: number
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
