// ============================================================
// ModuleESG.jsx
// Módulo de Sostenibilidad Corporativa — THO Compass v4
// Vista Consultora completa.
//
// Diferencias respecto a RC y DO:
//   - Score expresado como nivel de madurez 1–5 por pilar
//   - Indicadores GRI específicos con estado de cumplimiento
//   - Pilares configurables (ambiental puede requerir especialista)
//   - Carga de archivos mapea al framework GRI automáticamente
//
// Tablas: projects, project_activities, project_scores,
//         client_files (bucket: esg-documents)
// ============================================================

import { saveProjectScore, syncClientScore } from "../lib/scores.js";
import ScoreLog from "./ScoreLog.jsx";
import FilesPanel from "./FilesPanel.jsx";
import FormManager from "./FormManager.jsx";
import CommitmentsPanel from "./CommitmentsPanel.jsx";
import BaselineInstrument from "./BaselineInstrument.jsx";
import { useState, useRef, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ── Tokens ────────────────────────────────────────────────────
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
.esg-fade{animation:esgFade .35s cubic-bezier(.4,0,.2,1) both;}
.esg-d1{animation-delay:.06s;} .esg-d2{animation-delay:.12s;}
.esg-d3{animation-delay:.18s;} .esg-d4{animation-delay:.24s;}
@keyframes esgFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes esgSpin{to{transform:rotate(360deg)}}
`;

// ── Pilares ESG ────────────────────────────────────────────────
const PILLARS = {
  ambiental: {
    key:"ambiental", label:"Ambiental", short:"E", icon:"🌍", color:"#4ade80",
    tooltip:"Cumplimiento normativo ambiental, gestión de residuos, huella de carbono y eficiencia energética. Puede requerir especialista ambiental.",
    requires_specialist:true,
    gri_standards:[
      { id:"GRI 302", name:"Energía",                topic:"Consumo energético y fuentes renovables" },
      { id:"GRI 303", name:"Agua y efluentes",        topic:"Uso de agua, fuentes y gestión de efluentes" },
      { id:"GRI 305", name:"Emisiones",               topic:"Emisiones GEI directas e indirectas (Scope 1,2,3)" },
      { id:"GRI 306", name:"Residuos",                topic:"Generación, gestión y destino de residuos" },
      { id:"GRI 304", name:"Biodiversidad",           topic:"Impacto en ecosistemas y áreas protegidas" },
    ],
    indicators:[
      { key:"consumo_energetico",   label:"Consumo energético total (GJ)",    unit:"GJ"  },
      { key:"energia_renovable",    label:"% energía renovable",              unit:"%"   },
      { key:"emisiones_co2",        label:"Emisiones GEI directas (ton CO2e)", unit:"ton" },
      { key:"consumo_agua",         label:"Consumo de agua (m³)",             unit:"m³"  },
      { key:"residuos_generados",   label:"Residuos generados (ton)",         unit:"ton" },
      { key:"residuos_reciclados",  label:"% residuos reciclados o reutilizados", unit:"%" },
    ],
  },
  social: {
    key:"social", label:"Social", short:"S", icon:"🤝", color:T.blue,
    tooltip:"Condiciones laborales, diversidad e inclusión, relacionamiento comunitario y cadena de valor. Área de expertise central de THO.",
    requires_specialist:false,
    gri_standards:[
      { id:"GRI 401", name:"Empleo",                  topic:"Contratación, rotación y beneficios a empleados" },
      { id:"GRI 403", name:"Salud y seguridad",       topic:"Sistema de gestión de SST, lesiones y enfermedades" },
      { id:"GRI 404", name:"Formación y educación",   topic:"Horas de formación, desarrollo de competencias" },
      { id:"GRI 405", name:"Diversidad e igualdad",   topic:"Diversidad en órganos de gobierno y empleados" },
      { id:"GRI 413", name:"Comunidades locales",     topic:"Evaluación de impactos y programas de desarrollo" },
      { id:"GRI 414", name:"Evaluación social proveedores", topic:"Porcentaje proveedores evaluados en criterios sociales" },
    ],
    indicators:[
      { key:"tasa_rotacion",        label:"Tasa de rotación voluntaria (%)", unit:"%" },
      { key:"tasa_accidentes",      label:"Tasa de accidentes (por 100 trab.)", unit:"tasa" },
      { key:"horas_formacion",      label:"Horas promedio de formación/persona", unit:"hrs" },
      { key:"mujeres_directivos",   label:"% mujeres en cargos directivos",  unit:"%"  },
      { key:"brecha_salarial",      label:"Brecha salarial de género (%)",   unit:"%"  },
      { key:"trabajadores_locales", label:"% trabajadores de comunidades locales", unit:"%" },
    ],
  },
  gobernanza: {
    key:"gobernanza", label:"Gobernanza", short:"G", icon:"⚖️", color:"#a78bfa",
    tooltip:"Ética empresarial, prevención de delitos (Ley 21.595), transparencia corporativa y políticas internas de cumplimiento.",
    requires_specialist:false,
    gri_standards:[
      { id:"GRI 205", name:"Anticorrupción",          topic:"Evaluación de riesgos, capacitación y casos confirmados" },
      { id:"GRI 206", name:"Conducta anticompetitiva",topic:"Acciones legales por prácticas anticompetitivas" },
      { id:"GRI 418", name:"Privacidad del cliente",  topic:"Reclamaciones sobre privacidad y pérdida de datos" },
      { id:"GRI 2-9", name:"Estructura de gobierno",  topic:"Composición del órgano de gobierno y comités" },
      { id:"GRI 2-26","name":"Mecanismos de consulta",topic:"Canales de denuncia y mecanismos de asesoramiento ético" },
      { id:"Ley 21.595","name":"Modelo de Prevención",topic:"Chile: delitos económicos, compliance y modelo preventivo" },
    ],
    indicators:[
      { key:"capacitacion_etica",    label:"% trabajadores capacitados en ética/compliance", unit:"%"  },
      { key:"incidentes_corrupcion", label:"Incidentes de corrupción confirmados",            unit:"N°" },
      { key:"denuncias_canal",       label:"Denuncias recibidas canal ético",                 unit:"N°" },
      { key:"politicas_aprobadas",   label:"% políticas éticas formalizadas y aprobadas",    unit:"%"  },
      { key:"directores_independientes", label:"% directores independientes",                unit:"%"  },
    ],
  },
};

const COMPLIANCE_STATUS = [
  { value:"cumple",   label:"Cumple",         color:T.green,  icon:"✓" },
  { value:"parcial",  label:"Parcial",         color:T.amber,  icon:"◐" },
  { value:"pendiente",label:"Pendiente",       color:T.t3,     icon:"○" },
  { value:"no_aplica",label:"No aplica",       color:T.t4,     icon:"—" },
];

const MATURITY_LEVELS = [
  { level:1, label:"Inicial",       desc:"Sin prácticas formales. Actuación reactiva.", color:T.red   },
  { level:2, label:"Básico",        desc:"Algunas prácticas aisladas, sin sistematizar.", color:"#fb923c" },
  { level:3, label:"Definido",      desc:"Procesos documentados y aplicados consistentemente.", color:T.amber },
  { level:4, label:"Gestionado",    desc:"Medición activa, mejora continua, reporte interno.", color:T.teal  },
  { level:5, label:"Optimizado",    desc:"Liderazgo sectorial. Reporte público. Mejora continua.", color:T.green },
];

const STATUS_META = {
  draft: { label:"Borrador", color:T.t3   },
  active:{ label:"Activo",   color:T.green },
  paused:{ label:"Pausado",  color:T.amber },
  closed:{ label:"Cerrado",  color:T.t4   },
};

// ── Mock data ──────────────────────────────────────────────────
const MOCK_PROJECTS = [
  {
    id:"p4", name:"Estrategia ESG 2025", status:"active",
    project_type:"programmatic", scope:"Empresa completa",
    description:"Diagnóstico y hoja de ruta ESG alineada a GRI y Ley 21.595.",
    starts_on:"2025-01-01", ends_on:"2025-12-31",
    client_visible:true,
    active_pillars:{ ambiental:true, social:true, gobernanza:true },
    maturity:{ ambiental:3, social:4, gobernanza:3 },
    score:{ overall:71, ambiental:68, social:74, gobernanza:72 },
    history:[
      { period:"Q3 2024", score:62 },
      { period:"Q4 2024", score:66 },
      { period:"Q1 2025", score:71 },
    ],
    gri_compliance:{
      ambiental:{
        "GRI 302":"parcial","GRI 303":"parcial","GRI 305":"cumple",
        "GRI 306":"cumple","GRI 304":"no_aplica",
      },
      social:{
        "GRI 401":"cumple","GRI 403":"cumple","GRI 404":"parcial",
        "GRI 405":"pendiente","GRI 413":"cumple","GRI 414":"pendiente",
      },
      gobernanza:{
        "GRI 205":"cumple","GRI 206":"no_aplica","GRI 418":"parcial",
        "GRI 2-9":"cumple","GRI 2-26":"parcial","Ley 21.595":"cumple",
      },
    },
    indicators:{
      ambiental:{ consumo_energetico:48500, energia_renovable:22, emisiones_co2:1240, consumo_agua:85000, residuos_generados:320, residuos_reciclados:65 },
      social:{ tasa_rotacion:8.2, tasa_accidentes:1.4, horas_formacion:32, mujeres_directivos:28, brecha_salarial:12, trabajadores_locales:45 },
      gobernanza:{ capacitacion_etica:82, incidentes_corrupcion:0, denuncias_canal:3, politicas_aprobadas:75, directores_independientes:40 },
    },
  },
];

const MOCK_REPORTS = [
  { id:"r1", project_id:"p4", record_type:"audit", title:"Auditoría ambiental externa 2024",
    activity_date:"2025-01-20", evaluation_score:68, pillar:"ambiental",
    qualitative_summary:"Cumplimiento normativo ambiental en niveles aceptables. Oportunidad de mejora en gestión de efluentes y medición de Scope 3.",
    tensions_text:"Emisiones Scope 3 aún sin medir formalmente.",
    opportunities_text:"Potencial de certificación ISO 14001 en 18 meses.",
    consultant_notes:"Coordinar con jefe de medio ambiente para plan de acción Scope 3.",
    visible_to_client:true },
  { id:"r2", project_id:"p4", record_type:"compliance", title:"Diagnóstico Ley 21.595 — Modelo de Prevención",
    activity_date:"2025-02-10", evaluation_score:78, pillar:"gobernanza",
    qualitative_summary:"Modelo de prevención implementado. Canal de denuncias activo. Falta actualizar 3 políticas clave y completar capacitación al 100%.",
    tensions_text:"18% de trabajadores aún sin capacitación en compliance.",
    opportunities_text:"Certificación del modelo preventivo factible en Q3 2025.",
    consultant_notes:"Priorizar capacitación área de operaciones.",
    visible_to_client:true },
  { id:"r3", project_id:"p4", record_type:"indicators", title:"Indicadores RRHH — Diversidad e inclusión",
    activity_date:"2025-02-28", evaluation_score:72, pillar:"social",
    qualitative_summary:"Avance en paridad. Mujeres en dirección subió de 22% a 28%. Brecha salarial de género persistente en 12%.",
    tensions_text:"Brecha salarial de género requiere plan de cierre formal.",
    opportunities_text:"Política de paridad aprobada. Meta 35% mujeres en dirección para 2026.",
    consultant_notes:"Incluir indicador GRI 405 en próximo reporte de sostenibilidad.",
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
    esg:    { background:`${T.esg}18`, color:T.esg, border:`1px solid ${T.esg}30` },
    success:{ background:T.green, color:"#08090c" },
  };
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter="brightness(1.15)";}}
    onMouseLeave={e=>{e.currentTarget.style.filter="none";}}>{children}</button>;
};

const Toggle = ({ checked, onChange, color=T.esg }) => (
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
      onFocus={e=>e.target.style.borderColor=T.esg}
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
      onFocus={e=>e.target.style.borderColor=T.esg}
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

const Divider = () => <div style={{ height:1,background:T.b1,margin:"20px 0" }}/>;
const Spinner = () => <span style={{ width:13,height:13,border:`2px solid rgba(255,255,255,.25)`,
  borderTopColor:"white",borderRadius:"50%",animation:"esgSpin .8s linear infinite",display:"inline-block" }}/>;

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

// ── Maturity Level Display ─────────────────────────────────────
function MaturityDisplay({ level, color, compact=false }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
      <div style={{ display:"flex",gap:3 }}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{ width:compact?14:18, height:compact?14:18, borderRadius:3,
            background:i<=level?color:T.b2,
            transition:"background .3s" }}/>
        ))}
      </div>
      {!compact&&(
        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color }}>
          {level}/5 · {MATURITY_LEVELS[level-1]?.label||""}
        </span>
      )}
    </div>
  );
}

// ── GRI Compliance Badge ───────────────────────────────────────
function ComplianceBadge({ status }) {
  const s = COMPLIANCE_STATUS.find(c=>c.value===status)||COMPLIANCE_STATUS[2];
  return (
    <span style={{ background:`${s.color}15`,color:s.color,border:`1px solid ${s.color}25`,
      padding:"2px 8px",borderRadius:20,fontSize:11,
      fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Tab: SCORE ESG ─────────────────────────────────────────────
function TabScore({ project, supabase, onUpdate }) {
  const [scores,   setScores]   = useState({ ...project.score });
  const [maturity, setMaturity] = useState({ ...project.maturity });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const activePillars = Object.entries(project.active_pillars)
    .filter(([,v])=>v).map(([k])=>k);

  function calcOverall() {
    const active = activePillars;
    if (!active.length) return 0;
    return Math.round(active.reduce((s,k)=>s+(scores[k]||0),0)/active.length);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const overall = calcOverall();
      await saveProjectScore(supabase, project.id, {
        overall_score:         overall,
        dimension_scores_json: scores,
        score_drivers_json: {
          ...(project.score_drivers_json || {}),
          maturity,
          active_pillars: project.active_pillars,
        },
      });
      await syncClientScore(supabase, project.client_id, "esg", scores, overall);
      setSaved(true);
      setTimeout(()=>setSaved(false), 2200);
      onUpdate({ ...project, score:{ ...scores, overall }, maturity });
    } finally {
      setSaving(false);
    }
  }

  const overall = calcOverall();
  const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;

  const radarData = activePillars.map(k=>({
    s:PILLARS[k].label.split(" ")[0], A:scores[k]||0
  }));

  // GRI compliance summary
  const griSummary = activePillars.map(k=>{
    const comp = project.gri_compliance[k]||{};
    const vals = Object.values(comp);
    return {
      key:k, label:PILLARS[k].label, color:PILLARS[k].color,
      cumple:   vals.filter(v=>v==="cumple").length,
      parcial:  vals.filter(v=>v==="parcial").length,
      pendiente:vals.filter(v=>v==="pendiente").length,
      total:    vals.filter(v=>v!=="no_aplica").length,
    };
  });

  return (
    <div className="esg-fade">
      {/* Top row */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:18 }}>
        {/* Overall score */}
        <Card style={{ display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:"28px 20px",gap:12 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase" }}>Madurez ESG global</div>
          <div style={{ width:120,height:120,borderRadius:"50%",
            background:`conic-gradient(${sc(overall)} 0% ${overall}%, ${T.b1} ${overall}% 100%)`,
            display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:92,height:92,borderRadius:"50%",background:T.bg,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:32,
                color:sc(overall),lineHeight:1 }}>{overall}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3 }}>/100</span>
            </div>
          </div>
          <Pill color={sc(overall)}>
            {overall>=70?"▲ Favorable":overall>=50?"◆ En desarrollo":"▼ Inicial"}
          </Pill>
        </Card>

        {/* Maturity per pillar */}
        <Card style={{ display:"flex",flexDirection:"column",justifyContent:"center",gap:18 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase" }}>Nivel de madurez por pilar</div>
          {activePillars.map(k=>{
            const p = PILLARS[k];
            const lv = maturity[k]||1;
            const ml = MATURITY_LEVELS[lv-1];
            return (
              <div key={k}>
                <div style={{ display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:6 }}>
                  <span style={{ fontSize:13,color:T.t2 }}>{p.icon} {p.label}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:p.color }}>
                    Nivel {lv}/5
                  </span>
                </div>
                <MaturityDisplay level={lv} color={p.color}/>
                <div style={{ fontSize:11,color:T.t4,marginTop:4 }}>{ml?.desc}</div>
              </div>
            );
          })}
        </Card>

        {/* GRI compliance summary */}
        <Card>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase",marginBottom:14 }}>
            Cumplimiento GRI
          </div>
          {griSummary.map(g=>(
            <div key={g.key} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12,color:T.t2,marginBottom:7 }}>{g.label}</div>
              <div style={{ display:"flex",height:8,borderRadius:4,overflow:"hidden",gap:1 }}>
                <div style={{ flex:g.cumple,background:T.green,minWidth:g.cumple?2:0 }}/>
                <div style={{ flex:g.parcial,background:T.amber,minWidth:g.parcial?2:0 }}/>
                <div style={{ flex:g.pendiente,background:T.t4,minWidth:g.pendiente?2:0 }}/>
              </div>
              <div style={{ display:"flex",gap:10,marginTop:5 }}>
                <span style={{ fontSize:10,color:T.green,fontFamily:"'JetBrains Mono',monospace" }}>
                  ✓ {g.cumple}
                </span>
                <span style={{ fontSize:10,color:T.amber,fontFamily:"'JetBrains Mono',monospace" }}>
                  ◐ {g.parcial}
                </span>
                <span style={{ fontSize:10,color:T.t4,fontFamily:"'JetBrains Mono',monospace" }}>
                  ○ {g.pendiente}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Radar */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18 }}>
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Perfil ESG
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.b2}/>
                <PolarAngleAxis dataKey="s" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}/>
                <Radar dataKey="A" stroke={T.esg} fill={T.esg} fillOpacity={.1} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Evolución histórica
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={project.history}>
                <defs>
                  <linearGradient id="esgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.esg} stopOpacity={.18}/>
                    <stop offset="95%" stopColor={T.esg} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}
                  axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fill:T.t3,fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12 }}/>
                <Area type="monotone" dataKey="score" stroke={T.esg} strokeWidth={2}
                  fill="url(#esgGrad)" name="ESG"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Score + maturity editors */}
      <Card>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Editar scores y niveles de madurez
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:20,lineHeight:1.55 }}>
          Ingresa el score (0–100) y el nivel de madurez (1–5) para cada pilar activo.
        </div>
        {activePillars.map(k=>{
          const p = PILLARS[k];
          return (
            <div key={k} style={{ marginBottom:20,background:T.s2,
              border:`1px solid ${T.b1}`,borderRadius:10,padding:"16px 18px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:14 }}>
                <span style={{ fontSize:18 }}>{p.icon}</span>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:p.color }}>
                  {p.label}
                </div>
                {p.requires_specialist&&(
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                    color:T.amber,background:`${T.amber}12`,border:`1px solid ${T.amber}25`,
                    padding:"2px 8px",borderRadius:20 }}>
                    ⚠ Requiere especialista
                  </span>
                )}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                <div>
                  <label style={{ display:"block",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                    color:T.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                    Score (0–100)
                  </label>
                  <input type="number" min={0} max={100} value={scores[k]||""}
                    onChange={e=>setScores(prev=>({...prev,[k]:Math.min(100,Math.max(0,parseInt(e.target.value)||0))}))}
                    style={{ width:"100%",background:T.s3,border:`1px solid ${T.b2}`,borderRadius:8,
                      padding:"10px 13px",fontFamily:"'JetBrains Mono',monospace",fontSize:20,
                      fontWeight:600,color:sc(scores[k]),outline:"none",transition:"border-color .15s",textAlign:"center" }}
                    onFocus={e=>e.target.style.borderColor=p.color}
                    onBlur={e=>e.target.style.borderColor=T.b2}/>
                </div>
                <div>
                  <label style={{ display:"block",fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                    color:T.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                    Nivel de madurez
                  </label>
                  <div style={{ display:"flex",gap:6 }}>
                    {[1,2,3,4,5].map(lv=>{
                      const ml = MATURITY_LEVELS[lv-1];
                      const isActive = maturity[k]>=lv;
                      return (
                        <div key={lv} onClick={()=>setMaturity(prev=>({...prev,[k]:lv}))}
                          title={`${ml.label}: ${ml.desc}`}
                          style={{ flex:1,height:36,borderRadius:7,cursor:"pointer",
                            background:isActive?p.color:T.b2,transition:"all .2s",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,
                            color:isActive?"white":T.t4,
                            boxShadow:isActive?`0 2px 8px ${p.color}40`:"none" }}>
                          {lv}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize:10,color:T.t3,marginTop:6 }}>
                    {MATURITY_LEVELS[maturity[k]-1]?.label} — {MATURITY_LEVELS[maturity[k]-1]?.desc}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <Btn variant="esg" onClick={handleSave} disabled={saving}>
            {saving?<><Spinner/> Guardando…</>:saved?"✓ Guardado":"Guardar scores"}
          </Btn>
          <span style={{ fontSize:12,color:T.t3 }}>
            Score global calculado:{" "}
            <span style={{ fontFamily:"'JetBrains Mono',monospace",
              color:sc(overall),fontWeight:600 }}>{overall}</span>
          </span>
        </div>
      </Card>

      {/* Historial de cambios */}
      {supabase && project?.id && (
        <div style={{ marginTop:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:14 }}>
            Historial de cambios
          </div>
          <ScoreLog projectId={project.id} supabase={supabase} accentColor={T.esg}/>
        </div>
      )}
    </div>
  );
}

// ── Tab: GRI FRAMEWORK ─────────────────────────────────────────
function TabGRI({ project, supabase, onUpdate }) {
  const [compliance, setCompliance] = useState({ ...project.gri_compliance });
  const [indicators, setIndicators] = useState({ ...project.indicators });
  const [activePillar, setActivePillar] = useState(
    Object.entries(project.active_pillars).filter(([,v])=>v)[0]?.[0]||"social"
  );
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      // Fetch current score_drivers_json to merge
      const { data: existing } = await supabase
        .from("project_scores").select("id, score_drivers_json")
        .eq("project_id", project.id).order("updated_at", { ascending:false }).limit(1);
      const current = existing?.[0]?.score_drivers_json || {};

      await saveProjectScore(supabase, project.id, {
        score_drivers_json: {
          ...current,
          gri_compliance: compliance,
          indicators,
        },
      });
      await syncClientScore(supabase, project.client_id, "esg",
        project.score || {}, project.score?.overall ?? null);
      setSaved(true);
      setTimeout(()=>setSaved(false), 2200);
      onUpdate({ ...project, gri_compliance:compliance, indicators });
    } finally {
      setSaving(false);
    }
  }

  const activePillars = Object.entries(project.active_pillars)
    .filter(([,v])=>v).map(([k])=>k);
  const pillar = PILLARS[activePillar];

  return (
    <div className="esg-fade">
      {/* Pillar selector */}
      <div style={{ display:"flex",gap:10,marginBottom:20 }}>
        {activePillars.map(k=>{
          const p = PILLARS[k];
          const isActive = activePillar===k;
          const comp = compliance[k]||{};
          const cumpleCount = Object.values(comp).filter(v=>v==="cumple").length;
          const total = Object.values(comp).filter(v=>v!=="no_aplica").length;
          return (
            <div key={k} onClick={()=>setActivePillar(k)} style={{
              flex:1,padding:"14px 16px",borderRadius:12,cursor:"pointer",transition:"all .15s",
              border:`1px solid ${isActive?`${p.color}50`:T.b2}`,
              background:isActive?`${p.color}10`:T.s2 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <span style={{ fontSize:18 }}>{p.icon}</span>
                <span style={{ fontFamily:"'Playfair Display',serif",fontSize:14,
                  color:isActive?p.color:T.t2 }}>{p.label}</span>
              </div>
              <div style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>
                {cumpleCount}/{total} estándares cumplidos
              </div>
              <div style={{ height:4,borderRadius:2,overflow:"hidden",
                background:T.b2,marginTop:8 }}>
                <div style={{ height:"100%",borderRadius:2,background:p.color,
                  width:total?`${(cumpleCount/total)*100}%`:"0%",transition:"width .5s" }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* GRI Standards */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
          <span style={{ fontSize:20 }}>{pillar.icon}</span>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:pillar.color }}>
            {pillar.label}
          </div>
          <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
            {COMPLIANCE_STATUS.map(s=>(
              <span key={s.value} style={{ fontSize:11,color:s.color,
                fontFamily:"'JetBrains Mono',monospace" }}>
                {s.icon} {Object.values(compliance[activePillar]||{}).filter(v=>v===s.value).length}
              </span>
            ))}
          </div>
        </div>

        {pillar.gri_standards.map(std=>{
          const currentStatus = compliance[activePillar]?.[std.id]||"pendiente";
          return (
            <div key={std.id} style={{ display:"flex",alignItems:"flex-start",gap:14,
              padding:"13px 0",borderBottom:`1px solid ${T.b1}` }}>
              <div style={{ width:90,flexShrink:0 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                  color:pillar.color,fontWeight:600 }}>{std.id}</div>
                <div style={{ fontSize:12,color:T.t2,marginTop:2 }}>{std.name}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12,color:T.t3,lineHeight:1.5 }}>{std.topic}</div>
              </div>
              <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                {COMPLIANCE_STATUS.map(s=>(
                  <button key={s.value} onClick={()=>setCompliance(p=>({
                    ...p,[activePillar]:{ ...p[activePillar],[std.id]:s.value }}))}
                    style={{ padding:"4px 9px",borderRadius:20,border:"none",cursor:"pointer",
                      fontFamily:"'JetBrains Mono',monospace",fontSize:11,transition:"all .15s",
                      background:currentStatus===s.value?`${s.color}20`:T.s2,
                      color:currentStatus===s.value?s.color:T.t4,
                      boxShadow:currentStatus===s.value?`0 0 0 1px ${s.color}40`:"none" }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Quantitative indicators */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Indicadores cuantitativos — {pillar.label}
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:18 }}>
          Registra los datos numéricos del período para este pilar.
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          {pillar.indicators.map(ind=>(
            <div key={ind.key}>
              <label style={{ display:"block",fontSize:12,color:T.t2,marginBottom:6 }}>
                {ind.label}
              </label>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input type="number" min={0}
                  defaultValue={indicators[activePillar]?.[ind.key]||""}
                  placeholder="—"
                  style={{ flex:1,background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
                    padding:"8px 12px",color:T.t1,fontSize:13,outline:"none",
                    fontFamily:"'Instrument Sans',sans-serif",transition:"border-color .15s" }}
                  onFocus={e=>e.target.style.borderColor=pillar.color}
                  onBlur={e=>e.target.style.borderColor=T.b2}
                  onChange={e=>setIndicators(p=>({ ...p,
                    [activePillar]:{ ...p[activePillar],[ind.key]:parseFloat(e.target.value)||0 }}))}/>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                  color:T.t4,width:36,textAlign:"right",flexShrink:0 }}>{ind.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="esg" onClick={handleSave} disabled={saving}>
          {saving?<><Spinner/> Guardando…</>:saved?"✓ Guardado":"Guardar estándares e indicadores"}
        </Btn>
      </div>
    </div>
  );
}

// ── Report Form Modal ──────────────────────────────────────────
function ReportModal({ report, projectId, activePillars, supabase, onSave, onClose }) {
  const isEdit = !!report;
  const [pillar,    setPillar]    = useState(report?.pillar||activePillars[0]);
  const [type,      setType]      = useState(report?.record_type||"audit");
  const [title,     setTitle]     = useState(report?.title||"");
  const [date,      setDate]      = useState(report?.activity_date||"");
  const [evalScore, setEvalScore] = useState(report?.evaluation_score||"");
  const [summary,   setSummary]   = useState(report?.qualitative_summary||"");
  const [tensions,  setTensions]  = useState(report?.tensions_text||"");
  const [opps,      setOpps]      = useState(report?.opportunities_text||"");
  const [notes,     setNotes]     = useState(report?.consultant_notes||"");
  const [visible,   setVisible]   = useState(report?.visible_to_client??true);
  const [loading,   setLoading]   = useState(false);

  async function handleSave() {
    if (!title.trim()||!date) return;
    setLoading(true);
    try {
      const payload = {
        project_id: projectId, record_type: type, title, activity_date: date,
        pillar,
        evaluation_score:    evalScore ? parseFloat(evalScore) : null,
        qualitative_summary: summary, tensions_text: tensions,
        opportunities_text:  opps,    consultant_notes: notes,
        visible_to_client:   visible,
      };
      if (isEdit) {
        const { data, error } = await supabase
          .from("project_activities")
          .update({ ...payload, updated_at:new Date().toISOString() })
          .eq("id", report.id).select().single();
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
    <Modal title={isEdit?"Editar reporte":"Registrar reporte / diagnóstico"} onClose={onClose} width={580}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
        <Select label="Pilar" value={pillar} onChange={setPillar}
          options={activePillars.map(k=>({ value:k, label:PILLARS[k].label }))}/>
        <Select label="Tipo de documento" value={type} onChange={setType} options={[
          { value:"audit",      label:"Auditoría externa" },
          { value:"compliance", label:"Diagnóstico de cumplimiento" },
          { value:"indicators", label:"Informe de indicadores" },
          { value:"policy",     label:"Política o procedimiento" },
          { value:"report",     label:"Reporte de sostenibilidad" },
          { value:"other",      label:"Otro" },
        ]}/>
        <Input label="Título del documento" value={title} onChange={setTitle}
          placeholder="Ej. Auditoría ambiental Q1 2025" style={{ gridColumn:"span 2" }}/>
        <Input label="Fecha" value={date} onChange={setDate} type="date"/>
        <Input label="Score resultado (0–100)" value={evalScore} onChange={setEvalScore} type="number"/>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:12,marginBottom:18 }}>
        <Textarea label="Hallazgos principales" value={summary} onChange={setSummary}
          placeholder="Resultados del diagnóstico, nivel de cumplimiento, brechas…"/>
        <Textarea label="Brechas / áreas críticas" value={tensions} onChange={setTensions}
          placeholder="Estándares no cumplidos, riesgos identificados…" rows={2}/>
        <Textarea label="Oportunidades / fortalezas" value={opps} onChange={setOpps}
          placeholder="Estándares cumplidos, certificaciones posibles…" rows={2}/>
        <Textarea label="Notas del consultor (internas)" value={notes} onChange={setNotes}
          placeholder="Notas privadas — el cliente no las verá." rows={2}/>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"12px 16px",background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,marginBottom:20 }}>
        <div>
          <div style={{ fontSize:13,color:T.t1,fontWeight:500,marginBottom:2 }}>
            Visible para el cliente
          </div>
          <div style={{ fontSize:11,color:T.t3 }}>El cliente puede ver este reporte en su panel ESG.</div>
        </div>
        <Toggle checked={visible} onChange={setVisible}/>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        <Btn variant="esg" onClick={handleSave} disabled={!title.trim()||!date||loading}>
          {loading?<><Spinner/> Guardando…</>:isEdit?"Guardar cambios":"Registrar"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ── Tab: REPORTES ──────────────────────────────────────────────
function TabReports({ project, reports, supabase, onAdd, onUpdate }) {
  const [modal,  setModal]  = useState(null);
  const [filter, setFilter] = useState("all");

  const activePillars = Object.entries(project.active_pillars)
    .filter(([,v])=>v).map(([k])=>k);

  const filtered = reports.filter(r=>
    filter==="all"||r.pillar===filter
  );

  function handleSave(saved) {
    const exists = reports.some(r=>r.id===saved.id);
    exists ? onUpdate(saved) : onAdd(saved);
    setModal(null);
  }

  const TYPE_ICONS = {
    audit:"🔍", compliance:"⚖️", indicators:"📊",
    policy:"📄", report:"🌿", other:"📝",
  };

  return (
    <div className="esg-fade">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          <button onClick={()=>setFilter("all")} style={{
            padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",
            background:filter==="all"?`${T.esg}18`:"none",
            color:filter==="all"?T.esg:T.t3,fontSize:12,fontWeight:500,
            fontFamily:"'Instrument Sans',sans-serif",
            outline:filter==="all"?`1px solid ${T.esg}30`:"none" }}>Todos</button>
          {activePillars.map(k=>(
            <button key={k} onClick={()=>setFilter(k)} style={{
              padding:"6px 13px",borderRadius:20,border:"none",cursor:"pointer",
              background:filter===k?`${PILLARS[k].color}18`:"none",
              color:filter===k?PILLARS[k].color:T.t3,fontSize:12,fontWeight:500,
              fontFamily:"'Instrument Sans',sans-serif",
              outline:filter===k?`1px solid ${PILLARS[k].color}30`:"none" }}>
              {PILLARS[k].icon} {PILLARS[k].short}
            </button>
          ))}
        </div>
        <Btn variant="esg" size="sm" onClick={()=>setModal("new")}>
          + Registrar reporte
        </Btn>
      </div>

      {filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"48px 0",background:T.s2,
          border:`1px dashed ${T.b2}`,borderRadius:14 }}>
          <div style={{ fontSize:32,marginBottom:12 }}>🌿</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
            Sin reportes registrados
          </div>
          <div style={{ fontSize:13,color:T.t3,marginBottom:16 }}>
            Registra auditorías, diagnósticos de cumplimiento, informes de indicadores y políticas.
          </div>
          <Btn variant="esg" size="sm" onClick={()=>setModal("new")}>+ Primer reporte</Btn>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {filtered.map(r=>{
            const p = PILLARS[r.pillar]||PILLARS.social;
            const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;
            return (
              <div key={r.id} style={{ background:T.s1,border:`1px solid ${T.b1}`,
                borderRadius:12,padding:"18px 20px",transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=p.color+"40"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.b1}>
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                      <span style={{ fontSize:18 }}>{TYPE_ICONS[r.record_type]||"📝"}</span>
                      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1 }}>
                        {r.title}
                      </div>
                      <Pill color={p.color}>{p.icon} {p.label}</Pill>
                      {!r.visible_to_client&&(
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                          color:T.t4,background:T.s2,padding:"2px 7px",borderRadius:20 }}>🔒</span>
                      )}
                    </div>
                    <div style={{ display:"flex",gap:14,flexWrap:"wrap",marginBottom:r.qualitative_summary?10:0 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3 }}>
                        {new Date(r.activity_date).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
                      </span>
                      {r.evaluation_score!=null&&(
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                          color:sc(r.evaluation_score) }}>
                          Score: {r.evaluation_score}
                        </span>
                      )}
                    </div>
                    {r.qualitative_summary&&(
                      <div style={{ fontSize:13,color:T.t2,lineHeight:1.55,
                        marginBottom:r.tensions_text?8:0 }}>
                        {r.qualitative_summary}
                      </div>
                    )}
                    {r.tensions_text&&(
                      <div style={{ fontSize:12,color:"#fb923c",background:`${T.amber}08`,
                        border:`1px solid ${T.amber}20`,borderRadius:7,padding:"7px 11px",marginTop:6 }}>
                        ⚠ {r.tensions_text}
                      </div>
                    )}
                    {r.opportunities_text&&(
                      <div style={{ fontSize:12,color:T.green,background:`${T.green}08`,
                        border:`1px solid ${T.green}20`,borderRadius:7,padding:"7px 11px",marginTop:6 }}>
                        ✦ {r.opportunities_text}
                      </div>
                    )}
                  </div>
                  <Btn variant="ghost" size="sm" onClick={()=>setModal(r)} style={{ flexShrink:0 }}>
                    Editar
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal&&(
        <ReportModal
          report={modal==="new"?null:modal}
          projectId={project.id}
          supabase={supabase}
          activePillars={activePillars}
          onSave={handleSave}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  );
}

// ── Tab: CARGA IA ──────────────────────────────────────────────
// saveProjectScore imported from ../lib/scores.js

function TabUpload({ project, supabase, onApplyScores }) {
  const [files,         setFiles]         = useState([]);
  const [busy,          setBusy]          = useState(false);
  const [prop,          setProp]          = useState(null);
  const [drag,          setDrag]          = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const ref = useRef();

  async function loadUploadedFiles() {
    if (!supabase || !project?.id) return;
    const { data } = await supabase.from("client_files")
      .select("id, original_name, mime_type, size_bytes, created_at, status")
      .eq("project_id", project.id).eq("module_key", "esg")
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

  const activePillars = Object.entries(project.active_pillars)
    .filter(([,v])=>v).map(([k])=>k);

  async function readFileForUpload(file) {
    const raw  = file.raw || file;
    const name = file.name || raw.name || "";
    const ext  = name.split(".").pop().toLowerCase();
    const isPdfOrExcel = ["pdf","xlsx","xls","ods"].includes(ext);
    return new Promise((resolve) => {
      const reader = new FileReader();
      if (isPdfOrExcel) {
        reader.onload = e => {
          const b64 = e.target.result?.split(",")[1] || "";
          resolve({ name, base64: b64, content: null, mimeType: raw.type || "" });
        };
        reader.readAsDataURL(raw);
      } else {
        reader.onload = e => resolve({ name, content: e.target.result?.slice(0,15000)||"", base64:null });
        reader.onerror = () => resolve({ name, content:"", base64:null });
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
      scoreHistory:     logRes.data    || [],
      actors:           actorsRes.data || [],
      commitments:      commRes.data   || [],
      recentActivities: actRes.data    || [],
    };
  }

  async function uploadAndRegister(file) {
    if (!supabase || !project?.client_id) return null;
    const ts   = Date.now();
    const path = `${project.client_id}/esg/${project.id}/${ts}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("esg-documents").upload(path, file.raw || file, { upsert: false });
    if (uploadErr && !uploadErr.message?.includes("already exists") && uploadErr.statusCode !== 409) {
      console.warn("Storage ESG upload:", uploadErr.message); return null;
    }
    await supabase.from("client_files").insert({
      client_id: project.client_id, project_id: project.id, module_key: "esg",
      storage_bucket: "esg-documents", storage_path: path,
      original_name: file.name, mime_type: file.raw?.type || "application/octet-stream",
      size_bytes: file.raw?.size || 0, status: "uploaded",
    });
    return path;
  }

  async function analyze() {
    if (!files.length) return;
    setBusy(true); setProp(null);
    try {
      await Promise.all(files.map(f => uploadAndRegister(f)));

      const fileContents = await Promise.all(files.map(f => readFileForUpload(f)));
      const projectContext = await loadProjectContext();

      const res = await fetch("/api/analyze-esg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContents,
          projectName:     project.name,
          currentScores:   project.score    || {},
          currentMaturity: project.maturity || {},
          activePillars,
          projectContext,
        }),
      });

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Error servidor"); }
      const result = await res.json();
      setSourceFileName(fileContents?.[0]?.name || null);
      setProp(result);
    } catch(e) {
      console.error("Analyze ESG error:", e);
      setProp({ summary: `Error: ${e.message}`, insights: [], gri_updates: [], proposed_scores: {}, proposed_maturity: {} });
    } finally { setBusy(false); }
  }

  async function handleApply() {
    const newScores = {};
    Object.entries(prop.proposed_scores||{}).forEach(([k,v])=>{ if(v.proposed!=null) newScores[k]=v.proposed; });
    const newMaturity = {};
    Object.entries(prop.proposed_maturity||{}).forEach(([k,v])=>{ if(v.proposed!=null) newMaturity[k]=v.proposed; });

    // Scores persisted via onApplyScores → applyScores in parent
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
    onApplyScores(newScores, prop.gri_updates, prop.proposed_maturity, { method:"ai_analysis", notes:prop.summary, sourceFile:sourceFileName });
    setProp(null); setFiles([]);
  }

  const sc = v=>v>=70?T.green:v>=50?T.amber:T.red;

  return (
    <div className="esg-fade">
      <div style={{ padding:"14px 18px",background:`${T.esg}08`,border:`1px solid ${T.esg}25`,
        borderRadius:10,marginBottom:20,fontSize:13,color:"#86efac",lineHeight:1.55 }}>
        <strong>Proyecto activo:</strong> {project.name} · Archivos en{" "}
        <code style={{ background:`${T.esg}15`,padding:"1px 6px",borderRadius:4,
          fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>esg-documents</code>{" "}
        bajo{" "}
        <code style={{ background:`${T.esg}15`,padding:"1px 6px",borderRadius:4,
          fontFamily:"'JetBrains Mono',monospace",fontSize:11 }}>{"{client_id}/esg/{project_id}/"}</code>
        {" "}· La IA mapea automáticamente al framework GRI.
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
          Carga de documentos ESG
        </div>
        <div style={{ fontSize:13,color:T.t3,marginBottom:18,lineHeight:1.6 }}>
          Sube bases de datos con indicadores, políticas internas, reportes de auditoría o plantillas de la consultora.
          La IA identifica los estándares GRI relevantes y propone actualizaciones de cumplimiento y scores.
        </div>
        <div onClick={()=>ref.current.click()}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}}
          style={{ border:`2px dashed ${drag?T.esg:T.b2}`,borderRadius:12,padding:28,
            textAlign:"center",cursor:"pointer",background:drag?`${T.esg}08`:T.s2,transition:"all .2s" }}>
          <div style={{ fontSize:28,marginBottom:8 }}>📁</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:4 }}>
            Arrastra archivos o haz clic
          </div>
          <div style={{ fontSize:12,color:T.t3 }}>
            Indicadores .xlsx · Políticas .pdf · Plantillas .xlsx · Auditorías .pdf
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
          <Btn variant="esg" onClick={analyze} disabled={!files.length||busy}>
            {busy?<><Spinner/> Analizando…</>:"✦ Analizar con IA"}
          </Btn>
          <Btn variant="ghost" onClick={()=>{setFiles([]);setProp(null);}}>Limpiar</Btn>
        </div>
      </Card>

      {busy&&(
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
            <span style={{ background:`${T.esg}18`,color:T.esg,border:`1px solid ${T.esg}30`,
              borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>✦ IA</span>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:T.t3 }}>
              <Spinner/> Analizando documento ESG…
            </div>
          </div>
          {["Identificando pilar y tipo de documento",
            "Mapeando contenido a estándares GRI",
            "Evaluando nivel de cumplimiento por estándar",
            "Calculando propuesta de scores y madurez"].map((s,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:9,
              padding:"6px 0",color:T.t3,fontSize:13 }}>
              <Spinner/>{s}
            </div>
          ))}
        </Card>
      )}

      {prop&&(
        <Card>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
            <span style={{ background:`${T.esg}18`,color:T.esg,border:`1px solid ${T.esg}30`,
              borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>
              ✦ Propuesta IA
            </span>
            <Pill color={PILLARS[prop.detected_pillar]?.color||T.esg}>
              {PILLARS[prop.detected_pillar]?.icon} {PILLARS[prop.detected_pillar]?.label}
            </Pill>
          </div>

          <div style={{ fontSize:13,color:T.t2,marginBottom:16,lineHeight:1.65,
            background:T.s2,border:`1px solid ${T.b1}`,borderRadius:9,padding:"14px 16px" }}>
            {prop.summary}
          {prop.source_consistency && (
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginTop:10,
              padding:"4px 12px",borderRadius:20,fontSize:11,
              fontFamily:"'JetBrains Mono',monospace",
              background:prop.source_consistency==="consistente"?`${T.green}12`:
                         prop.source_consistency==="contradictoria"?`${T.red}12`:`${T.amber}12`,
              color:prop.source_consistency==="consistente"?T.green:
                    prop.source_consistency==="contradictoria"?T.red:T.amber }}>
              {prop.source_consistency==="consistente"?"✓ Fuentes consistentes":
                prop.source_consistency==="contradictoria"?"⚠ Fuentes contradictorias":"~ Fuentes mixtas"}
            </div>
          )}
        </div>

          {/* GRI updates */}
          {prop.gri_updates.length>0&&(
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
                letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                Propuesta de actualización GRI
              </div>
              {prop.gri_updates.map((g,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:14,
                  padding:"10px 14px",background:T.s2,border:`1px solid ${T.b1}`,
                  borderRadius:8,marginBottom:8 }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                    color:T.esg,width:80,flexShrink:0 }}>{g.id}</span>
                  <div style={{ flex:1,fontSize:12,color:T.t3 }}>{g.reason}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
                    <ComplianceBadge status={g.current}/>
                    <span style={{ color:T.t4 }}>→</span>
                    <ComplianceBadge status={g.proposed}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Score + maturity proposals */}
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:1.5,textTransform:"uppercase",marginBottom:12 }}>
            Propuesta de scores y madurez
          </div>
          {Object.entries(prop.proposed_scores).map(([key,s])=>{
            const p = PILLARS[key];
            const mat = prop.proposed_maturity?.[key];
            const changed = s.proposed!==s.current;
            return (
              <div key={key} style={{ background:T.s2,
                border:`1px solid ${changed?T.esg+"30":T.b1}`,
                borderRadius:9,padding:"14px 16px",marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:16 }}>{p?.icon}</span>
                    <span style={{ fontSize:13,color:T.t1,fontWeight:500 }}>{p?.label}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:T.t3 }}>
                        Score: {s.current}
                      </span>
                      <span style={{ color:T.t4 }}>→</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:16,
                        fontWeight:700,color:sc(s.proposed) }}>{s.proposed}</span>
                      {changed&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                        color:s.proposed>s.current?T.green:T.red }}>
                        {s.proposed>s.current?`↑ +${s.proposed-s.current}`:`↓ ${s.proposed-s.current}`}
                      </span>}
                    </div>
                    {mat&&(
                      <div style={{ display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end" }}>
                        <span style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>
                          Madurez: {mat.current}
                        </span>
                        <span style={{ color:T.t4 }}>→</span>
                        <span style={{ fontSize:11,color:p?.color,fontFamily:"'JetBrains Mono',monospace",
                          fontWeight:600 }}>
                          Nivel {mat.proposed}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize:12,color:T.t3 }}>{s.reason}</div>
              </div>
            );
          })}

          <div style={{ display:"flex",gap:10,marginTop:16 }}>
            {/* Compromisos detectados */}
            {prop.proposed_commitments?.length > 0 && (
              <div style={{ width:"100%",marginBottom:16 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
                  letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                  Compromisos detectados ({prop.proposed_commitments.length})
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
                  {prop.proposed_commitments.map((cm,i)=>(
                    <div key={i} style={{ padding:"12px 14px",background:T.s2,
                      border:`1px solid ${T.b1}`,borderRadius:10 }}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                        <input type="checkbox" defaultChecked
                          onChange={e=>{
                            const upd=[...prop.proposed_commitments];
                            upd[i]={...upd[i],_include:e.target.checked};
                            setProp(p=>({...p,proposed_commitments:upd}));
                          }}
                          style={{ marginTop:3,accentColor:T.esg,flexShrink:0 }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,color:T.t1,fontWeight:600,marginBottom:2 }}>{cm.title}</div>
                          {cm.description&&<div style={{ fontSize:12,color:T.t3,marginBottom:4 }}>{cm.description}</div>}
                          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                            {cm.responsible&&<span style={{ fontSize:11,color:T.t3 }}>👤 {cm.responsible}</span>}
                            {cm.due_date&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.amber }}>📅 {cm.due_date}</span>}
                          </div>
                          {cm.source_quote&&(
                            <div style={{ fontSize:11,color:T.t4,fontStyle:"italic",marginTop:5,
                              padding:"4px 8px",background:T.s1,borderRadius:5 }}>
                              "{cm.source_quote}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <Btn variant="success" onClick={handleApply}>✓ Aplicar propuesta</Btn>
            <Btn variant="ghost"   onClick={()=>setProp(null)}>Descartar</Btn>
          </div>
        </Card>
      )}

      {uploadedFiles.length > 0 && (
        <Card>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
            Archivos subidos ({uploadedFiles.length})
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {uploadedFiles.map(f => (
              <div key={f.id} style={{ display:"flex",alignItems:"center",gap:12,
                padding:"10px 14px",background:T.s2,borderRadius:9,border:`1px solid ${T.b1}` }}>
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
export default function ModuleESG({ client, supabase }) {
  const [projects, setProjects] = useState([]);
  const [selProjId,setSelProjId]= useState(null);
  const [reports,  setReports]  = useState([]);
  const [tab,      setTab]      = useState("score");
  const [projCommitments, setProjCommitments] = useState([]);
  const [showBaseline,    setShowBaseline]    = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!supabase || !client?.id) return;
    loadProjects();
  }, [supabase, client?.id]);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data: projs, error: pErr } = await supabase
        .from("projects").select("*")
        .eq("client_id", client.id).eq("module_key", "esg")
        .order("starts_on", { ascending: false });
      if (pErr) throw pErr;
      if (!projs?.length) { setProjects([]); setLoading(false); return; }

      const ids = projs.map(p=>p.id);
      const [scoresRes, reportsRes] = await Promise.all([
        supabase.from("project_scores").select("*").in("project_id", ids)
          .order("updated_at", { ascending: false }),
        supabase.from("project_activities").select("*").in("project_id", ids)
          .order("activity_date", { ascending: false }),
      ]);

      // Also fetch client_modules for active_pillars
      const { data: modData } = await supabase
        .from("client_modules").select("active_pillars_json")
        .eq("client_id", client.id).single();
      const activePillars = modData?.active_pillars_json ||
        { ambiental:true, social:true, gobernanza:true };

      const projectsWithScores = projs.map(p => {
        const ps  = scoresRes.data?.find(s=>s.project_id===p.id);
        const dim = ps?.dimension_scores_json || {};
        const drv = ps?.score_drivers_json    || {};
        return {
          ...p,
          active_pillars: activePillars,
          score: {
            overall:    ps?.overall_score ?? null,
            ambiental:  dim.ambiental  ?? null,
            social:     dim.social     ?? null,
            gobernanza: dim.gobernanza ?? null,
          },
          maturity:        drv.maturity        || { ambiental:1, social:1, gobernanza:1 },
          gri_compliance:  drv.gri_compliance  || { ambiental:{}, social:{}, gobernanza:{} },
          indicators:      drv.indicators      || { ambiental:{}, social:{}, gobernanza:{} },
          history: [],
        };
      });

      setProjects(projectsWithScores);
      setSelProjId(projectsWithScores[0]?.id || null);
      setReports(reportsRes.data || []);
    } finally {
      setLoading(false);
    }
  }

  const selProject  = projects.find(p=>p.id===selProjId) || projects[0];
  const projReports = reports.filter(r=>r.project_id===selProjId);

  async function updateProject(updated) {
    setProjects(p=>p.map(pr=>pr.id===updated.id?updated:pr));
    if (supabase && 'client_visible' in updated) {
      const { error } = await supabase.from("projects")
        .update({ client_visible:updated.client_visible, updated_at:new Date().toISOString() })
        .eq("id", updated.id);
      if (error) console.error('client_visible update error:', error);
    }
  }

  async function applyScores(newScores, griUpdates, maturityUpdates, opts = {}) {
    const updated = projects.map(pr=>{
      if (pr.id!==selProjId) return pr;
      const active = Object.entries(pr.active_pillars||{}).filter(([,v])=>v).map(([k])=>k);
      const overall = active.length
        ? Math.round(active.reduce((s,k)=>s+(newScores[k]??pr.score[k]??0),0)/active.length) : 0;
      let newCompliance = { ...pr.gri_compliance };
      if (griUpdates) griUpdates.forEach(g=>{
        Object.keys(newCompliance).forEach(pk=>{
          if (g.id in (newCompliance[pk]||{})) newCompliance[pk][g.id]=g.proposed;
        });
      });
      let newMaturity = { ...pr.maturity };
      if (maturityUpdates) Object.entries(maturityUpdates).forEach(([k,v])=>{ newMaturity[k]=v.proposed; });
      return { ...pr, score:{ ...pr.score, ...newScores, overall },
        maturity:newMaturity, gri_compliance:newCompliance };
    });
    setProjects(updated);
    if (supabase && selProjId) {
      const pr = updated.find(p=>p.id===selProjId);
      await saveProjectScore(supabase, selProjId, {
        overall_score:         pr?.score?.overall ?? 0,
        dimension_scores_json: { ...pr?.score },
        score_drivers_json: {
          maturity:       pr?.maturity        || {},
          gri_compliance: pr?.gri_compliance  || {},
          active_pillars: pr?.active_pillars  || {},
        },
      }, { method: opts.method || "manual", notes: opts.notes || null, sourceFile: opts.sourceFile || null });
      await syncClientScore(supabase, pr?.client_id, "esg",
        pr?.score || {}, pr?.score?.overall ?? 0);
    }
    setTab("score");
  }

  const TABS = [
    { id:"score",   label:"Score ESG"     },
    { id:"gri",     label:"Framework GRI" },
    { id:"reports", label:`Reportes${projReports.length>0?` (${projReports.length})`:""}`},
    { id:"upload",  label:"Carga IA"      },
    { id:"files",       label:"Archivos"     },
    { id:"surveys",     label:"Encuestas"    },
    { id:"commitments", label:`Compromisos${projCommitments?.length>0?` (${projCommitments.length})`:""}`},
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="esg-module" style={{ padding:"clamp(16px, 4vw, 36px)",maxWidth:1200,overflowX:"hidden" }}>
        {/* THO spectrum stripe */}
        <div style={{ height:2, background:"linear-gradient(90deg,#e8631a,#c44a7a,#9b59d0)",
          margin:"-32px -36px 24px" }}/>

        {/* Header */}
        <div className="esg-fade" style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.esg,
            letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>
            🌿 Sostenibilidad Corporativa
          </div>
          <div style={{ fontFamily:"'Megrim',cursive" ,letterSpacing:2,fontSize:30,color:T.t1,
            letterSpacing:-.5,marginBottom:4 }}>Madurez ESG</div>
          <div style={{ fontSize:13,color:T.t2 }}>
            Framework GRI · Ambiental · Social · Gobernanza · {client?.name||"Cliente"}
          </div>
        </div>

        {/* Project selector */}
        <div className="esg-fade esg-d1" style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
            letterSpacing:2,textTransform:"uppercase",marginBottom:10 }}>Proyecto activo</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {projects.map(p=>{
              const st = STATUS_META[p.status]||STATUS_META.draft;
              const isActive = p.id===selProjId;
              const activePillars = Object.entries(p.active_pillars).filter(([,v])=>v);
              return (
                <div key={p.id} onClick={()=>setSelProjId(p.id)} style={{
                  padding:"12px 16px",borderRadius:11,cursor:"pointer",transition:"all .15s",
                  border:`1px solid ${isActive?`${T.esg}50`:T.b2}`,
                  background:isActive?`${T.esg}10`:T.s2,
                  display:"flex",flexDirection:"column",gap:6,minWidth:240 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:isActive?T.t1:T.t2 }}>{p.name}</div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:st.color }}>
                      ● {st.label}
                    </span>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                      color:isActive?T.esg:T.t4 }}>
                      ESG: {p.score.overall}
                    </span>
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    {activePillars.map(([k])=>(
                      <span key={k} style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:PILLARS[k].color,background:`${PILLARS[k].color}15`,
                        padding:"1px 6px",borderRadius:20 }}>{PILLARS[k].short}</span>
                    ))}
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
          <div className="esg-fade esg-d2" style={{ display:"flex",alignItems:"center",
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
                  ?"El cliente puede ver scores, madurez GRI y reportes marcados como visibles."
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
          <div style={{ padding:"12px 18px",background:`${T.esg}08`,
            border:`1px solid ${T.esg}25`,borderRadius:10,marginBottom:20,
            display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13,color:T.t1,fontWeight:600,marginBottom:2 }}>Instrumento de observación directa</div>
              <div style={{ fontSize:12,color:T.t3 }}>
                Genera o actualiza la medición completando el cuestionario de observación.
              </div>
            </div>
            <button onClick={()=>setShowBaseline(true)} style={{
              padding:"8px 16px",background:T.esg,border:"none",borderRadius:8,
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

        {/* Content */}
        {loading ? (
          <div style={{ display:"flex",alignItems:"center",gap:10,color:T.t3,
            fontFamily:"'JetBrains Mono',monospace",fontSize:13,padding:"48px 0" }}>
            <span style={{ width:14,height:14,border:`2px solid ${T.b2}`,borderTopColor:T.esg,
              borderRadius:"50%",animation:"esgSpin .8s linear infinite",display:"inline-block" }}/>
            Cargando proyectos…
          </div>
        ) : !selProject ? (
          <div style={{ textAlign:"center",padding:"48px 0",background:T.s2,
            border:`1px dashed ${T.b2}`,borderRadius:14 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1,marginBottom:6 }}>
              Sin proyectos ESG
            </div>
            <div style={{ fontSize:13,color:T.t3 }}>
              Crea el primer proyecto ESG desde Gestión de Clientes.
            </div>
          </div>
        ) : (
          <>
            {tab==="score"&&(
              <TabScore project={selProject} supabase={supabase} onUpdate={updateProject}/>
            )}
            {tab==="gri"&&(
              <TabGRI project={selProject} supabase={supabase} onUpdate={updateProject}/>
            )}
            {tab==="reports"&&(
              <TabReports project={selProject} reports={projReports}
                supabase={supabase}
                onAdd={r=>setReports(p=>[r,...p])}
                onUpdate={r=>setReports(p=>p.map(x=>x.id===r.id?r:x))}/>
            )}
            {tab==="upload"&&(
              <TabUpload project={selProject} supabase={supabase} onApplyScores={applyScores}/>
            )}
            {tab==="files"&&(
              <FilesPanel
                projectId={selProject.id}
                moduleKey="esg"
                supabase={supabase}
                isConsultant={true}
                accentColor={T.esg}/>
            )}
            {tab==="surveys"&&(
              <FormManager
                projectId={selProject.id}
                moduleKey="esg"
                supabase={supabase}
                accentColor={T.esg}
                onApplyScores={(result, formTitle) => {
                  if(result?.proposed_scores||result?.proposed) {
                    const scores = result.proposed_scores||result.proposed;
                    applyScores(scores, { method:"survey", notes:`Formulario: ${formTitle}` });
                  }
                }}/>
            )}
            {tab==="commitments"&&(
              <CommitmentsPanel
                projectId={selProject.id}
                clientId={selProject.client_id}
                moduleKey="esg"
                supabase={supabase}
                isConsultant={true}
                accentColor={T.esg}/>
            )}
          </>
        )}
      </div>
      {showBaseline && selProject && (
        <BaselineInstrument
          moduleKey="esg"
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
