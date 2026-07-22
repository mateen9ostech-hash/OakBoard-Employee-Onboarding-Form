import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv, supabaseEnvReady } from './env'

export const supabase = supabaseEnvReady
  ? (() => {
      const { url, publishableKey } = getSupabaseEnv()
      return createClient(url, publishableKey, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    })()
  : null
