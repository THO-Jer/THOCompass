// ============================================================
// ClientDashboard.jsx
// Dashboard del cliente — THO Compass v4
//
// Estructura:
//   Vista general  → resumen automático, scores, alertas,
//                    evolución, proyectos visibles
//   Vista módulo   → detalle de RC / DO / ESG al hacer click
//
// Lo que el cliente VE está controlado por:
//   - project.client_visible (toggle en vista consultora)
//   - activity.visible_to_client
//   - alert.visible_to_client
//   - recommendation.visible_to_client
//
// Supabase queries documentadas en cada función mock.
// ============================================================

import { useState, useRef, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import ScoreLog from "./ScoreLog.jsx";
import FilesPanel from "./FilesPanel.jsx";

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
.cd-fade{animation:cdFade .4s cubic-bezier(.4,0,.2,1) both;}
.cd-d1{animation-delay:.07s;} .cd-d2{animation-delay:.14s;}
.cd-d3{animation-delay:.21s;} .cd-d4{animation-delay:.28s;}
.cd-d5{animation-delay:.35s;}
@keyframes cdFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes cdSpin{to{transform:rotate(360deg)}}
@keyframes cdPulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes cdGlow{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.3)}50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
`;

// ── Module meta ────────────────────────────────────────────────
const MOD = {
  rc:  { key:"rc",  label:"Relacionamiento Comunitario", short:"RC",  icon:"🤝", color:T.rc,
         scoreLabel:"Índice LSO", scoreDesc:"Licencia Social de Operación",
         methodDesc:"Mide la legitimidad, credibilidad y confianza que la organización ha construido con las comunidades donde opera.",
         dims:[
           { key:"percepcion",     label:"Percepción y confianza", weight:30, tooltip:"Evalúa cómo perciben a la organización sus stakeholders clave, medido a través de encuestas NPS adaptadas." },
           { key:"compromisos",    label:"Gestión de compromisos", weight:25, tooltip:"Mide el cumplimiento de acuerdos adquiridos con la comunidad." },
           { key:"dialogo",        label:"Calidad del diálogo",    weight:25, tooltip:"Valora la frecuencia, calidad y diversidad de las instancias de participación territorial." },
           { key:"conflictividad", label:"Conflictividad activa",  weight:20, tooltip:"Indicador inverso: a mayor conflictividad activa, menor puntaje." },
         ]},
  do:  { key:"do",  label:"Desarrollo Organizacional",   short:"DO",  icon:"🏛", color:T.do,
         scoreLabel:"Salud Organizacional", scoreDesc:"Índice de Salud Org.",
         methodDesc:"Diagnóstico del estado cultural y organizacional. Integra percepción de cultura, clima laboral y calidad del liderazgo.",
         dims:[
           { key:"cultura",    label:"Cultura organizacional", weight:35, tooltip:"Mide la coherencia entre los valores declarados y los comportamientos observados en la práctica." },
           { key:"engagement", label:"Engagement y clima",     weight:35, tooltip:"Evalúa motivación, satisfacción y sentido de pertenencia. Basado en eNPS y encuestas de clima." },
           { key:"liderazgo",  label:"Liderazgo",              weight:30, tooltip:"Mide la percepción de jefaturas directas en comunicación y desarrollo de equipo." },
         ]},
  esg: { key:"esg", label:"Sostenibilidad Corporativa",  short:"ESG", icon:"🌿", color:T.esg,
         scoreLabel:"Madurez ESG", scoreDesc:"Índice de Madurez ESG",
         methodDesc:"Evalúa el nivel de madurez en las tres dimensiones ESG, alineado con estándares GRI e ISO 26000.",
         dims:[
           { key:"ambiental",  label:"Ambiental",   weight:33, tooltip:"Cumplimiento normativo ambiental, gestión de residuos y huella de carbono." },
           { key:"social",     label:"Social",       weight:34, tooltip:"Condiciones laborales, diversidad e inclusión y relacionamiento comunitario." },
           { key:"gobernanza", label:"Gobernanza",   weight:33, tooltip:"Ética empresarial, prevención de delitos (Ley 21.595) y transparencia." },
         ]},
};

const MATURITY_LEVELS = [
  { level:1, label:"Inicial",    color:T.red    },
  { level:2, label:"Básico",     color:"#fb923c" },
  { level:3, label:"Definido",   color:T.amber  },
  { level:4, label:"Gestionado", color:T.teal   },
  { level:5, label:"Optimizado", color:T.green  },
];

// ── Mock data ──────────────────────────────────────────────────
// En producción este objeto viene de Supabase:
// SELECT c.*, cm.*, cs.*, csh.*, ca.*, cr.*,
//   json_agg(p.*) as projects,
//   json_agg(cm2.*) as messages
// FROM clients c
// JOIN client_modules cm ON cm.client_id = c.id
// JOIN client_scores cs ON cs.client_id = c.id
// JOIN client_score_history csh ON csh.client_id = c.id
// LEFT JOIN client_alerts ca ON ca.client_id = c.id AND ca.visible_to_client = true
// LEFT JOIN client_recommendations cr ON cr.client_id = c.id AND cr.visible_to_client = true
// LEFT JOIN projects p ON p.client_id = c.id AND p.client_visible = true
// LEFT JOIN client_messages cm2 ON cm2.client_id = c.id
// WHERE c.id = :clientId AND c.published = true
const MOCK_CLIENT = {
  id:"c1",
  name:"Minera Los Andes",
  industry:"Minería",
  period:"Q1 2025",
  contact_consultant:"Jeremías · THO Consultora",
  modules:{ rc:true, do:true, esg:true },
  scores:{
    rc:{ total:68, percepcion:65, compromisos:72, dialogo:70, conflictividad:62 },
    do:{ total:78, cultura:80, engagement:76, liderazgo:78 },
    esg:{ total:71, ambiental:68, social:74, gobernanza:72,
          maturity:{ ambiental:3, social:4, gobernanza:3 } },
  },
  history:[
    { period:"Q2 2024", rc:58, do:70, esg:62 },
    { period:"Q3 2024", rc:62, do:72, esg:65 },
    { period:"Q4 2024", rc:65, do:75, esg:68 },
    { period:"Q1 2025", rc:68, do:78, esg:71 },
  ],
  alerts:[
    { id:"a1", type:"amber", text:"Mesa de diálogo comunidad La Greda pendiente de reagendar.", date:"12 Mar 2025", module:"rc" },
    { id:"a2", type:"green", text:"Compromiso de reforestación completado al 100%.", date:"8 Mar 2025", module:"rc" },
    { id:"a3", type:"red",   text:"Conflictividad sobre umbral esperado en sector norte.", date:"3 Mar 2025", module:"rc" },
    { id:"a4", type:"amber", text:"Brecha salarial de género requiere plan de cierre formal.", date:"28 Feb 2025", module:"esg" },
    { id:"a5", type:"green", text:"Modelo de prevención Ley 21.595 auditado y aprobado.", date:"15 Feb 2025", module:"esg" },
  ],
  recommendations:[
    { id:"r1", text:"Priorizar mesa de diálogo sector norte para reducir conflictividad activa.", module:"rc" },
    { id:"r2", text:"Plan de comunicación trimestral para fortalecer percepción comunitaria.", module:"rc" },
    { id:"r3", text:"Diseñar política formal de cierre de brecha salarial de género.", module:"esg" },
  ],
  // Solo proyectos marcados como client_visible = true
  projects:[
    { id:"p1", name:"Proyecto Coronel", module_key:"rc",  status:"active",
      description:"Gestión territorial zona costera Coronel.", starts_on:"2024-10-01", ends_on:"2025-06-30" },
    { id:"p3", name:"Diagnóstico Clima 2025", module_key:"do", status:"active",
      description:"Diagnóstico de clima y cultura Q1-Q2 2025.", starts_on:"2025-02-01", ends_on:"2025-07-31",
      participants:{ total:320, responded:284, rate:88.7 } },
    { id:"p4", name:"Estrategia ESG 2025", module_key:"esg", status:"active",
      description:"Diagnóstico y hoja de ruta ESG alineada a GRI.", starts_on:"2025-01-01", ends_on:"2025-12-31" },
  ],
  messages:[
    { id:"m1", from:"client",     body:"¿Cuándo tendremos el análisis del sector norte?", created_at:"2025-03-14T10:32:00Z" },
    { id:"m2", from:"consultant", body:"Esta semana enviamos el análisis detallado con acciones recomendadas.", created_at:"2025-03-14T11:05:00Z" },
  ],
  // GRI compliance summary (solo pilares visibles)
  gri_summary:{
    social:    { cumple:4, parcial:1, pendiente:1, total:6 },
    gobernanza:{ cumple:3, parcial:2, pendiente:0, total:5 },
  },
};

// ── Helpers ────────────────────────────────────────────────────
const sc    = v => v==null ? T.t3 : v>=70 ? T.green : v>=50 ? T.amber : T.red;
const scLbl = v => v>=70 ? "Favorable" : v>=50 ? "En desarrollo" : "Crítico";
const fmtDate = iso => new Date(iso).toLocaleDateString("es-CL",{
  day:"numeric", month:"short", year:"numeric" });

// ── Atoms ──────────────────────────────────────────────────────
const Card = ({ children, style={}, cls="" }) => (
  <div className={cls} style={{ background:T.s1, border:`1px solid ${T.b1}`,
    borderRadius:14, padding:"22px 24px", ...style }}>{children}</div>
);

const Tip = ({ text, children }) => {
  const [show,setShow] = useState(false);
  return (
    <span style={{ position:"relative",display:"inline-flex",alignItems:"center" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show&&<span style={{ position:"absolute",bottom:"calc(100% + 8px)",left:"50%",
        transform:"translateX(-50%)",background:"#1f1f1f",border:`1px solid ${T.b2}`,
        borderRadius:8,padding:"10px 14px",fontSize:12,color:T.t2,lineHeight:1.55,
        width:240,zIndex:9999,pointerEvents:"none",boxShadow:"0 8px 24px rgba(0,0,0,.5)",
        fontFamily:"'Instrument Sans',sans-serif" }}>{text}</span>}
    </span>
  );
};

const Btn = ({ children, onClick, variant="ghost", size="md", style={} }) => {
  const base = { padding:size==="sm"?"6px 13px":"9px 18px", fontSize:size==="sm"?12:13,
    fontWeight:600, cursor:"pointer", border:"none", borderRadius:8, transition:"all .15s",
    fontFamily:"'Instrument Sans',sans-serif", display:"inline-flex", alignItems:"center", gap:6, ...style };
  const v = {
    primary:{ background:T.blue,  color:"white" },
    ghost:  { background:"none",  color:T.t2,  border:`1px solid ${T.b2}` },
  };
  return <button style={{...base,...v[variant]}} onClick={onClick}
    onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.15)"}
    onMouseLeave={e=>e.currentTarget.style.filter="none"}>{children}</button>;
};

// ── Score Ring ─────────────────────────────────────────────────
function ScoreRing({ value, size=110, color }) {
  const c = color||sc(value);
  const inner = size*.76;
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",margin:"0 auto",
      background:`conic-gradient(${c} 0% ${value||0}%, ${T.b1} ${value||0}% 100%)`,
      display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ width:inner,height:inner,borderRadius:"50%",background:T.bg,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:size*.27,color:c,lineHeight:1 }}>
          {value??"—"}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:size*.09,color:T.t3 }}>/100</span>
      </div>
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────
function ProgBar({ label, value, color, tooltip, weight }) {
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <span style={{ fontSize:12,color:T.t2 }}>{label}</span>
          {tooltip&&(
            <Tip text={tooltip}>
              <span style={{ width:14,height:14,borderRadius:"50%",background:T.b2,color:T.t3,
                fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"help",fontFamily:"'JetBrains Mono',monospace" }}>?</span>
            </Tip>
          )}
          {weight&&(
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
              background:T.s3,padding:"1px 5px",borderRadius:3 }}>{weight}%</span>
          )}
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:sc(value) }}>
          {value??"—"}
        </span>
      </div>
      <div style={{ height:5,background:T.b2,borderRadius:3,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${value||0}%`,background:color,borderRadius:3,
          transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
    </div>
  );
}

// ── Auto Summary Block ─────────────────────────────────────────
// Genera un resumen automático basado en los datos del cliente.
// En producción puede ser generado por la API de Claude.
function AutoSummary({ client }) {
  const activeModules = Object.entries(client.modules || {}).filter(([,v])=>v);
  const scores = activeModules.map(([k])=>client.scores?.[k]?.total||0);
  const avgScore = activeModules.length
    ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)
    : 0;
  const hist = client.history || [];
  const prevPeriod = hist[hist.length-2];
  const currPeriod = hist[hist.length-1];
  const trend = currPeriod && prevPeriod
    ? Object.keys(MOD).filter(k=>client.modules[k])
        .reduce((s,k)=>s+(currPeriod[k]||0)-(prevPeriod[k]||0),0)
    : 0;

  const criticalAlerts = (client.alerts || []).filter(a=>a.type==="red").length;
  const pendingActions = (client.alerts || []).filter(a=>a.type==="amber").length;
  const goodNews       = (client.alerts || []).filter(a=>a.type==="green").length;

  // Determine overall status
  const status = avgScore>=70&&criticalAlerts===0 ? "good"
               : avgScore>=50&&criticalAlerts<=1  ? "moderate"
               : "attention";

  const statusConfig = {
    good:      { label:"Posición favorable",      color:T.green, icon:"✦", bg:`${T.green}06` },
    moderate:  { label:"En desarrollo",            color:T.amber, icon:"◆", bg:`${T.amber}06` },
    attention: { label:"Requiere atención",        color:T.red,   icon:"⚠", bg:`${T.red}06`   },
  };
  const cfg = statusConfig[status];

  // Auto-generated narrative
  const narrative = status==="good"
    ? `${client.name} mantiene una posición favorable en todos los módulos activos. Los indicadores han mejorado respecto al período anterior${trend>0?` (+${trend} puntos promedio)`:""} y no se registran alertas críticas activas.`
    : status==="moderate"
    ? `${client.name} muestra un desempeño en desarrollo con oportunidades claras de mejora. ${criticalAlerts>0?`Se registra ${criticalAlerts} alerta${criticalAlerts>1?"s":""} crítica${criticalAlerts>1?"s":""} que requiere${criticalAlerts>1?"n":""} atención prioritaria.`:""} ${pendingActions>0?`Hay ${pendingActions} acción${pendingActions>1?"es":""} pendiente${pendingActions>1?"s":""} de seguimiento.`:""}`
    : `${client.name} requiere atención en aspectos críticos. Se registran ${criticalAlerts} alerta${criticalAlerts>1?"s":""} crítica${criticalAlerts>1?"s":""} que necesitan resolución inmediata. Se recomienda revisar las acciones prioritarias con el equipo consultor.`;

  return (
    <div style={{ background:`${cfg.bg}`,border:`1px solid ${cfg.color}20`,
      borderRadius:16,padding:"24px 28px",marginBottom:20,position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,
        borderRadius:"50%",background:`radial-gradient(circle,${cfg.color}08,transparent 65%)`,
        pointerEvents:"none" }}/>
      <div style={{ display:"flex",alignItems:"flex-start",gap:18 }}>
        <div style={{ width:48,height:48,borderRadius:12,flexShrink:0,
          background:`${cfg.color}15`,border:`1px solid ${cfg.color}25`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:22,animation:status==="good"?"cdGlow 3s ease-in-out infinite":"none" }}>
          {cfg.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:17,color:T.t1 }}>
              Estado actual de la asesoría
            </div>
            <span style={{ background:`${cfg.color}18`,color:cfg.color,
              border:`1px solid ${cfg.color}30`,padding:"3px 10px",
              borderRadius:20,fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize:14,color:T.t2,lineHeight:1.7,marginBottom:16 }}>
            {narrative}
          </div>
          {/* Status indicators */}
          <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
            {[
              { val:criticalAlerts, label:"Alertas críticas",  color:criticalAlerts>0?T.red:T.t3,   icon:"⚠" },
              { val:pendingActions, label:"Acciones pendientes",color:pendingActions>0?T.amber:T.t3, icon:"◐" },
              { val:goodNews,       label:"Avances positivos",  color:goodNews>0?T.green:T.t3,       icon:"✓" },
              { val:(client.recommendations||[]).length, label:"Recomendaciones", color:T.blue, icon:"→" },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex",alignItems:"center",gap:6 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:14,
                  fontWeight:600,color:s.color }}>{s.val}</span>
                <span style={{ fontSize:12,color:T.t3 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Module Card (dashboard view) ───────────────────────────────
function ModuleCard({ modKey, scores, active, onClick }) {
  const mod = MOD[modKey];
  if (!mod||!active) return null;
  const total = scores?.[modKey]?.total;
  return (
    <div onClick={onClick} style={{ background:T.s1,border:`1px solid ${T.b1}`,borderRadius:14,
      padding:22,cursor:"pointer",position:"relative",overflow:"hidden",transition:"all .2s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=mod.color+"44";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,.3)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,
        background:`linear-gradient(90deg,${mod.color},${mod.color}66)` }}/>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16 }}>
        <div style={{ width:40,height:40,borderRadius:10,background:`${mod.color}18`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
          {mod.icon}
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:36,
            color:sc(total),lineHeight:1 }}>{total??"—"}</div>
          <div style={{ fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace",marginTop:2 }}>
            /100
          </div>
        </div>
      </div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:13,color:T.t1,marginBottom:3 }}>
        {mod.label}
      </div>
      <div style={{ fontSize:11,color:T.t3,marginBottom:14 }}>{mod.scoreLabel}</div>
      {/* Dimensions */}
      {scores?.[modKey]&&mod.dims.map(d=>(
        <ProgBar key={d.key} label={d.label}
          value={scores[modKey][d.key]} color={mod.color}
          tooltip={d.tooltip} weight={d.weight}/>
      ))}
      {/* CTA */}
      <div style={{ marginTop:14,display:"flex",alignItems:"center",gap:6,
        color:mod.color,fontSize:12,fontFamily:"'JetBrains Mono',monospace" }}>
        Ver detalle →
      </div>
    </div>
  );
}

// ── Module Detail View ─────────────────────────────────────────
function ModuleDetail({ modKey, client, onBack, supabase }) {
  const mod = MOD[modKey];
  const scores = client.scores?.[modKey] || {};
  const moduleProjects    = (client.projects     || []).filter(p=>p.module_key===modKey);
  const moduleAlerts      = (client.alerts       || []).filter(a=>a.module===modKey);
  const moduleRecs        = (client.recommendations || []).filter(r=>r.module===modKey);
  const moduleCommitments = (client.commitments  || []).filter(c=>
    moduleProjects.some(p=>p.id===c.project_id)
  );
  const [tab, setTab]  = useState("overview");

  const radarData = mod.dims.map(d=>({ s:d.label.split(" ")[0], A:scores?.[d.key]||0 }));
  const history   = (client.history || []).map(h=>({ period:h.period, score:h[modKey] }));

  // First project of this module for score log
  const firstProject = moduleProjects[0];

  const TABS = [
    { id:"overview",     label:"Resumen"  },
    { id:"projects",     label:`Proyectos${moduleProjects.length>0?` (${moduleProjects.length})`:""}`},
    { id:"commitments",  label:`Compromisos${moduleCommitments.length>0?` (${moduleCommitments.length})`:""}`},
    { id:"documents",    label:"Documentos"},
    { id:"history",      label:"Historial de scores"},
    { id:"evolution",    label:"Evolución"},
  ];

  const STATUS_COLOR = { active:T.green, draft:T.t3, paused:T.amber, closed:T.t4 };
  const STATUS_LABEL = { active:"Activo", draft:"Borrador", paused:"Pausado", closed:"Cerrado" };

  return (
    <div style={{ padding:"32px 36px",maxWidth:1200 }}>
      {/* Back */}
      <button onClick={onBack} style={{ background:"none",border:"none",color:T.t3,
        cursor:"pointer",fontSize:13,fontFamily:"'Instrument Sans',sans-serif",
        display:"flex",alignItems:"center",gap:6,marginBottom:18,padding:0 }}
        onMouseEnter={e=>e.currentTarget.style.color=T.t1}
        onMouseLeave={e=>e.currentTarget.style.color=T.t3}>
        ← Volver al dashboard
      </button>

      {/* Header */}
      <div className="cd-fade" style={{ marginBottom:26 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:mod.color,
          letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>
          {mod.icon} {mod.label}
        </div>
        <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",
          flexWrap:"wrap",gap:14 }}>
          <div style={{ fontFamily:'Megrim',cursive,letterSpacing:2,fontSize:28,color:T.t1,letterSpacing:-.5 }}>
            {mod.scoreLabel}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:32,
              color:sc(scores?.total),fontWeight:600 }}>{scores?.total??"-"}</span>
            <div>
              <div style={{ fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>/100</div>
              <span style={{ background:`${sc(scores?.total)}18`,color:sc(scores?.total),
                border:`1px solid ${sc(scores?.total)}30`,padding:"2px 8px",
                borderRadius:20,fontSize:11,fontFamily:"'JetBrains Mono',monospace" }}>
                {scLbl(scores?.total||0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <div className="cd-fade cd-d1" style={{ padding:"12px 16px",background:`${mod.color}08`,
        border:`1px solid ${mod.color}20`,borderRadius:10,marginBottom:22,
        display:"flex",gap:10,alignItems:"flex-start" }}>
        <span style={{ color:mod.color,flexShrink:0,marginTop:1 }}>ℹ</span>
        <div style={{ fontSize:13,color:T.t2,lineHeight:1.6 }}>
          <strong style={{ color:T.t1 }}>¿Cómo se construye este índice?</strong>{" "}
          {mod.methodDesc}{" "}
          <span style={{ color:T.t3 }}>
            Pasa el cursor sobre cada dimensión para ver su definición y metodología de cálculo.
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:3,marginBottom:22,background:T.s2,
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

      {/* Overview */}
      {tab==="overview"&&(
        <div className="cd-fade">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
            {/* Score ring + dims */}
            <Card>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:16 }}>
                Score por dimensión
              </div>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:20 }}>
                <ScoreRing value={scores?.total} size={120} color={mod.color}/>
              </div>
              {mod.dims.map(d=>(
                <ProgBar key={d.key} label={d.label}
                  value={scores?.[d.key]} color={mod.color}
                  tooltip={d.tooltip} weight={d.weight}/>
              ))}
            </Card>
            {/* Radar */}
            <Card>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
                Perfil de indicadores
              </div>
              <div style={{ height:240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={T.b2}/>
                    <PolarAngleAxis dataKey="s" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }}/>
                    <Radar dataKey="A" stroke={mod.color} fill={mod.color} fillOpacity={.1} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* ESG maturity levels */}
              {modKey==="esg"&&client.scores.esg?.maturity&&(
                <>
                  <div style={{ height:1,background:T.b1,margin:"16px 0" }}/>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:13,color:T.t1,marginBottom:12 }}>
                    Nivel de madurez por pilar
                  </div>
                  {["ambiental","social","gobernanza"].map(k=>{
                    const lv = client.scores.esg.maturity[k]||1;
                    const ml = MATURITY_LEVELS[lv-1];
                    const pillarColor = k==="ambiental"?"#4ade80":k==="social"?T.blue:"#a78bfa";
                    return (
                      <div key={k} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",
                          alignItems:"center",marginBottom:6 }}>
                          <span style={{ fontSize:12,color:T.t2,textTransform:"capitalize" }}>{k}</span>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                            color:ml.color }}>Nivel {lv}/5 · {ml.label}</span>
                        </div>
                        <div style={{ display:"flex",gap:3 }}>
                          {[1,2,3,4,5].map(i=>(
                            <div key={i} style={{ flex:1,height:6,borderRadius:2,
                              background:i<=lv?pillarColor:T.b2,transition:"background .3s" }}/>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </Card>
          </div>

          {/* Alerts for this module */}
          {moduleAlerts.length>0&&(
            <Card>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
                Alertas del módulo
              </div>
              {moduleAlerts.map(a=>(
                <div key={a.id} style={{ display:"flex",gap:10,padding:"11px 14px",
                  borderRadius:8,marginBottom:8,
                  background:a.type==="red"?`${T.red}0e`:a.type==="amber"?`${T.amber}0e`:`${T.green}0e`,
                  border:`1px solid ${a.type==="red"?T.red:a.type==="amber"?T.amber:T.green}25` }}>
                  <span style={{ fontSize:14,marginTop:1 }}>
                    {a.type==="red"?"✕":a.type==="amber"?"⚠":"✓"}
                  </span>
                  <div>
                    <div style={{ fontSize:13,color:T.t2 }}>{a.text}</div>
                    <div style={{ fontSize:10,color:T.t4,fontFamily:"'JetBrains Mono',monospace",marginTop:2 }}>
                      {a.date}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* GRI compliance for ESG */}
          {modKey==="esg"&&client.gri_summary&&(
            <Card style={{ marginTop:16 }}>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:16 }}>
                Cumplimiento de estándares GRI
              </div>
              {Object.entries(client.gri_summary).map(([pillar,g])=>{
                const pillarColor = pillar==="ambiental"?"#4ade80":pillar==="social"?T.blue:"#a78bfa";
                return (
                  <div key={pillar} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:8 }}>
                      <span style={{ fontSize:13,color:T.t1,textTransform:"capitalize" }}>
                        {pillar}
                      </span>
                      <div style={{ display:"flex",gap:12 }}>
                        <span style={{ fontSize:11,color:T.green,fontFamily:"'JetBrains Mono',monospace" }}>
                          ✓ {g.cumple}
                        </span>
                        <span style={{ fontSize:11,color:T.amber,fontFamily:"'JetBrains Mono',monospace" }}>
                          ◐ {g.parcial}
                        </span>
                        <span style={{ fontSize:11,color:T.t4,fontFamily:"'JetBrains Mono',monospace" }}>
                          ○ {g.pendiente}
                        </span>
                      </div>
                    </div>
                    <div style={{ height:8,borderRadius:4,overflow:"hidden",
                      background:T.b2,display:"flex",gap:1 }}>
                      <div style={{ flex:g.cumple,background:T.green,minWidth:g.cumple?2:0 }}/>
                      <div style={{ flex:g.parcial,background:T.amber,minWidth:g.parcial?2:0 }}/>
                      <div style={{ flex:g.pendiente,background:T.t4,minWidth:g.pendiente?2:0 }}/>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      )}

      {/* Projects */}
      {tab==="projects"&&(
        <div className="cd-fade">
          {moduleProjects.length===0 ? (
            <Card>
              <div style={{ textAlign:"center",padding:"32px 0",fontSize:13,color:T.t3 }}>
                No hay proyectos activos disponibles para este módulo.
              </div>
            </Card>
          ) : (
            moduleProjects.map(p=>{
              const daysLeft = p.ends_on
                ? Math.ceil((new Date(p.ends_on)-new Date())/(1000*60*60*24))
                : null;
              return (
                <Card key={p.id} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex",alignItems:"flex-start",
                    justifyContent:"space-between",gap:16 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:6 }}>
                        <div style={{ fontFamily:"'Playfair Display',serif",fontSize:16,color:T.t1 }}>
                          {p.name}
                        </div>
                        <span style={{ background:`${STATUS_COLOR[p.status]||T.t3}18`,
                          color:STATUS_COLOR[p.status]||T.t3,
                          border:`1px solid ${STATUS_COLOR[p.status]||T.t3}30`,
                          padding:"2px 9px",borderRadius:20,fontSize:11,
                          fontFamily:"'JetBrains Mono',monospace" }}>
                          ● {STATUS_LABEL[p.status]||p.status}
                        </span>
                      </div>
                      {p.description&&(
                        <div style={{ fontSize:13,color:T.t2,lineHeight:1.6,marginBottom:10 }}>
                          {p.description}
                        </div>
                      )}
                      <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
                        {p.starts_on&&(
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t4 }}>
                            Inicio: {new Date(p.starts_on).toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
                          </span>
                        )}
                        {daysLeft!==null&&daysLeft>0&&(
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                            color:daysLeft<30?T.amber:T.t4 }}>
                            {daysLeft} días restantes
                          </span>
                        )}
                        {p.participants&&(
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t4 }}>
                            👥 {p.participants.responded}/{p.participants.total} ({p.participants.rate}% respuesta)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Evolution */}
      {tab==="commitments"&&(
        <div className="cd-fade">
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
              Compromisos activos
            </div>
            <div style={{ fontSize:13,color:T.t3,marginBottom:18 }}>
              Acuerdos vigentes entre la organización y sus grupos de interés para este módulo.
            </div>
            {moduleCommitments.length === 0 ? (
              <div style={{ textAlign:"center",padding:"32px 0",
                background:T.s2,borderRadius:12,border:`1px dashed ${T.b2}` }}>
                <div style={{ fontSize:28,marginBottom:8 }}>📋</div>
                <div style={{ fontSize:13,color:T.t2 }}>Sin compromisos activos registrados</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {moduleCommitments.map(c=>{
                  const daysLeft = c.due_date
                    ? Math.ceil((new Date(c.due_date)-new Date())/(1000*60*60*24)) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const ST = {
                    pending:     {l:"Pendiente",  col:T.t3},
                    open:        {l:"Abierto",    col:T.blue},
                    in_progress: {l:"En curso",   col:T.blue},
                    completed:   {l:"Completado", col:T.green},
                    resolved:    {l:"Resuelto",   col:T.green},
                    closed:      {l:"Cerrado",    col:T.t3},
                    overdue:     {l:"Atrasado",   col:T.red},
                    rejected:    {l:"Rechazado",  col:T.red},
                  };
                  const st = ST[c.status] || ST.pending;
                  return (
                    <div key={c.id} style={{ padding:"13px 16px",background:T.s2,
                      border:`1px solid ${isOverdue?T.red+"40":T.b1}`,borderRadius:11 }}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13,fontWeight:600,color:T.t1,marginBottom:3 }}>{c.title}</div>
                          {c.description&&<div style={{ fontSize:12,color:T.t3,marginBottom:5 }}>{c.description}</div>}
                          <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
                            {c.due_date&&(
                              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                                color:isOverdue?T.red:daysLeft<=7?T.amber:T.t3 }}>
                                {isOverdue?`⚠ Atrasado ${Math.abs(daysLeft)}d`
                                 :daysLeft===0?"⚡ Vence hoy"
                                 :daysLeft<=7?`⏰ ${daysLeft}d restantes`
                                 :`📅 ${new Date(c.due_date).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}`}
                              </span>
                            )}
                            {c.responsible&&<span style={{ fontSize:11,color:T.t3 }}>👤 {c.responsible}</span>}
                            <span style={{ padding:"2px 8px",borderRadius:20,fontSize:10,
                              fontFamily:"'JetBrains Mono',monospace",
                              background:`${st.col}12`,color:st.col }}>{st.l}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab==="documents"&&(
        <div className="cd-fade">
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
              Documentos compartidos
            </div>
            <div style={{ fontSize:13,color:T.t3,marginBottom:18,lineHeight:1.6 }}>
              Archivos que el equipo consultor ha compartido para este módulo. Puedes descargarlos directamente.
            </div>
            {firstProject && supabase
              ? <FilesPanel
                  projectId={firstProject.id}
                  moduleKey={modKey}
                  supabase={supabase}
                  isConsultant={false}
                  accentColor={mod.color}/>
              : <div style={{ textAlign:"center",padding:"28px 0",color:T.t3,fontSize:13 }}>
                  Sin proyectos activos.
                </div>
            }
          </Card>
        </div>
      )}

      {tab==="history"&&(
        <div className="cd-fade">
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
              Historial de cambios de score
            </div>
            <div style={{ fontSize:13,color:T.t3,marginBottom:18,lineHeight:1.6 }}>
              Registro de cada actualización: método utilizado, evidencia analizada y variación respecto al período anterior.
            </div>
            {firstProject && supabase
              ? <ScoreLog projectId={firstProject.id} supabase={supabase} accentColor={mod.color}/>
              : <div style={{ textAlign:"center",padding:"28px 0",color:T.t3,fontSize:13 }}>
                  Sin proyectos activos para mostrar historial.
                </div>
            }
          </Card>
        </div>
      )}

      {tab==="evolution"&&(
        <div className="cd-fade">
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:18 }}>
              Evolución del {mod.scoreLabel}
            </div>
            <div style={{ height:250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id={`modGrad-${modKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={mod.color} stopOpacity={.2}/>
                      <stop offset="95%" stopColor={mod.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tick={{ fill:T.t3,fontSize:11,fontFamily:"JetBrains Mono" }}
                    axisLine={false} tickLine={false}/>
                  <YAxis domain={[30,100]} tick={{ fill:T.t3,fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:T.s2,border:`1px solid ${T.b2}`,
                    borderRadius:8,fontSize:12,fontFamily:"Instrument Sans" }}/>
                  <Area type="monotone" dataKey="score" stroke={mod.color} strokeWidth={2.5}
                    fill={`url(#modGrad-${modKey})`} name={mod.short}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Period comparison */}
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
              Comparativa períodos
            </div>
            {history.slice(-3).reverse().map((h,i,arr)=>{
              const prev = arr[i+1];
              const diff = prev ? h.score-prev.score : null;
              return (
                <div key={h.period} style={{ display:"flex",alignItems:"center",gap:14,
                  padding:"12px 0",borderBottom:`1px solid ${T.b1}` }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                    color:T.t3,width:80,flexShrink:0 }}>{h.period}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:20,
                    color:sc(h.score),fontWeight:600 }}>{h.score}</div>
                  {diff!==null&&(
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                      color:diff>0?T.green:diff<0?T.red:T.t4 }}>
                      {diff>0?`↑ +${diff}`:diff<0?`↓ ${diff}`:"→ Sin cambio"}
                    </div>
                  )}
                  {i===0&&<span style={{ background:`${mod.color}15`,color:mod.color,
                    border:`1px solid ${mod.color}30`,padding:"2px 8px",
                    borderRadius:20,fontSize:10,fontFamily:"'JetBrains Mono',monospace" }}>
                    Actual
                  </span>}
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Messages Panel ─────────────────────────────────────────────
function MessagesPanel({ messages, onSend, onDelete, senderRole="client" }) {
  const [txt,       setTxt]       = useState("");
  const [hoverId,   setHoverId]   = useState(null);
  const endRef = useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);
  const send = () => { if(txt.trim()){onSend(txt);setTxt("");} };
  const placeholder = senderRole==="client"
    ? "Escribe un mensaje al equipo consultor…"
    : "Escribe un mensaje al cliente…";
  const canDelete = senderRole === "consultant";
  return (
    <div>
      <div style={{ display:"flex",flexDirection:"column",gap:12,maxHeight:300,
        overflowY:"auto",marginBottom:16,paddingRight:4 }}>
        {messages.length===0&&(
          <div style={{ color:T.t4,fontSize:12,textAlign:"center",padding:"20px 0",
            fontFamily:"'JetBrains Mono',monospace" }}>Sin mensajes aún</div>
        )}
        {messages.map(m=>(
          <div key={m.id}
            onMouseEnter={()=>canDelete&&setHoverId(m.id)}
            onMouseLeave={()=>setHoverId(null)}
            style={{ alignSelf:m.from===senderRole?"flex-end":"flex-start",
              maxWidth:"76%", position:"relative" }}>
            <div style={{ padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.55,
              background:m.from===senderRole?`${T.blue}18`:T.s2,
              border:`1px solid ${m.from===senderRole?T.blue+"30":T.b2}`,
              color:T.t2,
              borderBottomRightRadius:m.from===senderRole?3:12,
              borderBottomLeftRadius:m.from===senderRole?12:3 }}>
              {m.body}
            </div>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:m.from===senderRole?"flex-end":"flex-start",
              gap:8, marginTop:3 }}>
              <div style={{ fontSize:10,color:T.t4,fontFamily:"'JetBrains Mono',monospace" }}>
                {m.from==="client"?"Cliente":"THO Consultora"} · {fmtDate(m.created_at)}
              </div>
              {canDelete && hoverId===m.id && (
                <button onClick={()=>onDelete?.(m.id)}
                  style={{ background:"none",border:"none",color:T.red,
                    cursor:"pointer",fontSize:11,padding:"1px 4px",
                    fontFamily:"'JetBrains Mono',monospace",opacity:.7 }}
                  title="Eliminar mensaje">✕</button>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      <div style={{ display:"flex",gap:9 }}>
        <input value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder={placeholder}
          style={{ flex:1,background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,
            padding:"9px 13px",color:T.t1,fontSize:13,outline:"none",
            fontFamily:"'Instrument Sans',sans-serif" }}/>
        <Btn variant="primary" size="sm" onClick={send}>Enviar</Btn>
      </div>
    </div>
  );
}

// ── Recommendations Card ───────────────────────────────────────
// ── Upcoming Commitments Card ──────────────────────────────────
function UpcomingCommitmentsCard({ client }) {
  // Get all active commitments with due dates, sorted by proximity to today
  const DONE = ["completed","resolved","closed","rejected"];
  const today = new Date();

  const upcoming = (client.commitments || [])
    .filter(c => c.due_date && !DONE.includes(c.status))
    .map(c => {
      const due  = new Date(c.due_date);
      const days = Math.ceil((due - today) / (1000*60*60*24));
      return { ...c, days };
    })
    .sort((a,b) => Math.abs(a.days) - Math.abs(b.days)) // closest first
    .slice(0, 3);

  const mod = c => {
    const proj = (client.projects||[]).find(p=>p.id===c.project_id);
    return proj ? MOD[proj.module_key] : null;
  };

  function dayLabel(days) {
    if (days < 0)  return { text:`Atrasado ${Math.abs(days)}d`, color:T.red    };
    if (days === 0)return { text:"Vence hoy",                   color:T.red    };
    if (days <= 3) return { text:`${days}d restantes`,          color:T.red    };
    if (days <= 7) return { text:`${days}d restantes`,          color:T.amber  };
    if (days <= 14)return { text:`${days}d restantes`,          color:T.amber  };
    return           { text: new Date(new Date().setDate(new Date().getDate()+days))
                         .toLocaleDateString("es-CL",{day:"numeric",month:"short"}), color:T.t3 };
  }

  return (
    <div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>
        Próximos compromisos
      </div>

      {upcoming.length === 0 ? (
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
          background:`${T.green}08`,border:`1px solid ${T.green}20`,borderRadius:10 }}>
          <span style={{ fontSize:20 }}>✓</span>
          <div>
            <div style={{ fontSize:13,color:T.green,fontWeight:500 }}>Sin compromisos próximos</div>
            <div style={{ fontSize:11,color:T.t3,marginTop:2 }}>
              No hay acuerdos con fecha pendiente en este período.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {upcoming.map((cm,i) => {
            const dl  = dayLabel(cm.days);
            const mod_ = mod(cm);
            return (
              <div key={cm.id||i} style={{ display:"flex",alignItems:"center",gap:12,
                padding:"12px 14px",background:T.s2,
                border:`1px solid ${cm.days<=3?T.red+"30":cm.days<=7?T.amber+"30":T.b1}`,
                borderRadius:10 }}>
                {/* Countdown */}
                <div style={{ textAlign:"center",width:44,flexShrink:0 }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",
                    fontSize:cm.days<0?13:Math.abs(cm.days)>99?11:18,
                    fontWeight:700,color:dl.color,lineHeight:1 }}>
                    {cm.days<0?"!":`${Math.abs(cm.days)}`}
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",
                    fontSize:8,color:T.t4,textTransform:"uppercase",letterSpacing:1 }}>
                    {cm.days<0?"atraso":"días"}
                  </div>
                </div>
                {/* Content */}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,color:T.t1,fontWeight:500,marginBottom:3,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                    {cm.title}
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",
                      fontSize:10,color:dl.color }}>{dl.text}</span>
                    {cm.responsible&&(
                      <span style={{ fontSize:11,color:T.t3 }}>👤 {cm.responsible}</span>
                    )}
                    {mod_&&(
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",
                        fontSize:9,color:mod_.color }}>{mod_.icon} {mod_.short}</span>
                    )}
                  </div>
                </div>
                {/* Status dot */}
                <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,
                  background:cm.days<0?T.red:cm.days<=7?T.amber:T.t3 }}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── General Dashboard ──────────────────────────────────────────
function GeneralDashboard({ client, supabase, onOpenModule, msgList, onSendMsg }) {
  const activeModules = Object.entries(client.modules || {}).filter(([,v])=>v);

  const rawHist = client.history || [];
  const currentPoint = activeModules.length > 0 ? {
    period: new Date().toLocaleDateString("es-CL", { month:"short", year:"numeric" }),
    ...Object.fromEntries(activeModules.map(([k]) => [k, client.scores?.[k]?.total ?? null])),
  } : null;
  const lastPeriod = rawHist[rawHist.length - 1]?.period;
  const hist = currentPoint
    ? (lastPeriod === currentPoint.period ? rawHist : [...rawHist, currentPoint])
    : rawHist;
  const chartData = hist.length === 1
    ? [{ ...hist[0], period: "Anterior" }, hist[0]]
    : hist;
  const prev = hist[hist.length-2];
  const curr = hist[hist.length-1];

  const radarData = activeModules.flatMap(([k])=>
    MOD[k].dims.map(d=>({ s:d.label.split(" ")[0], A:client.scores?.[k]?.[d.key]||0 }))
  );

  const ircsScores = activeModules.map(([k])=>client.scores?.[k]?.total).filter(v=>v!=null);
  const ircs       = ircsScores.length ? Math.round(ircsScores.reduce((s,v)=>s+v,0)/ircsScores.length) : null;
  const ircsColor  = ircs==null ? T.t3 : ircs>=70 ? T.green : ircs>=50 ? T.amber : T.red;
  const ircsLabel  = ircs==null ? "Sin medición" : ircs>=70 ? "Favorable" : ircs>=50 ? "En desarrollo" : "Requiere atención";
  const completedCommitments = (client.commitments||[]).filter(c=>["completed","resolved","closed"].includes(c.status)).length;

  return (
    <div style={{ maxWidth:1200 }}>

      {/* ── HERO ── */}
      <div style={{ position:"relative", overflow:"hidden",
        background:"linear-gradient(135deg,#050505 0%,#0a0a0a 60%,#111111 100%)",
        borderBottom:`1px solid ${T.b1}` }}>
        {/* Spectrum stripe at top */}
        <div style={{ height:2, background:"linear-gradient(90deg,#e8631a,#c44a7a,#9b59d0)" }}/>
        {/* Compass watermark */}
        <div style={{ position:"absolute", bottom:-20, right:20, opacity:.04,
          color:T.t1, pointerEvents:"none" }}>
          <svg width="180" height="180" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth=".5"/>
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth=".3"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <polygon points="12,2 10.5,12 13.5,12" fill="#e8631a" opacity="1"/>
            <polygon points="12,22 13.5,12 10.5,12" fill="#3b8fd4" opacity="0.8"/>
            <line x1="12" y1="2" x2="12" y2="3.5" stroke="currentColor" strokeWidth=".8"/>
            <line x1="12" y1="20.5" x2="12" y2="22" stroke="currentColor" strokeWidth=".8"/>
            <line x1="2" y1="12" x2="3.5" y2="12" stroke="currentColor" strokeWidth=".8"/>
            <line x1="20.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth=".8"/>
            <line x1="4.2" y1="4.2" x2="5.3" y2="5.3" stroke="currentColor" strokeWidth=".5"/>
            <line x1="18.7" y1="4.2" x2="17.6" y2="5.3" stroke="currentColor" strokeWidth=".5"/>
            <line x1="4.2" y1="19.8" x2="5.3" y2="18.7" stroke="currentColor" strokeWidth=".5"/>
            <line x1="18.7" y1="19.8" x2="17.6" y2="18.7" stroke="currentColor" strokeWidth=".5"/>
          </svg>
        </div>

        <div style={{ padding:"36px 40px 32px",position:"relative" }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:24 }}>
            <div style={{ flex:1,minWidth:260 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
                letterSpacing:3,textTransform:"uppercase",marginBottom:10 }}>
                {client.period} · THO Compass
              </div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:34,color:T.t1,
                letterSpacing:-.5,marginBottom:8,lineHeight:1.1 }}>{client.name}</div>
              <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16 }}>
                {client.industry&&<span style={{ fontSize:13,color:T.t2 }}>{client.industry}</span>}
                {activeModules.map(([k])=>(
                  <span key={k} style={{ padding:"3px 10px",borderRadius:20,fontSize:11,
                    fontFamily:"'JetBrains Mono',monospace",
                    background:`${MOD[k].color}12`,border:`1px solid ${MOD[k].color}35`,color:MOD[k].color }}>
                    {MOD[k].icon} {MOD[k].short}
                  </span>
                ))}
              </div>
              <div style={{ fontSize:12,color:T.t3 }}>
                Asesoría a cargo: <span style={{ color:T.t2,fontWeight:500 }}>{client.contact_consultant}</span>
              </div>
            </div>

            {ircs!==null&&(
              <div style={{ textAlign:"center",padding:"20px 28px",
                background:"rgba(255,255,255,.03)",
                border:`1px solid ${ircsColor}25`,borderRadius:16,flexShrink:0 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
                  letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>Índice IRCS</div>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:56,color:ircsColor,
                  fontWeight:700,lineHeight:1,marginBottom:4 }}>{ircs}</div>
                <div style={{ fontSize:12,color:ircsColor,fontWeight:500 }}>{ircsLabel}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop:20,padding:"14px 18px",
            background:"rgba(255,255,255,.03)",border:`1px solid ${T.b1}`,borderRadius:12 }}>
            <AutoSummary client={client}/>
          </div>
        </div>
      </div>

      <div style={{ padding:"24px 40px 40px" }}>

        {/* Module cards */}
        <div className="cd-fade" style={{ display:"grid",
          gridTemplateColumns:`repeat(${Math.max(activeModules.length,1)},1fr)`,
          gap:14,marginBottom:24 }}>
          {Object.keys(MOD).map(k=>(
            client.modules[k]
              ? <ModuleCard key={k} modKey={k} scores={client.scores} active={true} onClick={()=>onOpenModule(k)}/>
              : null
          ))}
        </div>

        {/* Achievements */}
        {completedCommitments>0&&(
          <div className="cd-fade" style={{ padding:"14px 20px",marginBottom:20,
            background:`${T.green}08`,border:`1px solid ${T.green}20`,
            borderRadius:12,display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ fontSize:28 }}>🏆</div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.green,marginBottom:2 }}>
                {completedCommitments} compromiso{completedCommitments>1?"s":""} completado{completedCommitments>1?"s":""}
              </div>
              <div style={{ fontSize:12,color:T.t3 }}>Acuerdos cumplidos con sus grupos de interés.</div>
            </div>
          </div>
        )}

        {/* Evolution + Radar */}
        <div className="cd-fade cd-d2" style={{ display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:20 }}>
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:16 }}>Evolución histórica</div>
            <div style={{ height:200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {activeModules.map(([k])=>(
                      <linearGradient key={k} id={`cg-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MOD[k].color} stopOpacity={.15}/>
                        <stop offset="95%" stopColor={MOD[k].color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="period" tick={{ fill:T.t3,fontSize:10,fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{ fill:T.t3,fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12 }}/>
                  {activeModules.map(([k])=>(
                    <Area key={k} type="monotone" dataKey={k} stroke={MOD[k].color}
                      strokeWidth={2.5} fill={`url(#cg-${k})`} name={MOD[k].short} dot={{ fill:MOD[k].color,r:3 }}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {prev&&curr&&(
              <>
                <div style={{ height:1,background:T.b1,margin:"14px 0" }}/>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:T.t3,
                  letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
                  Variación {prev.period} → {curr.period}
                </div>
                <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                  {activeModules.map(([k])=>{
                    const diff=(curr[k]||0)-(prev[k]||0);
                    return (
                      <div key={k} style={{ display:"flex",alignItems:"center",gap:8,
                        padding:"6px 12px",background:T.s2,borderRadius:8,border:`1px solid ${T.b1}` }}>
                        <span style={{ fontSize:13 }}>{MOD[k].icon}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:sc(curr[k]) }}>{curr[k]}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                          color:diff>0?T.green:diff<0?T.red:T.t4 }}>
                          {diff>0?`↑+${diff}`:diff<0?`↓${diff}`:"—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>Perfil de indicadores</div>
            <div style={{ height:240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={T.b2}/>
                  <PolarAngleAxis dataKey="s" tick={{ fill:T.t3,fontSize:9,fontFamily:"JetBrains Mono" }}/>
                  <Radar dataKey="A" stroke={T.rc} fill={T.rc} fillOpacity={.08} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Alerts + Recommendations */}
        <div className="cd-fade cd-d3" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20 }}>
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>Alertas del período</div>
            {client.alerts.length===0 ? (
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
                background:`${T.green}08`,border:`1px solid ${T.green}20`,borderRadius:10 }}>
                <span style={{ fontSize:20 }}>✓</span>
                <div>
                  <div style={{ fontSize:13,color:T.green,fontWeight:500 }}>Sin alertas activas</div>
                  <div style={{ fontSize:11,color:T.t3,marginTop:2 }}>Todo en orden en este período.</div>
                </div>
              </div>
            ) : client.alerts.map((a,i)=>(
              <div key={a.id||i} style={{ display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.b1}` }}>
                <div style={{ width:6,height:6,borderRadius:"50%",flexShrink:0,marginTop:6,
                  background:a.type==="red"?T.red:a.type==="green"?T.green:T.amber }}/>
                <div>
                  <div style={{ fontSize:13,color:T.t2,lineHeight:1.55 }}>{a.text}</div>
                  {a.module&&(
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                      color:MOD[a.module]?.color,marginTop:3,display:"block" }}>
                      {MOD[a.module]?.icon} {MOD[a.module]?.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Card>
          <Card><UpcomingCommitmentsCard client={client}/></Card>
        </div>

        {/* Active projects */}
        {client.projects.length>0&&(
          <Card cls="cd-fade cd-d4" style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:14 }}>Proyectos activos</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
              {client.projects.map(p=>{
                const mod=MOD[p.module_key];
                return (
                  <div key={p.id} style={{ background:T.s2,border:`1px solid ${T.b1}`,
                    borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"all .15s" }}
                    onClick={()=>onOpenModule(p.module_key)}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=mod?.color+"40";e.currentTarget.style.transform="translateY(-1px)"}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b1;e.currentTarget.style.transform="none"}}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                      <span style={{ fontSize:15 }}>{mod?.icon}</span>
                      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:13,color:T.t1 }}>{p.name}</div>
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:p.status==="active"?T.green:T.amber }}>
                        ● {p.status==="active"?"Activo":"En curso"}
                      </span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:mod?.color }}>→ ver</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Messages */}
        <Card cls="cd-fade cd-d5">
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1,marginBottom:6 }}>
            Canal con THO Consultora
          </div>
          <div style={{ fontSize:13,color:T.t3,marginBottom:18 }}>
            Escribe preguntas, comentarios o solicitudes al equipo consultor.
          </div>
          <MessagesPanel messages={msgList||[]} onSend={onSendMsg} onDelete={null} senderRole="client"/>
        </Card>

      </div>
    </div>
  );
}


// ── MAIN EXPORT ────────────────────────────────────────────────
export default function ClientDashboard({ client: rawClient = MOCK_CLIENT, supabase, isConsultant, initialModule }) {
  const [activeModule, setActiveModule] = useState(initialModule || null);
  const [liveData,     setLiveData]     = useState(null);
  const [loadingData,  setLoadingData]  = useState(false);
  const [msgList,      setMsgList]      = useState([]);
  const [showMsgs,     setShowMsgs]     = useState(false);

  // Load real client data if supabase + client.id are available
  useEffect(() => {
    if (!supabase || !rawClient?.id) return;
    loadClientData();
  }, [supabase, rawClient?.id]);

  async function loadClientData() {
    setLoadingData(true);
    try {
      const [
        clientRes, modulesRes, scoresRes, historyRes,
        alertsRes, recsRes, projectsRes, messagesRes,
      ] = await Promise.all([
        supabase.from("clients").select("*").eq("id", rawClient.id).maybeSingle(),
        supabase.from("client_modules").select("*").eq("client_id", rawClient.id).maybeSingle(),
        supabase.from("client_scores").select("*").eq("client_id", rawClient.id).maybeSingle(),
        supabase.from("client_score_history")
          .select("*, reporting_periods(label)")
          .eq("client_id", rawClient.id).order("created_at", { ascending:true }),
        supabase.from("client_alerts").select("*")
          .eq("client_id", rawClient.id).eq("visible_to_client", true)
          .eq("resolved", false)
          .order("created_at", { ascending:false }),
        supabase.from("client_recommendations").select("*")
          .eq("client_id", rawClient.id).eq("visible_to_client", true)
          .order("sort_order"),
        supabase.from("projects").select("*")
          .eq("client_id", rawClient.id).eq("client_visible", true)
          .neq("status", "closed"),
        supabase.from("client_messages").select("*")
          .eq("client_id", rawClient.id).order("created_at", { ascending:true }),
      ]);

      const c = clientRes.data;
      const m = modulesRes.data;
      const s = scoresRes.data;

      if (!c) { setLoadingData(false); return; }

      const projs = projectsRes.data || [];

      // Load commitments for visible projects
      let commitments = [];
      if (projs.length > 0) {
        const { data: comData } = await supabase
          .from("project_commitments")
          .select("*")
          .in("project_id", projs.map(p=>p.id))
          .not("status", "in", '("completed","resolved","closed","rejected")')
          .order("due_date", { ascending: true, nullsLast: true });
        commitments = comData || [];
      }

      const hasRC  = m ? (m.rc ?? false)  : projs.some(p=>p.module_key==="rc");
      const hasDO  = m ? (m?.do ?? false) : projs.some(p=>p.module_key==="do");
      const hasESG = m ? (m.esg ?? false) : projs.some(p=>p.module_key==="esg");

      setLiveData({
        ...c,
        period: new Date().toLocaleDateString("es-CL", { month:"long", year:"numeric" }),
        modules: { rc: hasRC, do: hasDO, esg: hasESG },
        scores: {
          rc:  { total:s?.rc       ?? null, percepcion:s?.rc_percepcion ?? null,
                 compromisos:s?.rc_compromisos ?? null, dialogo:s?.rc_dialogo ?? null,
                 conflictividad:s?.rc_conflictividad ?? null },
          do:  { total:s?.do ?? null, cultura:s?.do_cultura ?? null,
                 engagement:s?.do_engagement ?? null, liderazgo:s?.do_liderazgo ?? null },
          esg: { total:s?.esg      ?? null, ambiental:s?.esg_ambiental ?? null,
                 social:s?.esg_social ?? null, gobernanza:s?.esg_gobernanza ?? null,
                 maturity: s?.score_drivers_json?.maturity || { ambiental:1, social:1, gobernanza:1 } },
        },
        history: (historyRes.data||[]).map(h=>({
          period: h.reporting_periods?.label || "Período",
          rc: h.rc, do: h.do, esg: h.esg,
        })),
        alerts:          alertsRes.data   || [],
        recommendations: recsRes.data     || [],
        projects:        projs,
        commitments:     commitments,
        messages: (messagesRes.data||[]).map(msg=>({ ...msg, from:msg.sender_role })),
        gri_summary: s?.score_drivers_json?.gri_summary || {},
        contact_consultant: c.contact_consultant || "THO Consultora",
      });
    } catch(e) {
      console.error("ClientDashboard load error:", e);
    } finally {
      setLoadingData(false);
    }
  }

  // Normalize: usa datos reales si están disponibles, si no el prop
  const src = liveData || rawClient || {};
  const client = {
    id:       src.id,
    name:     src.name     || "—",
    industry: src.industry || "",
    period:   src.period   || new Date().toLocaleDateString("es-CL",{month:"long",year:"numeric"}),
    contact_consultant: src.contact_consultant || "THO Consultora",
    modules:         { rc:false, do:false, esg:false,   ...(src.modules || {}) },
    scores:          { rc:{},   do:{},    esg:{},        ...(src.scores  || {}) },
    history:         src.history         || [],
    alerts:          src.alerts          || [],
    recommendations: src.recommendations || [],
    projects:        src.projects        || [],
    commitments:     src.commitments     || [],
    gri_summary:     src.gri_summary     || {},
  };

  // Sync msgList cuando llegan mensajes reales de Supabase
  useEffect(() => {
    const msgs = (liveData || rawClient)?.messages || [];
    setMsgList(msgs);
  }, [liveData]);

  // Suscripción en tiempo real a mensajes nuevos
  useEffect(() => {
    if (!supabase || !rawClient?.id) return;
    const channel = supabase
      .channel(`messages:${rawClient.id}`)
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "client_messages",
        filter: `client_id=eq.${rawClient.id}`,
      }, payload => {
        const m = payload.new;
        setMsgList(p => {
          // Evitar duplicados (el mensaje optimista ya está)
          if (p.some(x => x.id === m.id)) return p;
          return [...p, { ...m, from: m.sender_role }];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, rawClient?.id]);

  // Envío de mensaje — funciona para cliente y consultora
  async function sendMessage(txt) {
    const senderRole = isConsultant ? "consultant" : "client";
    const now        = new Date().toISOString();
    setMsgList(p => [...p, { id:`m${Date.now()}`, from:senderRole, body:txt, created_at:now }]);
    if (supabase && client?.id) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("client_messages").insert({
        client_id:      client.id,
        sender_user_id: user?.id || null,
        sender_role:    senderRole,
        body:           txt,
      });
      if (error) console.error("Messages insert error:", error);
    }
  }

  async function deleteMessage(id) {
    setMsgList(p => p.filter(m => m.id !== id));
    if (supabase) {
      await supabase.from("client_messages").delete().eq("id", id);
    }
  }

  const senderRole = isConsultant ? "consultant" : "client";

  return (
    <>
      <style>{CSS}</style>

      {/* Panel de mensajes flotante para la consultora */}
      {isConsultant && client?.id && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:300 }}>
          {showMsgs ? (
            <div style={{ width:360, background:T.s1, border:`1px solid ${T.b2}`,
              borderRadius:16, boxShadow:"0 16px 48px rgba(0,0,0,.6)", overflow:"hidden" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"14px 18px", borderBottom:`1px solid ${T.b1}` }}>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1 }}>
                    Mensajes — {client.name}
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                    color:T.t3,letterSpacing:1.5,textTransform:"uppercase",marginTop:2 }}>
                    Canal directo con el cliente
                  </div>
                </div>
                <button onClick={()=>setShowMsgs(false)} style={{ background:"none",
                  border:"none",color:T.t3,cursor:"pointer",fontSize:18,padding:4 }}>✕</button>
              </div>
              <div style={{ padding:"14px 16px" }}>
                <MessagesPanel messages={msgList} onSend={sendMessage} onDelete={deleteMessage} senderRole="consultant"/>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowMsgs(true)} style={{
              background:`linear-gradient(135deg,${T.blue},#6366f1)`,
              border:"none",borderRadius:50,width:52,height:52,
              cursor:"pointer",color:"white",fontSize:20,
              boxShadow:"0 4px 20px rgba(59,130,246,.5)",
              display:"flex",alignItems:"center",justifyContent:"center",
              position:"relative" }}>
              ✉
              {msgList.filter(m=>m.from==="client").length > 0 && (
                <span style={{ position:"absolute",top:-4,right:-4,
                  background:T.red,color:"white",fontSize:9,
                  fontFamily:"'JetBrains Mono',monospace",
                  width:18,height:18,borderRadius:"50%",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {msgList.filter(m=>m.from==="client").length}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {activeModule
        ? <ModuleDetail
            modKey={activeModule}
            client={client}
            supabase={supabase}
            onBack={()=>setActiveModule(null)}/>
        : <GeneralDashboard
            client={client}
            supabase={supabase}
            onOpenModule={setActiveModule}
            msgList={msgList}
            onSendMsg={sendMessage}/>
      }
    </>
  );
}
