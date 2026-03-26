import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, getOAuthRedirectUrl } from "./lib/supabase";
import { useAuthGuard } from "./hooks/useAuthGuard";
import AdminPage       from "./components/AdminPage";
import ClientsPage     from "./components/ClientsPage";
import ClientDashboard from "./components/ClientDashboard";
import ModuleRC        from "./components/ModuleRC";
import ModuleDO        from "./components/ModuleDO";
import ModuleESG       from "./components/ModuleESG";
import PendingAccess   from "./components/PendingAccess";
import SurveyPage      from "./components/SurveyPage";
import FormPage        from "./components/FormPage";

// ── Design tokens — THO Brand ─────────────────────────────────
// Inspirado en tho-web.vercel.app: negro puro, serif editorial,
// acentos cálidos contenidos, mucho espacio.
const T = {
  bg:"#050505",   // negro puro como tho-web
  s1:"#0a0a0a",   // superficies
  s2:"#111111",
  s3:"#1a1a1a",
  b1:"#1f1f1f",   // bordes sutiles, monocromáticos
  b2:"#2a2a2a",
  b3:"#363636",
  t1:"#f0ece4",   // blanco cálido (como tho-web)
  t2:"#9a9080",   // texto secundario cálido
  t3:"#4a4540",   // texto terciario
  t4:"#282420",
  // Acentos módulos — más apagados, elegantes
  rc:"#c8813a",   // terracota/bronce en vez de naranja brillante
  do:"#8b6fa8",   // violeta apagado
  esg:"#4a8c6a",  // verde bosque
  // UI
  blue:"#5b7fa6",
  amber:"#b8860b",
  red:"#a84040",
  green:"#4a8c6a",
};

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{
  background:#050505;
  color:#f0ece4;
  font-family:'Instrument Sans',sans-serif;
  font-size:14px;
  line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
::-webkit-scrollbar{width:2px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.fu{animation:fadeUp .35s cubic-bezier(.4,0,.2,1) both;}
.d1{animation-delay:.06s;} .d2{animation-delay:.12s;} .d3{animation-delay:.18s;}

/* Responsive */
@media(max-width:768px){
  .sidebar-desktop{display:none!important;}
  .topbar-back{display:flex!important;}
  .main-full{margin-left:0!important;}
  .rc-content,.do-content,.esg-content,.cd-content{padding:16px!important;}
  .mod-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .mod-grid-2{grid-template-columns:1fr!important;}
  .mod-grid-3{grid-template-columns:1fr!important;}
}
@media(min-width:769px){
  .mobile-menu-btn{display:none!important;}
  .mobile-drawer{display:none!important;}
}
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

// ── Logo mark ─────────────────────────────────────────────────
function LogoMark({ size=28 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:6, flexShrink:0,
      background:`linear-gradient(135deg,${T.rc},${T.do})`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Megrim',cursive", fontWeight:400, fontSize:size*0.6,
      color:"white", letterSpacing:0,
    }}>T</div>
  );
}

// ── Nav item ──────────────────────────────────────────────────
function NavItem({ item, isActive, ac, open, onClick }) {
  return (
    <div onClick={onClick}
      title={!open ? item.label : undefined}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding: open ? "9px 12px" : "9px 0",
        justifyContent: open ? "flex-start" : "center",
        borderRadius:6, cursor:item.locked ? "default" : "pointer",
        background: isActive ? `${ac}12` : "transparent",
        borderLeft: isActive ? `2px solid ${ac}` : "2px solid transparent",
        marginLeft: isActive ? 0 : 0,
        opacity: item.locked ? .3 : 1,
        transition:"all .15s",
        userSelect:"none",
      }}
      onMouseEnter={e=>{ if(!isActive&&!item.locked) e.currentTarget.style.background=T.s2; }}
      onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background="transparent"; }}>
      <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
      {open && (
        <span style={{
          fontSize:13, color:isActive ? T.t1 : T.t2,
          fontWeight: isActive ? 500 : 400,
          fontFamily:"'Instrument Sans',sans-serif",
          letterSpacing:.1,
          whiteSpace:"nowrap", overflow:"hidden",
        }}>{item.label}</span>
      )}
      {open && item.locked && (
        <span style={{ marginLeft:"auto", fontSize:10, color:T.t3 }}>🔒</span>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ nav, page, onNav, open, onToggle, profile, isC, onSignOut, mobile=false, onClose }) {
  const sidebarContent = (
    <div style={{
      width: mobile ? "100%" : (open ? 220 : 52),
      flexShrink:0,
      background:T.s1,
      borderRight: mobile ? "none" : `1px solid ${T.b1}`,
      display:"flex", flexDirection:"column",
      height:"100%",
      transition: mobile ? "none" : "width .2s cubic-bezier(.4,0,.2,1)",
      overflow:"hidden",
    }}>
      {/* Logo */}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding: open||mobile ? "20px 16px 18px" : "20px 0 18px",
        justifyContent: open||mobile ? "flex-start" : "center",
        borderBottom:`1px solid ${T.b1}`,
        minHeight:64,
      }}>
        <LogoMark size={30}/>
        {(open||mobile) && (
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontFamily:"'Megrim',cursive",
              fontSize:18,
              color:T.t1,
              letterSpacing:2,
              lineHeight:1,
            }}>
              THO{" "}
              <span style={{
                background:`linear-gradient(90deg,${T.rc},${T.do})`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"
              }}>Compass</span>
            </div>
            <div style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:8, color:T.t3, letterSpacing:2,
              textTransform:"uppercase", marginTop:2
            }}>The Human Org</div>
          </div>
        )}
        {!mobile && (
          <button onClick={onToggle} style={{
            marginLeft:open?"auto":undefined,
            background:"none", border:`1px solid ${T.b2}`,
            borderRadius:5, color:T.t3, cursor:"pointer",
            padding:"3px 6px", fontSize:11, flexShrink:0,
            fontFamily:"'JetBrains Mono',monospace",
          }}>{open ? "←" : "→"}</button>
        )}
        {mobile && (
          <button onClick={onClose} style={{
            marginLeft:"auto", background:"none", border:"none",
            color:T.t2, cursor:"pointer", fontSize:20, padding:"4px",
          }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"12px 8px" }}>
        {nav.map((item, i) => {
          if (item.sep) return (open||mobile)
            ? <div key={i} style={{
                fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:T.t3,
                letterSpacing:2.5, textTransform:"uppercase",
                padding:"0 10px", margin:"16px 0 5px",
              }}>{item.label}</div>
            : <div key={i} style={{ height:1, background:T.b1, margin:"10px 4px" }}/>;

          const isActive = page === item.id;
          const ac = MOD_COLOR[item.activeCls || item.id] || T.blue;
          return (
            <NavItem key={item.id} item={item} isActive={isActive} ac={ac}
              open={open||mobile}
              onClick={() => { if(!item.locked) { onNav(item.id); if(mobile) onClose?.(); } }}/>
          );
        })}
      </div>

      {/* Profile */}
      {(open||mobile) && profile && (
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.b1}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{
              width:30, height:30, borderRadius:"50%", flexShrink:0,
              background:`${T.rc}20`, border:`1px solid ${T.rc}30`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Playfair Display',serif", fontSize:12, color:T.rc,
            }}>{profile.full_name?.[0]?.toUpperCase() || "?"}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, color:T.t1, fontWeight:500,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {profile.full_name}
              </div>
              <div style={{ fontSize:10, color:T.t3,
                fontFamily:"'JetBrains Mono',monospace",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {profile.role?.replace("_"," ")}
              </div>
            </div>
          </div>
          <button onClick={onSignOut} style={{
            width:"100%", padding:"7px", background:"none",
            border:`1px solid ${T.b2}`, borderRadius:6,
            color:T.t3, cursor:"pointer", fontSize:11,
            fontFamily:"'Instrument Sans',sans-serif",
            transition:"all .15s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.b3;e.currentTarget.style.color=T.t2;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
            Cerrar sesión
          </button>
        </div>
      )}
      {(!open&&!mobile) && (
        <div style={{ padding:"12px 0", borderTop:`1px solid ${T.b1}`, textAlign:"center" }}>
          <button onClick={onSignOut} title="Cerrar sesión" style={{
            background:"none", border:"none", color:T.t3,
            cursor:"pointer", fontSize:14, padding:"6px",
          }}>⏻</button>
        </div>
      )}
    </div>
  );

  if (mobile) return sidebarContent;
  return (
    <div className="sidebar-desktop" style={{
      position:"fixed", top:0, left:0, bottom:0,
      width:open?220:52, zIndex:200,
      transition:"width .2s cubic-bezier(.4,0,.2,1)",
    }}>
      {sidebarContent}
    </div>
  );
}

// ── Mobile Drawer ─────────────────────────────────────────────
function MobileDrawer({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="mobile-drawer" style={{
      position:"fixed", inset:0, zIndex:300,
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"absolute", inset:0, background:"rgba(0,0,0,.8)",
      }}/>
      {/* Drawer */}
      <div style={{
        position:"absolute", top:0, left:0, bottom:0, width:280,
        background:T.s1, borderRight:`1px solid ${T.b1}`,
        display:"flex", flexDirection:"column",
        animation:"fadeUp .2s both",
      }}>
        {children}
      </div>
    </div>
  );
}


// ── Loading Screen ────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20 }}>
      <LogoMark size={40}/>
      <div style={{ width:24, height:24, border:`1px solid ${T.b3}`,
        borderTopColor:T.rc, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────
function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [mode,     setMode]     = useState("login"); // login | signup | magic

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email,
          options: { emailRedirectTo: getOAuthRedirectUrl() } });
        if (error) throw error;
        setError("✓ Revisa tu email — te enviamos un link de acceso.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password,
          options: { emailRedirectTo: getOAuthRedirectUrl() } });
        if (error) throw error;
        setError("✓ Cuenta creada. Verifica tu email antes de ingresar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }

  if (!isSupabaseConfigured) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:400, textAlign:"center" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
          color:T.t1, marginBottom:12 }}>Supabase no configurado</div>
        <div style={{ fontSize:13, color:T.t3 }}>
          Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:380 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <LogoMark size={36}/>
            <div style={{ fontFamily:"'Megrim',cursive", fontSize:22,
              color:T.t1, letterSpacing:3 }}>
              THO{" "}
              <span style={{ background:`linear-gradient(90deg,${T.rc},${T.do})`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Compass
              </span>
            </div>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            color:T.t3, letterSpacing:3, textTransform:"uppercase" }}>
            The Human Org · Plataforma interna
          </div>
        </div>

        {/* Card */}
        <div style={{ background:T.s1, border:`1px solid ${T.b1}`,
          borderRadius:14, padding:"32px 28px",
          boxShadow:"0 32px 80px rgba(0,0,0,.6)" }}>

          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
            color:T.t1, marginBottom:4, textAlign:"center" }}>
            {mode==="signup" ? "Crear cuenta" : mode==="magic" ? "Acceso por email" : "Ingresar"}
          </div>
          <div style={{ fontSize:12, color:T.t3, textAlign:"center", marginBottom:28 }}>
            {mode==="magic" ? "Te enviaremos un link seguro" :
             mode==="signup" ? "Tu cuenta quedará pendiente de aprobación" :
             "Accede a tu cuenta THO Compass"}
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:10, color:T.t3, display:"block", marginBottom:5,
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:1.5,
                textTransform:"uppercase" }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                required placeholder="tu@email.cl"
                style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`,
                  borderRadius:8, padding:"10px 14px", color:T.t1, fontSize:14,
                  outline:"none", fontFamily:"'Instrument Sans',sans-serif",
                  boxSizing:"border-box", transition:"border-color .15s" }}
                onFocus={e=>e.target.style.borderColor=T.rc}
                onBlur={e=>e.target.style.borderColor=T.b2}/>
            </div>

            {mode !== "magic" && (
              <div>
                <label style={{ fontSize:10, color:T.t3, display:"block", marginBottom:5,
                  fontFamily:"'JetBrains Mono',monospace", letterSpacing:1.5,
                  textTransform:"uppercase" }}>Contraseña</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                  required placeholder="••••••••"
                  style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`,
                    borderRadius:8, padding:"10px 14px", color:T.t1, fontSize:14,
                    outline:"none", fontFamily:"'Instrument Sans',sans-serif",
                    boxSizing:"border-box", transition:"border-color .15s" }}
                  onFocus={e=>e.target.style.borderColor=T.rc}
                  onBlur={e=>e.target.style.borderColor=T.b2}/>
              </div>
            )}

            {error && (
              <div style={{ fontSize:12, lineHeight:1.6, padding:"10px 12px", borderRadius:7,
                background: error.startsWith("✓") ? `${T.esg}12` : `${T.red}12`,
                border: `1px solid ${error.startsWith("✓") ? T.esg+"30" : T.red+"30"}`,
                color: error.startsWith("✓") ? T.esg : "#f87171" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding:"11px", background:`linear-gradient(135deg,${T.rc},${T.do})`,
                border:"none", borderRadius:8, color:"white", fontSize:14, fontWeight:600,
                cursor:loading?"not-allowed":"pointer",
                fontFamily:"'Instrument Sans',sans-serif",
                opacity:loading?.7:1, marginTop:4, letterSpacing:.3 }}>
              {loading ? "Procesando…" :
               mode==="signup" ? "Crear cuenta" :
               mode==="magic"  ? "Enviar link" : "Ingresar"}
            </button>
          </form>

          <div style={{ marginTop:20, display:"flex", flexDirection:"column",
            gap:8, alignItems:"center" }}>
            {mode==="login" && (<>
              <button onClick={()=>{setMode("magic");setError(null);}} style={{
                background:"none", border:"none", color:T.t3, cursor:"pointer",
                fontSize:12, fontFamily:"'Instrument Sans',sans-serif" }}>
                Ingresar con link por email
              </button>
              <button onClick={()=>{setMode("signup");setError(null);}} style={{
                background:"none", border:"none", color:T.t3, cursor:"pointer",
                fontSize:12, fontFamily:"'Instrument Sans',sans-serif" }}>
                Crear cuenta nueva
              </button>
            </>)}
            {mode!=="login" && (
              <button onClick={()=>{setMode("login");setError(null);}} style={{
                background:"none", border:"none", color:T.t3, cursor:"pointer",
                fontSize:12, fontFamily:"'Instrument Sans',sans-serif" }}>
                ← Volver al inicio
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign:"center", marginTop:24,
          fontFamily:"'JetBrains Mono',monospace", fontSize:9,
          color:T.t4, letterSpacing:2, textTransform:"uppercase" }}>
          © {new Date().getFullYear()} The Human Org · Concepción
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Check for public routes FIRST — no auth needed
  const hash = window.location.hash;
  const surveyMatch = hash.match(/^#\/survey\/([a-zA-Z0-9-]+)$/);
  if (surveyMatch) return <SurveyPage token={surveyMatch[1]} />;
  const formMatch = hash.match(/^#\/form\/([a-zA-Z0-9-]+)$/);
  if (formMatch) return <FormPage token={formMatch[1]} />;

  const auth = useAuthGuard();
  const [page,         setPage]         = useState("dashboard");
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selClientId,  setSelClientId]  = useState(null);
  const [clients,      setClients]      = useState([]);
  const [showPicker,   setShowPicker]   = useState(false);

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
      .select("client_id, rc, do, esg")
      .in("client_id", ids);

    const mapped = clientData.map(c => {
      const m = moduleData?.find(m => m.client_id === c.id);
      return {
        ...c,
        modules: {
          rc:  m?.rc         ?? false,
          do:  m?.do ?? false,
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
          auth.supabase.from("client_modules").select("rc, do, esg").eq("client_id", data.client_id).maybeSingle(),
        ]);
        if (clientData) {
          setClients([{
            ...clientData,
            modules: {
              rc:  moduleData?.rc         ?? false,
              do:  moduleData?.do ?? false,
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
      // Módulos RC/DO/ESG abren ClientDashboard con el módulo pre-seleccionado
      const modPage = ["rc","do","esg"].includes(page) ? page : null;
      return <ClientDashboard
        client={{ id: clientViewId }}
        supabase={auth.supabase}
        initialModule={modPage}
        key={page} />;  // key=page fuerza re-mount al cambiar módulo
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

      {/* Mobile drawer */}
      <MobileDrawer open={mobileMenuOpen} onClose={()=>setMobileMenuOpen(false)}>
        <Sidebar nav={nav} page={page} onNav={navigate}
          open={true} onToggle={()=>{}} profile={auth.profile}
          isC={isC} onSignOut={auth.signOut}
          mobile={true} onClose={()=>setMobileMenuOpen(false)}/>
      </MobileDrawer>

      <div style={{ display:"flex", minHeight:"100vh" }}>

        {/* Desktop sidebar */}
        <Sidebar nav={nav} page={page} onNav={navigate}
          open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)}
          profile={auth.profile} isC={isC} onSignOut={auth.signOut}/>

        {/* Main content */}
        <div className="main-full" style={{
          marginLeft: sidebarOpen ? 220 : 52,
          flex:1, minHeight:"100vh",
          transition:"margin-left .2s cubic-bezier(.4,0,.2,1)",
        }}>

          {/* Topbar */}
          <div style={{
            height:52, background:T.s1,
            borderBottom:`1px solid ${T.b1}`,
            display:"flex", alignItems:"center",
            justifyContent:"space-between",
            padding:"0 24px",
            position:"sticky", top:0, zIndex:100,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {/* Mobile hamburger */}
              <button className="mobile-menu-btn" onClick={()=>setMobileMenuOpen(true)}
                style={{ background:"none", border:`1px solid ${T.b2}`, borderRadius:6,
                  color:T.t2, cursor:"pointer", padding:"5px 8px", fontSize:14,
                  display:"none" }}>☰</button>

              {/* Breadcrumb */}
              <div style={{ fontSize:12, color:T.t3, fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:.5 }}>
                <span style={{ color:T.t3 }}>THO Compass</span>
                <span style={{ color:T.b3, margin:"0 8px" }}>/</span>
                <span style={{ color:T.t1, fontWeight:500,
                  fontFamily:"'Instrument Sans',sans-serif", fontSize:13 }}>
                  {pageLabel}
                </span>
              </div>
            </div>

            {/* Client picker */}
            <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
              {isC && clients.length > 0 && (
                <>
                  <button onClick={() => setShowPicker(p=>!p)} style={{
                    background:"none",
                    border:`1px solid ${T.b2}`, borderRadius:6,
                    padding:"5px 14px", color:T.t1, fontSize:12,
                    cursor:"pointer",
                    fontFamily:"'Instrument Sans',sans-serif",
                    display:"flex", alignItems:"center", gap:8,
                    transition:"border-color .15s",
                    letterSpacing:.2,
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.b3}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>
                    <div style={{ width:6, height:6, borderRadius:"50%",
                      background:selClient?.published ? T.esg : T.amber,
                      flexShrink:0 }}/>
                    {selClient?.name || "Seleccionar cliente"}
                    <span style={{ color:T.t3, fontSize:10 }}>▾</span>
                  </button>
                  {showPicker && (
                    <>
                      <div onClick={() => setShowPicker(false)}
                        style={{ position:"fixed", inset:0, zIndex:199 }}/>
                      <div style={{
                        position:"absolute", top:"calc(100% + 6px)", right:0,
                        background:T.s1, border:`1px solid ${T.b2}`, borderRadius:10,
                        padding:6, minWidth:220, zIndex:200,
                        boxShadow:"0 16px 48px rgba(0,0,0,.6)",
                      }}>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8,
                          color:T.t3, letterSpacing:2.5, textTransform:"uppercase",
                          padding:"6px 10px 4px" }}>Cliente activo</div>
                        {clients.map(c => (
                          <div key={c.id}
                            onClick={() => { setSelClientId(c.id); setShowPicker(false); }}
                            style={{
                              padding:"9px 12px", borderRadius:6, cursor:"pointer",
                              background:c.id===selClientId ? `${T.rc}10` : "none",
                              color:c.id===selClientId ? T.rc : T.t2,
                              fontSize:13, fontWeight:500,
                              display:"flex", alignItems:"center", gap:8,
                              transition:"background .1s",
                            }}
                            onMouseEnter={e=>{ if(c.id!==selClientId) e.currentTarget.style.background=T.s2; }}
                            onMouseLeave={e=>{ if(c.id!==selClientId) e.currentTarget.style.background="none"; }}>
                            <div style={{ width:6, height:6, borderRadius:"50%",
                              flexShrink:0, background:c.published ? T.esg : T.amber }}/>
                            {c.name}
                          </div>
                        ))}
                        <div style={{ height:1, background:T.b1, margin:"6px 0" }}/>
                        <div onClick={() => { navigate("clients"); }}
                          style={{ padding:"8px 12px", borderRadius:6, cursor:"pointer",
                            fontSize:11, color:T.t3, transition:"color .1s",
                            fontFamily:"'JetBrains Mono',monospace" }}
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
                  background:"none", border:`1px solid ${T.rc}40`, borderRadius:6,
                  padding:"5px 14px", color:T.rc, fontSize:12, cursor:"pointer",
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
