import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, getOAuthRedirectUrl } from "./lib/supabase";
import { useAuthGuard } from "./hooks/useAuthGuard";
import AdminPage      from "./components/AdminPage";
import ClientsPage    from "./components/ClientsPage";
import ClientDashboard from "./components/ClientDashboard";
import ModuleRC        from "./components/ModuleRC";
import ModuleDO        from "./components/ModuleDO";
import ModuleESG       from "./components/ModuleESG";
import PendingAccess   from "./components/PendingAccess";

// ── Design tokens ─────────────────────────────────────────────
const T = {
  bg:"#08090c", s1:"#0d0f14", s2:"#111520", s3:"#161b28",
  b1:"#1d2535", b2:"#232d42", b3:"#2e3a52",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  rc:"#f97316", do:"#a855f7", esg:"#22c55e",
  blue:"#3b82f6", amber:"#f59e0b", red:"#ef4444",
};

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#08090c;color:#e8ecf4;font-family:'Instrument Sans',sans-serif;font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#2a3040;border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.fu{animation:fadeUp .4s cubic-bezier(.4,0,.2,1) both;}
.d1{animation-delay:.07s;} .d2{animation-delay:.14s;} .d3{animation-delay:.21s;}
`;

// ── Nav definitions ────────────────────────────────────────────
const CONSULTANT_NAV = [
  { id:"dashboard", icon:"◈",  label:"Panel general" },
  { sep:true,                   label:"Módulos" },
  { id:"rc",        icon:"🤝", label:"Relacionamiento",  activeCls:"rc"  },
  { id:"do",        icon:"🏛",  label:"Desarrollo Org.", activeCls:"do"  },
  { id:"esg",       icon:"🌿", label:"Sostenibilidad",  activeCls:"esg" },
  { sep:true,                   label:"Gestión" },
  { id:"clients",   icon:"🏢", label:"Clientes"         },
  { id:"admin",     icon:"⚙",  label:"Administración"   },
];

const CLIENT_NAV = (modules) => [
  { id:"dashboard", icon:"◈",  label:"Mi dashboard" },
  { sep:true,                   label:"Servicios" },
  { id:"rc",        icon:"🤝", label:"Relacionamiento",  activeCls:"rc",  locked:!modules?.rc  },
  { id:"do",        icon:"🏛",  label:"Desarrollo Org.", activeCls:"do",  locked:!modules?.do  },
  { id:"esg",       icon:"🌿", label:"Sostenibilidad",  activeCls:"esg", locked:!modules?.esg },
  { sep:true,                   label:"Cuenta" },
  { id:"messages",  icon:"✉",  label:"Mensajes"          },
];

const MOD_COLOR = { rc:T.rc, do:T.do, esg:T.esg, clients:T.blue, admin:T.blue, dashboard:T.blue };

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ nav, page, onNav, open, onToggle, profile, isC, onSignOut }) {
  return (
    <div style={{
      width:open?228:56, flexShrink:0, background:T.s1, borderRight:`1px solid ${T.b1}`,
      display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0,
      transition:"width .22s cubic-bezier(.4,0,.2,1)", zIndex:200, overflow:"hidden",
    }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 14px 16px",
        borderBottom:`1px solid ${T.b1}`, minHeight:62, overflow:"hidden", whiteSpace:"nowrap" }}>
        <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
          background:`linear-gradient(135deg,${T.rc},${T.do})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:14, color:"white" }}>T</div>
        {open && (
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16, color:T.t1 }}>
            THO{" "}
            <span style={{ background:`linear-gradient(90deg,${T.rc},${T.do})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Compass</span>
          </div>
        )}
        <button onClick={onToggle} style={{ marginLeft:"auto", flexShrink:0, background:"none",
          border:`1px solid ${T.b2}`, borderRadius:6, color:T.t3, cursor:"pointer",
          padding:"4px 7px", fontSize:12 }}>
          {open ? "←" : "→"}
        </button>
      </div>

      {/* Nav items */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"10px 8px" }}>
        {nav.map((item, i) => {
          if (item.sep) return open
            ? <div key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t3,
                letterSpacing:2, textTransform:"uppercase", padding:"0 8px", margin:"14px 0 5px" }}>
                {item.label}
              </div>
            : <div key={i} style={{ height:1, background:T.b1, margin:"10px 6px" }}/>;

          const isActive = page === item.id;
          const ac = MOD_COLOR[item.activeCls || item.id] || T.blue;

          return (
            <div key={item.id}
              onClick={() => !item.locked && onNav(item.id)}
              title={!open ? item.label : undefined}
              style={{
                display:"flex", alignItems:"center", gap:9, padding:"9px 8px", borderRadius:8,
                cursor:item.locked ? "default" : "pointer",
                opacity:item.locked ? .35 : 1,
                color:isActive ? ac : T.t3,
                background:isActive ? `${ac}12` : "none",
                border:`1px solid ${isActive ? ac+"25" : "transparent"}`,
                transition:"all .15s", whiteSpace:"nowrap", overflow:"hidden",
                fontSize:13, fontWeight:500,
              }}
              onMouseEnter={e => !isActive && !item.locked && (e.currentTarget.style.background = T.s2, e.currentTarget.style.color = T.t1)}
              onMouseLeave={e => !isActive && (e.currentTarget.style.background = "none", e.currentTarget.style.color = T.t3)}
            >
              <span style={{ fontSize:16, flexShrink:0, width:22, textAlign:"center" }}>{item.icon}</span>
              {open && <span style={{ flex:1 }}>{item.label}</span>}
              {open && item.locked && <span style={{ fontSize:11, color:T.t4 }}>🔒</span>}
            </div>
          );
        })}
      </div>

      {/* User + sign out */}
      <div style={{ padding:"10px 8px", borderTop:`1px solid ${T.b1}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:8, overflow:"hidden", whiteSpace:"nowrap" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
            background:isC ? `${T.blue}18` : `${T.rc}18`,
            color:isC ? T.blue : T.rc,
            border:`1px solid ${isC ? T.blue : T.rc}30`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:12 }}>
            {profile?.full_name?.[0]?.toUpperCase() || (isC ? "T" : "C")}
          </div>
          {open && (
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.t1,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {profile?.full_name || (isC ? "THO Consultora" : "Cliente")}
              </div>
              <div style={{ fontSize:10, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>
                {profile?.role === "super_consultant" ? "super consultora"
                  : profile?.role === "consultant" ? "consultora" : "cliente"}
              </div>
            </div>
          )}
        </div>
        {open && (
          <button onClick={onSignOut} style={{ width:"100%", marginTop:7, padding:7,
            background:"none", border:`1px solid ${T.b2}`, borderRadius:7, color:T.t3,
            fontSize:12, cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif",
            transition:"all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.b2; e.currentTarget.style.color = T.t3; }}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────
function Login() {
  const [role,    setRole]    = useState("consultant");
  const [loading, setLoading] = useState(null);
  const [error,   setError]   = useState(null);

  async function handleOAuth(provider) {
    if (!supabase) { setError("Supabase no configurado."); return; }
    setLoading(provider); setError(null);
    const redirectTo = getOAuthRedirectUrl();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: provider === "azure" ? "openid email profile" : undefined,
        queryParams: role === "client" ? { prompt:"select_account" } : undefined,
      },
    });
    if (err) { setError(err.message); setLoading(null); }
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0,
        backgroundImage:`linear-gradient(${T.b1}50 1px,transparent 1px),linear-gradient(90deg,${T.b1}50 1px,transparent 1px)`,
        backgroundSize:"52px 52px", opacity:.4 }}/>
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
        background:`radial-gradient(circle,${T.rc}07,transparent 65%)`,
        top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}/>

      <div className="fu" style={{ position:"relative", background:T.s1, border:`1px solid ${T.b2}`,
        borderRadius:20, padding:"48px 44px", width:400, maxWidth:"92vw",
        boxShadow:"0 32px 80px rgba(0,0,0,.7)" }}>
        <div style={{ position:"absolute", top:0, left:48, right:48, height:2,
          borderRadius:"0 0 2px 2px",
          background:`linear-gradient(90deg,${T.rc},${T.do})` }}/>

        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700,
          color:T.t1, marginBottom:4 }}>
          THO{" "}
          <span style={{ background:`linear-gradient(90deg,${T.rc},${T.do})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Compass</span>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t4,
          letterSpacing:3, textTransform:"uppercase", marginBottom:32 }}>
          Plataforma de Reputación Corporativa
        </div>

        {/* Role selector */}
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t3,
          letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Tipo de acceso</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {[["consultant","⚙️","Consultora"], ["client","📊","Cliente"]].map(([r, ic, l]) => (
            <div key={r} onClick={() => setRole(r)} style={{
              padding:"14px 10px", borderRadius:12, cursor:"pointer", textAlign:"center",
              border:`1px solid ${role===r ? `${T.rc}60` : T.b2}`,
              background:role===r ? `${T.rc}10` : T.s2,
              color:role===r ? T.rc : T.t3, transition:"all .2s",
            }}>
              <div style={{ fontSize:22, marginBottom:5 }}>{ic}</div>
              <div style={{ fontSize:13, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding:"10px 14px", background:`${T.red}10`,
            border:`1px solid ${T.red}30`, borderRadius:8,
            fontSize:12, color:T.red, marginBottom:16 }}>{error}</div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {/* Google */}
          <button onClick={() => handleOAuth("google")} disabled={!!loading} style={{
            width:"100%", padding:12, background:"none", border:`1px solid ${T.b2}`,
            borderRadius:9, color:T.t1, fontSize:14, fontWeight:500, cursor:"pointer",
            fontFamily:"'Instrument Sans',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            opacity:loading ? .6 : 1 }}>
            {loading === "google"
              ? <span style={{ width:16, height:16, border:"2px solid #3b82f6",
                  borderTopColor:"transparent", borderRadius:"50%",
                  animation:"spin .8s linear infinite", display:"inline-block" }}/>
              : <svg width="17" height="17" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>}
            Continuar con Google
          </button>

          {/* Microsoft */}
          <button onClick={() => handleOAuth("azure")} disabled={!!loading} style={{
            width:"100%", padding:12,
            background:`linear-gradient(135deg,${T.rc},${T.do})`,
            border:"none", borderRadius:9, color:"white", fontSize:14, fontWeight:600,
            cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            opacity:loading ? .6 : 1 }}>
            {loading === "azure"
              ? <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.4)",
                  borderTopColor:"white", borderRadius:"50%",
                  animation:"spin .8s linear infinite", display:"inline-block" }}/>
              : <svg width="17" height="17" viewBox="0 0 23 23">
                  <path fill="rgba(255,255,255,.9)" d="M11 0H0v11h11V0zm12 0H12v11h11V0zM11 12H0v11h11V12zm12 0H12v11h11V12z"/>
                </svg>}
            Continuar con Microsoft
          </button>
        </div>

        <div style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace",
          fontSize:10, color:T.t4, marginTop:18 }}>thocompass.cl</div>
      </div>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, borderRadius:10,
        background:`linear-gradient(135deg,${T.rc},${T.do})`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:20, color:"white" }}>T</div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
        color:T.t3, letterSpacing:2 }}>CARGANDO…</div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const auth = useAuthGuard();
  const [page,        setPage]        = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selClientId, setSelClientId]   = useState(null);
  const [clients,     setClients]       = useState([]);
  const [showPicker,  setShowPicker]    = useState(false);

  // Load clients list for consultant
  useEffect(() => {
    if (!auth.isConsultant || !auth.supabase) return;
    loadConsultantClients();
  }, [auth.isConsultant, auth.supabase]);

  async function loadConsultantClients() {
    const sb = auth.supabase;
    // Primero traemos los clientes, luego filtramos módulos por sus IDs
    const { data: clientData } = await sb
      .from("clients").select("id, name, published").order("name");

    if (!clientData?.length) return;

    const ids = clientData.map(c => c.id);
    const { data: moduleData } = await sb
      .from("client_modules")
      .select("client_id, rc, do_enabled, esg")
      .in("client_id", ids);

    const mapped = clientData.map(c => {
      const m = moduleData?.find(m => m.client_id === c.id);
      return {
        ...c,
        modules: {
          rc:  m?.rc         ?? false,
          do:  m?.do_enabled ?? false,
          esg: m?.esg        ?? false,
        },
      };
    });
    setClients(mapped);
    setSelClientId(prev => prev || mapped[0]?.id);
  }

  // Load assigned client for client users
  useEffect(() => {
    if (!auth.isClient || !auth.supabase || !auth.profile?.id) return;
    auth.supabase
      .from("client_user_access")
      .select("client_id")
      .eq("user_id", auth.profile.id)
      .eq("access_status", "approved")
      .limit(1)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data?.client_id) return;
        setSelClientId(data.client_id);
        // Load client modules so nav shows correct locked state
        const [{ data: clientData }, { data: moduleData }] = await Promise.all([
          auth.supabase.from("clients").select("id, name, published").eq("id", data.client_id).single(),
          auth.supabase.from("client_modules").select("rc, do_enabled, esg").eq("client_id", data.client_id).maybeSingle(),
        ]);
        if (clientData) {
          setClients([{
            ...clientData,
            modules: {
              rc:  moduleData?.rc         ?? false,
              do:  moduleData?.do_enabled ?? false,
              esg: moduleData?.esg        ?? false,
            },
          }]);
        }
      });
  }, [auth.isClient, auth.supabase, auth.profile?.id]);

  const selClient  = clients.find(c => c.id === selClientId) || clients[0] || null;
  const clientMods = selClient?.modules || {};

  // Para usuario cliente: su clientId asignado — puede llegar con delay
  const clientViewId = auth.isClient ? selClientId : null;

  const isC = auth.isConsultant;
  const nav  = isC ? CONSULTANT_NAV : CLIENT_NAV(clientMods);
  const ml   = sidebarOpen ? 228 : 56;

  // Navigate and reset scroll
  function navigate(id) {
    setPage(id);
    window.scrollTo({ top:0, behavior:"instant" });
    setShowPicker(false);
  }

  // ── Render page content ──────────────────────────────────────
  function renderPage() {
    if (isC) {
      if (page === "dashboard") return <ClientDashboard client={selClient} supabase={auth.supabase} isConsultant={true}/>;
      if (page === "rc")        return <ModuleRC client={selClient} supabase={auth.supabase}/>;
      if (page === "do")        return <ModuleDO client={selClient} supabase={auth.supabase}/>;
      if (page === "esg")       return <ModuleESG client={selClient} supabase={auth.supabase}/>;
      if (page === "clients")   return <ClientsPage supabase={auth.supabase} currentUser={auth.profile} onClientsChange={loadConsultantClients}/>;
      if (page === "admin")     return <AdminPage   supabase={auth.supabase} currentUser={auth.profile} onClientsChange={loadConsultantClients}/>;
    } else {
      // Si aún no cargó el clientId, mostrar spinner
      if (!clientViewId) return (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          height:"60vh", flexDirection:"column", gap:12 }}>
          <div style={{ width:20, height:20, border:`2px solid #1d2535`,
            borderTopColor:"#f97316", borderRadius:"50%",
            animation:"spin .8s linear infinite" }}/>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
            color:"#3d4d66", letterSpacing:2 }}>CARGANDO…</div>
        </div>
      );
      return <ClientDashboard client={{ id: clientViewId }} supabase={auth.supabase}/>;
    }
    return null;
  }

  // ── Auth gates ───────────────────────────────────────────────
  if (auth.status === "loading") return (
    <><style>{BASE_CSS}</style><LoadingScreen/></>
  );

  if (auth.status === "unauthenticated") return (
    <><style>{BASE_CSS}</style><Login/></>
  );

  if (auth.status === "pending" || auth.status === "disabled") return (
    <><style>{BASE_CSS}</style>
      <PendingAccess
        email={auth.profile?.email || auth.session?.user?.email}
        name={auth.profile?.full_name}
        onSignOut={auth.signOut}/>
    </>
  );

  // ── Authenticated shell ──────────────────────────────────────
  const pageLabel = nav.find(n => n.id === page)?.label || "Dashboard";

  return (
    <>
      <style>{BASE_CSS}</style>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <Sidebar
          nav={nav}
          page={page}
          onNav={navigate}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          profile={auth.profile}
          isC={isC}
          onSignOut={auth.signOut}/>

        <div style={{ marginLeft:ml, flex:1, minHeight:"100vh",
          transition:"margin-left .22s cubic-bezier(.4,0,.2,1)" }}>

          {/* Topbar */}
          <div style={{ height:52, background:T.s1, borderBottom:`1px solid ${T.b1}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0 28px", position:"sticky", top:0, zIndex:100 }}>
            <div style={{ fontSize:13, color:T.t2 }}>
              THO Compass{" "}
              <strong style={{ color:T.t1, fontWeight:600 }}>/ {pageLabel}</strong>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
              {isC && clients.length > 0 && (
                <>
                  <button onClick={() => setShowPicker(p=>!p)} style={{
                    background:T.s2, border:`1px solid ${T.b2}`, borderRadius:7,
                    padding:"5px 12px", color:T.t1, fontSize:13, fontWeight:500,
                    cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif",
                    display:"flex", alignItems:"center", gap:8, transition:"border-color .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.b3}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>
                    <div style={{ width:7, height:7, borderRadius:"50%",
                      background:selClient?.published ? T.esg : T.amber,
                      animation:"pulse 2s ease infinite" }}/>
                    {selClient?.name || "Seleccionar cliente"}
                    <span style={{ color:T.t3, fontSize:11 }}>▾</span>
                  </button>
                  {showPicker && (
                    <>
                      {/* Backdrop */}
                      <div onClick={() => setShowPicker(false)}
                        style={{ position:"fixed", inset:0, zIndex:199 }}/>
                      {/* Dropdown */}
                      <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0,
                        background:T.s1, border:`1px solid ${T.b2}`, borderRadius:10,
                        padding:6, minWidth:220, zIndex:200,
                        boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                          color:T.t3, letterSpacing:2, textTransform:"uppercase",
                          padding:"6px 10px 4px" }}>Cliente activo</div>
                        {clients.map(c => (
                          <div key={c.id} onClick={() => { setSelClientId(c.id); setShowPicker(false); }}
                            style={{ padding:"9px 12px", borderRadius:7, cursor:"pointer",
                              background:c.id===selClientId ? `${T.rc}10` : "none",
                              color:c.id===selClientId ? T.rc : T.t2,
                              fontSize:13, fontWeight:500, transition:"background .1s",
                              display:"flex", alignItems:"center", gap:8 }}
                            onMouseEnter={e=>{ if(c.id!==selClientId) e.currentTarget.style.background=T.s2; }}
                            onMouseLeave={e=>{ if(c.id!==selClientId) e.currentTarget.style.background="none"; }}>
                            <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0,
                              background:c.published ? T.esg : T.amber }}/>
                            {c.name}
                          </div>
                        ))}
                        <div style={{ height:1, background:T.b1, margin:"6px 0" }}/>
                        <div onClick={() => { navigate("clients"); }}
                          style={{ padding:"8px 12px", borderRadius:7, cursor:"pointer",
                            fontSize:12, color:T.t3, transition:"color .1s" }}
                          onMouseEnter={e=>e.currentTarget.style.color=T.t1}
                          onMouseLeave={e=>e.currentTarget.style.color=T.t3}>
                          + Gestionar clientes
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              {isC && clients.length === 0 && (
                <button onClick={() => navigate("clients")} style={{
                  background:`${T.rc}10`, border:`1px solid ${T.rc}30`, borderRadius:7,
                  padding:"5px 12px", color:T.rc, fontSize:12, cursor:"pointer",
                  fontFamily:"'Instrument Sans',sans-serif" }}>
                  + Crear primer cliente
                </button>
              )}
            </div>
          </div>

          {/* Page content */}
          {renderPage()}
        </div>
      </div>
    </>
  );
}
