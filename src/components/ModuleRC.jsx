// ============================================================
// ModuleRC.jsx
// Módulo de Relacionamiento Comunitario — THO Compass v4
// Vista Consultora completa.
//
// Estructura:
//   Selector de proyecto RC activo
//   Tab Score LSO     → dimensiones, ingreso manual, evolución
//   Tab Actividades   → registro de actas, reuniones, incidentes
//   Tab Actores       → mapa de stakeholders del territorio
//   Tab Carga IA      → upload archivos + análisis + propuesta
//
// Supabase queries documentadas en cada función mock.
// ============================================================

import { saveProjectScore, syncClientScore } from "../lib/scores.js";
import ScoreLog from "./ScoreLog.jsx";
import FilesPanel from "./FilesPanel.jsx";
import SurveyManager from "./SurveyManager.jsx";
import CommitmentsPanel from "./CommitmentsPanel.jsx";
import BaselineInstrument from "./BaselineInstrument.jsx";
import { useState, useRef, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ── Tokens ────────────────────────────────────────────────────
const T = {
  bg:"#08090c", s1:"#0d0f14", s2:"#111520", s3:"#161b28",
  b1:"#1d2535", b2:"#232d42", b3:"#2e3a52",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  rc:"#f97316", do:"#a855f7", esg:"#22c55e",
  blue:"#3b82f6", amber:"#f59e0b", red:"#ef4444", green:"#22c55e",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.rc-fade { animation: rcFade .35s cubic-bezier(.4,0,.2,1) both; }
.rc-d1{animation-delay:.06s;} .rc-d2{animation-delay:.12s;}
.rc-d3{animation-delay:.18s;} .rc-d4{animation-delay:.24s;}
@keyframes rcFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes rcSpin{to{transform:rotate(360deg)}}
`;

// ── RC Dimensions ──────────────────────────────────────────────
const DIMENSIONS = [
  { key:"percepcion",     label:"Percepción y confianza", weight:30,
    tooltip:"NPS adaptado a stakeholders comunitarios. Mide cómo perciben a la organización los actores clave del territorio." },
  { key:"compromisos",    label:"Gestión de compromisos", weight:25,
    tooltip:"Cumplimiento de acuerdos adquiridos con la comunidad. Se alimenta de actas y registros de seguimiento." },
  { key:"dialogo",        label:"Calidad del diálogo",    weight:25,
    tooltip:"Frecuencia, calidad y diversidad de las instancias de participación y diálogo con actores territoriales." },
  { key:"conflictividad", label:"Conflictividad activa",  weight:20,
    tooltip:"Indicador inverso: a mayor conflictividad (incidentes, reclamos sin resolver), menor puntaje." },
];

const ACTIVITY_TYPES = [
  { value:"meeting",          label:"Reunión" },
  { value:"workshop",         label:"Taller" },
  { value:"interview",        label:"Entrevista" },
  { value:"site_visit",       label:"Visita terreno" },
  { value:"internal_session", label:"Sesión interna" },
  { value:"survey",           label:"Encuesta" },
  { value:"incident",         label:"Incidente" },
  { value:"other",            label:"Otro" },
];

const ACTIVITY_ICONS = {
  meeting:"🤝", workshop:"🏗", interview:"🎙", site_visit:"📍",
  internal_session:"💬", survey:"📋", incident:"⚠️", other:"📝",
};

const INFLUENCE = ["Baja","Media","Alta","Crítica"];
const ENGAGEMENT = ["Baja","Media","Alta"];
const RELATIONSHIP = [
  { value:"colaborativo", label:"Colaborativo", color:T.green },
  { value:"estable",      label:"Estable",      color:T.blue  },
  { value:"fragil",       label:"Frágil",       color:T.amber },
  { value:"tenso",        label:"Tenso",        color:"#fb923c" },
  { value:"critico",      label:"Crítico",      color:T.red   },
];

// ── Mock data ──────────────────────────────────────────────────
// Query: SELECT p.*, ps.overall_score, ps.dimension_scores_json
//        FROM projects p
//        LEFT JOIN project_scores ps ON ps.project_id = p.id
//        WHERE p.client_id = :clientId AND p.module_key = 'rc'
//        ORDER BY p.status, p.starts_on DESC
const MOCK_PROJECTS = [
  {
    id:"p1", name:"Proyecto Coronel", status:"active", project_type:"territorial",
    description:"Gestión territorial zona costera Coronel.",
    starts_on:"2024-10-01", ends_on:"2025-06-30",
    client_visible:true,
    score:{ overall:68, percepcion:65, compromisos:72, dialogo:70, conflictividad:62 },
    history:[
      { period:"Q3 2024", score:55 },{ period:"Q4 2024", score:61 },{ period:"Q1 2025", score:68 },
    ],
  },
  {
    id:"p2", name:"Proyecto Caimanes", status:"active", project_type:"territorial",
    description:"Relacionamiento comunidades sector Caimanes.",
    starts_on:"2025-01-01", ends_on:null,
    client_visible:false,
    score:{ overall:54, percepcion:50, compromisos:58, dialogo:55, conflictividad:50 },
    history:[
      { period:"Q1 2025", score:54 },
    ],
  },
];

// Query: SELECT * FROM project_activities WHERE project_id = :projectId
//        ORDER BY activity_date DESC
const MOCK_ACTIVITIES = [
  { id:"a1", project_id:"p1", record_type:"meeting", title:"Mesa de diálogo ampliada sector norte",
    activity_date:"2025-03-12", participants_count:24, organizations_count:6,
    nps_score:42, evaluation_score:68,
    qualitative_summary:"Reunión con alta asistencia. Se abordaron preocupaciones sobre calidad del agua. Tono constructivo aunque con tensiones al final.",
    tensions_text:"Grupo de pescadores manifestó desconfianza respecto a compromisos previos no cumplidos.",
    opportunities_text:"Municipalidad mostró apertura para mesa técnica conjunta.",
    consultant_notes:"Reagendar seguimiento en 3 semanas. Contactar directamente a líder de pescadores.",
    visible_to_client:true },
  { id:"a2", project_id:"p1", record_type:"site_visit", title:"Visita terreno punto de descarga",
    activity_date:"2025-03-05", participants_count:4, organizations_count:2,
    nps_score:null, evaluation_score:72,
    qualitative_summary:"Recorrido con delegados comunitarios. Sin incidentes.",
    tensions_text:"", opportunities_text:"",
    consultant_notes:"Documentado con fotos. Sin hallazgos críticos.",
    visible_to_client:true },
  { id:"a3", project_id:"p1", record_type:"incident", title:"Reclamo formal por ruido nocturno",
    activity_date:"2025-02-28", participants_count:1, organizations_count:1,
    nps_score:null, evaluation_score:null,
    qualitative_summary:"Vecino interpuso reclamo formal por ruido en turno nocturno.",
    tensions_text:"Escalamiento posible si no se resuelve en 10 días.",
    opportunities_text:"",
    consultant_notes:"Derivado a jefatura operaciones. Seguimiento pendiente.",
    visible_to_client:false },
];

// Query: SELECT * FROM project_actors WHERE project_id = :projectId ORDER BY influence_level DESC
const MOCK_ACTORS = [
  { id:"ac1", project_id:"p1", name:"Sindicato de Pescadores Artesanales",
    actor_type:"Comunidad", influence_level:"Crítica", engagement_level:"Media",
    relationship_status:"tenso", visible_to_client:true,
    notes:"Grupo clave. Historial de conflictos con empresa. Requiere atención prioritaria.",
    last_interaction_at:"2025-03-12" },
  { id:"ac2", project_id:"p1", name:"Municipalidad de Coronel",
    actor_type:"Gobierno local", influence_level:"Alta", engagement_level:"Alta",
    relationship_status:"estable", visible_to_client:true,
    notes:"Relación estable. Alcalde interesado en mesas técnicas.",
    last_interaction_at:"2025-03-08" },
  { id:"ac3", project_id:"p1", name:"Junta de Vecinos Sector Norte",
    actor_type:"Comunidad", influence_level:"Media", engagement_level:"Baja",
    relationship_status:"fragil", visible_to_client:true,
    notes:"Poca participación en instancias formales. Prefieren contacto directo.",
    last_interaction_at:"2025-02-20" },
  { id:"ac4", project_id:"p1", name:"ONG Agua Limpia",
    actor_type:"Sociedad civil", influence_level:"Media", engagement_level:"Baja",
    relationship_status:"critico", visible_to_client:false,
    notes:"Opositores activos. Monitorear sus comunicaciones públicas.",
    last_interaction_at:"2025-01-15" },
];

// ── Atoms ──────────────────────────────────────────────────────
const Card = ({ children, style={}, cls="" }) => (
  <div className={cls} style={{ background:T.s1, border:`1px solid ${T.b1}`,
    borderRadius:14, padding:"22px 24px", ...style }}>{children}</div>
);

const Pill = ({ children, color }) => (
  <span style={{ background:`${color}18`, color, border:`1px solid ${color}30`,
    padding:"3px 9px", borderRadius:20, fontSize:11,
    fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap" }}>{children}</span>
);

const Btn = ({ children, onClick, variant="ghost", size="md", disabled=false, style={} }) => {
  const base = { padding:size==="sm"?"6px 13px":"9px 18px", fontSize:size==="sm"?12:13,
    fontWeight:600, cursor:disabled?"not-allowed":"pointer", border:"none", borderRadius:8,
    transition:"all .15s", fontFamily:"'Instrument Sans',sans-serif",
    display:"inline-flex", alignItems:"center", gap:6, opacity:disabled?.5:1, ...style };
  const v = { primary:{background:T.blue,color:"white"}, ghost:{background:"none",color:T.t2,border:`1px solid ${T.b2}`},
    danger:{background:"none",color:T.red,border:`1px solid ${T.red}30`},
    rc:{background:`${T.rc}18`,color:T.rc,border:`1px solid ${T.rc}30`},
    success:{background:T.green,color:"#08090c"} };
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.15)";}}
    onMouseLeave={e=>{e.currentTarget.style.filter="none";}}>{children}</button>;
};

const Toggle = ({ checked, onChange, color=T.rc }) => (
  <label style={{ position:"relative",width:36,height:19,cursor:"pointer",flexShrink:0 }}>
    <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
      style={{ opacity:0,width:0,height:0 }}/>
    <span style={{ position:"absolute",inset:0,borderRadius:10,transition:".2s",
      background:checked?color:T.b2 }}>
      <span style={{ position:"absolute",width:13,height:13,top:3,borderRadius:"50%",
        background:checked?"white":T.t3,transition:".2s",left:checked?20:3 }}/>
    </span>
  </label>
);

const Input = ({ label, value, onChange, placeholder, type="text", style={} }) => (
  <div style={style}>
    {label&&<label style={{ display:"block",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
      color:T.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:7 }}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
        padding:"9px 13px",color:T.t1,fontSize:13,outline:"none",
        fontFamily:"'Instrument Sans',sans-serif",transition:"border-color .15s" }}
      onFocus={e=>e.target.style.borderColor=T.rc}
      onBlur={e=>e.target.style.borderColor=T.b2}/>
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows=3 }) => (
  <div>
    {label&&<label style={{ display:"block",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
      color:T.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:7 }}>{label}</label>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
        padding:"9px 13px",color:T.t1,fontSize:13,outline:"none",resize:"vertical",
        fontFamily:"'Instrument Sans',sans-serif",lineHeight:1.6,transition:"border-color .15s" }}
      onFocus={e=>e.target.style.borderColor=T.rc}
      onBlur={e=>e.target.style.borderColor=T.b2}/>
  </div>
);

const Select = ({ label, value, onChange, options, style={} }) => (
  <div style={style}>
    {label&&<label style={{ display:"block",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
      color:T.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:7 }}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
        padding:"9px 13px",color:T.t1,fontSize:13,outline:"none",
        fontFamily:"'Instrument Sans',sans-serif",cursor:"pointer" }}>
      {options.map(o=><option key={o.value} value={o.value} style={{ background:T.s2 }}>{o.label}</option>)}
    </select>
  </div>
);

const Tip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative",display:"inline-flex",alignItems:"center" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show&&<span style={{ position:"absolute",bottom:"calc(100% + 8px)",left:"50%",
        transform:"translateX(-50%)",background:"#1d2535",border:`1px solid ${T.b2}`,
        borderRadius:8,padding:"10px 14px",fontSize:12,color:T.t2,lineHeight:1.55,
        width:240,zIndex:9999,pointerEvents:"none",boxShadow:"0 8px 24px rgba(0,0,0,.5)",
        fontFamily:"'Instrument Sans',sans-serif" }}>{text}</span>}
    </span>
  );
};

const Divider = () => <div style={{ height:1,background:T.b1,margin:"20px 0" }}/>;
const Spinner = () => <span style={{ width:13,height:13,border:`2px solid rgba(255,255,255,.25)`,
  borderTopColor:"white",borderRadius:"50%",animation:"rcSpin .8s linear infinite",display:"inline-block" }}/>;

// ── Modal ──────────────────────────────────────────────────────
function Modal({ title, onClose, children, width=540 }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:16,
        padding:"28px 32px",width,maxWidth:"94vw",maxHeight:"88vh",overflowY:"auto",
        boxShadow:"0 32px 80px rgba(0,0,0,.8)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,color:T.t1 }}>{title}</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Score Bar ──────────────────────────────────────────────────
function ScoreBar({ dim, value, onChange }) {
  const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7 }}>
        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          <span style={{ fontSize:13,color:T.t2 }}>{dim.label}</span>
          <Tip text={dim.tooltip}>
            <span style={{ width:14,height:14,borderRadius:"50%",background:T.b2,color:T.t3,
              fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"help",fontFamily:"'JetBrains Mono',monospace" }}>?</span>
          </Tip>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
            background:T.s3,padding:"1px 5px",borderRadius:3 }}>{dim.weight}%</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <input type="number" min={0} max={100} value={value||""} placeholder="—"
            onChange={e=>onChange(Math.min(100,Math.max(0,parseInt(e.target.value)||0)))}
            style={{ width:60,background:T.s2,border:`1px solid ${T.b2}`,borderRadius:6,
              padding:"5px 9px",color:sc(value),fontFamily:"'JetBrains Mono',monospace",
              fontSize:14,fontWeight:600,outline:"none",textAlign:"center",
              transition:"border-color .15s" }}
            onFocus={e=>e.target.style.borderColor=T.rc}
            onBlur={e=>e.target.style.borderColor=T.b2}/>
        </div>
      </div>
      <div style={{ height:6,background:T.b2,borderRadius:3,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${value||0}%`,background:sc(value),borderRadius:3,
          transition:"width .8s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
    </div>
  );
}

// ── Tab: SCORE LSO ─────────────────────────────────────────────
function TabScore({ project, supabase, onUpdate }) {
  const [scores, setScores] = useState({ ...project.score });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  function calcTotal(s) {
    return Math.round(
      DIMENSIONS.reduce((acc,d)=>acc+(s[d.key]||0)*d.weight/100,0)
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const total = calcTotal(scores);
      await saveProjectScore(supabase, project.id, {
          overall_score: total,
          dimension_scores_json: scores,
        });
      await syncClientScore(supabase, project.client_id, "rc", scores, total);
      setSaved(true);
      setTimeout(()=>setSaved(false), 2200);
      onUpdate({ ...project, score:{ ...scores, overall:total } });
    } finally {
      setSaving(false);
    }
  }

  const total = calcTotal(scores);
  const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;

  const radarData = DIMENSIONS.map(d=>({ s:d.label.split(" ")[0], A:scores[d.key]||0 }));

  return (
    <div className="rc-fade">
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18 }}>
        {/* Score ring */}
        <Card style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:14,padding:"32px 24px" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase" }}>Score LSO actual</div>
          <div style={{ width:130,height:130,borderRadius:"50%",
            background:`conic-gradient(${sc(total)} 0% ${total}%, ${T.b1} ${total}% 100%)`,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:100,height:100,borderRadius:"50%",background:T.bg,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:36,
                color:sc(total),lineHeight:1 }}>{total}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>/100</span>
            </div>
          </div>
          <Pill color={sc(total)}>
            {total>=70?"▲ Favorable":total>=50?"◆ En desarrollo":"▼ Crítico"}
          </Pill>
          <div style={{ fontSize:12,color:T.t3,textAlign:"center",maxWidth:200,lineHeight:1.55 }}>
            Calculado aplicando los pesos de la metodología LSO.
          </div>
        </Card>

        {/* Radar */}
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Perfil de indicadores
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.b2}/>
                <PolarAngleAxis dataKey="s" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}/>
                <Radar dataKey="A" stroke={T.rc} fill={T.rc} fillOpacity={.1} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Dimension inputs */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Ingreso de scores por dimensión
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:20,lineHeight:1.55 }}>
          Modifica los valores manualmente o aplica una propuesta de la IA desde la pestaña Carga IA.
          El score total se recalcula automáticamente.
        </div>
        {DIMENSIONS.map(d=>(
          <ScoreBar key={d.key} dim={d} value={scores[d.key]}
            onChange={v=>setScores(p=>({...p,[d.key]:v}))}/>
        ))}
        <div style={{ marginTop:20,display:"flex",gap:10,alignItems:"center" }}>
          <Btn variant="rc" onClick={handleSave} disabled={saving}>
            {saving?<><Spinner/> Guardando…</>:saved?"✓ Guardado":"Guardar scores"}
          </Btn>
          <span style={{ fontSize:12,color:T.t3 }}>
            Score calculado: <span style={{ fontFamily:"'JetBrains Mono',monospace",
              color:sc(total),fontWeight:600 }}>{total}</span>
          </span>
        </div>
      </Card>

      {/* History */}
      {project.history.length>1&&(
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:16 }}>
            Evolución del score LSO
          </div>
          <div style={{ height:180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={project.history}>
                <defs>
                  <linearGradient id="rcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.rc} stopOpacity={.18}/>
                    <stop offset="95%" stopColor={T.rc} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}
                  axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fill:T.t3,fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:T.s2,border:`1px solid ${T.b2}`,
                  borderRadius:8,fontSize:12,fontFamily:"Instrument Sans" }}/>
                <Area type="monotone" dataKey="score" stroke={T.rc} strokeWidth={2}
                  fill="url(#rcGrad)" name="LSO"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Historial de cambios */}
      {supabase && project?.id && (
        <div style={{ marginTop:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:14 }}>
            Historial de cambios
          </div>
          <ScoreLog projectId={project.id} supabase={supabase} accentColor={T.rc}/>
        </div>
      )}
    </div>
  );
}
function ActivityModal({ activity, projectId, supabase, onSave, onClose }) {
  const isEdit = !!activity;
  const [type,     setType]     = useState(activity?.record_type||"meeting");
  const [title,    setTitle]    = useState(activity?.title||"");
  const [date,     setDate]     = useState(activity?.activity_date||"");
  const [partic,   setPartic]   = useState(activity?.participants_count||"");
  const [orgs,     setOrgs]     = useState(activity?.organizations_count||"");
  const [nps,      setNps]      = useState(activity?.nps_score||"");
  const [evalScore,setEvalScore]= useState(activity?.evaluation_score||"");
  const [summary,  setSummary]  = useState(activity?.qualitative_summary||"");
  const [tensions, setTensions] = useState(activity?.tensions_text||"");
  const [opps,     setOpps]     = useState(activity?.opportunities_text||"");
  const [notes,    setNotes]    = useState(activity?.consultant_notes||"");
  const [visible,  setVisible]  = useState(activity?.visible_to_client??true);
  const [loading,  setLoading]  = useState(false);

  async function handleSave() {
    if (!title.trim()||!date) return;
    setLoading(true);
    try {
      const payload = {
        project_id: projectId, record_type:type, title,
        activity_date:date,
        participants_count:  partic    ? parseInt(partic)     : null,
        organizations_count: orgs      ? parseInt(orgs)       : null,
        nps_score:           nps       ? parseFloat(nps)      : null,
        evaluation_score:    evalScore ? parseFloat(evalScore): null,
        qualitative_summary: summary,
        tensions_text:       tensions,
        opportunities_text:  opps,
        consultant_notes:    notes,
        visible_to_client:   visible,
      };
      if (isEdit) {
        const { data, error } = await supabase
          .from("project_activities").update({ ...payload, updated_at:new Date().toISOString() })
          .eq("id", activity.id).select().single();
        if (error) throw error;
        onSave(data);
      } else {
        const { data, error } = await supabase
          .from("project_activities").insert(payload).select().single();
        if (error) throw error;
        onSave(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit?"Editar actividad":"Registrar actividad"} onClose={onClose} width={580}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <Select label="Tipo" value={type} onChange={setType}
          options={ACTIVITY_TYPES}/>
        <Input label="Fecha" value={date} onChange={setDate} type="date"/>
        <Input label="Título / descripción breve" value={title} onChange={setTitle}
          placeholder="Ej. Mesa de diálogo ampliada" style={{ gridColumn:"span 2" }}/>
        <Input label="Participantes" value={partic} onChange={setPartic} type="number"
          placeholder="N°"/>
        <Input label="Organizaciones" value={orgs} onChange={setOrgs} type="number"
          placeholder="N°"/>
        <Input label="NPS (-100 a 100)" value={nps} onChange={setNps} type="number"
          placeholder="Ej. 42"/>
        <Input label="Score evaluación (0–100)" value={evalScore} onChange={setEvalScore}
          type="number" placeholder="Ej. 68"/>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:18 }}>
        <Textarea label="Resumen cualitativo" value={summary} onChange={setSummary}
          placeholder="Descripción de lo ocurrido, tono de la reunión, principales temas…"/>
        <Textarea label="Tensiones identificadas" value={tensions} onChange={setTensions}
          placeholder="Conflictos, reclamos, puntos de desacuerdo…" rows={2}/>
        <Textarea label="Oportunidades identificadas" value={opps} onChange={setOpps}
          placeholder="Apertura para colaboración, compromisos positivos…" rows={2}/>
        <Textarea label="Notas del consultor (internas)" value={notes} onChange={setNotes}
          placeholder="Notas privadas — el cliente no las verá." rows={2}/>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"12px 16px",background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:20 }}>
        <div>
          <div style={{ fontSize:13,color:T.t1,fontWeight:500,marginBottom:2 }}>
            Visible para el cliente
          </div>
          <div style={{ fontSize:11,color:T.t3 }}>
            Si está activo, el cliente puede ver esta actividad en su panel.
          </div>
        </div>
        <Toggle checked={visible} onChange={setVisible}/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="rc" onClick={handleSave} disabled={!title.trim()||!date||loading}>
          {loading?<><Spinner/> Guardando…</>:isEdit?"Guardar cambios":"Registrar actividad"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Tab: ACTIVIDADES ───────────────────────────────────────────
function TabActivities({ project, activities, supabase, onAddActivity, onUpdateActivity, onDeleteActivity }) {
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const [confirmId, setConfirmId] = useState(null);

  const filtered = activities.filter(a=>
    filter==="all" || a.record_type===filter
  );

  function handleSave(saved) {
    const exists = activities.some(a=>a.id===saved.id);
    exists ? onUpdateActivity(saved) : onAddActivity(saved);
    setModal(null);
  }

  async function handleDelete(id) {
    await supabase.from("project_activities").delete().eq("id", id);
    onDeleteActivity(id);
    setConfirmId(null);
  }

  const relColor = status => RELATIONSHIP.find(r=>r.value===status)?.color||T.t3;

  return (
    <div className="rc-fade">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {[["all","Todas"],["meeting","Reuniones"],["incident","Incidentes"],["survey","Encuestas"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",
              background:filter===v?`${T.rc}18`:"none",
              color:filter===v?T.rc:T.t3,fontSize:12,fontWeight:500,
              fontFamily:"'Instrument Sans',sans-serif",
              outline:filter===v?`1px solid ${T.rc}30`:"none" }}>{l}</button>
          ))}
        </div>
        <Btn variant="rc" size="sm" onClick={()=>setModal("new")}>
          + Registrar actividad
        </Btn>
      </div>

      {filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"48px 0",background:T.s2,
          border:`1px dashed ${T.b2}`,borderRadius:14 }}>
          <div style={{ fontSize:32,marginBottom:12 }}>📋</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
            Sin actividades registradas
          </div>
          <div style={{ fontSize:13,color:T.t3,marginBottom:16 }}>
            Registra reuniones, visitas, encuestas e incidentes del proyecto.
          </div>
          <Btn variant="rc" size="sm" onClick={()=>setModal("new")}>
            + Primera actividad
          </Btn>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {filtered.map(a=>(
            <div key={a.id} style={{ background:T.s1,border:`1px solid ${a.record_type==="incident"?T.red+"30":T.b1}`,
              borderRadius:12,padding:"18px 20px",transition:"border-color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=a.record_type==="incident"?T.red+"60":T.b3}
              onMouseLeave={e=>e.currentTarget.style.borderColor=a.record_type==="incident"?T.red+"30":T.b1}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                    <span style={{ fontSize:18 }}>{ACTIVITY_ICONS[a.record_type]||"📝"}</span>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1 }}>
                      {a.title}
                    </div>
                    {!a.visible_to_client&&(
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:T.t4,background:T.s2,padding:"2px 7px",borderRadius:20 }}>
                        🔒 Solo consultora
                      </span>
                    )}
                  </div>
                  <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:a.qualitative_summary?10:0 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                      {new Date(a.activity_date).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
                    </span>
                    {a.participants_count&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                      👥 {a.participants_count} participantes
                    </span>}
                    {a.nps_score!=null&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:a.nps_score>=30?T.green:a.nps_score>=0?T.amber:T.red }}>
                      NPS: {a.nps_score>0?"+":""}{a.nps_score}
                    </span>}
                    {a.evaluation_score!=null&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:a.evaluation_score>=70?T.green:a.evaluation_score>=50?T.amber:T.red }}>
                      Eval: {a.evaluation_score}
                    </span>}
                  </div>
                  {a.qualitative_summary&&(
                    <div style={{ fontSize:13,color:T.t2,lineHeight:1.55,marginBottom:a.tensions_text?8:0 }}>
                      {a.qualitative_summary}
                    </div>
                  )}
                  {a.tensions_text&&(
                    <div style={{ fontSize:12,color:"#fb923c",background:`${T.amber}08`,
                      border:`1px solid ${T.amber}20`,borderRadius:7,padding:"7px 11px",marginTop:8 }}>
                      ⚠ {a.tensions_text}
                    </div>
                  )}
                  {a.opportunities_text&&(
                    <div style={{ fontSize:12,color:T.green,background:`${T.green}08`,
                      border:`1px solid ${T.green}20`,borderRadius:7,padding:"7px 11px",marginTop:6 }}>
                      ✦ {a.opportunities_text}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                  <Btn variant="ghost" size="sm" onClick={()=>setModal(a)}>Editar</Btn>
                  <Btn variant="ghost" size="sm" onClick={()=>setConfirmId(a.id)}
                    style={{ color:T.red,borderColor:T.red+"40" }}>✕</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:500 }}>
          <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:14,
            padding:"24px 28px",maxWidth:360,width:"100%",
            boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:8 }}>
              ¿Eliminar actividad?
            </div>
            <div style={{ fontSize:13,color:T.t3,marginBottom:20 }}>
              Esta acción no se puede deshacer.
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <Btn variant="danger" onClick={()=>handleDelete(confirmId)}>Eliminar</Btn>
              <Btn variant="ghost" onClick={()=>setConfirmId(null)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {modal&&(
        <ActivityModal
          activity={modal==="new"?null:modal}
          projectId={project.id}
          supabase={supabase}
          onSave={handleSave}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  );
}

// ── Actor Form Modal ───────────────────────────────────────────
function ActorModal({ actor, projectId, supabase, onSave, onClose }) {
  const isEdit = !!actor;
  const [name,     setName]     = useState(actor?.name||"");
  const [type,     setType]     = useState(actor?.actor_type||"");
  const [infl,     setInfl]     = useState(actor?.influence_level||"Media");
  const [engage,   setEngage]   = useState(actor?.engagement_level||"Media");
  const [rel,      setRel]      = useState(actor?.relationship_status||"estable");
  const [notes,    setNotes]    = useState(actor?.notes||"");
  const [visible,  setVisible]  = useState(actor?.visible_to_client??true);
  const [loading,  setLoading]  = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload = {
        project_id: projectId, name, actor_type:type||null,
        influence_level: infl, engagement_level: engage,
        relationship_status: rel, notes, visible_to_client: visible,
      };
      if (isEdit) {
        const { data, error } = await supabase
          .from("project_actors").update({ ...payload, updated_at:new Date().toISOString() })
          .eq("id", actor.id).select().single();
        if (error) throw error;
        onSave(data);
      } else {
        const { data, error } = await supabase
          .from("project_actors").insert(payload).select().single();
        if (error) throw error;
        onSave(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={isEdit?"Editar actor":"Nuevo actor / stakeholder"} onClose={onClose} width={500}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <Input label="Nombre del actor" value={name} onChange={setName}
          placeholder="Ej. Sindicato de Pescadores" style={{ gridColumn:"span 2" }}/>
        <Input label="Tipo de actor" value={type} onChange={setType}
          placeholder="Ej. Comunidad, Gobierno, ONG…"/>
        <Select label="Nivel de influencia" value={infl} onChange={setInfl}
          options={INFLUENCE.map(v=>({ value:v,label:v }))}/>
        <Select label="Nivel de involucramiento" value={engage} onChange={setEngage}
          options={ENGAGEMENT.map(v=>({ value:v,label:v }))}/>
        <Select label="Estado de la relación" value={rel} onChange={setRel}
          options={RELATIONSHIP.map(r=>({ value:r.value,label:r.label }))}
          style={{ gridColumn:"span 2" }}/>
      </div>
      <div style={{ marginBottom:18 }}>
        <Textarea label="Notas" value={notes} onChange={setNotes}
          placeholder="Contexto, historial, consideraciones clave…" rows={3}/>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"12px 16px",background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:20 }}>
        <div>
          <div style={{ fontSize:13,color:T.t1,fontWeight:500,marginBottom:2 }}>Visible para el cliente</div>
          <div style={{ fontSize:11,color:T.t3 }}>El cliente verá este actor en su panel RC.</div>
        </div>
        <Toggle checked={visible} onChange={setVisible}/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="rc" onClick={handleSave} disabled={!name.trim()||loading}>
          {loading?<><Spinner/> Guardando…</>:isEdit?"Guardar":"Agregar actor"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Tab: ACTORES ───────────────────────────────────────────────
function TabActors({ project, actors, supabase, onAdd, onUpdate, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = actors.filter(a=>
    filter==="all"||
    (filter==="visible"&&a.visible_to_client)||
    (filter==="critical"&&a.influence_level==="Crítica")
  );

  function handleSave(saved) {
    const exists = actors.some(a=>a.id===saved.id);
    exists ? onUpdate(saved) : onAdd(saved);
    setModal(null);
  }

  const INFL_COLOR = { "Baja":T.t3,"Media":T.blue,"Alta":T.amber,"Crítica":T.red };
  const relColor = s => RELATIONSHIP.find(r=>r.value===s)?.color||T.t3;
  const relLabel = s => RELATIONSHIP.find(r=>r.value===s)?.label||s;

  return (
    <div className="rc-fade">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
        <div style={{ display:"flex",gap:8 }}>
          {[["all","Todos"],["visible","Visibles al cliente"],["critical","Influencia crítica"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",
              background:filter===v?`${T.rc}18`:"none",color:filter===v?T.rc:T.t3,
              fontSize:12,fontWeight:500,fontFamily:"'Instrument Sans',sans-serif",
              outline:filter===v?`1px solid ${T.rc}30`:"none" }}>{l}</button>
          ))}
        </div>
        <Btn variant="rc" size="sm" onClick={()=>setModal("new")}>+ Agregar actor</Btn>
      </div>

      {/* Summary strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18 }}>
        {[
          { label:"Total actores",      val:actors.length,                                         color:T.blue  },
          { label:"Influencia crítica", val:actors.filter(a=>a.influence_level==="Crítica").length, color:T.red   },
          { label:"Relación en riesgo", val:actors.filter(a=>["tenso","critico"].includes(a.relationship_status)).length, color:T.amber },
        ].map(s=>(
          <div key={s.label} style={{ background:T.s2,border:`1px solid ${T.b1}`,borderRadius:10,padding:"12px 16px" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,color:s.color,marginBottom:2 }}>{s.val}</div>
            <div style={{ fontSize:11,color:T.t3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"48px 0",background:T.s2,
          border:`1px dashed ${T.b2}`,borderRadius:14 }}>
          <div style={{ fontSize:32,marginBottom:12 }}>👥</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
            Sin actores registrados
          </div>
          <div style={{ fontSize:13,color:T.t3,marginBottom:16 }}>
            Mapea los stakeholders del territorio: comunidades, autoridades, ONGs, grupos de interés.
          </div>
          <Btn variant="rc" size="sm" onClick={()=>setModal("new")}>+ Primer actor</Btn>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {filtered.map(a=>(
            <div key={a.id} style={{ background:T.s1,border:`1px solid ${T.b1}`,
              borderRadius:12,padding:"16px 20px",transition:"all .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=relColor(a.relationship_status)+"40";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;}}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
                {/* Influence indicator */}
                <div style={{ width:40,height:40,borderRadius:10,flexShrink:0,
                  background:`${INFL_COLOR[a.influence_level]||T.t3}18`,
                  border:`1px solid ${INFL_COLOR[a.influence_level]||T.t3}30`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                  color:INFL_COLOR[a.influence_level]||T.t3 }}>
                  {a.influence_level==="Crítica"?"🔴":a.influence_level==="Alta"?"🟠":a.influence_level==="Media"?"🟡":"⚪"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1 }}>
                      {a.name}
                    </div>
                    <Pill color={relColor(a.relationship_status)}>● {relLabel(a.relationship_status)}</Pill>
                    {!a.visible_to_client&&(
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:T.t4,background:T.s2,padding:"2px 7px",borderRadius:20 }}>🔒</span>
                    )}
                  </div>
                  <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:a.notes?8:0 }}>
                    <span style={{ fontSize:12,color:T.t3 }}>{a.actor_type||"Sin tipo"}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:INFL_COLOR[a.influence_level]||T.t3 }}>
                      Influencia: {a.influence_level}
                    </span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                      Involucramiento: {a.engagement_level}
                    </span>
                    {a.last_interaction_at&&(
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t4 }}>
                        Última int.: {new Date(a.last_interaction_at).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}
                      </span>
                    )}
                  </div>
                  {a.notes&&(
                    <div style={{ fontSize:12,color:T.t3,lineHeight:1.5,
                      background:T.s2,border:`1px solid ${T.b1}`,borderRadius:7,
                      padding:"8px 12px",marginTop:6 }}>{a.notes}</div>
                  )}
                </div>
                <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                  <Btn variant="ghost" size="sm" onClick={()=>setModal(a)}>Editar</Btn>
                  <Btn variant="ghost" size="sm" onClick={()=>setConfirmId(a.id)}
                    style={{ color:T.red,borderColor:T.red+"40" }}>✕</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:500 }}>
          <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:14,
            padding:"24px 28px",maxWidth:360,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:8 }}>
              ¿Eliminar actor?
            </div>
            <div style={{ fontSize:13,color:T.t3,marginBottom:20 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display:"flex",gap:10 }}>
              <Btn variant="danger" onClick={async()=>{ await supabase.from("project_actors").delete().eq("id",confirmId); onDelete(confirmId); setConfirmId(null); }}>Eliminar</Btn>
              <Btn variant="ghost" onClick={()=>setConfirmId(null)}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {modal&&(
        <ActorModal
          actor={modal==="new"?null:modal}
          projectId={project.id}
          supabase={supabase}
          onSave={handleSave}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  );
}
// saveProjectScore imported from ../lib/scores.js

function TabUpload({ project, supabase, onApplyScores }) {
  const [files,        setFiles]        = useState([]);
  const [busy,         setBusy]         = useState(false);
  const [prop,         setProp]         = useState(null);
  const [drag,         setDrag]         = useState(false);
  const [uploadedFiles,setUploadedFiles]= useState([]);
  const [sourceFileName, setSourceFileName] = useState(null);
  const ref = useRef();

  async function loadUploadedFiles() {
    if (!supabase || !project?.id) return;
    const { data } = await supabase.from("client_files")
      .select("id, original_name, mime_type, size_bytes, created_at, status")
      .eq("project_id", project.id)
      .eq("module_key", "rc")
      .order("created_at", { ascending: false });
    setUploadedFiles(data || []);
  }

  useEffect(() => { loadUploadedFiles(); }, [supabase, project?.id]);

  const add = list => setFiles(p=>[...p,...Array.from(list).map(f=>({
    name:f.name,
    type:f.name.match(/\.(xlsx|csv)/i)?"excel":f.name.match(/\.pdf/i)?"pdf":
         f.name.match(/\.docx?/i)?"doc":"txt",
    raw:f,
  }))]);

  const fIcon = t=>({excel:"📊",pdf:"📄",doc:"📝",txt:"📋"})[t]||"📎";

  // Lee el archivo como texto (csv, txt, docx parcial)
  async function readFileForUpload(file) {
    const raw  = file.raw || file;
    const name = file.name || raw.name || "";
    const ext  = name.split(".").pop().toLowerCase();
    const isPdfOrExcel = ["pdf","xlsx","xls","ods"].includes(ext);

    return new Promise((resolve) => {
      const reader = new FileReader();
      if (isPdfOrExcel) {
        // Send as base64 so server can extract text properly
        reader.onload = e => {
          const b64 = e.target.result?.split(",")[1] || "";
          resolve({ name, base64: b64, content: null, mimeType: raw.type || "" });
        };
        reader.readAsDataURL(raw);
      } else {
        reader.onload = e => resolve({
          name, content: e.target.result?.slice(0, 15000) || "", base64: null
        });
        reader.onerror = () => resolve({ name, content: "", base64: null });
        reader.readAsText(raw, "utf-8");
      }
    });
  }

  async function loadProjectContext() {
    if (!supabase || !project?.id) return {};
    const [logRes, actorsRes, commRes, actRes] = await Promise.all([
      supabase.from("project_score_log").select("method,dimension,value_before,value_after,created_at")
        .eq("project_id", project.id).order("created_at",{ascending:false}).limit(8),
      supabase.from("project_actors").select("name,actor_type,influence_level,relationship_status")
        .eq("project_id", project.id).limit(15),
      supabase.from("project_commitments").select("title,status,due_date")
        .eq("project_id", project.id).neq("status","completed").limit(10),
      supabase.from("project_activities").select("title,activity_date,nps_score")
        .eq("project_id", project.id).order("activity_date",{ascending:false}).limit(5),
    ]);
    return {
      scoreHistory:      logRes.data    || [],
      actors:            actorsRes.data || [],
      commitments:       commRes.data   || [],
      recentActivities:  actRes.data    || [],
    };
  }


  async function uploadAndRegister(file) {
    if (!supabase || !project?.client_id) return null;
    const ts   = Date.now();
    const path = `${project.client_id}/rc/${project.id}/${ts}_${file.name}`;

    // Subir al bucket
    const { error: uploadErr } = await supabase.storage
      .from("rc-documents").upload(path, file.raw || file, { upsert: false });

    if (uploadErr && !uploadErr.message?.includes("already exists") && uploadErr.statusCode !== 409) {
      console.warn("Storage RC upload:", uploadErr.message);
      return null;
    }

    // Registrar en client_files
    const { error: insertErr } = await supabase.from("client_files").insert({
      client_id:      project.client_id,
      project_id:     project.id,
      module_key:     "rc",
      storage_bucket: "rc-documents",
      storage_path:   path,
      original_name:  file.name,
      mime_type:      file.raw?.type || "application/octet-stream",
      size_bytes:     file.raw?.size || 0,
      status:         "uploaded",
    });
    if (insertErr) console.warn("client_files insert:", insertErr.message);

    return path;
  }

  async function analyze() {
    if (!files.length) return;
    setBusy(true); setProp(null);
    try {
      // 1. Subir archivos al bucket y registrar en client_files
      await Promise.all(files.map(f => uploadAndRegister(f)));
      await loadUploadedFiles(); // Refresh history

      // 2. Leer archivos (base64 para PDF/Excel, texto para el resto)
      const fileContents = await Promise.all(files.map(f => readFileForUpload(f)));

      // 3. Cargar contexto del proyecto (historial, actores, compromisos)
      const projectContext = await loadProjectContext();

      // 4. Llamar al endpoint de Vercel
      const res = await fetch("/api/analyze-rc", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContents,
          projectName:   project.name,
          currentScores: project.score || {},
          projectContext,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en el servidor");
      }

      const result = await res.json();
      setSourceFileName(fileContents?.[0]?.name || null);
      setProp(result);
    } catch(e) {
      console.error("Analyze RC error:", e);
      setProp({ summary: `Error: ${e.message}`, insights: [], proposed_scores: {} });
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    const newScores = {};
    Object.entries(prop.proposed_scores).forEach(([k,v])=>{ if(v.proposed!=null) newScores[k]=v.proposed; });
    // Persistir en Supabase
    if (supabase && project?.id) {
      const overall = Math.round(
        DIMENSIONS.reduce((acc,d)=>acc+(newScores[d.key]||project.score?.[d.key]||0)*d.weight/100, 0)
      );
      await saveProjectScore(supabase, project.id, {
        overall_score:         overall,
        dimension_scores_json: { ...project.score, ...newScores },
      }, { method: 'ai_analysis', notes: prop.summary, sourceFile: sourceFileName });
      await syncClientScore(supabase, project.client_id, "rc",
        { ...project.score, ...newScores }, overall);
    }

    // Crear compromisos marcados en Supabase
    if (supabase && project?.id && prop.proposed_commitments?.length) {
      const toCreate = prop.proposed_commitments.filter(c => c._include !== false);
      for (const cm of toCreate) {
        await supabase.from("project_commitments").insert({
          project_id:  project.id,
          title:       cm.title,
          description: cm.description || null,
          responsible: cm.responsible || null,
          due_date:    cm.due_date || null,
          status:      "pending",
          commitment_type: "general",
        });
      }
    }
    onApplyScores(newScores);
    setProp(null); setFiles([]);
  }

  const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;

  return (
    <div className="rc-fade">
      {/* Context panel */}
      <div style={{ padding:"14px 18px",background:`${T.rc}08`,border:`1px solid ${T.rc}25`,
        borderRadius:10,marginBottom:20,fontSize:13,color:"#fb923c",lineHeight:1.55 }}>
        <strong>Proyecto activo:</strong> {project.name} · Los archivos se almacenarán en el bucket <code style={{ background:`${T.rc}15`,padding:"1px 6px",borderRadius:4,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>rc-documents</code> bajo la ruta <code style={{ background:`${T.rc}15`,padding:"1px 6px",borderRadius:4,fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>{"{client_id}/rc/{project_id}/"}</code>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Carga de archivos
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:18,lineHeight:1.6 }}>
          Sube actas, encuestas, reportes o notas. La IA extrae indicadores relevantes y propone actualizaciones de score para tu revisión y confirmación.
        </div>

        {/* Drop zone */}
        <div onClick={()=>ref.current.click()}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}}
          style={{ border:`2px dashed ${drag?T.rc:T.b2}`,borderRadius:12,padding:28,
            textAlign:"center",cursor:"pointer",background:drag?`${T.rc}08`:T.s2,transition:"all .2s" }}>
          <div style={{ fontSize:28,marginBottom:8 }}>📁</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:4 }}>
            Arrastra archivos o haz clic
          </div>
          <div style={{ fontSize:12,color:T.t3 }}>Actas .docx · Encuestas .xlsx · Reportes .pdf · Notas .txt</div>
          <input ref={ref} type="file" multiple style={{ display:"none" }} onChange={e=>add(e.target.files)}/>
        </div>

        {files.length>0&&(
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:12 }}>
            {files.map((f,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:7,background:T.s3,
                border:`1px solid ${T.b2}`,borderRadius:7,padding:"5px 11px",fontSize:12,color:T.t2 }}>
                <span>{fIcon(f.type)}</span><span>{f.name}</span>
                <span onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                  style={{ cursor:"pointer",color:T.t4,marginLeft:2 }}>✕</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex",gap:10,marginTop:16 }}>
          <Btn variant="rc" onClick={analyze} disabled={!files.length||busy}>
            {busy?<><Spinner/> Analizando…</>:"✦ Analizar con IA"}
          </Btn>
          <Btn variant="ghost" onClick={()=>{setFiles([]);setProp(null);}}>Limpiar</Btn>
        </div>
      </Card>

      {/* Analyzing */}
      {busy&&(
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
            <span style={{ background:`${T.rc}18`,color:T.rc,border:`1px solid ${T.rc}30`,
              borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>✦ IA</span>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:T.t3 }}>
              <Spinner/> Procesando archivos…
            </div>
          </div>
          {["Detectando tipo de contenido y formato",
            "Extrayendo indicadores relevantes para LSO",
            "Calculando propuesta de scores por dimensión",
            "Identificando tensiones y oportunidades"].map((s,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:9,padding:"6px 0",
              color:T.t3,fontSize:13 }}>
              <Spinner/>{s}
            </div>
          ))}
        </Card>
      )}

      {/* Proposal */}
      {prop&&(
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
            <span style={{ background:`${T.rc}18`,color:T.rc,border:`1px solid ${T.rc}30`,
              borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>
              ✦ Propuesta IA
            </span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
              RC · Proyecto {project.name}
            </span>
          </div>

          {/* Summary + consistency */}
          <div style={{ fontSize:13,color:T.t2,marginBottom:12,lineHeight:1.65,
            background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,padding:"14px 16px" }}>
            {prop.summary}
          </div>
          {prop.source_consistency && (
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginBottom:14,
              padding:"4px 12px",borderRadius:20,fontSize:11,
              fontFamily:"'JetBrains Mono',monospace",
              background:prop.source_consistency==="consistente"?`${T.green}12`:
                         prop.source_consistency==="contradictoria"?`${T.red}12`:`${T.amber}12`,
              color:prop.source_consistency==="consistente"?T.green:
                    prop.source_consistency==="contradictoria"?T.red:T.amber }}>
              {prop.source_consistency==="consistente"?"✓ Fuentes consistentes":
                prop.source_consistency==="contradictoria"?"⚠ Fuentes contradictorias":
                "~ Fuentes mixtas"}
            </div>
          )}

          {/* Insights */}
          {prop.insights.length>0&&(
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
                letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                Hallazgos identificados
              </div>
              {prop.insights.map((ins,i)=>(
                <div key={i} style={{ display:"flex",gap:10,padding:"8px 0",
                  borderBottom:`1px solid ${T.b1}`,fontSize:13,color:T.t2 }}>
                  <span style={{ color:T.rc,flexShrink:0 }}>✦</span>{ins}
                </div>
              ))}
            </div>
          )}

          {/* Score proposals */}
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:1.5,textTransform:"uppercase",marginBottom:12 }}>
            Propuesta de actualización de scores
          </div>
          {Object.entries(prop.proposed_scores).map(([key,s])=>{
            const dim = DIMENSIONS.find(d=>d.key===key);
            const changed = s.proposed!==s.current;
            return (
              <div key={key} style={{ background:T.s2,border:`1px solid ${changed?T.rc+"30":T.b1}`,
                borderRadius:9,padding:"12px 16px",marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                    <span style={{ fontSize:13,color:T.t1,fontWeight:500 }}>{dim?.label}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
                      background:T.s3,padding:"1px 5px",borderRadius:3 }}>{dim?.weight}%</span>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:T.t3 }}>
                      {s.current}
                    </span>
                    <span style={{ color:T.t4 }}>→</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,
                      color:changed?sc(s.proposed):T.t3 }}>{s.proposed}</span>
                    {changed&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:s.proposed>s.current?T.green:T.red }}>
                      {s.proposed>s.current?`↑ +${s.proposed-s.current}`:`↓ ${s.proposed-s.current}`}
                    </span>}
                  </div>
                </div>
                <div style={{ fontSize:12,color:T.t3 }}>{s.reason}</div>
              </div>
            );
          })}

          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,marginTop:18 }}>
            O ajusta manualmente antes de aplicar
          </div>

          {/* Proposed commitments */}
          {prop.proposed_commitments?.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
                letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                Compromisos detectados en el documento ({prop.proposed_commitments.length})
              </div>
              <div style={{ fontSize:12,color:T.t3,marginBottom:12 }}>
                Revisa y edita antes de crear. Los compromisos marcados se agregarán al proyecto.
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {prop.proposed_commitments.map((c,i)=>(
                  <div key={i} style={{ padding:"12px 14px",background:T.s2,
                    border:`1px solid ${T.b1}`,borderRadius:10 }}>
                    <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                      <input type="checkbox" defaultChecked
                        onChange={e=>{
                          const updated=[...prop.proposed_commitments];
                          updated[i]={...updated[i],_include:e.target.checked};
                          setProp(p=>({...p,proposed_commitments:updated}));
                        }}
                        style={{ marginTop:3,accentColor:T.rc,flexShrink:0 }}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,color:T.t1,fontWeight:600,marginBottom:3 }}>{c.title}</div>
                        {c.description&&<div style={{ fontSize:12,color:T.t3,marginBottom:4 }}>{c.description}</div>}
                        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                          {c.responsible&&<span style={{ fontSize:11,color:T.t3 }}>👤 {c.responsible}</span>}
                          {c.due_date&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.amber }}>📅 {c.due_date}</span>}
                        </div>
                        {c.source_quote&&(
                          <div style={{ fontSize:11,color:T.t4,fontStyle:"italic",
                            marginTop:6,padding:"4px 8px",background:T.s1,borderRadius:6 }}>
                            "{c.source_quote}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20 }}>
            {Object.entries(prop.proposed_scores).map(([key,s])=>{
              const dim = DIMENSIONS.find(d=>d.key===key);
              return (
                <div key={key}>
                  <div style={{ fontSize:11,color:T.t3,marginBottom:5 }}>{dim?.label}</div>
                  <input type="number" defaultValue={s.proposed} min={0} max={100}
                    onChange={e=>setProp(p=>({...p,proposed_scores:{...p.proposed_scores,
                      [key]:{...p.proposed_scores[key],proposed:parseInt(e.target.value)||0}}}))}
                    style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:7,
                      padding:"8px 11px",color:T.t1,fontSize:13,outline:"none",
                      fontFamily:"'JetBrains Mono',monospace",textAlign:"center",
                      transition:"border-color .15s" }}
                    onFocus={e=>e.target.style.borderColor=T.rc}
                    onBlur={e=>e.target.style.borderColor=T.b2}/>
                </div>
              );
            })}
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <Btn variant="success" onClick={handleApply}>✓ Aplicar propuesta</Btn>
            <Btn variant="ghost"   onClick={()=>setProp(null)}>Descartar</Btn>
          </div>
        </Card>
      )}

      {/* Encuestas externas */}
      {supabase && project?.id && (
        <div style={{ marginTop:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:14 }}>
            Encuestas externas
          </div>
          <SurveyManager
            project={project}
            moduleKey="rc"
            supabase={supabase}
            accentColor={T.rc}/>
        </div>
      )}

      {/* Historial de archivos subidos */}
      {uploadedFiles.length > 0 && (
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Archivos subidos ({uploadedFiles.length})
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {uploadedFiles.map(f => (
              <div key={f.id} style={{ display:"flex",alignItems:"center",gap:12,
                padding:"10px 14px",background:T.s2,borderRadius:9,
                border:`1px solid ${T.b1}` }}>
                <span style={{ fontSize:18,flexShrink:0 }}>
                  {f.mime_type?.includes("pdf")?"📄":f.mime_type?.includes("sheet")?"📊":
                   f.mime_type?.includes("word")?"📝":"📋"}
                </span>
                <div style={{ flex:1,overflow:"hidden" }}>
                  <div style={{ fontSize:13,color:T.t1,fontWeight:500,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                    {f.original_name}
                  </div>
                  <div style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",marginTop:2 }}>
                    {new Date(f.created_at).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
                    {f.size_bytes ? ` · ${(f.size_bytes/1024).toFixed(1)} KB` : ""}
                  </div>
                </div>
                <span style={{ padding:"2px 8px",borderRadius:20,fontSize:10,
                  fontFamily:"'JetBrains Mono',monospace",
                  background:`${T.green}12`,color:T.green,border:`1px solid ${T.green}25` }}>
                  ✓ subido
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────
export default function ModuleRC({ client, supabase }) {
  const [projects,    setProjects]    = useState([]);
  const [selProjId,   setSelProjId]   = useState(null);
  const [activities,  setActivities]  = useState([]);
  const [actors,      setActors]      = useState([]);
  const [tab,         setTab]         = useState("score");
  const [projCommitments, setProjCommitments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);

  useEffect(() => {
    if (!supabase || !client?.id) return;
    loadProjects();
  }, [supabase, client?.id]);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data: projs, error: pErr } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", client.id)
        .eq("module_key", "rc")
        .order("starts_on", { ascending: false });
      if (pErr) throw pErr;

      if (!projs?.length) { setProjects([]); setLoading(false); return; }

      const ids = projs.map(p=>p.id);

      const [scoresRes, activitiesRes, actorsRes] = await Promise.all([
        supabase.from("project_scores").select("*").in("project_id", ids)
          .order("updated_at", { ascending: false }),
        supabase.from("project_activities").select("*").in("project_id", ids)
          .order("activity_date", { ascending: false }),
        supabase.from("project_actors").select("*").in("project_id", ids)
          .order("influence_level", { ascending: false }),
      ]);

      const projectsWithScores = projs.map(p => {
        const ps = scoresRes.data?.find(s=>s.project_id===p.id);
        const dimScores = ps?.dimension_scores_json || {};
        return {
          ...p,
          score: {
            overall:       ps?.overall_score ?? null,
            percepcion:    dimScores.percepcion    ?? null,
            compromisos:   dimScores.compromisos   ?? null,
            dialogo:       dimScores.dialogo       ?? null,
            conflictividad:dimScores.conflictividad?? null,
          },
          history: [],
        };
      });

      setProjects(projectsWithScores);
      setSelProjId(projectsWithScores[0]?.id || null);
      setActivities(activitiesRes.data || []);
      setActors(actorsRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const selProject      = projects.find(p=>p.id===selProjId) || projects[0];
  const projActivities  = activities.filter(a=>a.project_id===selProjId);
  const projActors      = actors.filter(a=>a.project_id===selProjId);

  async function updateProject(updated) {
    setProjects(p=>p.map(pr=>pr.id===updated.id?updated:pr));
    // Persist client_visible toggle
    if (supabase && 'client_visible' in updated) {
      const { error } = await supabase.from("projects")
        .update({ client_visible:updated.client_visible, updated_at:new Date().toISOString() })
        .eq("id", updated.id);
      if (error) console.error('client_visible update error:', error);
    }
  }

  async function applyScores(newScores) {
    const updated = projects.map(pr => {
      if (pr.id !== selProjId) return pr;
      const merged = { ...pr.score, ...newScores };
      const overall = Math.round(DIMENSIONS.reduce((acc,d)=>acc+(merged[d.key]||0)*d.weight/100,0));
      return { ...pr, score:{ ...merged, overall } };
    });
    setProjects(updated);

    // Persistir en Supabase
    if (supabase && selProjId) {
      const proj    = updated.find(p=>p.id===selProjId);
      const overall = proj?.score?.overall ?? 0;
      await saveProjectScore(supabase, selProjId, {
        overall_score:         overall,
        dimension_scores_json: { ...proj?.score },
      });
      await syncClientScore(supabase, proj?.client_id, "rc",
        proj?.score || {}, overall);
    }
    setTab("score");
  }

  const STATUS_META = {
    active:{ label:"Activo",  color:T.green },
    draft: { label:"Borrador",color:T.t3   },
    paused:{ label:"Pausado", color:T.amber },
    closed:{ label:"Cerrado", color:T.t4   },
  };

  const TABS = [
    { id:"score",       label:"Score LSO"   },
    { id:"activities",  label:`Actividades ${projActivities.length>0?`(${projActivities.length})`:""}`  },
    { id:"actors",      label:`Actores ${projActors.length>0?`(${projActors.length})`:""}`      },
    { id:"commitments", label:`Compromisos${projCommitments?.length>0?` (${projCommitments.length})`:""}`},
    { id:"files",       label:"Archivos"    },
    { id:"surveys",     label:"Encuestas"    },
    { id:"upload",      label:"Carga IA"    },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ padding:"32px 36px",maxWidth:1200 }}>

        {/* Page header */}
        <div className="rc-fade" style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.rc,
            letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>
            🤝 Relacionamiento Comunitario
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:30,color:T.t1,
            letterSpacing:-.5,marginBottom:4 }}>Índice LSO</div>
          <div style={{ fontSize:13,color:T.t2 }}>
            Licencia Social de Operación · {client?.name||"Cliente"}
          </div>
        </div>

        {/* Project selector */}
        <div className="rc-fade rc-d1" style={{ marginBottom:22 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>Proyecto activo</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {projects.map(p=>{
              const st = STATUS_META[p.status]||STATUS_META.draft;
              const isActive = p.id===selProjId;
              return (
                <div key={p.id} onClick={()=>setSelProjId(p.id)} style={{
                  padding:"10px 16px",borderRadius:11,cursor:"pointer",transition:"all .15s",
                  border:`1px solid ${isActive?`${T.rc}50`:T.b2}`,
                  background:isActive?`${T.rc}10`:T.s2,
                  display:"flex",alignItems:"center",gap:10 }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,
                      color:isActive?T.t1:T.t2,marginBottom:2 }}>{p.name}</div>
                    <div style={{ display:"flex",gap:8 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:st.color }}>● {st.label}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:isActive?T.rc:T.t4 }}>LSO: {p.score.overall}</span>
                      {!p.client_visible&&<span style={{ fontFamily:"'JetBrains Mono',monospace",
                        fontSize:10,color:T.t4 }}>🔒 No visible</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project visibility toggle */}
        {selProject&&(
          <div className="rc-fade rc-d2" style={{ display:"flex",alignItems:"center",
            justifyContent:"space-between",padding:"12px 18px",
            background:selProject.client_visible?`${T.green}08`:`${T.t3}08`,
            border:`1px solid ${selProject.client_visible?T.green+"30":T.b2}`,
            borderRadius:10,marginBottom:20 }}>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:T.t1,marginBottom:2 }}>
                {selProject.client_visible
                  ?"Este proyecto es visible para el cliente"
                  :"Este proyecto está oculto al cliente"}
              </div>
              <div style={{ fontSize:11,color:T.t3 }}>
                {selProject.client_visible
                  ?"El cliente puede ver scores, actores y actividades marcadas como visibles."
                  :"El cliente no ve este proyecto ni sus datos."}
              </div>
            </div>
            <Toggle checked={selProject.client_visible}
              onChange={v=>updateProject({...selProject,client_visible:v})}
              color={T.green}/>
          </div>
        )}

        {/* Línea base */}
        {selProject && !loading && (
          <div style={{ padding:"12px 18px",background:`${T.rc}08`,
            border:`1px solid ${T.rc}25`,borderRadius:10,marginBottom:20,
            display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13,color:T.t1,fontWeight:600,marginBottom:2 }}>Instrumento de observación directa</div>
              <div style={{ fontSize:12,color:T.t3 }}>
                Genera o actualiza la medición completando el cuestionario de observación.
              </div>
            </div>
            <button onClick={()=>setShowBaseline(true)} style={{
              padding:"8px 16px",background:T.rc,border:"none",borderRadius:8,
              color:"#08090c",fontSize:12,fontWeight:600,cursor:"pointer",
              fontFamily:"'Instrument Sans',sans-serif",whiteSpace:"nowrap",marginLeft:16
            }}>
              Aplicar instrumento
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex",gap:3,marginBottom:24,background:T.s2,
          borderRadius:10,padding:4,width:"fit-content" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"7px 16px",borderRadius:7,border:"none",
              background:tab===t.id?T.s1:"none",color:tab===t.id?T.t1:T.t3,
              fontSize:13,fontWeight:500,cursor:"pointer",
              fontFamily:"'Instrument Sans',sans-serif",
              boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,.3)":"none",
              transition:"all .15s" }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div style={{ display:"flex",alignItems:"center",gap:10,color:T.t3,
            fontFamily:"'JetBrains Mono',monospace",fontSize:13,padding:"48px 0" }}>
            <span style={{ width:14,height:14,border:`2px solid ${T.b2}`,borderTopColor:T.rc,
              borderRadius:"50%",animation:"rcSpin .8s linear infinite",display:"inline-block" }}/>
            Cargando proyectos…
          </div>
        ) : !selProject ? (
          <div style={{ textAlign:"center",padding:"48px 0",background:T.s2,
            border:`1px dashed ${T.b2}`,borderRadius:14 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
              Sin proyectos RC
            </div>
            <div style={{ fontSize:13,color:T.t3 }}>
              Crea el primer proyecto RC desde Gestión de Clientes.
            </div>
          </div>
        ) : (
          <>
            {tab==="score"&&(
              <TabScore project={selProject} supabase={supabase} onUpdate={updateProject}/>
            )}
            {tab==="activities"&&(
              <TabActivities project={selProject} activities={projActivities}
                supabase={supabase}
                onAddActivity={a=>setActivities(p=>[a,...p])}
                onUpdateActivity={a=>setActivities(p=>p.map(x=>x.id===a.id?a:x))}
                onDeleteActivity={id=>setActivities(p=>p.filter(x=>x.id!==id))}/>
            )}
            {tab==="actors"&&(
              <TabActors project={selProject} actors={projActors}
                supabase={supabase}
                onAdd={a=>setActors(p=>[...p,a])}
                onUpdate={a=>setActors(p=>p.map(x=>x.id===a.id?a:x))}
                onDelete={id=>setActors(p=>p.filter(x=>x.id!==id))}/>
            )}
            {tab==="upload"&&(
              <TabUpload project={selProject} supabase={supabase} onApplyScores={applyScores}/>
            )}
            {tab==="files"&&(
              <FilesPanel
                projectId={selProject.id}
                moduleKey="rc"
                supabase={supabase}
                isConsultant={true}
                accentColor={T.rc}/>
            )}
            {tab==="surveys"&&(
              <SurveyManager
                projectId={selProject.id}
                moduleKey="rc"
                supabase={supabase}
                accentColor={T.rc}
                onApplyScores={(scores, notes) => {
                  applyScores(scores);
                  // Also save with source info
                  if (supabase && selProject.id) {
                    saveProjectScore(supabase, selProject.id, {
                      overall_score: scores.overall,
                      dimension_scores_json: scores,
                    }, { method: 'baseline_instrument', notes });
                  }
                }}/>
            )}
            {tab==="commitments"&&(
              <CommitmentsPanel
                projectId={selProject.id}
                clientId={selProject.client_id}
                moduleKey="rc"
                supabase={supabase}
                isConsultant={true}
                accentColor={T.rc}/>
            )}
          </>
        )}
      </div>
      {showBaseline && selProject && (
        <BaselineInstrument
          moduleKey="rc"
          project={selProject}
          supabase={supabase}
          onComplete={(scores) => {
            setShowBaseline(false);
            // Update local state with new scores
            setProjects(p=>p.map(pr=>pr.id===selProjId
              ? {...pr, score:scores}
              : pr));
          }}
          onClose={()=>setShowBaseline(false)}/>
      )}
    </>
  );
}
