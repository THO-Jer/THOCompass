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
  bg:"#050505",
  s1:"#0a0a0a",
  s2:"#111111",
  s3:"#181818",
  b1:"#222222",
  b2:"#2e2e2e",
  b3:"#3a3a3a",
  t1:"#f0ece4",
  t2:"#9a9080",
  t3:"#4a4540",
  t4:"#282420",
  // THO brand colors — vibrant, used as accents on dark bg
  rc:"#e8631a",   // naranja THO
  do:"#9b59d0",   // violeta THO
  esg:"#2db87a",  // verde THO
  // Spectrum completo de la paleta THO
  tho_orange:"#e8631a",
  tho_yellow:"#f0c020",
  tho_green:"#2db87a",
  tho_blue:"#3b8fd4",
  tho_purple:"#9b59d0",
  tho_pink:"#d44b8a",
  // UI
  blue:"#3b8fd4",
  amber:"#f0c020",
  red:"#d44040",
  green:"#2db87a",
};

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{
  background:
    radial-gradient(1200px 420px at 20% -10%, rgba(155,89,208,.09), transparent 50%),
    radial-gradient(900px 300px at 90% -20%, rgba(232,99,26,.08), transparent 55%),
    #050505;
  color:#f0ece4;
  font-family:'Inter','Instrument Sans',sans-serif;
  font-size:14px;
  line-height:1.7;
  letter-spacing:.01em;
  -webkit-font-smoothing:antialiased;
}
button,input,select,textarea{
  font-family:'Inter','Instrument Sans',sans-serif;
}
button,input,select,textarea{transition:all .18s cubic-bezier(.4,0,.2,1);}
input,select,textarea{
  background:#111111;
  border:1px solid #2e2e2e;
  border-radius:10px;
  color:#f0ece4;
}
input:focus,select:focus,textarea:focus{
  outline:none;
  border-color:#4d4258;
  box-shadow:0 0 0 3px rgba(155,89,208,.17);
}
::-webkit-scrollbar{width:2px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.fu{animation:fadeUp .35s cubic-bezier(.4,0,.2,1) both;}
.d1{animation-delay:.06s;} .d2{animation-delay:.12s;} .d3{animation-delay:.18s;}

/* ── Responsive ── */
@media(max-width:768px){
  /* Layout */
  .sidebar-desktop{display:none!important;}
  .main-full{margin-left:0!important;}

  /* Mobile menu button — show it */
  .mobile-menu-btn{display:flex!important;}

  /* Module content padding */
  [class*="-fade"]{padding:0!important;}

  /* Module wrappers — reduce padding */
  .rc-module,.do-module,.esg-module{padding:16px!important;}

  /* Tabs — horizontal scroll */
  .mod-tabs{
    overflow-x:auto!important;
    -webkit-overflow-scrolling:touch!important;
    flex-wrap:nowrap!important;
    scrollbar-width:none!important;
  }
  .mod-tabs::-webkit-scrollbar{display:none!important;}

  /* Grids → single column */
  .mod-grid-2,.mod-grid-3,.mod-grid-auto{
    grid-template-columns:1fr!important;
  }

  /* Hero padding */
  .hero-section{padding:20px 16px 16px!important;}

  /* General content padding */
  .page-content{padding:16px!important;}

  /* Cards */
  .tho-card{padding:14px!important;}

  /* Tables — horizontal scroll */
  .tho-table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;}

  /* Form inputs — full width */
  input,select,textarea{width:100%!important;font-size:16px!important;}

  /* Topbar */
  .topbar-breadcrumb span:first-child{display:none!important;}
  .topbar-breadcrumb span.sep{display:none!important;}
}

@media(min-width:769px){
  .mobile-menu-btn{display:none!important;}
  .mobile-drawer{display:none!important;}
}

/* Tablet */
@media(min-width:769px) and (max-width:1024px){
  .main-full{margin-left:52px!important;}
  .mod-grid-3{grid-template-columns:1fr 1fr!important;}
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

// ── THO Design constants ──────────────────────────────────────
const THO_SPECTRUM = `linear-gradient(90deg,#e8631a,#c44a7a,#9b59d0)`;
const THO_SPECTRUM_SUBTLE = `linear-gradient(90deg, #e8631a30, #c44a7a30, #9b59d030)`;

// Compass SVG — evocación sutil de brújula
function CompassMark({ size=20, opacity=0.15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ opacity, flexShrink:0 }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      {/* N needle — orange */}
      <polygon points="12,3 10.5,12 13.5,12" fill="#e8631a" opacity="0.9"/>
      {/* S needle — blue */}
      <polygon points="12,21 13.5,12 10.5,12" fill="#3b8fd4" opacity="0.7"/>
      {/* Tick marks */}
      <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="0.8"/>
      <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  );
}

// ── Logo mark ─────────────────────────────────────────────────
function LogoMark({ size=28 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:6, flexShrink:0,
      background:"linear-gradient(155deg,#121212,#0d0d0d)",
      border:`1px solid #343434`,
      boxShadow:"inset 0 1px 0 rgba(255,255,255,.07), 0 8px 20px rgba(0,0,0,.32)",
      display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative",
    }}>
      <CompassMark size={size*0.78} opacity={0.9}/>
    </div>
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
        borderRadius:10, cursor:item.locked ? "default" : "pointer",
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
      background:"linear-gradient(180deg,#0d0d0d 0%, #0a0a0a 100%)",
      borderRight: mobile ? "none" : `1px solid ${T.b1}`,
      boxShadow: mobile ? "none" : "20px 0 38px rgba(0,0,0,.35)",
      display:"flex", flexDirection:"column",
      height:"100%",
      transition: mobile ? "none" : "width .2s cubic-bezier(.4,0,.2,1)",
      overflow:"hidden",
      position:"relative",
    }}>
      {/* THO spectrum stripe at top */}
      <div style={{ height:2, background:THO_SPECTRUM, flexShrink:0 }}/>

      {/* Compass watermark */}
      <div style={{ position:"absolute", bottom:60, right:-10, opacity:.04,
        pointerEvents:"none", color:T.t1 }}>
        <CompassMark size={120} opacity={1}/>
      </div>
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
              fontSize:20,
              letterSpacing:2,
              lineHeight:1,
              background:"linear-gradient(90deg,#e8631a,#c44a7a,#9b59d0)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Compass</div>
            <div style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:8, color:T.t3, letterSpacing:2,
              textTransform:"uppercase", marginTop:3
            }}>The Human Org</div>
          </div>
        )}
        {!mobile && (
          <button onClick={onToggle} style={{
            marginLeft:open?"auto":undefined,
            background:"#101010", border:`1px solid ${T.b2}`,
            borderRadius:8, color:T.t2, cursor:"pointer",
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

  async function handleOAuth(provider) {
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthRedirectUrl(),
          scopes: provider === "azure" ? "email profile" : undefined,
        },
      });
      if (error) throw error;
    } catch(e) { setError(e.message); setLoading(false); }
  }

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
            <div style={{
              fontFamily:"'Megrim',cursive", fontSize:24,
              letterSpacing:3,
              background:"linear-gradient(90deg,#e8631a,#c44a7a,#9b59d0)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Compass</div>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            color:T.t3, letterSpacing:3, textTransform:"uppercase" }}>
            The Human Org · Plataforma interna
          </div>
        </div>

        {/* Card */}
        <div style={{ background:T.s1, border:`1px solid ${T.b1}`,
          borderRadius:14, overflow:"hidden",
          boxShadow:"0 34px 90px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.04)" }}>
          {/* Spectrum stripe */}
          <div style={{ height:3, background:THO_SPECTRUM }}/>
          <div style={{ padding:"32px 28px", position:"relative" }}>
          {/* Compass watermark */}
          <div style={{ position:"absolute", top:16, right:16, opacity:.06,
            color:T.t1, pointerEvents:"none" }}>
            <CompassMark size={64} opacity={1}/>
          </div>

          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20,
            color:T.t1, marginBottom:4, textAlign:"center" }}>
            {mode==="signup" ? "Crear cuenta" : mode==="magic" ? "Acceso por email" : "Ingresar"}
          </div>
          <div style={{ fontSize:12, color:T.t3, textAlign:"center", marginBottom:28 }}>
            {mode==="magic" ? "Te enviaremos un link seguro" :
             mode==="signup" ? "Tu cuenta quedará pendiente de aprobación" :
             "Accede a tu cuenta THO Compass"}
          </div>

          {/* OAuth providers */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            <button type="button" onClick={()=>handleOAuth("azure")} disabled={loading}
              style={{ width:"100%", padding:"10px 14px",
                background:"none", border:`1px solid ${T.b2}`,
                borderRadius:8, color:T.t1, fontSize:13, cursor:"pointer",
                fontFamily:"'Instrument Sans',sans-serif",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                transition:"border-color .15s", letterSpacing:.2 }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.b3}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>
              <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Ingresar con Microsoft
            </button>
            <button type="button" onClick={()=>handleOAuth("google")} disabled={loading}
              style={{ width:"100%", padding:"10px 14px",
                background:"none", border:`1px solid ${T.b2}`,
                borderRadius:8, color:T.t1, fontSize:13, cursor:"pointer",
                fontFamily:"'Instrument Sans',sans-serif",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                transition:"border-color .15s", letterSpacing:.2 }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.b3}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Ingresar con Google
            </button>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:T.b1 }}/>
            <span style={{ fontSize:11, color:T.t3,
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:1 }}>o</span>
            <div style={{ flex:1, height:1, background:T.b1 }}/>
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
  const [sidebarOpen,  setSidebarOpen]  = useState(window.innerWidth > 1024);
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
  function scrollViewportTop() {
    window.scrollTo({ top:0, left:0, behavior:"auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function navigate(id) {
    setPage(id);
    scrollViewportTop();
    setShowPicker(false);
  }

  // Force top position whenever dashboard/modules are opened
  useEffect(() => {
    scrollViewportTop();
  }, [page, selClientId]);

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
          maxWidth:"100%",
          overflowX:"hidden",
        }}>

          {/* Topbar */}
          <div style={{
            background:"rgba(10,10,10,.9)",
            backdropFilter:"blur(10px)",
            borderBottom:`1px solid ${T.b1}`,
            position:"sticky", top:0, zIndex:100,
          }}>
            {/* Spectrum stripe */}
            <div style={{ height:2, background:THO_SPECTRUM }}/>
            <div style={{
              height:50,
              display:"flex", alignItems:"center",
              justifyContent:"space-between",
              padding:"0 24px",
            }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {/* Mobile hamburger */}
              <button className="mobile-menu-btn" onClick={()=>setMobileMenuOpen(true)}
                style={{ background:"none", border:`1px solid ${T.b2}`, borderRadius:6,
                  color:T.t2, cursor:"pointer", padding:"5px 10px", fontSize:16,
                  alignItems:"center", justifyContent:"center" }}>☰</button>

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
                    border:`1px solid ${T.b2}`, borderRadius:10,
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
                        background:"#0c0c0c", border:`1px solid ${T.b2}`, borderRadius:12,
                        padding:6, minWidth:220, zIndex:200,
                        boxShadow:"0 26px 70px rgba(0,0,0,.56)",
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
          </div>

          {/* Page content */}
          {renderPage()}
        </div>
      </div>
    </>
  );
}
