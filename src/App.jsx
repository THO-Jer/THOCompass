import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#08090c;color:#e8ecf4;font-family:'Instrument Sans',sans-serif;font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#2a3040;border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes tipIn{from{opacity:0;transform:translateY(4px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.fu{animation:fadeUp .4s cubic-bezier(.4,0,.2,1) both;}
.d1{animation-delay:.06s;}.d2{animation-delay:.12s;}.d3{animation-delay:.18s;}.d4{animation-delay:.24s;}
`;

const T = {
  bg:"#08090c", s1:"#0d0f14", s2:"#111520", s3:"#161b28",
  b1:"#1d2535", b2:"#232d42", b3:"#2e3a52",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  rc:"#f97316", do:"#a855f7", esg:"#22c55e",
  blue:"#3b82f6", amber:"#f59e0b", red:"#ef4444",
};

const MODULES = {
  rc: {
    key:"rc", label:"Relacionamiento Comunitario", short:"RC", icon:"🤝", color:T.rc,
    scoreLabel:"Índice LSO", scoreDesc:"Licencia Social de Operación",
    methodDesc:"Mide la legitimidad, credibilidad y confianza que la organización ha construido con las comunidades donde opera. Un score sobre 70 indica una posición favorable.",
    dimensions:[
      { key:"percepcion",     label:"Percepción y confianza", weight:30,
        tooltip:"Evalúa cómo perciben a la organización sus stakeholders clave, medido principalmente a través de encuestas NPS adaptadas a contexto comunitario." },
      { key:"compromisos",    label:"Gestión de compromisos", weight:25,
        tooltip:"Mide el cumplimiento de acuerdos y compromisos adquiridos con la comunidad. Se alimenta de actas, registros de seguimiento y reportes de avance." },
      { key:"dialogo",        label:"Calidad del diálogo",    weight:25,
        tooltip:"Valora la frecuencia, calidad y diversidad de las instancias de participación y diálogo con actores territoriales." },
      { key:"conflictividad", label:"Conflictividad activa",  weight:20,
        tooltip:"Indicador inverso: a mayor conflictividad activa (incidentes, reclamos sin resolver), menor puntaje. Fuente: registros internos y monitoreo." },
    ],
  },
  do: {
    key:"do", label:"Desarrollo Organizacional", short:"DO", icon:"🏛", color:T.do,
    scoreLabel:"Salud Organizacional", scoreDesc:"Índice de Salud Org.",
    methodDesc:"Diagnóstico del estado cultural y organizacional. Integra percepción de cultura, clima laboral y calidad del liderazgo en un índice compuesto.",
    dimensions:[
      { key:"cultura",    label:"Cultura organizacional", weight:35,
        tooltip:"Mide la coherencia entre los valores declarados por la organización y los comportamientos que se observan en la práctica cotidiana." },
      { key:"engagement", label:"Engagement y clima",     weight:35,
        tooltip:"Evalúa motivación, sentido de pertenencia y satisfacción de las personas. Se basa en encuestas de clima y el índice eNPS (Employee Net Promoter Score)." },
      { key:"liderazgo",  label:"Liderazgo",              weight:30,
        tooltip:"Mide la percepción de las jefaturas directas en comunicación, desarrollo de equipo y orientación al logro. Fuente: evaluación 180°." },
    ],
  },
  esg: {
    key:"esg", label:"Sostenibilidad Corporativa", short:"ESG", icon:"🌿", color:T.esg,
    scoreLabel:"Madurez ESG", scoreDesc:"Índice de Madurez ESG",
    methodDesc:"Evalúa el nivel de madurez de la organización en las tres dimensiones ESG. Alineado con estándares GRI e ISO 26000.",
    dimensions:[
      { key:"ambiental",  label:"Ambiental",   weight:33,
        tooltip:"Cumplimiento normativo ambiental, gestión de residuos, huella de carbono y eficiencia energética. Fuente: reportes ambientales y auditorías." },
      { key:"social",     label:"Social",       weight:34,
        tooltip:"Condiciones laborales, diversidad e inclusión, relacionamiento comunitario y cadena de valor. Conectado con el módulo RC." },
      { key:"gobernanza", label:"Gobernanza",   weight:33,
        tooltip:"Ética empresarial, prevención de delitos (Ley 21.595), transparencia y políticas internas de cumplimiento." },
    ],
  },
};

const MOCK_CLIENT = {
  id:"c1", name:"Minera Los Andes", industry:"Minería", period:"Q1 2025",
  modules:{ rc:true, do:true, esg:true }, published:true,
  scores:{
    rc:{ total:68, percepcion:65, compromisos:72, dialogo:70, conflictividad:62 },
    do:{ total:78, cultura:80, engagement:76, liderazgo:78 },
    esg:{ total:71, ambiental:68, social:74, gobernanza:72 },
  },
  history:[
    { period:"Q2 2024", rc:58, do:70, esg:62 },
    { period:"Q3 2024", rc:62, do:72, esg:65 },
    { period:"Q4 2024", rc:65, do:75, esg:68 },
    { period:"Q1 2025", rc:68, do:78, esg:71 },
  ],
  alerts:[
    { id:1, type:"amber", text:"Mesa de diálogo comunidad La Greda pendiente de reagendar.", date:"12 Mar 2025" },
    { id:2, type:"green", text:"Compromiso de reforestación completado al 100%.", date:"8 Mar 2025" },
    { id:3, type:"red",   text:"Conflictividad sobre umbral esperado en sector norte.", date:"3 Mar 2025" },
  ],
  recommendations:[
    "Priorizar mesa de diálogo sector norte para reducir conflictividad activa.",
    "Plan de comunicación trimestral para fortalecer percepción comunitaria.",
    "Avanzar en certificación ISO 45001 para mejorar dimensión de gobernanza ESG.",
  ],
  files:[
    { id:"f1", name:"Encuesta_Stakeholders_Q1_2025.xlsx", type:"excel", module:"rc",  date:"5 Mar 2025",   ai_score:68 },
    { id:"f2", name:"Acta_Mesa_Dialogo_Feb2025.pdf",       type:"pdf",   module:"rc",  date:"28 Feb 2025",  ai_score:71 },
    { id:"f3", name:"Encuesta_Clima_Laboral.xlsx",          type:"excel", module:"do",  date:"10 Feb 2025",  ai_score:76 },
    { id:"f4", name:"Reporte_Ambiental_2024.pdf",           type:"pdf",   module:"esg", date:"20 Ene 2025",  ai_score:65 },
  ],
  messages:[
    { id:"m1", from:"client",     text:"¿Cuándo tendremos el análisis del sector norte?", date:"14 Mar · 10:32" },
    { id:"m2", from:"consultant", text:"Esta semana enviamos el análisis detallado.",      date:"14 Mar · 11:05" },
  ],
};

// ── helpers ──
const sc    = v => v==null ? T.t3 : v>=70 ? T.esg : v>=50 ? T.amber : T.red;
const fIcon = t => ({excel:"📊",pdf:"📄",doc:"📝",txt:"📋"})[t]||"📎";

// ── Tooltip ──
function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-flex", alignItems:"center" }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && (
        <span style={{
          position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)",
          background:"#1d2535", border:`1px solid ${T.b2}`, borderRadius:8, padding:"10px 14px",
          fontSize:12, color:T.t2, lineHeight:1.55, width:240, zIndex:9999,
          pointerEvents:"none", boxShadow:"0 8px 24px rgba(0,0,0,.5)",
          animation:"tipIn .18s ease both", fontFamily:"'Instrument Sans',sans-serif",
        }}>{text}</span>
      )}
    </span>
  );
}

// ── ScoreRing ──
function ScoreRing({ value, size=110, color }) {
  const c = color || sc(value);
  const inner = size * .76;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", margin:"0 auto",
      background:`conic-gradient(${c} 0% ${value||0}%, ${T.b1} ${value||0}% 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:inner, height:inner, borderRadius:"50%", background:T.bg,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:size*.28, color:c, lineHeight:1 }}>
          {value??"—"}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:size*.09, color:T.t3 }}>/100</span>
      </div>
    </div>
  );
}

// ── ProgBar ──
function ProgBar({ label, value, color, tooltip, weight }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, color:T.t2 }}>{label}</span>
          {tooltip && (
            <Tip text={tooltip}>
              <span style={{ width:14, height:14, borderRadius:"50%", background:T.b2, color:T.t3,
                fontSize:9, display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"help", fontFamily:"'JetBrains Mono',monospace" }}>?</span>
            </Tip>
          )}
          {weight && (
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t3,
              background:T.s3, padding:"1px 5px", borderRadius:3 }}>{weight}%</span>
          )}
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:sc(value) }}>
          {value??"—"}
        </span>
      </div>
      <div style={{ height:5, background:T.b2, borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${value||0}%`, background:color, borderRadius:3,
          transition:"width 1s cubic-bezier(.4,0,.2,1)" }}/>
      </div>
    </div>
  );
}

// ── Badge ──
function Badge({ v }) {
  if (v==null) return null;
  const c = v>=70 ? T.esg : v>=50 ? T.amber : T.red;
  return <span style={{ background:`${c}18`, color:c, border:`1px solid ${c}30`,
    padding:"3px 9px", borderRadius:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
    {v>=70?"▲ Favorable":v>=50?"◆ En desarrollo":"▼ Crítico"}
  </span>;
}

// ── Card ──
const Card = ({ children, style={}, cls="" }) => (
  <div className={cls} style={{ background:T.s1, border:`1px solid ${T.b1}`, borderRadius:14, padding:"22px 24px", ...style }}>
    {children}
  </div>
);

// ── Module Score Card ──
function ModuleCard({ modKey, scores, active }) {
  const mod = MODULES[modKey];
  const total = scores?.[modKey]?.total;
  return (
    <div style={{ background:T.s1, border:`1px solid ${T.b1}`, borderRadius:14, padding:22,
      opacity:active?1:.35, position:"relative", overflow:"hidden",
      transition:"border-color .2s" }}
      onMouseEnter={e=>active&&(e.currentTarget.style.borderColor=mod.color+"44")}
      onMouseLeave={e=>active&&(e.currentTarget.style.borderColor=T.b1)}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,${mod.color},${mod.color}55)` }}/>
      {!active && <div style={{ position:"absolute", top:12, right:12, fontSize:11, color:T.t4 }}>🔒</div>}
      <div style={{ width:38, height:38, borderRadius:10, marginBottom:14,
        background:`${mod.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
        {mod.icon}
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:38, color:sc(total), lineHeight:1, marginBottom:2 }}>
        {active?(total??"—"):"—"}
      </div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, color:T.t1, marginBottom:2 }}>{mod.label}</div>
      <div style={{ fontSize:11, color:T.t3, marginBottom:active?14:0 }}>{mod.scoreLabel}</div>
      {active && scores?.[modKey] && (
        <div style={{ marginTop:4 }}>
          {mod.dimensions.map(d=>(
            <ProgBar key={d.key} label={d.label} value={scores[modKey][d.key]}
              color={mod.color} tooltip={d.tooltip} weight={d.weight}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Messages ──
function Messages({ messages, onSend }) {
  const [txt, setTxt] = useState("");
  const endRef = useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);
  const send = () => { if (txt.trim()) { onSend(txt); setTxt(""); } };
  return (
    <div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:280,
        overflowY:"auto", marginBottom:16, paddingRight:4 }}>
        {messages.map(m=>(
          <div key={m.id} style={{ alignSelf:m.from==="client"?"flex-start":"flex-end", maxWidth:"75%" }}>
            <div style={{ padding:"10px 14px", borderRadius:12, fontSize:13, lineHeight:1.55,
              background:m.from==="client"?T.s2:`${T.blue}18`,
              border:`1px solid ${m.from==="client"?T.b2:T.blue+"30"}`,
              color:T.t2,
              borderBottomLeftRadius:m.from==="client"?3:12,
              borderBottomRightRadius:m.from==="client"?12:3 }}>
              {m.text}
            </div>
            <div style={{ fontSize:10, color:T.t4, fontFamily:"'JetBrains Mono',monospace", marginTop:3,
              textAlign:m.from==="client"?"left":"right" }}>
              {m.from==="client"?"Cliente":"THO Consultora"} · {m.date}
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      <div style={{ display:"flex", gap:9 }}>
        <input value={txt} onChange={e=>setTxt(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Escribe un mensaje…"
          style={{ flex:1, background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
            padding:"9px 13px", color:T.t1, fontSize:13, outline:"none",
            fontFamily:"'Instrument Sans',sans-serif" }}/>
        <button onClick={send} style={{ padding:"9px 18px", background:T.blue, border:"none",
          borderRadius:8, color:"white", fontSize:13, fontWeight:600, cursor:"pointer",
          fontFamily:"'Instrument Sans',sans-serif" }}>Enviar</button>
      </div>
    </div>
  );
}

// ── File Upload + AI ──
function FileUpload({ onApply }) {
  const [files, setFiles]  = useState([]);
  const [busy, setBusy]    = useState(false);
  const [prop, setProp]    = useState(null);
  const [drag, setDrag]    = useState(false);
  const ref = useRef();

  const add = list => setFiles(p=>[...p,...Array.from(list).map(f=>({
    name:f.name,
    type:f.name.match(/\.(xlsx|csv)/i)?"excel":f.name.match(/\.pdf/i)?"pdf":f.name.match(/\.docx?/i)?"doc":"txt",
  }))]);

  const analyze = () => {
    if (!files.length) return;
    setBusy(true); setProp(null);
    setTimeout(()=>{
      setBusy(false);
      setProp({
        module: files[0].type==="pdf"?"esg":files[0].type==="excel"?"do":"rc",
        summary:"El análisis detectó un tono general positivo. Se identificaron 3 compromisos nuevos y mejora en índices de participación respecto al período anterior.",
        scores:[
          { dim:"percepcion", label:"Percepción y confianza", cur:65, prop:69,
            reason:"Mejora en satisfacción de stakeholders (+4 pts vs período anterior)." },
          { dim:"dialogo",    label:"Calidad del diálogo",    cur:70, prop:73,
            reason:"Aumento de reuniones formales y tasa de acuerdos cumplidos al 92%." },
        ],
      });
    }, 2200);
  };

  return (
    <div>
      <div onClick={()=>ref.current.click()}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}}
        style={{ border:`2px dashed ${drag?T.rc:T.b2}`, borderRadius:12, padding:28,
          textAlign:"center", cursor:"pointer", background:drag?`${T.rc}08`:T.s2, transition:"all .2s" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>📁</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:T.t1, marginBottom:4 }}>
          Arrastra archivos o haz clic para cargar
        </div>
        <div style={{ fontSize:12, color:T.t3 }}>Soporta .xlsx · .csv · .pdf · .docx · .txt</div>
        <input ref={ref} type="file" multiple style={{ display:"none" }} onChange={e=>add(e.target.files)}/>
      </div>

      {files.length>0 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
          {files.map((f,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7,
              background:T.s3, border:`1px solid ${T.b2}`, borderRadius:7, padding:"5px 11px", fontSize:12, color:T.t2 }}>
              <span>{fIcon(f.type)}</span><span>{f.name}</span>
              <span onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                style={{ cursor:"pointer", color:T.t4, marginLeft:2 }}>✕</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:9, marginTop:14 }}>
        <button onClick={analyze} disabled={!files.length||busy} style={{
          padding:"9px 18px", background:T.rc, border:"none", borderRadius:8,
          color:"white", fontSize:13, fontWeight:600, cursor:"pointer",
          fontFamily:"'Instrument Sans',sans-serif", opacity:!files.length?.5:1,
          display:"flex", alignItems:"center", gap:7 }}>
          {busy
            ? <><span style={{ width:13,height:13,border:`2px solid rgba(255,255,255,.3)`,
                borderTopColor:"white",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block" }}/> Analizando…</>
            : "✦ Analizar con IA"}
        </button>
        <button onClick={()=>{setFiles([]);setProp(null);}} style={{
          padding:"9px 18px", background:"none", border:`1px solid ${T.b2}`,
          borderRadius:8, color:T.t2, fontSize:13, cursor:"pointer",
          fontFamily:"'Instrument Sans',sans-serif" }}>Limpiar</button>
      </div>

      {busy && (
        <div style={{ background:T.s3, border:`1px solid ${T.rc}30`, borderRadius:12, padding:18, marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ background:`${T.rc}18`, color:T.rc, border:`1px solid ${T.rc}30`,
              borderRadius:20, padding:"2px 9px", fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>✦ IA</span>
            <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:T.t3 }}>
              <span style={{ width:12,height:12,border:`2px solid ${T.b2}`,borderTopColor:T.rc,
                borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block" }}/>
              Procesando archivo…
            </div>
          </div>
          <div style={{ fontSize:12, color:T.t3 }}>Detectando tipo de contenido · Extrayendo indicadores · Generando propuesta</div>
        </div>
      )}

      {prop && (
        <div style={{ background:T.s3, border:`1px solid ${T.rc}30`, borderRadius:12, padding:20, marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{ background:`${T.rc}18`, color:T.rc, border:`1px solid ${T.rc}30`,
              borderRadius:20, padding:"2px 9px", fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>✦ Propuesta IA</span>
            <span style={{ background:`${MODULES[prop.module]?.color}18`, color:MODULES[prop.module]?.color,
              border:`1px solid ${MODULES[prop.module]?.color}30`,
              borderRadius:20, padding:"2px 9px", fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
              {MODULES[prop.module]?.short}
            </span>
          </div>
          <div style={{ fontSize:13, color:T.t2, marginBottom:14, lineHeight:1.65 }}>{prop.summary}</div>
          {prop.scores.map((s,i)=>(
            <div key={i} style={{ background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8, padding:"11px 14px", marginBottom:9 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:13, color:T.t1, fontWeight:500 }}>{s.label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:T.t3 }}>{s.cur}</span>
                  <span style={{ color:T.t4 }}>→</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, color:T.esg, fontWeight:600 }}>{s.prop}</span>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.t3 }}>{s.reason}</div>
            </div>
          ))}
          {/* Manual override */}
          <div style={{ borderTop:`1px solid ${T.b1}`, paddingTop:14, marginTop:6 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
              letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>O ingresa manualmente</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:12 }}>
              {prop.scores.map(s=>(
                <div key={s.dim}>
                  <div style={{ fontSize:11, color:T.t3, marginBottom:5 }}>{s.label}</div>
                  <input type="number" defaultValue={s.prop} min={0} max={100}
                    style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:7,
                      padding:"8px 11px", color:T.t1, fontSize:13, outline:"none",
                      fontFamily:"'Instrument Sans',sans-serif" }}/>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:9 }}>
              <button onClick={()=>{onApply&&onApply();setProp(null);setFiles([]);}} style={{
                padding:"8px 16px", background:T.esg, border:"none", borderRadius:7,
                color:"#08090c", fontSize:13, fontWeight:600, cursor:"pointer",
                fontFamily:"'Instrument Sans',sans-serif" }}>✓ Aplicar</button>
              <button onClick={()=>setProp(null)} style={{
                padding:"8px 16px", background:"none", border:`1px solid ${T.b2}`,
                borderRadius:7, color:T.t2, fontSize:13, cursor:"pointer",
                fontFamily:"'Instrument Sans',sans-serif" }}>Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Client Dashboard ──
function ClientDashboard({ client }) {
  const [tab, setTab] = useState("overview");
  const prev = client.history[client.history.length-2];
  const curr = client.history[client.history.length-1];
  const radarData = Object.entries(MODULES).filter(([k])=>client.modules[k])
    .flatMap(([k,m])=>m.dimensions.map(d=>({ s:d.label.split(" ")[0], A:client.scores[k]?.[d.key]||0 })));

  const TABS = [{ id:"overview",label:"Resumen"},{ id:"evolution",label:"Evolución"},{ id:"messages",label:"Mensajes"}];

  return (
    <div style={{ padding:"32px 36px", maxWidth:1200 }}>
      {/* Page header */}
      <div className="fu" style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
          letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>
          Dashboard · {client.period}
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:T.t1,
          letterSpacing:-.5, marginBottom:6 }}>{client.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, color:T.t2 }}>{client.industry}</span>
          {Object.entries(client.modules).filter(([,v])=>v).map(([k])=>(
            <span key={k} style={{ padding:"2px 9px", borderRadius:20, fontSize:11,
              fontFamily:"'JetBrains Mono',monospace",
              border:`1px solid ${MODULES[k].color}40`, color:MODULES[k].color }}>{MODULES[k].short}</span>
          ))}
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
            boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,.3)":"none", transition:"all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="overview" && (
        <>
          <div className="fu d1" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
            {Object.keys(MODULES).map(k=>(
              <ModuleCard key={k} modKey={k} scores={client.scores} active={client.modules[k]}/>
            ))}
          </div>
          <div className="fu d2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <Card>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:14 }}>
                Perfil de indicadores
              </div>
              <div style={{ height:220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={T.b2}/>
                    <PolarAngleAxis dataKey="s" tick={{ fill:T.t3, fontSize:10, fontFamily:"JetBrains Mono" }}/>
                    <Radar dataKey="A" stroke={T.rc} fill={T.rc} fillOpacity={.08} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:14 }}>
                Alertas del período
              </div>
              {client.alerts.map(a=>(
                <div key={a.id} style={{ display:"flex", gap:10, padding:"11px 14px",
                  borderRadius:8, marginBottom:8,
                  background:a.type==="red"?`${T.red}0e`:a.type==="amber"?`${T.amber}0e`:`${T.esg}0e`,
                  border:`1px solid ${a.type==="red"?T.red:a.type==="amber"?T.amber:T.esg}25` }}>
                  <span style={{ fontSize:14, marginTop:1 }}>
                    {a.type==="red"?"✕":a.type==="amber"?"⚠":"✓"}
                  </span>
                  <div>
                    <div style={{ fontSize:13, color:T.t2 }}>{a.text}</div>
                    <div style={{ fontSize:10, color:T.t4, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{a.date}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
          <Card cls="fu d3">
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:14 }}>
              Recomendaciones estratégicas
            </div>
            {client.recommendations.map((r,i)=>(
              <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.b1}` }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:T.blue, marginTop:6, flexShrink:0 }}/>
                <div style={{ fontSize:13, color:T.t2 }}>{r}</div>
              </div>
            ))}
          </Card>
        </>
      )}

      {tab==="evolution" && (
        <div className="fu">
          <Card style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:18 }}>
              Evolución histórica de scores
            </div>
            <div style={{ height:260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={client.history}>
                  <defs>
                    {Object.entries(MODULES).map(([k,m])=>(
                      <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={m.color} stopOpacity={.15}/>
                        <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="period" tick={{ fill:T.t3, fontSize:11, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[30,100]} tick={{ fill:T.t3, fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8, fontSize:12 }}/>
                  {Object.entries(MODULES).filter(([k])=>client.modules[k]).map(([k,m])=>(
                    <Area key={k} type="monotone" dataKey={k} stroke={m.color}
                      strokeWidth={2} fill={`url(#g${k})`} name={m.short}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:14 }}>
              Comparativa {prev?.period} → {curr?.period}
            </div>
            {Object.entries(MODULES).filter(([k])=>client.modules[k]).map(([k,m])=>{
              const diff=(curr?.[k]||0)-(prev?.[k]||0);
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${T.b1}` }}>
                  <span style={{ fontSize:16 }}>{m.icon}</span>
                  <div style={{ width:200, fontSize:13, color:T.t2 }}>{m.label}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, color:sc(curr?.[k]) }}>{curr?.[k]}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12,
                    color:diff>0?T.esg:diff<0?T.red:T.t4 }}>
                    {diff>0?`↑ +${diff}`:diff<0?`↓ ${diff}`:"→"}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {tab==="messages" && (
        <Card cls="fu">
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:6 }}>
            Canal con THO Consultora
          </div>
          <div style={{ fontSize:13, color:T.t3, marginBottom:18 }}>
            Escribe comentarios, preguntas o solicitudes al equipo consultor.
          </div>
          <Messages messages={client.messages} onSend={()=>{}}/>
        </Card>
      )}
    </div>
  );
}

// ── Consultant Panel ──
function ConsultantPanel({ clients, selId, setSelId }) {
  const [tab, setTab] = useState("scores");
  const client = clients.find(c=>c.id===selId)||clients[0];
  const TABS=[{ id:"scores",label:"Scores manuales"},{ id:"upload",label:"Carga IA"},
    { id:"files",label:"Historial"},{ id:"publish",label:"Publicación"}];

  return (
    <div style={{ padding:"32px 36px", maxWidth:1200 }}>
      <div className="fu" style={{ marginBottom:28 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
          letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Centro de control</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, color:T.t1, letterSpacing:-.5 }}>
          Gestión de datos
        </div>
      </div>

      <Card cls="fu" style={{ marginBottom:18 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t3,
          letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Cliente activo</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {clients.map(c=>(
            <div key={c.id} onClick={()=>setSelId(c.id)} style={{
              padding:"7px 14px", borderRadius:20, cursor:"pointer", transition:"all .15s",
              border:`1px solid ${selId===c.id?`${T.rc}60`:T.b2}`,
              background:selId===c.id?`${T.rc}10`:T.s2,
              color:selId===c.id?T.rc:T.t2,
              fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6,height:6,borderRadius:"50%", background:c.published?T.esg:T.amber }}/>
              {c.name}
              {!c.published&&<span style={{ fontSize:10, opacity:.6 }}>BORRADOR</span>}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display:"flex", gap:3, marginBottom:22, background:T.s2,
        borderRadius:10, padding:4, width:"fit-content" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"7px 16px", borderRadius:7, border:"none",
            background:tab===t.id?T.s1:"none", color:tab===t.id?T.t1:T.t3,
            fontSize:13, fontWeight:500, cursor:"pointer",
            fontFamily:"'Instrument Sans',sans-serif",
            boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,.3)":"none", transition:"all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="scores" && (
        <Card cls="fu">
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:6 }}>
            Ingreso manual de scores
          </div>
          <div style={{ fontSize:13, color:T.t3, marginBottom:22 }}>
            El score total de cada módulo se calcula automáticamente aplicando los pesos de la metodología.
          </div>
          {Object.entries(MODULES).filter(([k])=>client.modules[k]).map(([k,m])=>(
            <div key={k} style={{ marginBottom:28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
                <span style={{ fontSize:16 }}>{m.icon}</span>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:m.color }}>{m.label}</div>
                <Tip text={m.methodDesc}>
                  <span style={{ background:T.s2, border:`1px solid ${T.b2}`, borderRadius:20,
                    padding:"2px 9px", fontSize:11, fontFamily:"'JetBrains Mono',monospace",
                    color:T.t3, cursor:"help" }}>¿Cómo se calcula?</span>
                </Tip>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:m.color,
                  background:`${m.color}18`, padding:"2px 8px", borderRadius:4 }}>
                  score actual: {client.scores[k]?.total}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                {m.dimensions.map(d=>(
                  <div key={d.key}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                      <label style={{ fontSize:12, color:T.t2 }}>{d.label}</label>
                      <Tip text={d.tooltip}>
                        <span style={{ width:14,height:14,borderRadius:"50%",background:T.b2,color:T.t3,
                          fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",
                          cursor:"help",fontFamily:"'JetBrains Mono',monospace" }}>?</span>
                      </Tip>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t4,
                        background:T.s3, padding:"1px 5px", borderRadius:3 }}>{d.weight}%</span>
                    </div>
                    <input type="number" defaultValue={client.scores[k]?.[d.key]||""} min={0} max={100}
                      placeholder="0–100"
                      style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
                        padding:"9px 12px", color:T.t1, fontSize:13, outline:"none",
                        fontFamily:"'Instrument Sans',sans-serif" }}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button style={{ padding:"9px 18px", background:T.blue, border:"none", borderRadius:8,
            color:"white", fontSize:13, fontWeight:600, cursor:"pointer",
            fontFamily:"'Instrument Sans',sans-serif" }}>Guardar y recalcular</button>
        </Card>
      )}

      {tab==="upload" && (
        <Card cls="fu">
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:6 }}>
            Carga de archivos con análisis IA
          </div>
          <div style={{ fontSize:13, color:T.t3, marginBottom:18, lineHeight:1.65 }}>
            Sube cualquier archivo del período. La IA detecta el tipo de contenido, extrae indicadores relevantes y propone actualizaciones de score para tu revisión.
          </div>
          <div style={{ padding:"11px 14px", background:`${T.rc}08`, border:`1px solid ${T.rc}25`,
            borderRadius:8, marginBottom:20, fontSize:13, color:"#fb923c" }}>
            ✦ La IA propone — tú decides. Ningún score se actualiza sin tu confirmación.
          </div>
          <FileUpload onApply={()=>{}}/>
        </Card>
      )}

      {tab==="files" && (
        <Card cls="fu">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1 }}>Historial de archivos</div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.t3,
              background:T.s2, padding:"3px 9px", borderRadius:20 }}>{client.files.length} archivos</span>
          </div>
          {client.files.map(f=>(
            <div key={f.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${T.b1}` }}>
              <div style={{ width:34,height:34,borderRadius:8,flexShrink:0,
                background:f.type==="excel"?`${T.esg}18`:f.type==="pdf"?`${T.red}18`:`${T.blue}18`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>{fIcon(f.type)}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:T.t1 }}>{f.name}</div>
                <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>
                  {MODULES[f.module]?.short} · {f.date} · Score IA: {f.ai_score}
                </div>
              </div>
              <span style={{ background:`${T.esg}18`, color:T.esg, border:`1px solid ${T.esg}30`,
                padding:"3px 9px", borderRadius:20, fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>
                Aplicado
              </span>
            </div>
          ))}
        </Card>
      )}

      {tab==="publish" && (
        <Card cls="fu">
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:T.t1, marginBottom:6 }}>
            Control de publicación
          </div>
          <div style={{ fontSize:13, color:T.t3, marginBottom:22 }}>
            El cliente solo ve su dashboard cuando publicas el período. En borrador puedes editar libremente.
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"18px 20px", borderRadius:11, marginBottom:20,
            background:client.published?`${T.esg}08`:`${T.amber}08`,
            border:`1px solid ${client.published?T.esg:T.amber}25` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",
                background:client.published?T.esg:T.amber, animation:"pulse 2s infinite" }}/>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>
                  {client.published?"Publicado — visible para el cliente":"Borrador — el cliente no puede verlo"}
                </div>
                <div style={{ fontSize:12, color:T.t3 }}>{client.name} · {client.period}</div>
              </div>
            </div>
            <button style={{ padding:"9px 18px", borderRadius:8, cursor:"pointer",
              background:client.published?"none":T.esg,
              border:client.published?`1px solid ${T.b2}`:"none",
              color:client.published?T.t2:"#08090c",
              fontSize:13, fontWeight:600, fontFamily:"'Instrument Sans',sans-serif" }}>
              {client.published?"Despublicar":"✓ Publicar al cliente"}
            </button>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3,
            letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Notas internas</div>
          <textarea placeholder="Notas privadas — el cliente nunca las verá."
            style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`, borderRadius:8,
              padding:"12px 14px", color:T.t1, fontSize:13, outline:"none", resize:"vertical",
              minHeight:90, lineHeight:1.6, fontFamily:"'Instrument Sans',sans-serif" }}/>
        </Card>
      )}
    </div>
  );
}

// ── Login ──
function Login({ onLogin }) {
  const [role, setRole] = useState("consultant");
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0,
        backgroundImage:`linear-gradient(${T.b1}50 1px,transparent 1px),linear-gradient(90deg,${T.b1}50 1px,transparent 1px)`,
        backgroundSize:"52px 52px", opacity:.4 }}/>
      <div style={{ position:"absolute", width:480,height:480,borderRadius:"50%",
        background:`radial-gradient(circle,${T.rc}07,transparent 65%)`,
        top:"50%",left:"50%",transform:"translate(-50%,-50%)" }}/>
      <div style={{ position:"relative", background:T.s1, border:`1px solid ${T.b2}`,
        borderRadius:20, padding:"48px 44px", width:400, maxWidth:"92vw",
        boxShadow:"0 32px 80px rgba(0,0,0,.7)", animation:"fadeUp .45s ease both" }}>
        <div style={{ position:"absolute", top:0, left:48, right:48, height:2,
          borderRadius:"0 0 2px 2px", background:`linear-gradient(90deg,${T.rc},${T.do})` }}/>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700,
          color:T.t1, marginBottom:4 }}>
          THO <span style={{ background:`linear-gradient(90deg,${T.rc},${T.do})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Compass</span>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t4,
          letterSpacing:3, textTransform:"uppercase", marginBottom:36 }}>
          Plataforma de Reputación Corporativa
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t3,
          letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Tipo de acceso</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {[["consultant","⚙️","Consultora"],["client","📊","Cliente"]].map(([r,ic,l])=>(
            <div key={r} onClick={()=>setRole(r)} style={{
              padding:"14px 10px", borderRadius:12, cursor:"pointer", textAlign:"center",
              border:`1px solid ${role===r?`${T.rc}60`:T.b2}`,
              background:role===r?`${T.rc}10`:T.s2,
              color:role===r?T.rc:T.t3, transition:"all .2s" }}>
              <div style={{ fontSize:22, marginBottom:5 }}>{ic}</div>
              <div style={{ fontSize:13, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          <button onClick={()=>onLogin(role,"google")} style={{
            width:"100%", padding:12, background:"none", border:`1px solid ${T.b2}`,
            borderRadius:9, color:T.t1, fontSize:14, fontWeight:500, cursor:"pointer",
            fontFamily:"'Instrument Sans',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
          <button onClick={()=>onLogin(role,"azure")} style={{
            width:"100%", padding:12,
            background:`linear-gradient(135deg,${T.rc},${T.do})`,
            border:"none", borderRadius:9, color:"white", fontSize:14, fontWeight:600,
            cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <svg width="17" height="17" viewBox="0 0 23 23">
              <path fill="rgba(255,255,255,.9)" d="M11 0H0v11h11V0zm12 0H12v11h11V0zM11 12H0v11h11V12zm12 0H12v11h11V12z"/>
            </svg>
            Continuar con Microsoft
          </button>
        </div>
        <div style={{ textAlign:"center", fontFamily:"'JetBrains Mono',monospace",
          fontSize:10, color:T.t4, marginTop:18 }}>thocompass.cl</div>
      </div>
    </div>
  );
}

// ── Sidebar ──
function Sidebar({ nav, page, onNav, open, onToggle, isC, session, onSignOut }) {
  return (
    <div style={{ width:open?228:56, flexShrink:0, background:T.s1, borderRight:`1px solid ${T.b1}`,
      display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0,
      transition:"width .22s cubic-bezier(.4,0,.2,1)", zIndex:200, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 14px 16px",
        borderBottom:`1px solid ${T.b1}`, minHeight:62, overflow:"hidden", whiteSpace:"nowrap" }}>
        <div style={{ width:30,height:30,borderRadius:8,flexShrink:0,
          background:`linear-gradient(135deg,${T.rc},${T.do})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:14,color:"white" }}>T</div>
        {open && (
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16, color:T.t1 }}>
            THO <span style={{ background:`linear-gradient(90deg,${T.rc},${T.do})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Compass</span>
          </div>
        )}
        <button onClick={onToggle} style={{ marginLeft:"auto", flexShrink:0, background:"none",
          border:`1px solid ${T.b2}`, borderRadius:6, color:T.t3, cursor:"pointer",
          padding:"4px 7px", fontSize:12, transition:"all .15s" }}>
          {open?"←":"→"}
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"10px 8px" }}>
        {nav.map((item,i)=>{
          if (item.sep) return open
            ? <div key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:T.t3,
                letterSpacing:2, textTransform:"uppercase", padding:"0 8px", margin:"14px 0 5px" }}>{item.label}</div>
            : <div key={i} style={{ height:1, background:T.b1, margin:"10px 6px" }}/>;
          const isActive = page===item.id;
          const ac = item.activeCls==="rc-active"?T.rc:item.activeCls==="do-active"?T.do:item.activeCls==="esg-active"?T.esg:T.blue;
          return (
            <div key={item.id} onClick={()=>!item.locked&&onNav(item.id)}
              title={!open?item.label:undefined}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 8px", borderRadius:8,
                cursor:item.locked?"default":"pointer", opacity:item.locked?.35:1,
                color:isActive?ac:T.t3, background:isActive?`${ac}12`:"none",
                border:`1px solid ${isActive?ac+"25":"transparent"}`,
                transition:"all .15s", whiteSpace:"nowrap", overflow:"hidden",
                fontSize:13, fontWeight:500 }}
              onMouseEnter={e=>!isActive&&!item.locked&&(e.currentTarget.style.background=T.s2,e.currentTarget.style.color=T.t1)}
              onMouseLeave={e=>!isActive&&(e.currentTarget.style.background=isActive?`${ac}12`:"none",e.currentTarget.style.color=isActive?ac:T.t3)}>
              <span style={{ fontSize:16, flexShrink:0, width:22, textAlign:"center" }}>{item.icon}</span>
              {open && <span style={{ flex:1 }}>{item.label}</span>}
              {open && item.badge>0 && <span style={{ background:T.red, color:"white", fontSize:10,
                fontFamily:"'JetBrains Mono',monospace", padding:"1px 6px", borderRadius:10 }}>{item.badge}</span>}
              {open && item.locked && <span style={{ fontSize:11, color:T.t4 }}>🔒</span>}
            </div>
          );
        })}
      </div>

      <div style={{ padding:"10px 8px", borderTop:`1px solid ${T.b1}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, padding:8, overflow:"hidden", whiteSpace:"nowrap" }}>
          <div style={{ width:32,height:32,borderRadius:"50%",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:12,
            background:isC?`${T.blue}18`:`${T.rc}18`, color:isC?T.blue:T.rc,
            border:`1px solid ${isC?T.blue:T.rc}30` }}>
            {session?.displayName?.[0]?.toUpperCase()||(isC?"T":"C")}
          </div>
          {open && <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:12,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
              {session?.displayName||(isC?"THO Consultora":"Cliente")}
            </div>
            <div style={{ fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>
              {isC?"consultora":"cliente"}
            </div>
          </div>}
        </div>
        {open && <button onClick={onSignOut} style={{ width:"100%",marginTop:7,padding:7,
          background:"none",border:`1px solid ${T.b2}`,borderRadius:7,color:T.t3,
          fontSize:12,cursor:"pointer",transition:"all .15s",fontFamily:"'Instrument Sans',sans-serif" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t3;}}>
          Cerrar sesión
        </button>}
      </div>
    </div>
  );
}

// ── App ──
export default function App() {
  const [session, setSession] = useState(null);
  const [open,    setOpen]    = useState(true);
  const [page,    setPage]    = useState("dashboard");
  const [selId,   setSelId]   = useState("c1");

  const CLIENTS = [MOCK_CLIENT];
  const isC = session?.role === "consultant";
  const client = CLIENTS[0];

  const consultantNav = [
    { id:"dashboard", icon:"◈", label:"Panel general" },
    { sep:true, label:"Módulos" },
    { id:"rc",  icon:"🤝", label:"Relacionamiento", activeCls:"rc-active" },
    { id:"do",  icon:"🏛",  label:"Desarrollo Org.", activeCls:"do-active" },
    { id:"esg", icon:"🌿", label:"Sostenibilidad",   activeCls:"esg-active" },
    { sep:true, label:"Gestión" },
    { id:"control", icon:"⚙", label:"Centro de control" },
    { id:"profile", icon:"👤", label:"Perfil" },
  ];

  const clientNav = [
    { id:"dashboard", icon:"◈", label:"Mi dashboard" },
    { sep:true, label:"Servicios" },
    { id:"rc",  icon:"🤝", label:"Relacionamiento", activeCls:"rc-active", locked:!client?.modules.rc },
    { id:"do",  icon:"🏛",  label:"Desarrollo Org.", activeCls:"do-active", locked:!client?.modules.do },
    { id:"esg", icon:"🌿", label:"Sostenibilidad",   activeCls:"esg-active", locked:!client?.modules.esg },
    { sep:true, label:"Cuenta" },
    { id:"messages", icon:"✉", label:"Mensajes" },
    { id:"profile",  icon:"👤", label:"Mi perfil" },
  ];

  const nav = isC ? consultantNav : clientNav;

  function renderPage() {
    if (isC) {
      if (["dashboard","rc","do","esg"].includes(page)) return <ClientDashboard client={MOCK_CLIENT}/>;
      if (page==="control") return <ConsultantPanel clients={CLIENTS} selId={selId} setSelId={setSelId}/>;
    } else {
      if (["dashboard","rc","do","esg"].includes(page)) return <ClientDashboard client={client}/>;
      if (page==="messages") return (
        <div style={{ padding:"32px 36px", maxWidth:800 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:T.t1, marginBottom:24 }}>Mensajes</div>
          <Card><Messages messages={client.messages} onSend={()=>{}}/></Card>
        </div>
      );
    }
    if (page==="profile") return (
      <div style={{ padding:"32px 36px" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:T.t1, marginBottom:24 }}>Perfil</div>
        <Card style={{ maxWidth:480 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
            <div style={{ width:52,height:52,borderRadius:"50%",background:`${T.blue}18`,
              border:`1px solid ${T.blue}30`,display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:20,color:T.blue }}>
              {session?.displayName?.[0]}
            </div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:T.t1 }}>{session?.displayName}</div>
              <div style={{ fontSize:12, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>{session?.email}</div>
            </div>
          </div>
          <div style={{ fontSize:13, color:T.t3 }}>Gestión de perfil y preferencias disponible próximamente.</div>
        </Card>
      </div>
    );
    return null;
  }

  if (!session) return (
    <><style>{BASE_CSS}</style>
      <Login onLogin={(role)=>setSession({
        role,
        displayName: role==="consultant"?"Jeremías":"Rosa Fernández",
        email:       role==="consultant"?"jeremias@tho.cl":"rfernandez@mlosandes.cl",
      })}/></>
  );

  return (
    <><style>{BASE_CSS}</style>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <Sidebar nav={nav} page={page} onNav={setPage} open={open} onToggle={()=>setOpen(o=>!o)}
          isC={isC} session={session} onSignOut={()=>{setSession(null);setPage("dashboard");}}/>
        <div style={{ marginLeft:open?228:56, flex:1, minHeight:"100vh",
          transition:"margin-left .22s cubic-bezier(.4,0,.2,1)" }}>
          {/* Topbar */}
          <div style={{ height:52, background:T.s1, borderBottom:`1px solid ${T.b1}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0 28px", position:"sticky", top:0, zIndex:100 }}>
            <div style={{ fontSize:13, color:T.t3 }}>
              THO Compass <strong style={{ color:T.t1, fontWeight:600 }}>
                / {nav.find(n=>n.id===page)?.label||"Dashboard"}
              </strong>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button style={{ background:"none", border:`1px solid ${T.b2}`, borderRadius:7,
                color:T.t2, cursor:"pointer", padding:"5px 10px", fontSize:14 }}>🔔</button>
              {isC && (
                <div style={{ background:T.s2, border:`1px solid ${T.b2}`, borderRadius:7,
                  padding:"5px 12px", color:T.t1, fontSize:13, fontWeight:500,
                  display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7,height:7,borderRadius:"50%",background:T.esg }}/>
                  {MOCK_CLIENT.name} ▾
                </div>
              )}
            </div>
          </div>
          {renderPage()}
        </div>
      </div>
    </>
  );
}
