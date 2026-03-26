// ============================================================
// AdminPage.jsx
// Pantalla de Administración — THO Compass v4
//
// Integración Supabase:
// Reemplaza las funciones MOCK_* con las queries reales.
// Cada función tiene documentado el query correspondiente.
//
// Props esperadas cuando se conecte a Supabase:
//   supabase  — cliente de Supabase
//   currentUser — perfil del usuario logueado (de useAuthGuard)
// ============================================================

import { useState, useEffect } from "react";

// ── Design tokens (mismos que App v4) ─────────────────────────
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
  rc:"#e8631a",
  do:"#9b59d0",
  esg:"#2db87a",
  tho_orange:"#e8631a",
  tho_yellow:"#f0c020",
  tho_green:"#2db87a",
  tho_blue:"#3b8fd4",
  tho_purple:"#9b59d0",
  tho_pink:"#d44b8a",
  blue:"#3b8fd4",
  amber:"#f0c020",
  red:"#d44040",
  green:"#2db87a",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.adm-fade { animation: admFade .35s cubic-bezier(.4,0,.2,1) both; }
.adm-d1   { animation-delay:.05s; }
.adm-d2   { animation-delay:.1s; }
.adm-d3   { animation-delay:.15s; }
@keyframes admFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes admSpin { to{transform:rotate(360deg)} }
@keyframes admPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
`;

// ── Mock data — reemplazar con Supabase queries ────────────────




// ── Helpers ────────────────────────────────────────────────────
const initials = (name, email) =>
  name ? name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()
       : (email?.[0]?.toUpperCase() ?? "?");

const formatDate = iso =>
  new Date(iso).toLocaleDateString("es-CL", { day:"numeric", month:"short", year:"numeric" });

const formatDateTime = iso =>
  new Date(iso).toLocaleDateString("es-CL", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

// ── Atoms ──────────────────────────────────────────────────────
const Card = ({ children, style={}, cls="" }) => (
  <div className={cls} style={{ background:T.s1, border:`1px solid ${T.b1}`,
    borderRadius:14, padding:"22px 24px", ...style }}>
    {children}
  </div>
);

const Pill = ({ children, color }) => (
  <span style={{ background:`${color}18`, color, border:`1px solid ${color}30`,
    padding:"3px 9px", borderRadius:20, fontSize:11,
    fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap" }}>
    {children}
  </span>
);

const StatusPill = ({ status }) => {
  const map = {
    approved: { label:"Activo",      color:T.green  },
    pending:  { label:"Pendiente",   color:T.amber  },
    disabled: { label:"Desactivado", color:T.red    },
  };
  const s = map[status] || map.pending;
  return <Pill color={s.color}>● {s.label}</Pill>;
};

const RolePill = ({ role }) => {
  const map = {
    super_consultant: { label:"Super consultora", color:T.rc   },
    consultant:       { label:"Consultora",        color:T.blue },
    client:           { label:"Cliente",           color:T.t2   },
  };
  const r = map[role] || map.client;
  return <Pill color={r.color}>{r.label}</Pill>;
};

const Btn = ({ children, onClick, variant="ghost", size="md", disabled=false, style={} }) => {
  const base = {
    padding: size==="sm" ? "6px 13px" : "9px 18px",
    fontSize: size==="sm" ? 12 : 13,
    fontWeight:600, cursor:disabled?"not-allowed":"pointer",
    border:"none", borderRadius:8, transition:"all .15s",
    fontFamily:"'Instrument Sans',sans-serif",
    display:"inline-flex", alignItems:"center", gap:6,
    opacity:disabled?.5:1, ...style,
  };
  const variants = {
    primary: { background:T.blue,  color:"white" },
    success: { background:T.green, color:"#08090c" },
    danger:  { background:"none",  color:T.red,  border:`1px solid ${T.red}30` },
    ghost:   { background:"none",  color:T.t2,   border:`1px solid ${T.b2}` },
    rc:      { background:`${T.rc}18`, color:T.rc, border:`1px solid ${T.rc}30` },
  };
  return (
    <button style={{...base,...variants[variant]}} onClick={onClick} disabled={disabled}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.15)";}}
      onMouseLeave={e=>{e.currentTarget.style.filter="none";}}>
      {children}
    </button>
  );
};

const Avatar = ({ name, email, color=T.blue }) => (
  <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
    background:`${color}18`, color, border:`1px solid ${color}30`,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:12 }}>
    {initials(name, email)}
  </div>
);

const Input = ({ label, value, onChange, placeholder, type="text", style={} }) => (
  <div style={{ ...style }}>
    {label && <label style={{ display:"block", fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:7 }}>
      {label}
    </label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
        padding:"9px 13px", color:T.t1, fontSize:13, outline:"none",
        fontFamily:"'Instrument Sans',sans-serif", transition:"border-color .15s" }}
      onFocus={e=>e.target.style.borderColor=T.blue}
      onBlur={e=>e.target.style.borderColor=T.b2}/>
  </div>
);

const Select = ({ label, value, onChange, options, style={} }) => (
  <div style={{ ...style }}>
    {label && <label style={{ display:"block", fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:7 }}>
      {label}
    </label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
        padding:"9px 13px", color:T.t1, fontSize:13, outline:"none",
        fontFamily:"'Instrument Sans',sans-serif", cursor:"pointer" }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background:T.s2 }}>{o.label}</option>)}
    </select>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <label style={{ position:"relative", width:36, height:19, cursor:"pointer", flexShrink:0 }}>
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
      style={{ opacity:0, width:0, height:0 }}/>
    <span style={{
      position:"absolute", inset:0, borderRadius:10, transition:".2s",
      background:checked?T.blue:T.b2,
    }}>
      <span style={{ position:"absolute", width:13, height:13, top:3, borderRadius:"50%",
        background:checked?"white":T.t3, transition:".2s",
        left:checked?20:3 }}/>
    </span>
  </label>
);

const Divider = () => <div style={{ height:1, background:T.b1, margin:"22px 0" }}/>;

const SectionTitle = ({ children, count, action }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:T.t1 }}>{children}</div>
      {count !== undefined && (
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.t3,
          background:T.s2, padding:"2px 8px", borderRadius:20 }}>{count}</span>
      )}
    </div>
    {action}
  </div>
);

// ── Modal ──────────────────────────────────────────────────────
function Modal({ title, onClose, children, width=480 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.s1, border:`1px solid ${T.b2}`, borderRadius:16,
        padding:"28px 32px", width, maxWidth:"92vw", maxHeight:"85vh", overflowY:"auto",
        boxShadow:"0 32px 80px rgba(0,0,0,.7)",
        animation:"admFade .3s ease both" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.t1 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:T.t3, cursor:"pointer", fontSize:18, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Approve User Modal ──────────────────────────────────────────
function ApproveModal({ user, clients, onConfirm, onClose }) {
  const [selClient, setSelClient] = useState("");
  const [selRole,   setSelRole]   = useState("client");
  const [loading,   setLoading]   = useState(false);

  const roleOptions = [
    { value:"client",     label:"Cliente" },
    { value:"consultant", label:"Consultor/a" },
  ];
  const clientOptions = [
    { value:"", label:"— Seleccionar empresa —" },
    ...clients.map(c=>({ value:c.id, label:`${c.name} · ${c.industry}` })),
  ];

  async function handleConfirm() {
    if (selRole === "client" && !selClient) return;
    setLoading(true);
    await onConfirm(user.id, selRole, selClient);
    setLoading(false);
  }

  return (
    <Modal title="Aprobar acceso" onClose={onClose}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22,
        background:T.s2, border:`1px solid ${T.b1}`, borderRadius:10, padding:"12px 16px" }}>
        <Avatar name={user.full_name} email={user.email} color={T.amber}/>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>{user.full_name||"Sin nombre"}</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{user.email}</div>
          <div style={{ fontSize:10, color:T.t4, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
            Registrado {formatDateTime(user.created_at)} · vía {user.provider==="microsoft"?"Microsoft":"Google"}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Select label="Rol" value={selRole} onChange={setSelRole} options={roleOptions}/>
        {selRole==="client" && (
          <Select label="Asignar a empresa" value={selClient} onChange={setSelClient} options={clientOptions}/>
        )}
      </div>

      {selRole==="client" && !selClient && (
        <div style={{ padding:"10px 14px", background:`${T.amber}10`, border:`1px solid ${T.amber}25`,
          borderRadius:8, fontSize:12, color:"#fbbf24", marginBottom:16 }}>
          ⚠ Debes seleccionar una empresa antes de aprobar.
        </div>
      )}
      {selRole==="consultant" && (
        <div style={{ padding:"10px 14px", background:`${T.blue}10`, border:`1px solid ${T.blue}25`,
          borderRadius:8, fontSize:12, color:"#93c5fd", marginBottom:16 }}>
          ℹ Este usuario tendrá acceso de consultor/a. Podrá ver y editar los clientes que le asignes.
        </div>
      )}

      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="success" onClick={handleConfirm}
          disabled={(selRole==="client"&&!selClient)||loading}>
          {loading
            ? <><span style={{ width:12,height:12,border:`2px solid rgba(0,0,0,.3)`,borderTopColor:"#08090c",
                borderRadius:"50%",animation:"admSpin .8s linear infinite",display:"inline-block" }}/> Aprobando…</>
            : "✓ Confirmar aprobación"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Edit User Modal ─────────────────────────────────────────────
function EditUserModal({ user, clients, onSave, onClose }) {
  const [role,      setRole]      = useState(user.role);
  const [selClient, setSelClient] = useState(user.client_id||"");
  const [status,    setStatus]    = useState(user.approval_status);
  const [loading,   setLoading]   = useState(false);

  async function handleSave() {
    setLoading(true);
    await onSave({ ...user, role, approval_status:status, client_id:selClient });
    setLoading(false);
  }

  return (
    <Modal title={`Editar usuario`} onClose={onClose}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22,
        background:T.s2, border:`1px solid ${T.b1}`, borderRadius:10, padding:"12px 16px" }}>
        <Avatar name={user.full_name} email={user.email}/>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>{user.full_name}</div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{user.email}</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Select label="Rol" value={role} onChange={setRole} options={[
          { value:"client",           label:"Cliente"           },
          { value:"consultant",       label:"Consultor/a"       },
          { value:"super_consultant", label:"Super consultora"  },
        ]}/>
        <Select label="Estado" value={status} onChange={setStatus} options={[
          { value:"approved", label:"Activo"      },
          { value:"pending",  label:"Pendiente"   },
          { value:"disabled", label:"Desactivado" },
        ]}/>
        {role==="client" && (
          <Select label="Empresa asignada" value={selClient} onChange={setSelClient}
            style={{ gridColumn:"span 2" }}
            options={[
              { value:"", label:"— Sin empresa —" },
              ...clients.map(c=>({ value:c.id, label:c.name })),
            ]}/>
        )}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="primary" onClick={handleSave} disabled={loading}>
          {loading ? "Guardando…" : "Guardar cambios"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Create Client Modal ─────────────────────────────────────────
function CreateClientModal({ onSave, onClose }) {
  const [name,     setName]     = useState("");
  const [industry, setIndustry] = useState("");
  const [contact,  setContact]  = useState("");
  const [email,    setEmail]    = useState("");
  const [modules,  setModules]  = useState({ rc:true, do:true, esg:false });
  const [loading,  setLoading]  = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    await onSave({ name, industry, contact, email, modules });
    setLoading(false);
  }

  const MOD_LABELS = { rc:"Relacionamiento (RC)", do:"Desarrollo Org. (DO)", esg:"Sostenibilidad (ESG)" };
  const MOD_COLORS = { rc:T.rc, do:T.do, esg:T.esg };

  return (
    <Modal title="Crear nueva empresa cliente" onClose={onClose} width={520}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Input label="Nombre de la empresa" value={name} onChange={setName}
          placeholder="Ej. Minera Los Andes" style={{ gridColumn:"span 2" }}/>
        <Input label="Industria" value={industry} onChange={setIndustry} placeholder="Ej. Minería"/>
        <Input label="Contacto principal" value={contact} onChange={setContact} placeholder="Nombre completo"/>
        <Input label="Email de contacto" value={email} onChange={setEmail}
          type="email" placeholder="contacto@empresa.cl" style={{ gridColumn:"span 2" }}/>
      </div>

      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
        letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>Módulos activos</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
        {Object.entries(MOD_LABELS).map(([key, label])=>(
          <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 14px", background:T.s2, border:`1px solid ${modules[key]?`${MOD_COLORS[key]}30`:T.b1}`,
            borderRadius:9, transition:"border-color .15s" }}>
            <div style={{ fontSize:13, color:modules[key]?T.t1:T.t3, fontWeight:modules[key]?500:400 }}>
              {label}
            </div>
            <Toggle checked={modules[key]} onChange={v=>setModules(p=>({...p,[key]:v}))}/>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="primary" onClick={handleCreate} disabled={!name.trim()||loading}>
          {loading ? "Creando…" : "Crear empresa"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Edit Client Modal ───────────────────────────────────────────
function EditClientModal({ client, onSave, onClose }) {
  const [name,     setName]     = useState(client.name);
  const [industry, setIndustry] = useState(client.industry||"");
  const [contact,  setContact]  = useState(client.contact||"");
  const [email,    setEmail]    = useState(client.email||"");
  const [modules,  setModules]  = useState({ ...client.modules });
  const [loading,  setLoading]  = useState(false);

  async function handleSave() {
    setLoading(true);
    await onSave({ ...client, name, industry, contact, email, modules });
    setLoading(false);
  }

  const MOD_LABELS = { rc:"Relacionamiento (RC)", do:"Desarrollo Org. (DO)", esg:"Sostenibilidad (ESG)" };
  const MOD_COLORS = { rc:T.rc, do:T.do, esg:T.esg };

  return (
    <Modal title="Editar empresa cliente" onClose={onClose} width={520}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Input label="Nombre" value={name} onChange={setName} style={{ gridColumn:"span 2" }}/>
        <Input label="Industria" value={industry} onChange={setIndustry}/>
        <Input label="Contacto" value={contact} onChange={setContact}/>
        <Input label="Email" value={email} onChange={setEmail} type="email" style={{ gridColumn:"span 2" }}/>
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
        letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>Módulos activos</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
        {Object.entries(MOD_LABELS).map(([key,label])=>(
          <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 14px", background:T.s2,
            border:`1px solid ${modules[key]?`${MOD_COLORS[key]}30`:T.b1}`,
            borderRadius:9, transition:"border-color .15s" }}>
            <div style={{ fontSize:13, color:modules[key]?T.t1:T.t3 }}>{label}</div>
            <Toggle checked={modules[key]} onChange={v=>setModules(p=>({...p,[key]:v}))}/>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="primary" onClick={handleSave} disabled={loading}>
          {loading?"Guardando…":"Guardar cambios"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Confirm Dialog ──────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onClose, danger=true }) {
  return (
    <Modal title="Confirmar acción" onClose={onClose} width={380}>
      <div style={{ fontSize:14, color:T.t2, marginBottom:22, lineHeight:1.6 }}>{message}</div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant={danger?"danger":"primary"} onClick={onConfirm}>Confirmar</Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Table ───────────────────────────────────────────────────────
function Table({ headers, children }) {
  return (
    <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.b1}` }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:T.s2 }}>
            {headers.map((h,i)=>(
              <th key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                color:T.t3, letterSpacing:1.5, textTransform:"uppercase",
                textAlign:"left", padding:"10px 16px", fontWeight:400,
                borderBottom:`1px solid ${T.b1}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TR({ children, last=false }) {
  return (
    <tr style={{ transition:"background .1s" }}
      onMouseEnter={e=>e.currentTarget.style.background=T.s2}
      onMouseLeave={e=>e.currentTarget.style.background="none"}>
      {children}
    </tr>
  );
}

function TD({ children, mono=false }) {
  return (
    <td style={{ padding:"13px 16px", fontSize:13, color:T.t2,
      fontFamily:mono?"'JetBrains Mono',monospace":"inherit",
      borderBottom:`1px solid ${T.b1}` }}>
      {children}
    </td>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────
// ── Invite Consultant Modal ────────────────────────────────────
function InviteConsultantModal({ supabase, onClose, onInvited }) {
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [role,    setRole]    = useState("consultant");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null); // { ok, message }

  async function handleInvite() {
    if (!email.trim()) return;
    setLoading(true); setResult(null);
    try {
      // 1. Send invite via Supabase Auth (magic link)
      const { error: inviteErr } = await supabase.auth.admin
        ? await supabase.auth.admin.inviteUserByEmail(email.trim(), {
            data: { full_name: name.trim(), role, approval_status: "pending" }
          })
        : { error: { message: "admin API not available" } };

      // If admin API not available, fall back to creating a pending profile
      // and showing instructions to share the login link
      if (inviteErr) {
        // Fallback: create user_profile record manually so it shows in pendientes
        const { error: profileErr } = await supabase.from("user_profiles").insert({
          email:           email.trim(),
          full_name:       name.trim() || email.trim().split("@")[0],
          role,
          approval_status: "pending",
        });
        if (profileErr && !profileErr.message?.includes("duplicate")) {
          setResult({ ok:false, message:`Error: ${profileErr.message}` });
          return;
        }
        setResult({
          ok: true,
          message: `Perfil creado. Comparte el link de acceso con ${email} para que inicie sesión. Aparecerá en Pendientes para aprobación.`
        });
        return;
      }

      setResult({ ok:true, message:`Invitación enviada a ${email}. Recibirá un email con instrucciones.` });
    } catch(e) {
      setResult({ ok:false, message:`Error: ${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20 }}>
      <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:14,
        width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
        <div style={{ padding:"18px 22px",borderBottom:`1px solid ${T.b1}`,
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1 }}>
            Invitar consultor/a al equipo
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",
            color:T.t3,cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:"20px 22px",display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6 }}>
              Email *
            </label>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="nombre@empresa.cl" type="email"
              style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
                padding:"9px 12px",color:T.t1,fontSize:13,outline:"none",
                fontFamily:"'Instrument Sans',sans-serif",boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6 }}>
              Nombre completo
            </label>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="Ej. María González"
              style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
                padding:"9px 12px",color:T.t1,fontSize:13,outline:"none",
                fontFamily:"'Instrument Sans',sans-serif",boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6 }}>
              Rol
            </label>
            <select value={role} onChange={e=>setRole(e.target.value)}
              style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
                padding:"9px 12px",color:T.t1,fontSize:13,outline:"none",cursor:"pointer",
                fontFamily:"'Instrument Sans',sans-serif",boxSizing:"border-box" }}>
              <option value="consultant">Consultor/a — acceso a clientes asignados</option>
              <option value="super_consultant">Super consultora — acceso a todo</option>
            </select>
          </div>

          {result && (
            <div style={{ padding:"10px 14px",borderRadius:8,fontSize:13,
              background:result.ok?`${T.green}12`:`${T.red}12`,
              border:`1px solid ${result.ok?T.green:T.red}30`,
              color:result.ok?T.green:T.red,lineHeight:1.55 }}>
              {result.ok?"✓ ":""}{result.message}
            </div>
          )}

          <div style={{ fontSize:12,color:T.t3,padding:"8px 12px",
            background:T.s2,borderRadius:8,lineHeight:1.6 }}>
            ℹ La persona debe iniciar sesión en{" "}
            <span style={{ fontFamily:"'JetBrains Mono',monospace",color:T.blue }}>
              {window.location.origin}
            </span>{" "}
            y quedará en estado Pendiente hasta que la apruebes en Administración → Pendientes.
          </div>
        </div>
        <div style={{ padding:"14px 22px",borderTop:`1px solid ${T.b1}`,
          display:"flex",gap:10,justifyContent:"flex-end" }}>
          {result?.ok
            ? <Btn variant="primary" onClick={onInvited}>Listo</Btn>
            : <>
                <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleInvite}
                  disabled={!email.trim()||loading}>
                  {loading ? "Procesando…" : "Invitar"}
                </Btn>
              </>
          }
        </div>
      </div>
    </div>
  );
}

export default function AdminPage({ supabase, currentUser, onClientsChange }) {
  // State
  const [pending,     setPending]     = useState([]);
  const [users,       setUsers]       = useState([]);
  const [clients,     setClients]     = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("pending");
  const [search,      setSearch]      = useState("");
  const [filterRole,  setFilterRole]  = useState("all");
  const [filterStatus,setFilterStatus]= useState("all");

  // Modals
  const [approveModal, setApproveModal] = useState(null);
  const [editModal,    setEditModal]    = useState(null);
  const [editClient,   setEditClient]   = useState(null);
  const [createClient, setCreateClient] = useState(false);
  const [inviteModal,  setInviteModal]  = useState(false);
  const [confirmDlg,   setConfirmDlg]   = useState(null);

  // ── Load data from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    loadAll();
  }, [supabase]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadPending(), loadUsers(), loadClients(), loadConsultants()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPending() {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });
    if (!error) setPending(data || []);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(`
        *,
        client_user_access (
          access_status,
          client_id,
          clients ( id, name )
        )
      `)
      .eq("role", "client")
      .in("approval_status", ["approved", "disabled"])
      .order("created_at", { ascending: false });
    if (!error) {
      setUsers((data || []).map(u => ({
        ...u,
        client_id:   u.client_user_access?.[0]?.client_id   || null,
        client_name: u.client_user_access?.[0]?.clients?.name || null,
      })));
    }
  }

  async function loadClients() {
    const [clientsRes, modulesRes, accessRes] = await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("client_modules").select("client_id, rc, do, esg"),
      supabase.from("client_user_access").select("client_id, access_status"),
    ]);
    if (!clientsRes.error) {
      setClients((clientsRes.data || []).map(c => ({
        ...c,
        modules: {
          rc:         modulesRes.data?.find(m=>m.client_id===c.id)?.rc         ?? false,
          "do":       modulesRes.data?.find(m=>m.client_id===c.id)?.do ?? false,
          esg:        modulesRes.data?.find(m=>m.client_id===c.id)?.esg        ?? false,
        },
        user_count: (accessRes.data||[])
          .filter(a=>a.client_id===c.id && a.access_status==="approved").length,
      })));
    }
  }

  async function loadConsultants() {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .in("role", ["consultant", "super_consultant"])
      .order("created_at", { ascending: true });
    if (!error) setConsultants(data || []);
  }

  // ── Handlers ──────────────────────────────────────────────────
  async function handleApprove(userId, role, clientId) {
    // 1. Actualizar rol y estado en user_profiles
    await supabase.from("user_profiles")
      .update({ approval_status: "approved", role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    // 2. Si es cliente, crear acceso a la empresa
    if (role === "client" && clientId) {
      await supabase.from("client_user_access")
        .upsert({ client_id: clientId, user_id: userId, access_status: "approved" },
                 { onConflict: "client_id,user_id" });
    }

    setApproveModal(null);
    await loadPending();
    await loadUsers();
    await loadConsultants();
  }

  function handleReject(userId) {
    setConfirmDlg({
      message: "¿Rechazar este usuario? Su cuenta quedará desactivada y no podrá ingresar.",
      onConfirm: async () => {
        await supabase.from("user_profiles")
          .update({ approval_status: "disabled", updated_at: new Date().toISOString() })
          .eq("id", userId);
        setConfirmDlg(null);
        await loadPending();
      }
    });
  }

  async function handleSaveUser(updated) {
    // Actualizar rol y estado
    await supabase.from("user_profiles")
      .update({ role: updated.role, approval_status: updated.approval_status,
                updated_at: new Date().toISOString() })
      .eq("id", updated.id);

    // Si cambió la empresa asignada
    if (updated.role === "client" && updated.client_id) {
      await supabase.from("client_user_access")
        .upsert({ client_id: updated.client_id, user_id: updated.id, access_status: "approved" },
                 { onConflict: "client_id,user_id" });
    }

    setEditModal(null);
    await loadUsers();
    await loadConsultants();
  }

  function handleDisableUser(userId) {
    setConfirmDlg({
      message: "¿Desactivar este usuario? No podrá ingresar hasta que lo reactives.",
      onConfirm: async () => {
        await supabase.from("user_profiles")
          .update({ approval_status: "disabled", updated_at: new Date().toISOString() })
          .eq("id", userId);
        setConfirmDlg(null);
        await loadUsers();
        await loadConsultants();
      }
    });
  }

  async function handleReactivateUser(userId) {
    await supabase.from("user_profiles")
      .update({ approval_status: "approved", updated_at: new Date().toISOString() })
      .eq("id", userId);
    await loadUsers();
    await loadConsultants();
  }

  async function handleCreateClient(newClient) {
    // Insert client
    const { data: clientData, error: clientErr } = await supabase
      .from("clients")
      .insert({
        name:     newClient.name,
        industry: newClient.industry || null,
        contact:  newClient.contact  || null,
        email:    newClient.email    || null,
      })
      .select()
      .single();
    if (clientErr) { console.error(clientErr); return; }

    // Insert modules
    await supabase.from("client_modules").insert({
      client_id:  clientData.id,
      rc:         newClient.modules?.rc         ?? true,
      "do":       newClient.modules?.do ?? true,
      esg:        newClient.modules?.esg        ?? false,
      weight_rc:  40, weight_do: 35, weight_esg: 25,
    });

    setCreateClient(false);
    await loadClients();
    onClientsChange?.();
  }

  async function handleSaveClient(updated) {
    // Update client
    await supabase.from("clients")
      .update({
        name:     updated.name,
        industry: updated.industry || null,
        contact:  updated.contact  || null,
        email:    updated.email    || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id);

    // Update modules
    await supabase.from("client_modules")
      .update({
        rc:         updated.modules?.rc         ?? true,
        "do":       updated.modules?.do ?? true,
        esg:        updated.modules?.esg        ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", updated.id);

    setEditClient(null);
    await loadClients();
  }

  function handleDeleteClient(clientId) {
    setConfirmDlg({
      message: "¿Eliminar esta empresa? Se eliminarán todos sus datos y accesos asociados. Esta acción no se puede deshacer.",
      onConfirm: async () => {
        await supabase.from("clients").delete().eq("id", clientId);
        setConfirmDlg(null);
        await loadClients();
        onClientsChange?.();
      }
    });
  }

  // ── Filtered users ──
  const filteredUsers = users.filter(u=>{
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole==="all"   || u.role===filterRole;
    const matchStatus = filterStatus==="all" || u.approval_status===filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  // ── Tabs config ──
  const TABS = [
    { id:"pending",     label:"Pendientes",  badge:pending.length||null },
    { id:"users",       label:"Usuarios"     },
    { id:"clients",     label:"Empresas"     },
    { id:"consultants", label:"Mi equipo"    },
  ];

  // Early return while loading
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ padding:"32px 36px", maxWidth:1200 }}>
        <div className="adm-fade" style={{ marginBottom:28 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
            letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Centro de administración</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:T.t1,
            letterSpacing:-.5, marginBottom:6 }}>Administración</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:T.t3, fontSize:13,
          fontFamily:"'JetBrains Mono',monospace", padding:"48px 0" }}>
          <span style={{ width:14, height:14, border:`2px solid ${T.b2}`, borderTopColor:T.rc,
            borderRadius:"50%", animation:"admSpin .8s linear infinite", display:"inline-block" }}/>
          Cargando datos…
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{ padding:"32px 36px", maxWidth:1200 }}>

        {/* Page header */}
        <div className="adm-fade" style={{ marginBottom:28 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
            letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>
            Centro de administración
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:T.t1,
            letterSpacing:-.5, marginBottom:6 }}>Administración</div>
          <div style={{ fontSize:13, color:T.t2 }}>
            Gestión de usuarios, empresas, accesos y equipo consultor.
          </div>
        </div>

        {/* Stats strip */}
        <div className="adm-fade adm-d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          gap:14, marginBottom:24 }}>
          {[
            { label:"Pendientes de aprobación", val:pending.length, color:T.amber },
            { label:"Usuarios activos",          val:users.filter(u=>u.approval_status==="approved").length, color:T.green },
            { label:"Empresas cliente",          val:clients.length, color:T.blue },
            { label:"Consultores en equipo",     val:consultants.length, color:T.rc },
          ].map(s=>(
            <div key={s.label} style={{ background:T.s1, border:`1px solid ${T.b1}`, borderRadius:12, padding:"16px 18px" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, color:s.color, marginBottom:3 }}>
                {s.val}
              </div>
              <div style={{ fontSize:11, color:T.t3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:3, marginBottom:22, background:T.s2,
          borderRadius:10, padding:4, width:"fit-content" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"7px 16px", borderRadius:7, border:"none",
              background:tab===t.id?T.s1:"none", color:tab===t.id?T.t1:T.t3,
              fontSize:13, fontWeight:500, cursor:"pointer",
              fontFamily:"'Instrument Sans',sans-serif",
              boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,.3)":"none",
              transition:"all .15s", display:"flex", alignItems:"center", gap:7 }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{ background:T.red, color:"white", fontSize:10,
                  fontFamily:"'JetBrains Mono',monospace", padding:"1px 6px", borderRadius:10 }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: PENDIENTES ── */}
        {tab==="pending" && (
          <div className="adm-fade">
            {pending.length===0 ? (
              <Card>
                <div style={{ textAlign:"center", padding:"36px 0" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:6 }}>
                    Sin pendientes
                  </div>
                  <div style={{ fontSize:13, color:T.t3 }}>No hay usuarios esperando aprobación.</div>
                </div>
              </Card>
            ) : (
              <>
                <div style={{ padding:"12px 18px", background:`${T.amber}08`,
                  border:`1px solid ${T.amber}25`, borderRadius:10, marginBottom:18,
                  display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#fbbf24" }}>
                  <span>⚠️</span>
                  <span><strong>{pending.length} usuario{pending.length>1?"s":""}</strong> esperando aprobación. Asígnalos a una empresa y activa su acceso.</span>
                </div>
                {pending.map(u=>(
                  <Card key={u.id} style={{ marginBottom:12, borderLeft:`3px solid ${T.amber}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <Avatar name={u.full_name} email={u.email} color={T.amber}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>{u.full_name||"Sin nombre"}</div>
                        <div style={{ fontSize:12, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{u.email}</div>
                        <div style={{ fontSize:10, color:T.t4, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
                          {formatDateTime(u.created_at)} · vía {u.provider==="microsoft"?"Microsoft":"Google"}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:9 }}>
                        <Btn variant="success" size="sm" onClick={()=>setApproveModal(u)}>
                          ✓ Aprobar
                        </Btn>
                        <Btn variant="danger" size="sm" onClick={()=>handleReject(u.id)}>
                          Rechazar
                        </Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── TAB: USUARIOS ── */}
        {tab==="users" && (
          <div className="adm-fade">
            {/* Filters */}
            <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
              <Input value={search} onChange={setSearch} placeholder="Buscar por nombre o email…"
                style={{ flex:1, minWidth:200 }}/>
              <Select value={filterRole} onChange={setFilterRole} options={[
                { value:"all",           label:"Todos los roles"      },
                { value:"client",        label:"Clientes"             },
                { value:"consultant",    label:"Consultores"          },
                { value:"super_consultant", label:"Super consultores" },
              ]} style={{ width:190 }}/>
              <Select value={filterStatus} onChange={setFilterStatus} options={[
                { value:"all",      label:"Todos los estados" },
                { value:"approved", label:"Activos"           },
                { value:"pending",  label:"Pendientes"        },
                { value:"disabled", label:"Desactivados"      },
              ]} style={{ width:170 }}/>
            </div>

            <Table headers={["Usuario","Empresa","Rol","Estado","Registrado",""]}>
              {filteredUsers.map((u,i)=>(
                <TR key={u.id}>
                  <TD>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar name={u.full_name} email={u.email}
                        color={u.role==="super_consultant"?T.rc:u.role==="consultant"?T.blue:T.t2}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.full_name||"Sin nombre"}</div>
                        <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{u.email}</div>
                      </div>
                    </div>
                  </TD>
                  <TD>{u.client_name
                    ? <span style={{ color:T.t1 }}>{u.client_name}</span>
                    : <span style={{ color:T.t4 }}>—</span>}
                  </TD>
                  <TD><RolePill role={u.role}/></TD>
                  <TD><StatusPill status={u.approval_status}/></TD>
                  <TD mono>{formatDate(u.created_at)}</TD>
                  <TD>
                    <div style={{ display:"flex", gap:7 }}>
                      <Btn variant="ghost" size="sm" onClick={()=>setEditModal(u)}>Editar</Btn>
                      {u.approval_status==="approved"
                        ? <Btn variant="danger" size="sm" onClick={()=>handleDisableUser(u.id)}>Desactivar</Btn>
                        : u.approval_status==="disabled"
                          ? <Btn variant="ghost" size="sm" onClick={()=>handleReactivateUser(u.id)}>Reactivar</Btn>
                          : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
            {filteredUsers.length===0 && (
              <div style={{ textAlign:"center", padding:"32px 0", fontSize:13, color:T.t3 }}>
                No se encontraron usuarios con los filtros seleccionados.
              </div>
            )}
          </div>
        )}

        {/* ── TAB: EMPRESAS ── */}
        {tab==="clients" && (
          <div className="adm-fade">
            <SectionTitle count={clients.length}
              action={<Btn variant="primary" size="sm" onClick={()=>setCreateClient(true)}>
                + Nueva empresa
              </Btn>}>
              Empresas cliente
            </SectionTitle>

            {clients.map(c=>(
              <Card key={c.id} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
                  gap:16, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1 }}>{c.name}</div>
                      <StatusPill status={c.published?"approved":"pending"}/>
                    </div>
                    <div style={{ fontSize:12, color:T.t3, fontFamily:"'JetBrains Mono',monospace", marginBottom:10 }}>
                      {c.industry} · {c.user_count} usuario{c.user_count!==1?"s":"s"} · {c.email||"sin email"}
                    </div>
                    {/* Module tags */}
                    <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                      {[["rc","RC",T.rc],["do","DO",T.do],["esg","ESG",T.esg]].map(([key,lbl,color])=>(
                        <span key={key} style={{
                          padding:"2px 9px", borderRadius:20, fontSize:11,
                          fontFamily:"'JetBrains Mono',monospace",
                          border:`1px solid ${c.modules[key]?color+"40":T.b2}`,
                          color:c.modules[key]?color:T.t4,
                          opacity:c.modules[key]?1:.5,
                        }}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:9, alignItems:"center" }}>
                    <div style={{ textAlign:"right", marginRight:8 }}>
                      <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>
                        Usuarios con acceso
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, color:T.t1 }}>
                        {c.user_count}
                      </div>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={()=>setEditClient(c)}>Editar</Btn>
                    <Btn variant="danger" size="sm" onClick={()=>handleDeleteClient(c.id)}>Eliminar</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── TAB: EQUIPO ── */}
        {tab==="consultants" && (
          <div className="adm-fade">
            <SectionTitle count={consultants.length}
              action={<Btn variant="primary" size="sm" onClick={()=>setInviteModal(true)}>
                + Invitar consultor/a
              </Btn>}>
              Equipo consultor
            </SectionTitle>

            <div style={{ padding:"11px 16px", background:`${T.blue}08`,
              border:`1px solid ${T.blue}25`, borderRadius:9,
              fontSize:13, color:"#93c5fd", marginBottom:18 }}>
              ℹ <strong>Super consultora</strong> tiene acceso a todo. <strong>Consultor/a</strong> solo ve los clientes que le asignes.
            </div>

            <Table headers={["Consultor/a","Email","Rol","Estado","Desde",""]}>
              {consultants.map(u=>(
                <TR key={u.id}>
                  <TD>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar name={u.full_name} email={u.email}
                        color={u.role==="super_consultant"?T.rc:T.blue}/>
                      <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.full_name}</div>
                    </div>
                  </TD>
                  <TD mono>{u.email}</TD>
                  <TD><RolePill role={u.role}/></TD>
                  <TD><StatusPill status={u.approval_status}/></TD>
                  <TD mono>{formatDate(u.created_at)}</TD>
                  <TD>
                    <div style={{ display:"flex", gap:7 }}>
                      <Btn variant="ghost" size="sm" onClick={()=>setEditModal(u)}>Editar rol</Btn>
                      {u.email!=="jeremias@tho.cl" && (
                        <Btn variant="danger" size="sm" onClick={()=>handleDisableUser(u.id)}>Desactivar</Btn>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}
      {approveModal && (
        <ApproveModal user={approveModal} clients={clients}
          onConfirm={handleApprove} onClose={()=>setApproveModal(null)}/>
      )}
      {editModal && (
        <EditUserModal user={editModal} clients={clients}
          onSave={handleSaveUser} onClose={()=>setEditModal(null)}/>
      )}
      {createClient && (
        <CreateClientModal onSave={handleCreateClient} onClose={()=>setCreateClient(false)}/>
      )}
      {editClient && (
        <EditClientModal client={editClient} onSave={handleSaveClient} onClose={()=>setEditClient(null)}/>
      )}
      {confirmDlg && (
        <ConfirmDialog message={confirmDlg.message}
          onConfirm={confirmDlg.onConfirm} onClose={()=>setConfirmDlg(null)}/>
      )}
      {inviteModal && (
        <InviteConsultantModal
          supabase={supabase}
          onClose={()=>setInviteModal(false)}
          onInvited={()=>{ setInviteModal(false); loadAll(); }}/>
      )}
    </>
  );
}
