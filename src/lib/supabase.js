import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function authRedirectUrl() {
  if (Capacitor.isNativePlatform()) return 'dalibaba://auth/callback'
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
  if (configured) return configured
  return `${window.location.origin}${window.location.pathname}`
}

export async function applySessionFromAuthUrl(url) {
  if (!supabase || !url) return null
  const parsed = new URL(url)
  const params = new URLSearchParams(parsed.search)
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  hashParams.forEach((value, key) => params.set(key, value))
  const errorDescription = params.get('error_description')
  if (errorDescription) throw new Error(decodeURIComponent(errorDescription))

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error) throw error
  return data.session
}
