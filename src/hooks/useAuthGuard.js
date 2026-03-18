import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export function useAuthGuard() {
  const [status, setStatus] = useState(isSupabaseConfigured ? "loading" : "unauthenticated");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  async function loadProfile(userId) {
    if (!supabase || !userId) return null;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async function resolveStatus(sess) {
    if (!sess) {
      setStatus("unauthenticated");
      setSession(null);
      setProfile(null);
      return;
    }

    setSession(sess);
    const prof = await loadProfile(sess.user.id);

    if (!prof) {
      setProfile(null);
      setStatus("pending");
      return;
    }

    setProfile(prof);

    switch (prof.approval_status) {
      case "approved":
        setStatus("approved");
        break;
      case "disabled":
        setStatus("disabled");
        break;
      case "pending":
      default:
        setStatus("pending");
        break;
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

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
    setStatus("unauthenticated");
    setSession(null);
    setProfile(null);
  }

  const isConsultant = profile?.role === "consultant" || profile?.role === "super_consultant";
  const isSuperConsultant = profile?.role === "super_consultant";
  const isClient = profile?.role === "client";

  return {
    status,
    session,
    profile,
    isConsultant,
    isSuperConsultant,
    isClient,
    signOut,
    supabase,
  };
}

export async function fetchPendingUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("approval_status", "pending")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchApprovedUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_profiles")
    .select(`
      *,
      client_user_access (
        access_status,
        clients ( id, name, logo )
      )
    `)
    .eq("role", "client")
    .in("approval_status", ["approved", "disabled"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchClients() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, logo, industry")
    .order("name");

  if (error) throw error;
  return data;
}

export async function approveUser(userId, clientId) {
  if (!supabase) return;
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({ approval_status: "approved", updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) throw profileError;

  const { error: accessError } = await supabase
    .from("client_user_access")
    .upsert({
      client_id: clientId,
      user_id: userId,
      access_status: "approved",
    }, { onConflict: "client_id,user_id" });

  if (accessError) throw accessError;
}

export async function disableUser(userId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("user_profiles")
    .update({ approval_status: "disabled", updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}

export async function reEnableUser(userId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("user_profiles")
    .update({ approval_status: "approved", updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
