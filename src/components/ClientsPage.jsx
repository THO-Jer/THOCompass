// ============================================================
// ClientsPage.jsx
// Gestión de Clientes — THO Compass v4
//
// Estructura de la pantalla:
//   Vista lista  → todos los clientes con resumen
//   Vista detalle → un cliente: datos, módulos, proyectos, usuarios
//
// Supabase queries documentadas en cada función mock.
// El dev reemplaza MOCK_* y setTimeout por queries reales.
// ============================================================

import { useState, useEffect } from "react";

// ── Design tokens ──────────────────────────────────────────────
const T = {
  bg:"#050505", s1:"#0a0a0a", s2:"#111111", s3:"#1a1a1a",
  b1:"#1f1f1f", b2:"#2a2a2a", b3:"#363636",
  t1:"#f0ece4", t2:"#9a9080", t3:"#4a4540", t4:"#282420",
  rc:"#c8813a", do:"#8b6fa8", esg:"#4a8c6a",
  blue:"#5b7fa6", amber:"#b8860b", red:"#a84040", green:"#4a8c6a",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.cp-fade  { animation: cpFade .35s cubic-bezier(.4,0,.2,1) both; }
.cp-d1 { animation-delay:.06s; } .cp-d2 { animation-delay:.12s; }
.cp-d3 { animation-delay:.18s; } .cp-d4 { animation-delay:.24s; }
@keyframes cpFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes cpSpin { to{transform:rotate(360deg)} }
`;

// ── Module meta ────────────────────────────────────────────────
const MOD = {
  rc:  { key:"rc",  label:"Relacionamiento Comunitario", short:"RC",  icon:"🤝", color:T.rc,
         types:[{ value:"territorial", label:"Territorial" },{ value:"programmatic", label:"Programático" }] },
  do:  { key:"do",  label:"Desarrollo Organizacional",   short:"DO",  icon:"🏛",  color:T.do,
         types:[{ value:"organizational", label:"Organizacional" },{ value:"programmatic", label:"Programático" }] },
  esg: { key:"esg", label:"Sostenibilidad Corporativa",  short:"ESG", icon:"🌿", color:T.esg,
         types:[{ value:"programmatic", label:"Programático" },{ value:"territorial", label:"Territorial" }] },
};

const STATUS_META = {
  draft:  { label:"Borrador", color:T.t3   },
  active: { label:"Activo",   color:T.green },
  paused: { label:"Pausado",  color:T.amber },
  closed: { label:"Cerrado",  color:T.t4   },
};

// ── Mock data ──────────────────────────────────────────────────
// Query: SELECT c.*, cm.*, COUNT(cua) as user_count,
//        array_agg(p.*) as projects
//        FROM clients c
//        LEFT JOIN client_modules cm ON cm.client_id = c.id
// Datos cargados desde Supabase en el export default (ver loadClients)

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

const Btn = ({ children, onClick, variant="ghost", size="md", disabled=false, style={} }) => {
  const base = {
    padding:size==="sm"?"6px 13px":"9px 18px", fontSize:size==="sm"?12:13,
    fontWeight:600, cursor:disabled?"not-allowed":"pointer", border:"none",
    borderRadius:8, transition:"all .15s", fontFamily:"'Instrument Sans',sans-serif",
    display:"inline-flex", alignItems:"center", gap:6, opacity:disabled?.5:1, ...style,
  };
  const variants = {
    primary: { background:T.blue,  color:"white" },
    ghost:   { background:"none",  color:T.t2,  border:`1px solid ${T.b2}` },
    danger:  { background:"none",  color:T.red, border:`1px solid ${T.red}30` },
    success: { background:T.green, color:"#08090c" },
  };
  return (
    <button style={{...base,...variants[variant]}} onClick={onClick} disabled={disabled}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.15)";}}
      onMouseLeave={e=>{e.currentTarget.style.filter="none";}}>
      {children}
    </button>
  );
};

const Toggle = ({ checked, onChange, color=T.blue }) => (
  <label style={{ position:"relative", width:36, height:19, cursor:"pointer", flexShrink:0 }}>
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
      style={{ opacity:0, width:0, height:0 }}/>
    <span style={{ position:"absolute", inset:0, borderRadius:10, transition:".2s",
      background:checked?color:T.b2 }}>
      <span style={{ position:"absolute", width:13, height:13, top:3, borderRadius:"50%",
        background:checked?"white":T.t3, transition:".2s", left:checked?20:3 }}/>
    </span>
  </label>
);

const Input = ({ label, value, onChange, placeholder, type="text", style={} }) => (
  <div style={style}>
    {label && <label style={{ display:"block", fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:7 }}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
        padding:"9px 13px", color:T.t1, fontSize:13, outline:"none",
        fontFamily:"'Instrument Sans',sans-serif", transition:"border-color .15s" }}
      onFocus={e=>e.target.style.borderColor=T.blue}
      onBlur={e=>e.target.style.borderColor=T.b2}/>
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows=3 }) => (
  <div>
    {label && <label style={{ display:"block", fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:7 }}>{label}</label>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
        padding:"9px 13px", color:T.t1, fontSize:13, outline:"none", resize:"vertical",
        fontFamily:"'Instrument Sans',sans-serif", lineHeight:1.6, transition:"border-color .15s" }}
      onFocus={e=>e.target.style.borderColor=T.blue}
      onBlur={e=>e.target.style.borderColor=T.b2}/>
  </div>
);

const Select = ({ label, value, onChange, options, style={} }) => (
  <div style={style}>
    {label && <label style={{ display:"block", fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:7 }}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
        padding:"9px 13px", color:T.t1, fontSize:13, outline:"none",
        fontFamily:"'Instrument Sans',sans-serif", cursor:"pointer" }}>
      {options.map(o=><option key={o.value} value={o.value} style={{ background:T.s2 }}>{o.label}</option>)}
    </select>
  </div>
);

const Divider = () => <div style={{ height:1, background:T.b1, margin:"22px 0" }}/>;

const Spinner = () => (
  <span style={{ width:13, height:13, border:`2px solid rgba(255,255,255,.25)`,
    borderTopColor:"white", borderRadius:"50%",
    animation:"cpSpin .8s linear infinite", display:"inline-block" }}/>
);

// ── Modal ──────────────────────────────────────────────────────
function Modal({ title, onClose, children, width=500 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.s1, border:`1px solid ${T.b2}`, borderRadius:16,
        padding:"28px 32px", width, maxWidth:"94vw", maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 32px 80px rgba(0,0,0,.8)", animation:"cpFade .28s ease both" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.t1 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:T.t3, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Project Form Modal ─────────────────────────────────────────
function ProjectModal({ project, clientId, moduleKey, supabase, onSave, onClose }) {
  const isEdit = !!project;
  const mod = MOD[moduleKey];

  const [name,      setName]      = useState(project?.name||"");
  const [type,      setType]      = useState(project?.project_type||mod.types[0].value);
  const [status,    setStatus]    = useState(project?.status||"draft");
  const [desc,      setDesc]      = useState(project?.description||"");
  const [startsOn,  setStartsOn]  = useState(project?.starts_on||"");
  const [endsOn,    setEndsOn]    = useState(project?.ends_on||"");
  const [loading,   setLoading]   = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (isEdit) {
        const { data, error } = await supabase
          .from("projects")
          .update({ name, project_type:type, status, description:desc,
                    starts_on:startsOn||null, ends_on:endsOn||null,
                    updated_at:new Date().toISOString() })
          .eq("id", project.id)
          .select().single();
        if (error) throw error;
        onSave(data);
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert({ client_id:clientId, name, module_key:moduleKey,
                    project_type:type, status, description:desc,
                    starts_on:startsOn||null, ends_on:endsOn||null })
          .select().single();
        if (error) throw error;
        onSave(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit?"Editar proyecto":"Nuevo proyecto"} onClose={onClose}>
      {/* Module badge */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20,
        padding:"10px 14px", background:`${mod.color}10`,
        border:`1px solid ${mod.color}30`, borderRadius:9 }}>
        <span style={{ fontSize:17 }}>{mod.icon}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:mod.color }}>
          {mod.label}
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <Input label="Nombre del proyecto" value={name} onChange={setName}
          placeholder="Ej. Proyecto Coronel" style={{ gridColumn:"span 2" }}/>
        <Select label="Tipo" value={type} onChange={setType}
          options={mod.types}/>
        <Select label="Estado" value={status} onChange={setStatus} options={[
          { value:"draft",  label:"Borrador" },
          { value:"active", label:"Activo"   },
          { value:"paused", label:"Pausado"  },
          { value:"closed", label:"Cerrado"  },
        ]}/>
        <Input label="Fecha de inicio" value={startsOn} onChange={setStartsOn} type="date"/>
        <Input label="Fecha de cierre (opcional)" value={endsOn} onChange={setEndsOn} type="date"/>
      </div>
      <div style={{ marginBottom:22 }}>
        <Textarea label="Descripción" value={desc} onChange={setDesc}
          placeholder="Describe el alcance y objetivo del proyecto…"/>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="primary" onClick={handleSave} disabled={!name.trim()||loading}>
          {loading ? <><Spinner/> Guardando…</> : isEdit?"Guardar cambios":"Crear proyecto"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onClose }) {
  return (
    <Modal title="Confirmar" onClose={onClose} width={380}>
      <div style={{ fontSize:14, color:T.t2, marginBottom:22, lineHeight:1.65 }}>{message}</div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="danger" onClick={onConfirm}>Confirmar</Btn>
        <Btn variant="ghost"  onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Weights Editor ─────────────────────────────────────────────
function WeightsEditor({ weights, modules, onChange }) {
  const active = Object.entries(MOD).filter(([k])=>modules[k]);
  const total  = active.reduce((s,[k])=>s+weights[k],0);
  const isValid = total === 100 || active.length <= 1;

  return (
    <div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
        letterSpacing:1.5, textTransform:"uppercase", marginBottom:14 }}>
        Pesos IRCS por módulo
      </div>
      {active.length === 0 && (
        <div style={{ fontSize:13, color:T.t3, padding:"12px 0" }}>
          Activa al menos un módulo para configurar pesos.
        </div>
      )}
      {active.map(([k,m])=>(
        <div key={k} style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
            <span style={{ fontSize:13, color:T.t2 }}>{m.icon} {m.label}</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:m.color }}>
              {weights[k]}%
            </span>
          </div>
          <input type="range" min={5} max={100} value={weights[k]}
            onChange={e=>onChange({ ...weights, [k]:parseInt(e.target.value) })}
            style={{ width:"100%", accentColor:m.color, cursor:"pointer" }}/>
        </div>
      ))}
      {active.length > 0 && (
        <div style={{ padding:"10px 14px",
          background: isValid ? `${T.green}10` : `${T.amber}10`,
          border: `1px solid ${isValid ? T.green : T.amber}30`,
          borderRadius:8, marginTop:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12,
            color: isValid ? T.green : T.amber }}>
            Total: {total}%
            {active.length === 1 && " · Módulo único, peso automático"}
            {active.length > 1 && total !== 100 && " · Deben sumar 100%"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────
function ProjectCard({ project, onEdit, onArchive }) {
  const mod = MOD[project.module_key];
  const st  = STATUS_META[project.status] || STATUS_META.draft;
  const now = new Date();
  const end = project.ends_on ? new Date(project.ends_on) : null;
  const daysLeft = end ? Math.ceil((end-now)/(1000*60*60*24)) : null;

  return (
    <div style={{ background:T.s2, border:`1px solid ${T.b1}`, borderRadius:12,
      padding:"16px 18px", transition:"border-color .15s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=mod.color+"40"}
      onMouseLeave={e=>e.currentTarget.style.borderColor=T.b1}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:T.t1 }}>
              {project.name}
            </div>
            <Pill color={st.color}>● {st.label}</Pill>
          </div>
          {project.description && (
            <div style={{ fontSize:12, color:T.t3, marginBottom:8, lineHeight:1.55 }}>
              {project.description}
            </div>
          )}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {project.starts_on && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t4 }}>
                Inicio: {new Date(project.starts_on).toLocaleDateString("es-CL",{ day:"numeric",month:"short",year:"numeric" })}
              </span>
            )}
            {end && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                color:daysLeft!==null&&daysLeft<30?T.amber:T.t4 }}>
                {daysLeft!==null&&daysLeft>0?`${daysLeft} días restantes`:"Finalizado"}
              </span>
            )}
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t4 }}>
              {project.project_type==="territorial"?"Territorial":
               project.project_type==="organizational"?"Organizacional":"Programático"}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:7, flexShrink:0 }}>
          <Btn variant="ghost" size="sm" onClick={()=>onEdit(project)}>Editar</Btn>
          {project.status!=="closed" && (
            <Btn variant="danger" size="sm" onClick={()=>onArchive(project.id)}>Cerrar</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Client Detail View ─────────────────────────────────────────
function ClientDetail({ client, supabase, onBack, onUpdate, onClientsChange }) {
  const [tab,        setTab]        = useState("projects");
  const [weights,    setWeights]    = useState({ ...client.weights });
  const [modules,    setModules]    = useState({ ...client.modules });
  const [editName,   setEditName]   = useState(client.name);
  const [editInd,    setEditInd]    = useState(client.industry||"");
  const [editCon,    setEditCon]    = useState(client.contact||"");
  const [editEmail,  setEditEmail]  = useState(client.email||"");
  const [notes,      setNotes]      = useState("");
  const [projModal,  setProjModal]  = useState(null); // { mode:"create"|"edit", project?, moduleKey }
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  const projects = client.projects || [];

  async function saveGeneral() {
    setSaving(true);
    try {
      // Si solo hay un módulo activo, forzar su peso a 100
      const activeKeys = Object.entries(modules).filter(([k,v])=>v && ['rc','do','esg'].includes(k)).map(([k])=>k);
      const finalWeights = { ...weights };
      if (activeKeys.length === 1) {
        finalWeights.rc = activeKeys[0]==='rc' ? 100 : 0;
        finalWeights.do = activeKeys[0]==='do' ? 100 : 0;
        finalWeights.esg = activeKeys[0]==='esg' ? 100 : 0;
      }

      await supabase.from("clients")
        .update({ name:editName, industry:editInd||null, contact:editCon||null,
                  email:editEmail||null, updated_at:new Date().toISOString() })
        .eq("id", client.id);

      await supabase.from("client_modules")
        .update({ rc:modules.rc||false,
                  "do": modules.do || modules.do || false,
                  esg:modules.esg||false,
                  weight_rc:finalWeights.rc, weight_do:finalWeights.do, weight_esg:finalWeights.esg,
                  updated_at:new Date().toISOString() })
        .eq("client_id", client.id);

      setSaved(true);
      setTimeout(()=>setSaved(false), 2000);
      onUpdate({ ...client, name:editName, industry:editInd, contact:editCon,
        email:editEmail, modules, weights });
      onClientsChange?.(); // Refresh topbar + client nav modules
    } finally {
      setSaving(false);
    }
  }

  function handleSaveProject(savedProject) {
    const exists = projects.some(p=>p.id===savedProject.id);
    const updated = exists
      ? projects.map(p=>p.id===savedProject.id?savedProject:p)
      : [...projects, savedProject];
    onUpdate({ ...client, projects:updated });
    setProjModal(null);
  }

  function handleArchiveProject(projectId) {
    setConfirmDlg({
      message:"¿Cerrar este proyecto? Quedará archivado y no recibirá más actualizaciones.",
      onConfirm: async () => {
        await supabase.from("projects")
          .update({ status:"closed", updated_at:new Date().toISOString() })
          .eq("id", projectId);
        onUpdate({ ...client, projects:projects.map(p=>p.id===projectId?{...p,status:"closed"}:p) });
        setConfirmDlg(null);
      }
    });
  }

  const TABS = [
    { id:"projects", label:"Proyectos" },
    { id:"config",   label:"Configuración" },
    { id:"users",    label:"Usuarios" },
    { id:"publish",  label:"Publicación" },
  ];

  // Group projects by module
  const byModule = Object.keys(MOD).reduce((acc,k)=>{
    acc[k] = projects.filter(p=>p.module_key===k);
    return acc;
  }, {});

  return (
    <div style={{ padding:"32px 36px", maxWidth:1200 }}>
      {/* Header */}
      <div className="cp-fade" style={{ marginBottom:28 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:T.t3,
          cursor:"pointer", fontSize:13, fontFamily:"'Instrument Sans',sans-serif",
          display:"flex", alignItems:"center", gap:6, marginBottom:14, padding:0 }}
          onMouseEnter={e=>e.currentTarget.style.color=T.t1}
          onMouseLeave={e=>e.currentTarget.style.color=T.t3}>
          ← Volver a clientes
        </button>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
              letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{client.industry}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:T.t1,
              letterSpacing:-.5, marginBottom:8 }}>{client.name}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {Object.entries(MOD).map(([k,m])=>(
                <span key={k} style={{ padding:"3px 10px", borderRadius:20, fontSize:11,
                  fontFamily:"'JetBrains Mono',monospace",
                  border:`1px solid ${client.modules[k]?m.color+"40":T.b2}`,
                  color:client.modules[k]?m.color:T.t4,
                  opacity:client.modules[k]?1:.4 }}>{m.short}</span>
              ))}
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11,
                fontFamily:"'JetBrains Mono',monospace",
                border:`1px solid ${client.published?T.green+"40":T.amber+"40"}`,
                color:client.published?T.green:T.amber }}>
                {client.published?"● Publicado":"● Borrador"}
              </span>
            </div>
          </div>
          {/* Score chips */}
          <div style={{ display:"flex", gap:12 }}>
            {Object.entries(MOD).filter(([k])=>client.modules[k]).map(([k,m])=>(
              <div key={k} style={{ textAlign:"center", background:T.s2,
                border:`1px solid ${T.b1}`, borderRadius:10, padding:"10px 16px" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22,
                  color:client.scores[k]!=null?(client.scores[k]>=70?T.green:client.scores[k]>=50?T.amber:T.red):T.t4 }}>
                  {client.scores[k]??"—"}
                </div>
                <div style={{ fontSize:10, color:T.t3, fontFamily:"'JetBrains Mono',monospace",
                  marginTop:2 }}>{m.short}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:3, marginBottom:24, background:T.s2,
        borderRadius:10, padding:4, width:"fit-content" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"7px 16px", borderRadius:7, border:"none",
            background:tab===t.id?T.s1:"none", color:tab===t.id?T.t1:T.t3,
            fontSize:13, fontWeight:500, cursor:"pointer",
            fontFamily:"'Instrument Sans',sans-serif",
            boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,.3)":"none",
            transition:"all .15s" }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: PROYECTOS ── */}
      {tab==="projects" && (
        <div className="cp-fade">
          {Object.entries(MOD).map(([k,m])=>{
            if (!client.modules[k]) return null;
            const ps = byModule[k];
            return (
              <div key={k} style={{ marginBottom:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:18 }}>{m.icon}</span>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:m.color }}>
                      {m.label}
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                      color:T.t3, background:T.s2, padding:"2px 8px", borderRadius:20 }}>
                      {ps.length} proyecto{ps.length!==1?"s":""}
                    </span>
                  </div>
                  <Btn variant="ghost" size="sm"
                    onClick={()=>setProjModal({ mode:"create", moduleKey:k })}>
                    + Nuevo proyecto {m.short}
                  </Btn>
                </div>
                {ps.length===0 ? (
                  <div style={{ padding:"24px 20px", background:T.s2, border:`1px dashed ${T.b2}`,
                    borderRadius:12, textAlign:"center" }}>
                    <div style={{ fontSize:13, color:T.t3, marginBottom:10 }}>
                      No hay proyectos {m.short} aún.
                    </div>
                    <Btn variant="ghost" size="sm"
                      onClick={()=>setProjModal({ mode:"create", moduleKey:k })}>
                      + Crear primer proyecto
                    </Btn>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {ps.map(p=>(
                      <ProjectCard key={p.id} project={p}
                        onEdit={p=>setProjModal({ mode:"edit", project:p, moduleKey:k })}
                        onArchive={handleArchiveProject}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: CONFIGURACIÓN ── */}
      {tab==="config" && (
        <div className="cp-fade">
          <Card style={{ marginBottom:18 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:18 }}>
              Datos generales
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
              <Input label="Nombre de la empresa" value={editName} onChange={setEditName}
                style={{ gridColumn:"span 2" }}/>
              <Input label="Industria"         value={editInd}   onChange={setEditInd}/>
              <Input label="Contacto principal" value={editCon}   onChange={setEditCon}/>
              <Input label="Email de contacto"  value={editEmail} onChange={setEditEmail}
                type="email" style={{ gridColumn:"span 2" }}/>
            </div>

            <Divider/>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:18 }}>
              Módulos activos
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
              {Object.entries(MOD).map(([k,m])=>(
                <div key={k} style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", padding:"12px 16px",
                  background:T.s2, border:`1px solid ${modules[k]?m.color+"30":T.b1}`,
                  borderRadius:10, transition:"border-color .15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:17 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize:13, color:modules[k]?T.t1:T.t3, fontWeight:500 }}>{m.label}</div>
                      <div style={{ fontSize:11, color:T.t4, fontFamily:"'JetBrains Mono',monospace" }}>
                        {byModule[k]?.length||0} proyecto{byModule[k]?.length!==1?"s":""}
                      </div>
                    </div>
                  </div>
                  <Toggle checked={modules[k]} color={m.color}
                    onChange={v=>setModules(p=>({...p,[k]:v}))}/>
                </div>
              ))}
            </div>

            <Divider/>
            <WeightsEditor weights={weights} modules={modules} onChange={setWeights}/>

            <div style={{ marginTop:22, display:"flex", gap:10 }}>
              <Btn variant="primary" onClick={saveGeneral} disabled={saving}>
                {saving?<><Spinner/> Guardando…</>:saved?"✓ Guardado":"Guardar cambios"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB: USUARIOS ── */}
      {tab==="users" && (
        <div className="cp-fade">
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:18 }}>
              Usuarios con acceso
            </div>
            {(client.users||[]).length===0 ? (
              <div style={{ textAlign:"center", padding:"24px 0", fontSize:13, color:T.t3 }}>
                No hay usuarios asignados a esta empresa.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {(client.users||[]).map(u=>(
                  <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"12px 16px", background:T.s2, border:`1px solid ${T.b1}`, borderRadius:10 }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                      background:`${T.blue}18`, color:T.blue, border:`1px solid ${T.blue}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:12 }}>
                      {u.full_name?.[0]?.toUpperCase()||u.email[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>{u.full_name}</div>
                      <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{u.email}</div>
                    </div>
                    <span style={{ background:`${T.green}18`, color:T.green, border:`1px solid ${T.green}30`,
                      padding:"3px 9px", borderRadius:20, fontSize:11,
                      fontFamily:"'JetBrains Mono',monospace" }}>● Activo</span>
                    <Btn variant="danger" size="sm" onClick={()=>{
                      if (!window.confirm(`¿Revocar acceso de ${u.email}?`)) return;
                      supabase.from("client_user_access")
                        .update({ access_status:"revoked", updated_at:new Date().toISOString() })
                        .eq("client_id", client.id).eq("user_id", u.id)
                        .then(({ error })=>{
                          if (error) { alert("Error: " + error.message); return; }
                          onUpdate({ ...client, users:(client.users||[]).filter(x=>x.id!==u.id) });
                        });
                    }}>Revocar acceso</Btn>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:16 }}>
              <Btn variant="ghost" size="sm">+ Asignar usuario existente</Btn>
            </div>
          </Card>
          <div style={{ marginTop:14, padding:"12px 16px", background:T.s2,
            border:`1px solid ${T.b1}`, borderRadius:10, fontSize:13, color:T.t3 }}>
            Para aprobar nuevos usuarios y asignarlos a esta empresa, ve a{" "}
            <span style={{ color:T.blue, cursor:"pointer" }}>Administración → Pendientes</span>.
          </div>
        </div>
      )}

      {/* ── TAB: PUBLICACIÓN ── */}
      {tab==="publish" && (
        <div className="cp-fade">
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:6 }}>
              Control de publicación
            </div>
            <div style={{ fontSize:13, color:T.t3, marginBottom:22 }}>
              El cliente solo ve su dashboard cuando publicas el período. En borrador puedes editar libremente.
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"18px 20px", borderRadius:11,
              background:client.published?`${T.green}08`:`${T.amber}08`,
              border:`1px solid ${client.published?T.green:T.amber}25` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",
                  background:client.published?T.green:T.amber,
                  animation:"cpSpin 2s linear infinite",
                  animationName:"none",
                  opacity:1 }}/>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>
                    {client.published?"Publicado — visible para el cliente":"Borrador — el cliente no puede verlo"}
                  </div>
                  <div style={{ fontSize:12, color:T.t3 }}>{client.name}</div>
                </div>
              </div>
              <Btn variant={client.published?"ghost":"success"}
                onClick={()=>onUpdate({...client,published:!client.published})}>
                {client.published?"Despublicar":"✓ Publicar al cliente"}
              </Btn>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
              letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>
              Notas internas del período
            </div>
            <Textarea value={notes} onChange={setNotes}
              placeholder="Notas privadas — el cliente nunca las verá." rows={4}/>
            <div style={{ marginTop:14 }}>
              <Btn variant="ghost" size="sm">Guardar nota</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      {projModal && (
        <ProjectModal
          project={projModal.mode==="edit"?projModal.project:null}
          clientId={client.id}
          moduleKey={projModal.moduleKey}
          supabase={supabase}
          onSave={handleSaveProject}
          onClose={()=>setProjModal(null)}/>
      )}
      {confirmDlg && (
        <ConfirmDialog message={confirmDlg.message}
          onConfirm={confirmDlg.onConfirm} onClose={()=>setConfirmDlg(null)}/>
      )}
    </div>
  );
}

// ── Client List View ───────────────────────────────────────────
function ClientList({ clients, onSelect, onCreateClient }) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter(c=>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount  = clients.filter(c=>c.published).length;
  const projectCount = clients.reduce((s,c)=>s+(c.projects?.length||0),0);
  const userCount    = clients.reduce((s,c)=>s+c.user_count,0);

  return (
    <div style={{ padding:"32px 36px", maxWidth:1200 }}>
      {/* Header */}
      <div className="cp-fade" style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
          letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Cartera de clientes</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end",
          flexWrap:"wrap", gap:14 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:T.t1, letterSpacing:-.5 }}>
            Clientes
          </div>
          <Btn variant="primary" onClick={onCreateClient}>+ Nueva empresa</Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="cp-fade cp-d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
        gap:14, marginBottom:24 }}>
        {[
          { label:"Empresas cliente",   val:clients.length,  color:T.blue  },
          { label:"Reportes publicados", val:activeCount,     color:T.green },
          { label:"Proyectos activos",   val:projectCount,   color:T.rc    },
          { label:"Usuarios activos",    val:userCount,       color:T.do    },
        ].map(s=>(
          <div key={s.label} style={{ background:T.s1, border:`1px solid ${T.b1}`,
            borderRadius:12, padding:"16px 18px" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26,
              color:s.color, marginBottom:3 }}>{s.val}</div>
            <div style={{ fontSize:11, color:T.t3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom:18 }}>
        <Input value={search} onChange={setSearch}
          placeholder="Buscar por nombre o industria…"
          style={{ maxWidth:360 }}/>
      </div>

      {/* Client cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {filtered.map((c,i)=>(
          <div key={c.id} className={`cp-fade cp-d${Math.min(i+2,4)}`}
            style={{ background:T.s1, border:`1px solid ${T.b1}`, borderRadius:14,
              padding:"22px 24px", cursor:"pointer", transition:"all .2s" }}
            onClick={()=>onSelect(c.id)}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.b3; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,.3)`; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.b1; e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>

            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
              gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.t1 }}>
                    {c.name}
                  </div>
                  <span style={{ padding:"3px 9px", borderRadius:20, fontSize:11,
                    fontFamily:"'JetBrains Mono',monospace",
                    border:`1px solid ${c.published?T.green+"40":T.amber+"40"}`,
                    color:c.published?T.green:T.amber }}>
                    {c.published?"● Publicado":"● Borrador"}
                  </span>
                </div>
                <div style={{ fontSize:12, color:T.t3, fontFamily:"'JetBrains Mono',monospace",
                  marginBottom:12 }}>
                  {c.industry} · {c.contact} · {c.email}
                </div>
                {/* Module + project summary */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {Object.entries(MOD).map(([k,m])=>{
                    if (!c.modules[k]) return null;
                    const ps = (c.projects||[]).filter(p=>p.module_key===k);
                    const active = ps.filter(p=>p.status==="active").length;
                    return (
                      <span key={k} style={{ display:"inline-flex", alignItems:"center", gap:5,
                        padding:"4px 10px", borderRadius:20, fontSize:11,
                        fontFamily:"'JetBrains Mono',monospace",
                        border:`1px solid ${m.color}40`, color:m.color,
                        background:`${m.color}08` }}>
                        {m.icon} {m.short}
                        {ps.length>0&&<span style={{ opacity:.6 }}>· {active} activo{active!==1?"s":""}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Scores */}
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {Object.entries(MOD).filter(([k])=>c.modules[k]).map(([k,m])=>(
                  <div key={k} style={{ textAlign:"center", background:T.s2,
                    border:`1px solid ${T.b1}`, borderRadius:10, padding:"8px 14px" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20,
                      color:c.scores[k]!=null?(c.scores[k]>=70?T.green:c.scores[k]>=50?T.amber:T.red):T.t4 }}>
                      {c.scores[k]??"-"}
                    </div>
                    <div style={{ fontSize:10, color:T.t3,
                      fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>{m.short}</div>
                  </div>
                ))}
                <div style={{ color:T.t3, fontSize:18, marginLeft:4 }}>›</div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length===0 && (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:6 }}>
              Sin resultados
            </div>
            <div style={{ fontSize:13, color:T.t3 }}>No se encontraron clientes con ese criterio.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Client Modal ────────────────────────────────────────
function CreateClientModal({ supabase, onSave, onClose }) {
  const [name,    setName]    = useState("");
  const [ind,     setInd]     = useState("");
  const [contact, setContact] = useState("");
  const [email,   setEmail]   = useState("");
  const [modules, setModules] = useState({ rc:true, do:false, esg:false });
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data:clientData, error:clientErr } = await supabase
        .from("clients")
        .insert({ name, industry:ind||null, contact:contact||null, email:email||null })
        .select().single();
      if (clientErr) throw clientErr;

      await supabase.from("client_modules").insert({
        client_id:  clientData.id,
        rc:         modules.rc  || false,
        "do": modules.do || false,
        esg:        modules.esg || false,
        weight_rc:40, weight_do:35, weight_esg:25,
      });

      onSave({
        ...clientData,
        published:  false,
        user_count: 0,
        modules:    { rc:modules.rc||false, do:modules.do||false, esg:modules.esg||false },
        weights:    { rc:40, do:35, esg:25 },
        scores:     { rc:null, do:null, esg:null },
        projects:   [],
        users:      [],
      });
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Nueva empresa cliente" onClose={onClose} width={520}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
        <Input label="Nombre de la empresa" value={name} onChange={setName}
          placeholder="Ej. Minera Los Andes" style={{ gridColumn:"span 2" }}/>
        <Input label="Industria"            value={ind}     onChange={setInd}     placeholder="Ej. Minería"/>
        <Input label="Contacto principal"   value={contact} onChange={setContact} placeholder="Nombre completo"/>
        <Input label="Email de contacto"    value={email}   onChange={setEmail}
          type="email" placeholder="contacto@empresa.cl" style={{ gridColumn:"span 2" }}/>
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
        letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>Módulos a contratar</div>
      <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:24 }}>
        {Object.entries(MOD).map(([k,m])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"11px 14px", background:T.s2,
            border:`1px solid ${modules[k]?m.color+"30":T.b1}`,
            borderRadius:9, transition:"border-color .15s" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <span>{m.icon}</span>
              <span style={{ fontSize:13, color:modules[k]?T.t1:T.t3 }}>{m.label}</span>
            </div>
            <Toggle checked={modules[k]||false} color={m.color}
              onChange={v=>setModules(p=>({...p,[k]:v}))}/>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <Btn variant="primary" onClick={handleCreate} disabled={!name.trim()||loading}>
          {loading?<><Spinner/> Creando…</>:"Crear empresa"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────
export default function ClientsPage({ supabase, currentUser, onClientsChange }) {
  const [clients,     setClients]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState(null);
  const [createModal, setCreateModal] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    loadClients();
  }, [supabase]);

  async function loadClients() {
    setLoading(true);
    try {
      const [clientsRes, modulesRes, scoresRes, accessRes, projectsRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("client_modules").select("client_id, rc, do, esg, weight_rc, weight_do, weight_esg"),
        supabase.from("client_scores").select("client_id, rc, do_score, esg"),
        supabase.from("client_user_access").select(`
          client_id, user_id, access_status,
          user_profiles ( id, full_name, email )
        `),
        supabase.from("projects").select("*").order("starts_on", { ascending:false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;

      setClients((clientsRes.data || []).map(c => {
        const m  = modulesRes.data?.find(x=>x.client_id===c.id);
        const s  = scoresRes.data?.find(x=>x.client_id===c.id);
        const ua = (accessRes.data||[]).filter(x=>x.client_id===c.id);
        return {
          ...c,
          modules: {
            rc:  m?.rc  ?? false,
            do:  m?.do  ?? false,
            esg: m?.esg ?? false,
          },
          weights: {
            rc:  m?.weight_rc  ?? 40,
            do:  m?.weight_do  ?? 35,
            esg: m?.weight_esg ?? 25,
          },
          scores: {
            rc:  s?.rc       ?? null,
            do:  s?.do_score ?? null,
            esg: s?.esg      ?? null,
          },
          user_count: ua.filter(a=>a.access_status==="approved").length,
          users: ua.filter(a=>a.access_status==="approved")
            .map(a=>({ id:a.user_id, ...a.user_profiles, access_status:a.access_status })),
          projects: (projectsRes.data||[]).filter(p=>p.client_id===c.id),
        };
      }));
    } finally {
      setLoading(false);
    }
  }

  const selected = clients.find(c=>c.id===selectedId);

  async function handleUpdate(updated) {
    // Refleja cambio local inmediatamente; la persistencia está en ClientDetail
    setClients(p=>p.map(c=>c.id===updated.id?updated:c));
    // Si cambia published, persiste en Supabase
    const original = clients.find(c=>c.id===updated.id);
    if (original?.published !== updated.published) {
      await supabase.from("clients")
        .update({ published:updated.published, updated_at:new Date().toISOString() })
        .eq("id", updated.id);
    }
  }

  function handleCreate(newClient) {
    setClients(p=>[...p, newClient]);
    setCreateModal(false);
    setSelectedId(newClient.id);
    onClientsChange?.(); // refresh topbar selector in App
  }

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ padding:"32px 36px", display:"flex", alignItems:"center", gap:10,
        color:"#3d4d66", fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>
        <span style={{ width:14, height:14, border:"2px solid #1d2535",
          borderTopColor:"#f97316", borderRadius:"50%",
          animation:"cpFade 0s,cpSpin .8s linear infinite",
          display:"inline-block" }}/>
        Cargando clientes…
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      {selected ? (
        <ClientDetail
          client={selected}
          supabase={supabase}
          onBack={()=>{ setSelectedId(null); loadClients(); }}
          onUpdate={handleUpdate}
          onClientsChange={onClientsChange}/>
      ) : (
        <ClientList
          clients={clients}
          onSelect={setSelectedId}
          onCreateClient={()=>setCreateModal(true)}/>
      )}
      {createModal && (
        <CreateClientModal
          supabase={supabase}
          onSave={handleCreate}
          onClose={()=>setCreateModal(false)}/>
      )}
    </>
  );
}
