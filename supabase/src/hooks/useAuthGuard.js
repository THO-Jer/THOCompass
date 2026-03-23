import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Bootstrap: jeremias@tho.cl siempre es super_consultant
// Quitar esta función cuando el registro en Supabase esté 100% estable.
function applyBootstrap(sessionUser, profile) {
  const email = sessionUser?.email?.toLowerCase() || '';
  if (email !== 'jeremias@tho.cl') return profile;
  return {
    id:              sessionUser.id,
    email:           sessionUser.email,
    full_name:       sessionUser.user_metadata?.full_name
                  || sessionUser.user_metadata?.name
                  || 'Jeremías',
    role:            'super_consultant',
    approval_status: 'approved',
    created_at:      profile?.created_at || new Date().toISOString(),
    updated_at:      new Date().toISOString(),
    ...profile,
    // Forzar estos dos campos aunque el perfil diga otra cosa
    role:            'super_consultant',
    approval_status: 'approved',
  };
}

// ── Hook principal ─────────────────────────────────────────────
export function useAuthGuard() {
  const [status,  setStatus]  = useState(isSupabaseConfigured ? 'loading' : 'unauthenticated');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  async function loadProfile(userId) {
    if (!supabase || !userId) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data;
  }

  async function resolveStatus(sess) {
    if (!sess) {
      setStatus('unauthenticated');
      setSession(null);
      setProfile(null);
      return;
    }

    setSession(sess);
    const rawProfile = await loadProfile(sess.user.id);
    const prof       = applyBootstrap(sess.user, rawProfile);

    if (!prof) {
      setProfile(null);
      setStatus('pending');
      return;
    }

    setProfile(prof);

    switch (prof.approval_status) {
      case 'approved':  setStatus('approved');  break;
      case 'disabled':  setStatus('disabled');  break;
      case 'pending':
      default:          setStatus('pending');   break;
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      resolveStatus(sess);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      resolveStatus(sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setStatus('unauthenticated');
    setSession(null);
    setProfile(null);
  }

  return {
    status,
    session,
    profile,
    supabase,
    isConsultant:      profile?.role === 'consultant' || profile?.role === 'super_consultant',
    isSuperConsultant: profile?.role === 'super_consultant',
    isClient:          profile?.role === 'client',
    signOut,
  };
}

// ── Funciones de gestión de usuarios ──────────────────────────
// Usadas por AdminPage

/** Usuarios pendientes de aprobación */
export async function fetchPendingUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Todos los usuarios (clientes aprobados y desactivados) */
export async function fetchApprovedUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      client_user_access (
        access_status,
        clients ( id, name )
      )
    `)
    .eq('role', 'client')
    .in('approval_status', ['approved', 'disabled'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Lista simple de clientes para selectores */
export async function fetchClients() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, industry')
    .order('name');
  if (error) throw error;
  return data || [];
}

/** Consultores del equipo */
export async function fetchConsultants() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('role', ['consultant', 'super_consultant'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Aprobar usuario y asignarlo a un cliente */
export async function approveUser(userId, clientId, role = 'client') {
  if (!supabase) return;

  const { error: profileErr } = await supabase
    .from('user_profiles')
    .update({ approval_status: 'approved', role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileErr) throw profileErr;

  if (role === 'client' && clientId) {
    const { error: accessErr } = await supabase
      .from('client_user_access')
      .upsert({ client_id: clientId, user_id: userId, access_status: 'approved' },
               { onConflict: 'client_id,user_id' });
    if (accessErr) throw accessErr;
  }
}

/** Desactivar usuario */
export async function disableUser(userId) {
  if (!supabase) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({ approval_status: 'disabled', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/** Reactivar usuario */
export async function reEnableUser(userId) {
  if (!supabase) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/** Actualizar rol de un usuario */
export async function updateUserRole(userId, role) {
  if (!supabase) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
