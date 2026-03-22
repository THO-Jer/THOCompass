// ============================================================
// useAuthGuard.ts
// Hook que centraliza la lógica de autenticación y autorización.
// Determina qué pantalla renderizar según el estado del usuario.
//
// Uso en App.tsx o el router principal:
//
//   const { status, session, profile, signOut } = useAuthGuard()
//
//   if (status === 'loading')  return <LoadingScreen />
//   if (status === 'unauthenticated') return <Login />
//   if (status === 'pending')  return <PendingAccess ... />
//   if (status === 'disabled') return <PendingAccess disabled ... />
//   if (status === 'approved') return <App profile={profile} />
// ============================================================

import { useEffect, useState } from 'react'
import { createClient, Session } from '@supabase/supabase-js'

// ── Supabase client ───────────────────────────────────────────
// El dev reemplaza estas variables con las del proyecto real.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

// ── Types ─────────────────────────────────────────────────────
export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'pending'
  | 'disabled'
  | 'approved'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'super_consultant' | 'consultant' | 'client'
  approval_status: 'pending' | 'approved' | 'disabled'
  created_at: string
  updated_at: string
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuthGuard() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  async function loadProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return data as UserProfile
  }

  async function resolveStatus(sess: Session | null) {
    if (!sess) {
      setStatus('unauthenticated')
      setSession(null)
      setProfile(null)
      return
    }

    setSession(sess)

    const prof = await loadProfile(sess.user.id)

    if (!prof) {
      // El trigger no alcanzó a crear el perfil todavía.
      // Esto es raro pero posible en condiciones de race.
      // Mostramos pending y reintentamos.
      setStatus('pending')
      return
    }

    setProfile(prof)

    switch (prof.approval_status) {
      case 'approved':
        setStatus('approved')
        break
      case 'disabled':
        setStatus('disabled')
        break
      case 'pending':
      default:
        setStatus('pending')
        break
    }
  }

  useEffect(() => {
    // Sesión inicial al montar
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      resolveStatus(sess)
    })

    // Escuchar cambios de sesión (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        resolveStatus(sess)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setStatus('unauthenticated')
    setSession(null)
    setProfile(null)
  }

  // Helpers de rol (para no repetir lógica en los componentes)
  const isConsultant = profile?.role === 'consultant' || profile?.role === 'super_consultant'
  const isSuperConsultant = profile?.role === 'super_consultant'
  const isClient = profile?.role === 'client'

  return {
    status,
    session,
    profile,
    isConsultant,
    isSuperConsultant,
    isClient,
    signOut,
    supabase, // expuesto para queries en los componentes hijos
  }
}

// ── Helpers de Supabase para el ApprovalPanel ─────────────────
// El dev puede importar estas funciones directamente en el panel.

export async function fetchPendingUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('approval_status', 'pending')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as UserProfile[]
}

export async function fetchApprovedUsers() {
  // Trae usuarios cliente con su empresa asignada (si existe)
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      client_user_access (
        access_status,
        clients ( id, name, logo )
      )
    `)
    .eq('role', 'client')
    .in('approval_status', ['approved', 'disabled'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, logo, industry')
    .order('name')

  if (error) throw error
  return data
}

export async function approveUser(userId: string, clientId: string) {
  // 1. Aprobar el perfil
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (profileError) throw profileError

  // 2. Crear o actualizar el acceso al cliente
  const { error: accessError } = await supabase
    .from('client_user_access')
    .upsert({
      client_id: clientId,
      user_id: userId,
      access_status: 'approved',
    }, { onConflict: 'client_id,user_id' })

  if (accessError) throw accessError
}

export async function disableUser(userId: string) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ approval_status: 'disabled', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
}

export async function reEnableUser(userId: string) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
}
