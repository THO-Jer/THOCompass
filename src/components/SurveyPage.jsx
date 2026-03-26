// SurveyPage.jsx
// Página pública para responder el instrumento de línea base.
// Accesible via /#/survey/:token sin login.
// Renderiza el instrumento correspondiente al módulo del link.

import { useState, useEffect } from "react";
import { supabase as sb } from "../lib/supabase.js";

const T = {
  bg:"#050505", s1:"#0a0a0a", s2:"#111111", s3:"#1a1a1a",
  b1:"#1f1f1f", b2:"#2a2a2a", b3:"#363636",
  t1:"#f0ece4", t2:"#9a9080", t3:"#4a4540", t4:"#282420",
  rc:"#c8813a", do:"#8b6fa8", esg:"#4a8c6a",
  blue:"#5b7fa6", amber:"#b8860b", red:"#a84040", green:"#4a8c6a",
};

const QUESTIONS = {
  rc: [
    { id:"p1", dim:"percepcion",    text:"La organización actúa con transparencia y honestidad en su relación con la comunidad." },
    { id:"p2", dim:"percepcion",    text:"Confío en que la organización cumplirá los compromisos que asume con nosotros." },
    { id:"p3", dim:"percepcion",    text:"La organización tiene una imagen positiva en nuestro territorio." },
    { id:"c1", dim:"compromisos",   text:"La organización ha cumplido los acuerdos y compromisos anteriores." },
    { id:"c2", dim:"compromisos",   text:"Cuando hay incumplimientos, la organización los reconoce y busca solución." },
    { id:"d1", dim:"dialogo",       text:"Hay instancias regulares donde podemos expresar nuestras opiniones y ser escuchados." },
    { id:"d2", dim:"dialogo",       text:"Las reuniones con la organización son útiles y generan acuerdos concretos." },
    { id:"x1", dim:"conflictividad",text:"En general, la relación con la organización es fluida y sin conflictos importantes.", inverse:true },
    { id:"x2", dim:"conflictividad",text:"Los conflictos o tensiones que surgen se resuelven de manera justa.", inverse:true },
  ],
  do: [
    { id:"cu1", dim:"cultura",    text:"Los valores de esta organización se reflejan en cómo actuamos día a día." },
    { id:"cu2", dim:"cultura",    text:"Aquí se celebran los logros y se reconoce el buen trabajo." },
    { id:"cu3", dim:"cultura",    text:"Me siento orgulloso/a de pertenecer a esta organización." },
    { id:"en1", dim:"engagement", text:"Me siento motivado/a y comprometido/a con mi trabajo." },
    { id:"en2", dim:"engagement", text:"Recomendaría a un amigo trabajar en esta organización." },
    { id:"en3", dim:"engagement", text:"Cuento con las herramientas y recursos necesarios para hacer bien mi trabajo." },
    { id:"li1", dim:"liderazgo",  text:"Mi jefatura directa me comunica claramente lo que se espera de mí." },
    { id:"li2", dim:"liderazgo",  text:"Puedo hablar con honestidad con mi jefatura sin temor a consecuencias." },
    { id:"li3", dim:"liderazgo",  text:"Mi jefatura se preocupa por mi desarrollo profesional." },
  ],
  esg: [
    { id:"am1", dim:"ambiental",   text:"Conozco las políticas ambientales de esta organización." },
    { id:"am2", dim:"ambiental",   text:"Esta organización actúa de forma responsable con el medioambiente." },
    { id:"so1", dim:"social",      text:"Esta organización se preocupa genuinamente por el bienestar de sus trabajadores." },
    { id:"so2", dim:"social",      text:"Esta organización tiene un impacto positivo en las comunidades donde opera." },
    { id:"go1", dim:"gobernanza",  text:"Esta organización actúa con ética e integridad en sus negocios." },
    { id:"go2", dim:"gobernanza",  text:"Si tuviera que reportar una irregularidad, confío en que sería atendida apropiadamente." },
  ],
};

const MOD_META = {
  rc:  { label:"Relacionamiento Comunitario", color:T.rc,  icon:"🤝" },
  do:  { label:"Desarrollo Organizacional",   color:T.do,  icon:"🏛" },
  esg: { label:"Sostenibilidad",              color:T.esg, icon:"🌿" },
};

const LIKERT = [
  { v:1, l:"Muy en desacuerdo" },
  { v:2, l:"En desacuerdo"     },
  { v:3, l:"Neutro"            },
  { v:4, l:"De acuerdo"        },
  { v:5, l:"Muy de acuerdo"    },
];

export default function SurveyPage({ token }) {
  const [link,      setLink]      = useState(null);
  const [answers,   setAnswers]   = useState({});
  const [name,      setName]      = useState("");
  const [role,      setRole]      = useState("");
  const [step,      setStep]      = useState(0); // 0=intro, 1=questions, 2=done, -1=error
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!token) { setStep(-1); setError("Link inválido"); return; }
    sb.from("survey_links")
      .select("*, projects(name, module_key)")
      .eq("token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setStep(-1); setError("Este link no existe o ha expirado."); return; }
        if (!data.active)   { setStep(-1); setError("Este link ha sido desactivado."); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setStep(-1); setError("Este link ha expirado."); return;
        }
        setLink(data);
      });
  }, [token]);

  async function handleSubmit() {
    setSaving(true);
    const { error } = await sb.from("survey_responses").insert({
      survey_link_id:  link.id,
      answers_json:    answers,
      respondent_name: name.trim() || null,
      respondent_role: role.trim() || null,
    });
    if (error) { setError("Error al enviar: " + error.message); setSaving(false); return; }
    setStep(2);
  }

  const modKey   = link?.module_key || link?.projects?.module_key;
  const mod      = MOD_META[modKey];
  const questions = QUESTIONS[modKey] || [];
  const answered  = Object.keys(answers).length;
  const progress  = Math.round((answered / questions.length) * 100);
  const allDone   = answered >= questions.length;

  // ── Error / not found ──
  if (step === -1) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`body{margin:0;background:${T.bg}}`}</style>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22,
          color:T.t1, marginBottom:12 }}>Link no disponible</div>
        <div style={{ fontSize:14, color:T.t3, lineHeight:1.7 }}>{error}</div>
      </div>
    </div>
  );

  // ── Loading ──
  if (!link) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center" }}>
      <style>{`body{margin:0;background:${T.bg}}`}</style>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12,
        color:T.t3, letterSpacing:2 }}>CARGANDO…</div>
    </div>
  );

  // ── Thank you ──
  if (step === 2) return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');body{margin:0;background:${T.bg}}`}</style>
      <div style={{ textAlign:"center", maxWidth:440 }}>
        <div style={{ fontSize:52, marginBottom:20 }}>✓</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26,
          color:T.t1, marginBottom:12 }}>¡Gracias por responder!</div>
        <div style={{ fontSize:14, color:T.t2, lineHeight:1.7, marginBottom:24 }}>
          Tus respuestas han sido registradas y serán parte del análisis de{" "}
          <strong>{link.projects?.name || "este proyecto"}</strong>.
        </div>
        <div style={{ padding:"12px 18px", background:`${mod.color}10`,
          border:`1px solid ${mod.color}25`, borderRadius:10,
          fontSize:13, color:T.t3 }}>
          Puedes cerrar esta ventana.
        </div>
      </div>
    </div>
  );

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; }
    body { margin:0; background:${T.bg}; font-family:'Instrument Sans',sans-serif; color:${T.t2}; }
    input, select { outline:none; }
  `;

  // ── Intro ──
  if (step === 0) return (
    <div style={{ minHeight:"100vh", background:T.bg, padding:"40px 24px",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth:520, width:"100%" }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
          color:mod.color, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
          {mod.icon} {mod.label} · THO Compass
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28,
          color:T.t1, marginBottom:8, lineHeight:1.2 }}>
          {link.title || "Instrumento de evaluación"}
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
          color:T.t3, marginBottom:24 }}>
          {link.projects?.name}
          {link.target_group ? ` · Dirigido a: ${link.target_group}` : ""}
        </div>
        {link.description && (
          <div style={{ fontSize:14, color:T.t2, lineHeight:1.75, marginBottom:28,
            padding:"16px 20px", background:T.s2, borderRadius:12,
            border:`1px solid ${T.b1}` }}>
            {link.description}
          </div>
        )}
        <div style={{ fontSize:13, color:T.t3, marginBottom:28, lineHeight:1.7 }}>
          Este cuestionario tiene <strong style={{color:T.t2}}>{questions.length} preguntas</strong> y
          toma aproximadamente <strong style={{color:T.t2}}>3-5 minutos</strong>.
          Tus respuestas son confidenciales y se usarán de forma agregada.
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, color:T.t3, display:"block", marginBottom:6,
            fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>
            Tu nombre (opcional)
          </label>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="Ej. María González"
            style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`,
              borderRadius:8, padding:"10px 14px", color:T.t1, fontSize:14 }}/>
        </div>
        <div style={{ marginBottom:32 }}>
          <label style={{ fontSize:11, color:T.t3, display:"block", marginBottom:6,
            fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>
            Tu rol o cargo (opcional)
          </label>
          <input value={role} onChange={e=>setRole(e.target.value)}
            placeholder="Ej. Dirigente vecinal, Trabajador/a, Encargado/a ESG"
            style={{ width:"100%", background:T.s2, border:`1px solid ${T.b2}`,
              borderRadius:8, padding:"10px 14px", color:T.t1, fontSize:14 }}/>
        </div>

        <button onClick={()=>setStep(1)}
          style={{ width:"100%", padding:"14px", background:mod.color, border:"none",
            borderRadius:10, color:"#08090c", fontSize:15, fontWeight:700,
            cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif" }}>
          Comenzar →
        </button>
      </div>
    </div>
  );

  // ── Questions ──
  return (
    <div style={{ minHeight:"100vh", background:T.bg, padding:"32px 24px" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth:580, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            color:mod.color, letterSpacing:2, textTransform:"uppercase", flex:1 }}>
            {mod.icon} {link.projects?.name || mod.label}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.t3 }}>
            {answered}/{questions.length}
          </div>
        </div>

        {/* Progress */}
        <div style={{ height:3, background:T.b2, borderRadius:2, marginBottom:32, overflow:"hidden" }}>
          <div style={{ height:"100%", background:mod.color, width:`${progress}%`,
            transition:"width .3s", borderRadius:2 }}/>
        </div>

        {/* Questions */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{ padding:"20px 22px", background:T.s1,
              border:`1px solid ${answers[q.id] ? `${mod.color}30` : T.b1}`,
              borderRadius:14, transition:"border-color .2s" }}>
              <div style={{ fontSize:14, color:T.t1, lineHeight:1.65, marginBottom:18 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                  color:T.t3, marginRight:10 }}>{i+1}.</span>
                {q.text}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {LIKERT.map(opt => (
                  <button key={opt.v} onClick={()=>setAnswers(p=>({...p,[q.id]:opt.v}))}
                    title={opt.l}
                    style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none",
                      cursor:"pointer", fontSize:13, fontWeight:600,
                      fontFamily:"'JetBrains Mono',monospace", transition:"all .15s",
                      background: answers[q.id]===opt.v ? mod.color : T.s2,
                      color:      answers[q.id]===opt.v ? "#08090c" : T.t3 }}>
                    {opt.v}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                fontSize:9, color:T.t3, fontFamily:"'JetBrains Mono',monospace",
                marginTop:6, padding:"0 2px" }}>
                <span>Muy en desacuerdo</span>
                <span>Muy de acuerdo</span>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div style={{ marginTop:32, marginBottom:48 }}>
          {!allDone && (
            <div style={{ textAlign:"center", fontSize:13, color:T.t3, marginBottom:16 }}>
              Faltan {questions.length - answered} preguntas por responder
            </div>
          )}
          <button onClick={handleSubmit} disabled={!allDone || saving}
            style={{ width:"100%", padding:"14px", border:"none", borderRadius:10,
              fontSize:15, fontWeight:700, fontFamily:"'Instrument Sans',sans-serif",
              cursor: allDone ? "pointer" : "not-allowed",
              background: allDone ? mod.color : T.b2,
              color:       allDone ? "#08090c" : T.t3,
              transition:"all .2s" }}>
            {saving ? "Enviando…" : "Enviar respuestas ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
