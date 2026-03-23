// BaselineInstrument.jsx
// Instrumento de línea base por módulo
// Cuestionario estructurado que genera scores iniciales a partir
// de respuestas Likert (1-5) del consultor basadas en observación directa.
//
// Uso: <BaselineInstrument moduleKey="rc" project={project} supabase={supabase}
//        onComplete={(scores) => ...} onClose={() => ...} />

import { useState } from "react";
import { saveProjectScore, syncClientScore } from "../lib/scores.js";

const T = {
  bg:"#08090c", s1:"#0d0f14", s2:"#111520", b1:"#1d2535", b2:"#232d42",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  rc:"#f97316", do:"#a855f7", esg:"#22c55e", blue:"#3b82f6",
  amber:"#f59e0b", red:"#ef4444",
};

// ── Instrumentos por módulo ────────────────────────────────────
const INSTRUMENTS = {
  rc: {
    label: "Relacionamiento Comunitario",
    color: T.rc,
    intro: "Este instrumento permite establecer una línea base del Índice LSO. Responde en base a tu observación directa del territorio y conversaciones con actores clave.",
    sections: [
      {
        dimension: "percepcion",
        label: "Percepción y confianza",
        weight: 30,
        questions: [
          { id:"p1", text:"Los actores comunitarios clave expresan confianza en la organización en conversaciones directas." },
          { id:"p2", text:"La organización tiene una reputación reconociblemente positiva en el territorio." },
          { id:"p3", text:"Los stakeholders distinguen entre la organización y la industria al evaluar impactos." },
        ]
      },
      {
        dimension: "compromisos",
        label: "Gestión de compromisos",
        weight: 25,
        questions: [
          { id:"c1", text:"Existe un registro formal de compromisos adquiridos con la comunidad." },
          { id:"c2", text:"Los compromisos vigentes están siendo cumplidos dentro del plazo acordado." },
          { id:"c3", text:"La comunidad tiene acceso a información sobre el estado de los compromisos." },
        ]
      },
      {
        dimension: "dialogo",
        label: "Calidad del diálogo",
        weight: 25,
        questions: [
          { id:"d1", text:"Existen instancias de participación regulares (al menos mensuales) con la comunidad." },
          { id:"d2", text:"Las instancias de diálogo incluyen representantes de distintos grupos del territorio." },
          { id:"d3", text:"Los acuerdos de las reuniones quedan documentados y son conocidos por los participantes." },
        ]
      },
      {
        dimension: "conflictividad",
        label: "Conflictividad activa",
        weight: 20,
        inverse: true, // Score más alto = menos conflicto
        questions: [
          { id:"x1", text:"Actualmente NO hay conflictos activos que afecten la operación del proyecto." },
          { id:"x2", text:"Las tensiones existentes están siendo abordadas con mecanismos formales de resolución." },
          { id:"x3", text:"La relación con autoridades locales es fluida y sin disputas pendientes." },
        ]
      },
    ]
  },

  do: {
    label: "Desarrollo Organizacional",
    color: T.do,
    intro: "Instrumento de diagnóstico inicial de salud organizacional. Responde en base a información obtenida de entrevistas con líderes, revisión de documentos y observación.",
    sections: [
      {
        dimension: "cultura",
        label: "Cultura organizacional",
        weight: 35,
        questions: [
          { id:"cu1", text:"Los valores de la organización son conocidos y citados espontáneamente por los colaboradores." },
          { id:"cu2", text:"Los comportamientos observados en el día a día son consistentes con los valores declarados." },
          { id:"cu3", text:"La organización celebra logros y reconoce contribuciones de manera visible." },
        ]
      },
      {
        dimension: "engagement",
        label: "Engagement y clima",
        weight: 35,
        questions: [
          { id:"en1", text:"Los colaboradores expresan satisfacción con su trabajo y su equipo en conversaciones informales." },
          { id:"en2", text:"La tasa de rotación voluntaria es baja comparada con el sector." },
          { id:"en3", text:"Existe evidencia de iniciativa y motivación más allá de las responsabilidades formales." },
        ]
      },
      {
        dimension: "liderazgo",
        label: "Liderazgo",
        weight: 30,
        questions: [
          { id:"li1", text:"Los líderes comunican expectativas con claridad y consistencia." },
          { id:"li2", text:"Los equipos perciben a sus jefaturas como accesibles y abiertas al feedback." },
          { id:"li3", text:"Los líderes activamente desarrollan las capacidades de sus equipos." },
        ]
      },
    ]
  },

  esg: {
    label: "Sostenibilidad Corporativa",
    color: T.esg,
    intro: "Diagnóstico inicial de madurez ESG. Responde en base a revisión de documentos, políticas y conversaciones con el equipo de sostenibilidad.",
    sections: [
      {
        dimension: "ambiental",
        label: "Pilar Ambiental",
        weight: 33,
        questions: [
          { id:"am1", text:"La organización mide y registra sus principales indicadores ambientales (energía, agua, residuos, emisiones)." },
          { id:"am2", text:"Existe una política ambiental formal implementada y conocida por el personal relevante." },
          { id:"am3", text:"La organización cumple con toda la normativa ambiental vigente sin sanciones activas." },
        ]
      },
      {
        dimension: "social",
        label: "Pilar Social",
        weight: 34,
        questions: [
          { id:"so1", text:"La organización registra y monitorea indicadores de seguridad y salud ocupacional." },
          { id:"so2", text:"Existen programas formales de bienestar o desarrollo para los colaboradores." },
          { id:"so3", text:"La organización tiene iniciativas documentadas de vinculación con comunidades." },
        ]
      },
      {
        dimension: "gobernanza",
        label: "Pilar Gobernanza",
        weight: 33,
        questions: [
          { id:"go1", text:"Existe un Modelo de Prevención de Delitos (Ley 21.595) formalmente implementado." },
          { id:"go2", text:"Hay un canal de denuncias activo, accesible y con protocolos de respuesta documentados." },
          { id:"go3", text:"La organización publica o reporta internamente indicadores de gobernanza y ética." },
        ]
      },
    ]
  },
};

const LIKERT = [
  { value:1, label:"Muy en desacuerdo", short:"1" },
  { value:2, label:"En desacuerdo",     short:"2" },
  { value:3, label:"Neutro",            short:"3" },
  { value:4, label:"De acuerdo",        short:"4" },
  { value:5, label:"Muy de acuerdo",    short:"5" },
];

// Convierte promedio Likert (1-5) a score (0-100) con ajuste de calibración
function likertToScore(avg, inverse=false) {
  // Mapeo no lineal: refuerza extremos, modera el centro
  // 1→10, 2→30, 3→55, 4→75, 5→95
  const mapped = {1:10, 2:30, 3:55, 4:75, 5:95};
  // Interpolación para valores decimales
  const floor = Math.floor(avg);
  const ceil  = Math.ceil(avg);
  const frac  = avg - floor;
  const score = floor === ceil
    ? mapped[floor]
    : mapped[floor] + (mapped[ceil] - mapped[floor]) * frac;
  return inverse ? Math.round(100 - score + 10) : Math.round(score);
}

export default function BaselineInstrument({ moduleKey, project, supabase, onComplete, onClose }) {
  const instrument = INSTRUMENTS[moduleKey];
  if (!instrument) return null;

  const [answers,  setAnswers]  = useState({});
  const [saving,   setSaving]   = useState(false);
  const [section,  setSection]  = useState(0);
  const [notes,    setNotes]    = useState("");

  const totalQuestions = instrument.sections.reduce((s,sec)=>s+sec.questions.length,0);
  const answered       = Object.keys(answers).length;
  const allAnswered    = answered >= totalQuestions;
  const currentSection = instrument.sections[section];

  function computeScores() {
    const scores = {};
    instrument.sections.forEach(sec => {
      const vals = sec.questions.map(q=>answers[q.id]).filter(Boolean);
      if (!vals.length) return;
      const avg = vals.reduce((s,v)=>s+v,0) / vals.length;
      scores[sec.dimension] = likertToScore(avg, sec.inverse);
    });
    // Score total ponderado
    const overall = Math.round(
      instrument.sections.reduce((sum,sec) => {
        const s = scores[sec.dimension];
        return s != null ? sum + (s * sec.weight / 100) : sum;
      }, 0)
    );
    return { ...scores, overall };
  }

  async function handleSave() {
    if (!allAnswered) return;
    setSaving(true);
    try {
      const scores  = computeScores();
      const dimOnly = { ...scores };
      delete dimOnly.overall;

      await saveProjectScore(supabase, project.id, {
        overall_score:         scores.overall,
        dimension_scores_json: dimOnly,
      }, {
        method: 'baseline_instrument',
        notes: `Instrumento de observación directa${notes ? ': ' + notes : ''}`,
      });

      await syncClientScore(supabase, project.client_id, moduleKey, dimOnly, scores.overall);
      onComplete(scores);
    } finally {
      setSaving(false);
    }
  }

  const progress = Math.round((answered / totalQuestions) * 100);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20 }}>
      <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:16,
        width:"100%",maxWidth:620,maxHeight:"90vh",overflow:"hidden",
        display:"flex",flexDirection:"column",
        boxShadow:"0 32px 80px rgba(0,0,0,.7)" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px",borderBottom:`1px solid ${T.b1}`,
          display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              color:instrument.color,letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>
              Instrumento de línea base
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:17,color:T.t1 }}>
              {instrument.label}
            </div>
            <div style={{ fontSize:11,color:T.t3,marginTop:2 }}>{project.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",
            color:T.t3,cursor:"pointer",fontSize:20,padding:4 }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ padding:"12px 24px",borderBottom:`1px solid ${T.b1}`,
          background:T.s2 }}>
          <div style={{ display:"flex",justifyContent:"space-between",
            fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",marginBottom:7 }}>
            <span>{answered}/{totalQuestions} preguntas respondidas</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height:4,background:T.b2,borderRadius:2,overflow:"hidden" }}>
            <div style={{ height:"100%",background:instrument.color,
              width:`${progress}%`,transition:"width .3s",borderRadius:2 }}/>
          </div>
          {/* Section tabs */}
          <div style={{ display:"flex",gap:6,marginTop:10 }}>
            {instrument.sections.map((sec,i) => {
              const secAnswered = sec.questions.every(q=>answers[q.id]);
              return (
                <button key={sec.dimension} onClick={()=>setSection(i)} style={{
                  flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",
                  fontSize:10,fontFamily:"'JetBrains Mono',monospace",
                  background:section===i ? `${instrument.color}20` : T.s1,
                  color:section===i ? instrument.color : secAnswered ? T.esg : T.t3,
                  borderBottom:`2px solid ${section===i ? instrument.color : "transparent"}`,
                }}>
                  {secAnswered ? "✓ " : ""}{sec.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions */}
        <div style={{ flex:1,overflowY:"auto",padding:"20px 24px" }}>
          {section === 0 && !answered && (
            <div style={{ padding:"12px 16px",background:`${instrument.color}08`,
              border:`1px solid ${instrument.color}25`,borderRadius:10,
              fontSize:13,color:T.t2,lineHeight:1.6,marginBottom:20 }}>
              {instrument.intro}
            </div>
          )}

          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,
            color:instrument.color,marginBottom:16 }}>
            {currentSection.label}
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
              color:T.t3,marginLeft:8 }}>peso: {currentSection.weight}%</span>
          </div>

          {currentSection.questions.map((q,qi) => (
            <div key={q.id} style={{ marginBottom:22,
              padding:"14px 16px",background:T.s2,borderRadius:10,
              border:`1px solid ${answers[q.id] ? `${instrument.color}30` : T.b1}`,
              transition:"border-color .15s" }}>
              <div style={{ fontSize:13,color:T.t1,marginBottom:12,lineHeight:1.55 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                  color:T.t3,marginRight:8 }}>{qi+1}.</span>
                {q.text}
              </div>
              <div style={{ display:"flex",gap:6 }}>
                {LIKERT.map(opt => (
                  <button key={opt.value} onClick={()=>setAnswers(p=>({...p,[q.id]:opt.value}))}
                    title={opt.label}
                    style={{ flex:1,padding:"8px 0",borderRadius:7,border:"none",
                      cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .15s",
                      fontFamily:"'JetBrains Mono',monospace",
                      background:answers[q.id]===opt.value ? instrument.color : T.b1,
                      color:answers[q.id]===opt.value ? "#08090c" : T.t3 }}>
                    {opt.short}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",
                fontSize:9,color:T.t4,fontFamily:"'JetBrains Mono',monospace",
                marginTop:5,padding:"0 2px" }}>
                <span>Muy en desacuerdo</span>
                <span>Muy de acuerdo</span>
              </div>
            </div>
          ))}

          {section === instrument.sections.length - 1 && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:11,color:T.t3,marginBottom:8,
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                Notas del consultor (opcional)
              </div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Contexto adicional, condiciones de la observación, limitaciones..."
                style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                  borderRadius:8,padding:"10px 12px",color:T.t1,fontSize:13,
                  fontFamily:"'Instrument Sans',sans-serif",resize:"vertical",
                  minHeight:80,outline:"none",boxSizing:"border-box" }}/>
            </div>
          )}
        </div>

        {/* Preview & actions */}
        <div style={{ padding:"16px 24px",borderTop:`1px solid ${T.b1}`,background:T.s2 }}>
          {allAnswered && (
            <div style={{ marginBottom:14,display:"flex",gap:10,flexWrap:"wrap" }}>
              {(() => {
                const sc = computeScores();
                return instrument.sections.map(sec => (
                  <div key={sec.dimension} style={{ padding:"6px 12px",
                    background:`${instrument.color}10`,borderRadius:8,
                    border:`1px solid ${instrument.color}25`,fontSize:12 }}>
                    <span style={{ color:T.t3 }}>{sec.label.split(" ")[0]}:</span>{" "}
                    <span style={{ fontFamily:"'JetBrains Mono',monospace",
                      color:instrument.color,fontWeight:600 }}>
                      {sc[sec.dimension] ?? "—"}
                    </span>
                  </div>
                ));
              })()}
              <div style={{ padding:"6px 12px",background:`${T.blue}10`,borderRadius:8,
                border:`1px solid ${T.blue}25`,fontSize:12 }}>
                <span style={{ color:T.t3 }}>Total:</span>{" "}
                <span style={{ fontFamily:"'JetBrains Mono',monospace",
                  color:T.blue,fontWeight:600 }}>{computeScores().overall}</span>
              </div>
            </div>
          )}

          <div style={{ display:"flex",gap:10,justifyContent:"space-between" }}>
            <div style={{ display:"flex",gap:8 }}>
              {section > 0 && (
                <button onClick={()=>setSection(s=>s-1)} style={{ padding:"9px 16px",
                  background:"none",border:`1px solid ${T.b2}`,borderRadius:8,
                  color:T.t2,cursor:"pointer",fontSize:13 }}>← Anterior</button>
              )}
              {section < instrument.sections.length - 1 && (
                <button onClick={()=>setSection(s=>s+1)} style={{ padding:"9px 16px",
                  background:`${instrument.color}15`,border:`1px solid ${instrument.color}30`,
                  borderRadius:8,color:instrument.color,cursor:"pointer",fontSize:13 }}>
                  Siguiente →</button>
              )}
            </div>
            <button onClick={handleSave} disabled={!allAnswered||saving} style={{
              padding:"9px 20px",borderRadius:8,border:"none",
              background:allAnswered ? instrument.color : T.b2,
              color:allAnswered ? "#08090c" : T.t4,
              cursor:allAnswered?"pointer":"not-allowed",
              fontSize:13,fontWeight:600,fontFamily:"'Instrument Sans',sans-serif" }}>
              {saving ? "Guardando…" : allAnswered ? "✓ Guardar línea base" : `Faltan ${totalQuestions-answered} preguntas`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
