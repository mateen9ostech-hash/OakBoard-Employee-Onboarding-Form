import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv, supabaseEnvReady } from './env'

export const supabase = supabaseEnvReady
  ? (() => {
      const { url, publishableKey } = getSupabaseEnv()
      return createBrowserClient(url, publishableKey)
    })()
  : null
