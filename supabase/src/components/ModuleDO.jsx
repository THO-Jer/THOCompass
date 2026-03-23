// ============================================================
// ModuleDO.jsx
// Módulo de Desarrollo Organizacional — THO Compass v4
// Vista Consultora completa.
//
// Estructura:
//   Selector de proyecto DO activo
//   Tab Score ISO    → dimensiones, ingreso manual, evolución
//   Tab Diagnósticos → registro de instrumentos aplicados
//   Tab Carga IA     → upload + análisis + propuesta de scores
//
// Supabase queries documentadas en cada función mock.
// Tablas utilizadas: projects, project_activities, project_scores,
//                    client_files (bucket: do-documents)
// ============================================================

import { useState, useRef, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, Cell,
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
.do-fade{animation:doFade .35s cubic-bezier(.4,0,.2,1) both;}
.do-d1{animation-delay:.06s;} .do-d2{animation-delay:.12s;}
.do-d3{animation-delay:.18s;} .do-d4{animation-delay:.24s;}
@keyframes doFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes doSpin{to{transform:rotate(360deg)}}
`;

// ── DO Dimensions ──────────────────────────────────────────────
const DIMENSIONS = [
  { key:"cultura",    label:"Cultura organizacional", weight:35,
    tooltip:"Mide la coherencia entre los valores declarados y los comportamientos observados en la práctica. Se alimenta de cuestionarios de cultura y focus groups.",
    sub_dims:[
      { key:"valores",       label:"Valores en práctica" },
      { key:"comunicacion",  label:"Comunicación interna" },
      { key:"identidad",     label:"Identidad y pertenencia" },
      { key:"innovacion",    label:"Apertura al cambio" },
    ]},
  { key:"engagement", label:"Engagement y clima",    weight:35,
    tooltip:"Evalúa motivación, satisfacción y sentido de pertenencia. Basado en eNPS y encuestas de clima adaptadas al cliente.",
    sub_dims:[
      { key:"enps",          label:"eNPS" },
      { key:"satisfaccion",  label:"Satisfacción general" },
      { key:"retencion",     label:"Intención de permanencia" },
      { key:"bienestar",     label:"Bienestar percibido" },
    ]},
  { key:"liderazgo",  label:"Liderazgo",             weight:30,
    tooltip:"Mide la percepción de jefaturas directas en comunicación, desarrollo de equipo y orientación al logro. Fuente: evaluación 180°.",
    sub_dims:[
      { key:"comunicacion_l", label:"Comunicación efectiva" },
      { key:"desarrollo",     label:"Desarrollo de equipo" },
      { key:"logro",          label:"Orientación al logro" },
      { key:"empatia",        label:"Empatía y escucha" },
    ]},
];

const INSTRUMENT_TYPES = [
  { value:"survey_clima",   label:"Encuesta de clima",          icon:"📋" },
  { value:"survey_enps",    label:"Encuesta eNPS",              icon:"📊" },
  { value:"cultura_diag",   label:"Diagnóstico de cultura",     icon:"🏛" },
  { value:"interview",      label:"Entrevista individual",      icon:"🎙" },
  { value:"focus_group",    label:"Focus group",                icon:"👥" },
  { value:"eval_180",       label:"Evaluación 180°",            icon:"🔄" },
  { value:"workshop",       label:"Taller diagnóstico",         icon:"🏗" },
  { value:"other",          label:"Otro instrumento",           icon:"📝" },
];

const STATUS_META = {
  draft: { label:"Borrador", color:T.t3   },
  active:{ label:"Activo",   color:T.green },
  paused:{ label:"Pausado",  color:T.amber },
  closed:{ label:"Cerrado",  color:T.t4   },
};

// ── Mock data ──────────────────────────────────────────────────
// Query: SELECT p.*, ps.overall_score, ps.dimension_scores_json
//        FROM projects p
//        LEFT JOIN project_scores ps ON ps.project_id = p.id
//        WHERE p.client_id = :clientId AND p.module_key = 'do'
//        ORDER BY p.status, p.starts_on DESC
const MOCK_PROJECTS = [
  {
    id:"p3", name:"Diagnóstico Clima Laboral 2025", status:"active",
    project_type:"organizational", scope:"Empresa completa",
    description:"Diagnóstico integral de clima y cultura organizacional Q1-Q2 2025.",
    starts_on:"2025-02-01", ends_on:"2025-07-31",
    client_visible:true,
    score:{
      overall:78,
      cultura:80, engagement:76, liderazgo:78,
      sub:{
        cultura:{ valores:82, comunicacion:78, identidad:80, innovacion:79 },
        engagement:{ enps:72, satisfaccion:78, retencion:76, bienestar:77 },
        liderazgo:{ comunicacion_l:80, desarrollo:76, logro:79, empatia:77 },
      }
    },
    history:[
      { period:"Q3 2024", score:70 },
      { period:"Q4 2024", score:74 },
      { period:"Q1 2025", score:78 },
    ],
    participants:{ total:320, responded:284, rate:88.7 },
  },
  {
    id:"p6", name:"Diagnóstico Gerencia Operaciones", status:"active",
    project_type:"organizational", scope:"Gerencia de Operaciones",
    description:"Diagnóstico focalizado en la gerencia de operaciones.",
    starts_on:"2025-03-01", ends_on:null,
    client_visible:false,
    score:{
      overall:65,
      cultura:62, engagement:68, liderazgo:65,
      sub:{
        cultura:{ valores:60, comunicacion:62, identidad:65, innovacion:60 },
        engagement:{ enps:65, satisfaccion:68, retencion:70, bienestar:68 },
        liderazgo:{ comunicacion_l:64, desarrollo:65, logro:67, empatia:63 },
      }
    },
    history:[ { period:"Q1 2025", score:65 } ],
    participants:{ total:45, responded:38, rate:84.4 },
  },
];

// Query: SELECT * FROM project_activities
//        WHERE project_id = :projectId
//        ORDER BY activity_date DESC
const MOCK_INSTRUMENTS = [
  { id:"i1", project_id:"p3", record_type:"survey_clima",
    title:"Encuesta de clima organizacional Q1 2025",
    activity_date:"2025-02-20", participants_count:284, organizations_count:null,
    evaluation_score:76,
    qualitative_summary:"Alta tasa de respuesta (88.7%). Dimensión de bienestar obtuvo el puntaje más bajo. El área de operaciones muestra mayor desvinculación.",
    tensions_text:"Percepción negativa de comunicación descendente en mandos medios.",
    opportunities_text:"Alta valoración del trabajo en equipo y cultura de seguridad.",
    consultant_notes:"Los resultados de operaciones sugieren intervención focalizada. Ver proyecto Gerencia Operaciones.",
    visible_to_client:true },
  { id:"i2", project_id:"p3", record_type:"focus_group",
    title:"Focus group cultura — grupo ejecutivo",
    activity_date:"2025-03-05", participants_count:8, organizations_count:null,
    evaluation_score:80,
    qualitative_summary:"Alta cohesión en el nivel ejecutivo. Visión compartida de los valores. Tensiones respecto a la implementación operacional de los valores declarados.",
    tensions_text:"Brecha percibida entre valores declarados y conductas de mandos medios.",
    opportunities_text:"Disposición para programa de formación en liderazgo valórico.",
    consultant_notes:"Resultado consistente con encuesta. Proponer taller de alineación cultural Q2.",
    visible_to_client:false },
  { id:"i3", project_id:"p3", record_type:"cultura_diag",
    title:"Diagnóstico de cultura — cuestionario Denison adaptado",
    activity_date:"2025-02-28", participants_count:250, organizations_count:null,
    evaluation_score:79,
    qualitative_summary:"Fortalezas en misión y consistencia. Oportunidad de mejora en adaptabilidad e involucramiento.",
    tensions_text:"",
    opportunities_text:"Potencial para programa de innovación interno.",
    consultant_notes:"Resultados del modelo Denison adjuntos en informe PDF.",
    visible_to_client:true },
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
  const v = {
    primary:{ background:T.blue, color:"white" },
    ghost:  { background:"none", color:T.t2, border:`1px solid ${T.b2}` },
    danger: { background:"none", color:T.red, border:`1px solid ${T.red}30` },
    do:     { background:`${T.do}18`, color:T.do, border:`1px solid ${T.do}30` },
    success:{ background:T.green, color:"#08090c" },
  };
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.15)";}}
    onMouseLeave={e=>{e.currentTarget.style.filter="none";}}>{children}</button>;
};

const Toggle = ({ checked, onChange, color=T.do }) => (
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
      onFocus={e=>e.target.style.borderColor=T.do}
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
      onFocus={e=>e.target.style.borderColor=T.do}
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
  const [show,setShow] = useState(false);
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
  borderTopColor:"white",borderRadius:"50%",animation:"doSpin .8s linear infinite",display:"inline-block" }}/>;

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
          <button onClick={onClose} style={{ background:"none",border:"none",
            color:T.t3,cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Score Bar with sub-dimensions ─────────────────────────────
function DimScoreBlock({ dim, scores, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const sc = v => v>=70?T.green:v>=50?T.amber:T.red;
  const val = scores[dim.key];

  return (
    <div style={{ marginBottom:16, background:T.s2, border:`1px solid ${T.b1}`,
      borderRadius:10, overflow:"hidden" }}>
      {/* Main dimension row */}
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:13,color:T.t1,fontWeight:500 }}>{dim.label}</span>
            <Tip text={dim.tooltip}>
              <span style={{ width:14,height:14,borderRadius:"50%",background:T.b2,color:T.t3,
                fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"help",fontFamily:"'JetBrains Mono',monospace" }}>?</span>
            </Tip>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
              background:T.s3,padding:"1px 5px",borderRadius:3 }}>{dim.weight}%</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <input type="number" min={0} max={100} value={val||""} placeholder="—"
              onChange={e=>onChange(dim.key,Math.min(100,Math.max(0,parseInt(e.target.value)||0)))}
              style={{ width:60,background:T.s3,border:`1px solid ${T.b2}`,borderRadius:6,
                padding:"5px 9px",color:sc(val),fontFamily:"'JetBrains Mono',monospace",
                fontSize:14,fontWeight:600,outline:"none",textAlign:"center",transition:"border-color .15s" }}
              onFocus={e=>e.target.style.borderColor=T.do}
              onBlur={e=>e.target.style.borderColor=T.b2}/>
            <button onClick={()=>setExpanded(x=>!x)} style={{ background:"none",border:"none",
              color:T.t3,cursor:"pointer",fontSize:12,padding:"2px 6px" }}>
              {expanded?"▲ ocultar":"▼ subdimensiones"}
            </button>
          </div>
        </div>
        <div style={{ height:5,background:T.b2,borderRadius:3,overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${val||0}%`,background:sc(val),borderRadius:3,
            transition:"width .8s cubic-bezier(.4,0,.2,1)" }}/>
        </div>
      </div>

      {/* Sub-dimensions */}
      {expanded&&(
        <div style={{ borderTop:`1px solid ${T.b1}`,padding:"14px 16px",
          display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {dim.sub_dims.map(sd=>(
            <div key={sd.key}>
              <div style={{ fontSize:11,color:T.t3,marginBottom:6 }}>{sd.label}</div>
              <input type="number" min={0} max={100}
                defaultValue={scores.sub?.[dim.key]?.[sd.key]||""}
                placeholder="—"
                style={{ width:"100%",background:T.s3,border:`1px solid ${T.b2}`,borderRadius:7,
                  padding:"7px 10px",color:T.t1,fontFamily:"'JetBrains Mono',monospace",
                  fontSize:13,outline:"none",transition:"border-color .15s" }}
                onFocus={e=>e.target.style.borderColor=T.do}
                onBlur={e=>e.target.style.borderColor=T.b2}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: SCORE ISO ─────────────────────────────────────────────
function TabScore({ project, supabase, onUpdate }) {
  const [scores, setScores] = useState({ ...project.score });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  function calcTotal(s) {
    return Math.round(
      DIMENSIONS.reduce((acc,d)=>acc+(s[d.key]||0)*d.weight/100, 0)
    );
  }

  function handleDimChange(key, val) {
    setScores(p=>({ ...p, [key]:val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const total = calcTotal(scores);
      await supabase.from("project_scores")
        .upsert({
          project_id: project.id,
          overall_score: total,
          dimension_scores_json: scores,
          updated_at: new Date().toISOString(),
        }, { onConflict: "project_id" });
      setSaved(true);
      setTimeout(()=>setSaved(false), 2200);
      onUpdate({ ...project, score:{ ...scores, overall:total } });
    } finally {
      setSaving(false);
    }
  }

  const total = calcTotal(scores);
  const sc = v => v>=70?T.green:v>=50?T.amber:T.red;

  const radarData = DIMENSIONS.map(d=>({ s:d.label.split(" ")[0], A:scores[d.key]||0 }));

  const barData = DIMENSIONS.map(d=>({ name:d.label.split(" ")[0], score:scores[d.key]||0, color:
    d.key==="cultura"?T.do:d.key==="engagement"?"#e879f9":T.blue }));

  return (
    <div className="do-fade">
      {/* Top row: ring + participation */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:18 }}>
        {/* Score ring */}
        <Card style={{ display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:"28px 20px",gap:12 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase" }}>Salud Organizacional</div>
          <div style={{ width:120,height:120,borderRadius:"50%",
            background:`conic-gradient(${sc(total)} 0% ${total}%, ${T.b1} ${total}% 100%)`,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:92,height:92,borderRadius:"50%",background:T.bg,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:32,
                color:sc(total),lineHeight:1 }}>{total}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3 }}>/100</span>
            </div>
          </div>
          <Pill color={sc(total)}>
            {total>=70?"▲ Favorable":total>=50?"◆ En desarrollo":"▼ Crítico"}
          </Pill>
        </Card>

        {/* Participation stats */}
        <Card style={{ display:"flex",flexDirection:"column",justifyContent:"center",gap:16 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase" }}>Participación</div>
          {[
            { label:"Universo total",    val:project.participants.total,    color:T.t2 },
            { label:"Respondieron",      val:project.participants.responded, color:T.do },
            { label:"Tasa de respuesta", val:`${project.participants.rate}%`, color:project.participants.rate>=80?T.green:T.amber },
          ].map(s=>(
            <div key={s.label}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,
                color:s.color,marginBottom:2 }}>{s.val}</div>
              <div style={{ fontSize:11,color:T.t3 }}>{s.label}</div>
            </div>
          ))}
        </Card>

        {/* Dimension summary */}
        <Card>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase",marginBottom:14 }}>Dimensiones</div>
          <div style={{ height:160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={28} layout="vertical">
                <XAxis type="number" domain={[0,100]}
                  tick={{ fill:T.t3,fontSize:9 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={70}
                  tick={{ fill:T.t3,fontSize:10,fontFamily:"Instrument Sans" }}
                  axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:T.s2,border:`1px solid ${T.b2}`,
                  borderRadius:8,fontSize:12 }}/>
                <Bar dataKey="score" radius={[0,4,4,0]}>
                  {barData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Radar */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18 }}>
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Perfil de indicadores
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.b2}/>
                <PolarAngleAxis dataKey="s" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}/>
                <Radar dataKey="A" stroke={T.do} fill={T.do} fillOpacity={.1} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Evolution */}
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Evolución histórica
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={project.history}>
                <defs>
                  <linearGradient id="doGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.do} stopOpacity={.18}/>
                    <stop offset="95%" stopColor={T.do} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}
                  axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fill:T.t3,fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12 }}/>
                <Area type="monotone" dataKey="score" stroke={T.do} strokeWidth={2}
                  fill="url(#doGrad)" name="ISO"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Dimension inputs */}
      <Card>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Ingreso de scores por dimensión
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:20,lineHeight:1.55 }}>
          Ingresa el score de cada dimensión. Expande para ver y editar subdimensiones.
          El score total se recalcula automáticamente.
        </div>
        {DIMENSIONS.map(d=>(
          <DimScoreBlock key={d.key} dim={d} scores={scores}
            onChange={handleDimChange}/>
        ))}
        <div style={{ marginTop:16,display:"flex",gap:10,alignItems:"center" }}>
          <Btn variant="do" onClick={handleSave} disabled={saving}>
            {saving?<><Spinner/> Guardando…</>:saved?"✓ Guardado":"Guardar scores"}
          </Btn>
          <span style={{ fontSize:12,color:T.t3 }}>
            Score calculado:{" "}
            <span style={{ fontFamily:"'JetBrains Mono',monospace",
              color:sc(total),fontWeight:600 }}>{total}</span>
          </span>
        </div>
      </Card>
    </div>
  );
}

// ── Instrument Form Modal ──────────────────────────────────────
function InstrumentModal({ instrument, projectId, supabase, onSave, onClose }) {
  const isEdit = !!instrument;
  const [type,      setType]      = useState(instrument?.record_type||"survey_clima");
  const [title,     setTitle]     = useState(instrument?.title||"");
  const [date,      setDate]      = useState(instrument?.activity_date||"");
  const [partic,    setPartic]    = useState(instrument?.participants_count||"");
  const [evalScore, setEvalScore] = useState(instrument?.evaluation_score||"");
  const [summary,   setSummary]   = useState(instrument?.qualitative_summary||"");
  const [tensions,  setTensions]  = useState(instrument?.tensions_text||"");
  const [opps,      setOpps]      = useState(instrument?.opportunities_text||"");
  const [notes,     setNotes]     = useState(instrument?.consultant_notes||"");
  const [visible,   setVisible]   = useState(instrument?.visible_to_client??true);
  const [loading,   setLoading]   = useState(false);

  const instrType = INSTRUMENT_TYPES.find(t=>t.value===type);

  async function handleSave() {
    if (!title.trim()||!date) return;
    setLoading(true);
    try {
      const payload = {
        project_id: projectId, record_type:type, title, activity_date:date,
        participants_count:  partic    ? parseInt(partic)      : null,
        evaluation_score:    evalScore ? parseFloat(evalScore) : null,
        qualitative_summary: summary, tensions_text: tensions,
        opportunities_text:  opps,    consultant_notes: notes,
        visible_to_client:   visible,
      };
      if (isEdit) {
        const { data, error } = await supabase
          .from("project_activities")
          .update({ ...payload, updated_at:new Date().toISOString() })
          .eq("id", instrument.id).select().single();
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
    <Modal title={isEdit?"Editar instrumento":"Registrar instrumento"} onClose={onClose} width={580}>
      {/* Type badge */}
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:20,
        padding:"10px 14px",background:`${T.do}10`,border:`1px solid ${T.do}30`,borderRadius:9 }}>
        <span style={{ fontSize:18 }}>{instrType?.icon||"📝"}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.do }}>
          Módulo DO · {instrType?.label||"Instrumento"}
        </span>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <Select label="Tipo de instrumento" value={type} onChange={setType}
          options={INSTRUMENT_TYPES} style={{ gridColumn:"span 2" }}/>
        <Input label="Título / nombre del instrumento" value={title} onChange={setTitle}
          placeholder="Ej. Encuesta de clima Q1 2025" style={{ gridColumn:"span 2" }}/>
        <Input label="Fecha de aplicación" value={date} onChange={setDate} type="date"/>
        <Input label="Participantes" value={partic} onChange={setPartic}
          type="number" placeholder="N° personas"/>
        <Input label="Score resultado (0–100)" value={evalScore} onChange={setEvalScore}
          type="number" placeholder="Promedio general" style={{ gridColumn:"span 2" }}/>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:18 }}>
        <Textarea label="Hallazgos principales" value={summary} onChange={setSummary}
          placeholder="Resumen de resultados, tendencias detectadas, insights clave…"/>
        <Textarea label="Tensiones / áreas críticas" value={tensions} onChange={setTensions}
          placeholder="Dimensiones con puntaje bajo, conflictos detectados…" rows={2}/>
        <Textarea label="Fortalezas / oportunidades" value={opps} onChange={setOpps}
          placeholder="Dimensiones destacadas, potenciales de mejora…" rows={2}/>
        <Textarea label="Notas del consultor (internas)" value={notes} onChange={setNotes}
          placeholder="Notas privadas — el cliente no las verá." rows={2}/>
      </div>

      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"12px 16px",background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:20 }}>
        <div>
          <div style={{ fontSize:13,color:T.t1,fontWeight:500,marginBottom:2 }}>
            Visible para el cliente
          </div>
          <div style={{ fontSize:11,color:T.t3 }}>El cliente puede ver este instrumento en su panel.</div>
        </div>
        <Toggle checked={visible} onChange={setVisible}/>
      </div>

      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="do" onClick={handleSave} disabled={!title.trim()||!date||loading}>
          {loading?<><Spinner/> Guardando…</>:isEdit?"Guardar cambios":"Registrar instrumento"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Tab: DIAGNÓSTICOS ──────────────────────────────────────────
function TabDiagnostics({ project, instruments, supabase, onAdd, onUpdate }) {
  const [modal,  setModal]  = useState(null);
  const [filter, setFilter] = useState("all");

  const filtered = instruments.filter(i=>
    filter==="all"||i.record_type===filter
  );

  function handleSave(saved) {
    const exists = instruments.some(i=>i.id===saved.id);
    exists ? onUpdate(saved) : onAdd(saved);
    setModal(null);
  }

  const getInstrType = type => INSTRUMENT_TYPES.find(t=>t.value===type);

  return (
    <div className="do-fade">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {[["all","Todos"],["survey_clima","Encuestas clima"],
            ["cultura_diag","Diagnóstico cultura"],["focus_group","Focus groups"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",
              background:filter===v?`${T.do}18`:"none",
              color:filter===v?T.do:T.t3,fontSize:12,fontWeight:500,
              fontFamily:"'Instrument Sans',sans-serif",
              outline:filter===v?`1px solid ${T.do}30`:"none" }}>{l}</button>
          ))}
        </div>
        <Btn variant="do" size="sm" onClick={()=>setModal("new")}>
          + Registrar instrumento
        </Btn>
      </div>

      {/* Summary strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18 }}>
        {[
          { label:"Instrumentos aplicados", val:instruments.length,                               color:T.do   },
          { label:"Visibles al cliente",     val:instruments.filter(i=>i.visible_to_client).length, color:T.blue },
          { label:"Participantes totales",   val:instruments.reduce((s,i)=>s+(i.participants_count||0),0), color:T.green },
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
          <div style={{ fontSize:32,marginBottom:12 }}>📋</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
            Sin instrumentos registrados
          </div>
          <div style={{ fontSize:13,color:T.t3,marginBottom:16 }}>
            Registra encuestas, diagnósticos de cultura, focus groups y evaluaciones aplicadas.
          </div>
          <Btn variant="do" size="sm" onClick={()=>setModal("new")}>+ Primer instrumento</Btn>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {filtered.map(inst=>{
            const it = getInstrType(inst.record_type);
            const sc = v => v>=70?T.green:v>=50?T.amber:T.red;
            return (
              <div key={inst.id} style={{ background:T.s1,border:`1px solid ${T.b1}`,
                borderRadius:12,padding:"18px 20px",transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.b3}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.b1}>
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                      <span style={{ fontSize:18 }}>{it?.icon||"📝"}</span>
                      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1 }}>
                        {inst.title}
                      </div>
                      {!inst.visible_to_client&&(
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                          color:T.t4,background:T.s2,padding:"2px 7px",borderRadius:20 }}>
                          🔒 Solo consultora
                        </span>
                      )}
                    </div>
                    <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:inst.qualitative_summary?10:0 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                        {new Date(inst.activity_date).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
                      </span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                        {it?.label||inst.record_type}
                      </span>
                      {inst.participants_count&&(
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                          👥 {inst.participants_count} participantes
                        </span>
                      )}
                      {inst.evaluation_score!=null&&(
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                          color:sc(inst.evaluation_score) }}>
                          Score: {inst.evaluation_score}
                        </span>
                      )}
                    </div>
                    {inst.qualitative_summary&&(
                      <div style={{ fontSize:13,color:T.t2,lineHeight:1.55,marginBottom:inst.tensions_text?8:0 }}>
                        {inst.qualitative_summary}
                      </div>
                    )}
                    {inst.tensions_text&&(
                      <div style={{ fontSize:12,color:"#fb923c",background:`${T.amber}08`,
                        border:`1px solid ${T.amber}20`,borderRadius:7,padding:"7px 11px",marginTop:6 }}>
                        ⚠ {inst.tensions_text}
                      </div>
                    )}
                    {inst.opportunities_text&&(
                      <div style={{ fontSize:12,color:T.green,background:`${T.green}08`,
                        border:`1px solid ${T.green}20`,borderRadius:7,padding:"7px 11px",marginTop:6 }}>
                        ✦ {inst.opportunities_text}
                      </div>
                    )}
                  </div>
                  <Btn variant="ghost" size="sm" onClick={()=>setModal(inst)} style={{ flexShrink:0 }}>
                    Editar
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal&&(
        <InstrumentModal
          instrument={modal==="new"?null:modal}
          projectId={project.id}
          supabase={supabase}
          onSave={handleSave}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  );
}

// ── Tab: CARGA IA ──────────────────────────────────────────────
function TabUpload({ project, supabase, onApplyScores }) {
  const [files,  setFiles]  = useState([]);
  const [busy,   setBusy]   = useState(false);
  const [prop,   setProp]   = useState(null);
  const [drag,   setDrag]   = useState(false);
  const ref = useRef();

  const add = list => setFiles(p=>[...p,...Array.from(list).map(f=>({
    name:f.name,
    type:f.name.match(/\.(xlsx|csv)/i)?"excel":f.name.match(/\.pdf/i)?"pdf":
         f.name.match(/\.docx?/i)?"doc":"txt",
    raw:f,
  }))]);
  const fIcon = t=>({excel:"📊",pdf:"📄",doc:"📝",txt:"📋"})[t]||"📎";

  async function readFileText(file) {
    return new Promise((resolve) => {
      if (file.name.match(/\.pdf$/i)) { resolve("[PDF]"); return; }
      const r = new FileReader();
      r.onload = e => resolve(e.target.result?.slice(0, 12000) || "");
      r.onerror = () => resolve("");
      r.readAsText(file.raw || file, "utf-8");
    });
  }

  async function uploadToStorage(file) {
    if (!supabase || !project?.client_id) return null;
    const ts   = Date.now();
    const path = `${project.client_id}/do/${project.id}/${ts}_${file.name}`;
    const { error } = await supabase.storage
      .from("do-documents").upload(path, file.raw || file, { upsert: false });
    if (error?.message?.includes("already exists") || error?.statusCode === 409) return path;
    if (error) { console.warn("Storage DO upload:", error.message); return null; }
    return path;
  }

  async function analyze() {
    if (!files.length) return;
    setBusy(true); setProp(null);
    try {
      await Promise.all(files.map(f => uploadToStorage(f)));

      const fileContents = await Promise.all(
        files.map(async f => ({ name: f.name, content: await readFileText(f) }))
      );

      const res = await fetch("/api/analyze-do", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContents,
          projectName:   project.name,
          currentScores: project.score || {},
        }),
      });

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Error servidor"); }
      setProp(await res.json());
    } catch(e) {
      console.error("Analyze DO error:", e);
      setProp({ summary: `Error: ${e.message}`, insights: [], proposed: {} });
    } finally { setBusy(false); }
  }

  function handleApply() {
    const s={};
    Object.entries(prop.proposed).forEach(([k,v])=>{ s[k]=v.proposed; });
    onApplyScores(s);
    setProp(null); setFiles([]);
  }

  const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;

  return (
    <div className="do-fade">
      <div style={{ padding:"14px 18px",background:`${T.do}08`,border:`1px solid ${T.do}25`,
        borderRadius:10,marginBottom:20,fontSize:13,color:"#d8b4fe",lineHeight:1.55 }}>
        <strong>Proyecto activo:</strong> {project.name} · Archivos almacenados en{" "}
        <code style={{ background:`${T.do}15`,padding:"1px 6px",borderRadius:4,
          fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>do-documents</code>{" "}
        bajo{" "}
        <code style={{ background:`${T.do}15`,padding:"1px 6px",borderRadius:4,
          fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>{"{client_id}/do/{project_id}/"}</code>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Carga de instrumentos y resultados
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:18,lineHeight:1.6 }}>
          Sube resultados de encuestas, cuestionarios de cultura, transcripciones de focus groups o informes.
          La IA extrae los indicadores clave y propone actualizaciones de score.
        </div>

        <div onClick={()=>ref.current.click()}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}}
          style={{ border:`2px dashed ${drag?T.do:T.b2}`,borderRadius:12,padding:28,
            textAlign:"center",cursor:"pointer",background:drag?`${T.do}08`:T.s2,transition:"all .2s" }}>
          <div style={{ fontSize:28,marginBottom:8 }}>📁</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:4 }}>
            Arrastra archivos o haz clic
          </div>
          <div style={{ fontSize:12,color:T.t3 }}>
            Resultados .xlsx · Informes .pdf · Transcripciones .docx · Notas .txt
          </div>
          <input ref={ref} type="file" multiple style={{ display:"none" }}
            onChange={e=>add(e.target.files)}/>
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
          <Btn variant="do" onClick={analyze} disabled={!files.length||busy}>
            {busy?<><Spinner/> Analizando…</>:"✦ Analizar con IA"}
          </Btn>
          <Btn variant="ghost" onClick={()=>{setFiles([]);setProp(null);}}>Limpiar</Btn>
        </div>
      </Card>

      {busy&&(
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
            <span style={{ background:`${T.do}18`,color:T.do,border:`1px solid ${T.do}30`,
              borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>✦ IA</span>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:T.t3 }}>
              <Spinner/> Procesando…
            </div>
          </div>
          {["Identificando tipo de instrumento DO",
            "Extrayendo datos por dimensión (cultura, engagement, liderazgo)",
            "Calculando scores ponderados",
            "Generando hallazgos e insights"].map((s,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:9,padding:"6px 0",
              color:T.t3,fontSize:13 }}>
              <Spinner/>{s}
            </div>
          ))}
        </Card>
      )}

      {prop&&(
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
            <span style={{ background:`${T.do}18`,color:T.do,border:`1px solid ${T.do}30`,
              borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>
              ✦ Propuesta IA
            </span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
              DO · {project.name}
            </span>
          </div>

          <div style={{ fontSize:13,color:T.t2,marginBottom:16,lineHeight:1.65,
            background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,padding:"14px 16px" }}>
            {prop.summary}
          </div>

          {prop.insights.length>0&&(
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
                letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>Hallazgos identificados</div>
              {prop.insights.map((ins,i)=>(
                <div key={i} style={{ display:"flex",gap:10,padding:"8px 0",
                  borderBottom:`1px solid ${T.b1}`,fontSize:13,color:T.t2 }}>
                  <span style={{ color:T.do,flexShrink:0 }}>✦</span>{ins}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:1.5,textTransform:"uppercase",marginBottom:12 }}>
            Propuesta de scores
          </div>
          {Object.entries(prop.proposed).map(([key,s])=>{
            const dim = DIMENSIONS.find(d=>d.key===key);
            const changed = s.proposed!==s.current;
            return (
              <div key={key} style={{ background:T.s2,
                border:`1px solid ${changed?T.do+"30":T.b1}`,
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
                    {changed&&(
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                        color:s.proposed>s.current?T.green:T.red }}>
                        {s.proposed>s.current?`↑ +${s.proposed-s.current}`:`↓ ${s.proposed-s.current}`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:12,color:T.t3 }}>{s.reason}</div>
              </div>
            );
          })}

          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,marginTop:18 }}>
            Ajusta manualmente si es necesario
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20 }}>
            {Object.entries(prop.proposed).map(([key,s])=>{
              const dim = DIMENSIONS.find(d=>d.key===key);
              return (
                <div key={key}>
                  <div style={{ fontSize:11,color:T.t3,marginBottom:5 }}>{dim?.label}</div>
                  <input type="number" defaultValue={s.proposed} min={0} max={100}
                    onChange={e=>setProp(p=>({...p,proposed:{...p.proposed,
                      [key]:{...p.proposed[key],proposed:parseInt(e.target.value)||0}}}))}
                    style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:7,
                      padding:"8px 11px",color:T.t1,fontSize:13,outline:"none",
                      fontFamily:"'JetBrains Mono',monospace",textAlign:"center",
                      transition:"border-color .15s" }}
                    onFocus={e=>e.target.style.borderColor=T.do}
                    onBlur={e=>e.target.style.borderColor=T.b2}/>
                </div>
              );
            })}
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <Btn variant="success" onClick={handleApply}>✓ Aplicar propuesta</Btn>
            <Btn variant="ghost" onClick={()=>setProp(null)}>Descartar</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────
export default function ModuleDO({ client, supabase }) {
  const [projects,     setProjects]     = useState([]);
  const [selProjId,    setSelProjId]    = useState(null);
  const [instruments,  setInstruments]  = useState([]);
  const [tab,          setTab]          = useState("score");
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!supabase || !client?.id) return;
    loadProjects();
  }, [supabase, client?.id]);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data: projs, error: pErr } = await supabase
        .from("projects").select("*")
        .eq("client_id", client.id).eq("module_key", "do")
        .order("starts_on", { ascending: false });
      if (pErr) throw pErr;
      if (!projs?.length) { setProjects([]); setLoading(false); return; }

      const ids = projs.map(p=>p.id);
      const [scoresRes, instrRes] = await Promise.all([
        supabase.from("project_scores").select("*").in("project_id", ids)
          .order("updated_at", { ascending: false }),
        supabase.from("project_activities").select("*").in("project_id", ids)
          .order("activity_date", { ascending: false }),
      ]);

      const projectsWithScores = projs.map(p => {
        const ps = scoresRes.data?.find(s=>s.project_id===p.id);
        const d  = ps?.dimension_scores_json || {};
        return {
          ...p,
          score: {
            overall:    ps?.overall_score ?? null,
            cultura:    d.cultura    ?? null,
            engagement: d.engagement ?? null,
            liderazgo:  d.liderazgo  ?? null,
          },
          history: [],
          participants: { total:0, responded:0, rate:0 },
        };
      });

      setProjects(projectsWithScores);
      setSelProjId(projectsWithScores[0]?.id || null);
      setInstruments(instrRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const selProject      = projects.find(p=>p.id===selProjId) || projects[0];
  const projInstruments = instruments.filter(i=>i.project_id===selProjId);

  async function updateProject(updated) {
    setProjects(p=>p.map(pr=>pr.id===updated.id?updated:pr));
    if (supabase && 'client_visible' in updated) {
      const { error } = await supabase.from("projects")
        .update({ client_visible:updated.client_visible, updated_at:new Date().toISOString() })
        .eq("id", updated.id);
      if (error) console.error('client_visible update error:', error);
    }
  }

  function applyScores(newScores) {
    setProjects(p=>p.map(pr=>pr.id===selProjId
      ?{ ...pr, score:{ ...pr.score, ...newScores,
          overall:Math.round(DIMENSIONS.reduce((acc,d)=>acc+(newScores[d.key]||pr.score[d.key]||0)*d.weight/100,0)) }}
      :pr));
    setTab("score");
  }

  const TABS = [
    { id:"score",       label:"Score ISO"    },
    { id:"diagnostics", label:`Diagnósticos${projInstruments.length>0?` (${projInstruments.length})`:""}`},
    { id:"upload",      label:"Carga IA"     },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{ padding:"32px 36px",maxWidth:1200 }}>

        {/* Header */}
        <div className="do-fade" style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.do,
            letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>
            🏛 Desarrollo Organizacional
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:30,color:T.t1,
            letterSpacing:-.5,marginBottom:4 }}>Salud Organizacional</div>
          <div style={{ fontSize:13,color:T.t2 }}>
            Cultura · Engagement · Liderazgo · {client?.name||"Cliente"}
          </div>
        </div>

        {/* Project selector */}
        <div className="do-fade do-d1" style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>Proyecto activo</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {projects.map(p=>{
              const st = STATUS_META[p.status]||STATUS_META.draft;
              const isActive = p.id===selProjId;
              return (
                <div key={p.id} onClick={()=>setSelProjId(p.id)} style={{
                  padding:"10px 16px",borderRadius:11,cursor:"pointer",transition:"all .15s",
                  border:`1px solid ${isActive?`${T.do}50`:T.b2}`,
                  background:isActive?`${T.do}10`:T.s2,
                  display:"flex",flexDirection:"column",gap:4,minWidth:220 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:isActive?T.t1:T.t2 }}>
                    {p.name}
                  </div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:st.color }}>
                      ● {st.label}
                    </span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                      color:isActive?T.do:T.t4 }}>ISO: {p.score.overall}</span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t4 }}>
                      {p.scope}
                    </span>
                    {!p.client_visible&&<span style={{ fontFamily:"'JetBrains Mono',monospace",
                      fontSize:10,color:T.t4 }}>🔒</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visibility toggle */}
        {selProject&&(
          <div className="do-fade do-d2" style={{ display:"flex",alignItems:"center",
            justifyContent:"space-between",padding:"12px 18px",
            background:selProject.client_visible?`${T.green}08`:`${T.t3}08`,
            border:`1px solid ${selProject.client_visible?T.green+"30":T.b2}`,
            borderRadius:10,marginBottom:20 }}>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:T.t1,marginBottom:2 }}>
                {selProject.client_visible?"Proyecto visible para el cliente":"Proyecto oculto al cliente"}
              </div>
              <div style={{ fontSize:11,color:T.t3 }}>
                {selProject.client_visible
                  ?"El cliente puede ver scores e instrumentos marcados como visibles."
                  :"El cliente no ve este proyecto ni sus datos."}
              </div>
            </div>
            <Toggle checked={selProject.client_visible}
              onChange={v=>updateProject({...selProject,client_visible:v})}
              color={T.green}/>
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

        {/* Content */}
        {loading ? (
          <div style={{ display:"flex",alignItems:"center",gap:10,color:T.t3,
            fontFamily:"'JetBrains Mono',monospace",fontSize:13,padding:"48px 0" }}>
            <span style={{ width:14,height:14,border:`2px solid ${T.b2}`,borderTopColor:T.do,
              borderRadius:"50%",animation:"doSpin .8s linear infinite",display:"inline-block" }}/>
            Cargando proyectos…
          </div>
        ) : !selProject ? (
          <div style={{ textAlign:"center",padding:"48px 0",background:T.s2,
            border:`1px dashed ${T.b2}`,borderRadius:14 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
              Sin proyectos DO
            </div>
            <div style={{ fontSize:13,color:T.t3 }}>
              Crea el primer proyecto DO desde Gestión de Clientes.
            </div>
          </div>
        ) : (
          <>
            {tab==="score"&&(
              <TabScore project={selProject} supabase={supabase} onUpdate={updateProject}/>
            )}
            {tab==="diagnostics"&&(
              <TabDiagnostics project={selProject} instruments={projInstruments}
                supabase={supabase}
                onAdd={i=>setInstruments(p=>[i,...p])}
                onUpdate={i=>setInstruments(p=>p.map(x=>x.id===i.id?i:x))}/>
            )}
            {tab==="upload"&&(
              <TabUpload project={selProject} supabase={supabase} onApplyScores={applyScores}/>
            )}
          </>
        )}
      </div>
    </>
  );
}
