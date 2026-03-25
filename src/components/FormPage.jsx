// FormPage.jsx — Página pública de respuesta a formulario (sin login)
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fetch directo a Supabase REST sin cliente — garantiza uso de anon key
async function anonFetch(path, method="GET", body=null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      "Prefer":        method==="POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

const T = {
  bg:"#08090c", s1:"#0d0f14", s2:"#111520", b1:"#1d2535", b2:"#232d42",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", blue:"#3b82f6",
};
const MOD_COLOR = { rc:"#f97316", do:"#a855f7", esg:"#22c55e" };

function ScaleLikert({ q, value, onChange }) {
  const cfg = q.config_json || {};
  const min = cfg.scale_min || 1, max = cfg.scale_max || 5;
  const steps = Array.from({length:max-min+1},(_,i)=>min+i);
  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:6 }}>
        {steps.map(v=>(
          <button key={v} onClick={()=>onChange(v)}
            style={{ flex:1,padding:"12px 0",borderRadius:9,border:"none",
              cursor:"pointer",fontSize:14,fontWeight:600,
              fontFamily:"'JetBrains Mono',monospace",transition:"all .15s",
              background:value===v?"var(--ac)":"#1d2535",
              color:value===v?"#08090c":"#3d4d66" }}>
            {v}
          </button>
        ))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",
        fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>
        <span>{cfg.min_label||"Muy en desacuerdo"}</span>
        <span>{cfg.max_label||"Muy de acuerdo"}</span>
      </div>
    </div>
  );
}

function ScaleNPS({ value, onChange }) {
  return (
    <div>
      <div style={{ display:"flex",gap:3,marginBottom:6 }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(v=>(
          <button key={v} onClick={()=>onChange(v)}
            style={{ flex:1,padding:"10px 0",border:"none",borderRadius:6,
              cursor:"pointer",fontSize:12,fontWeight:600,
              fontFamily:"'JetBrains Mono',monospace",transition:"all .15s",
              background:value===v?v<=6?T.red:v<=8?T.amber:T.green:"#1d2535",
              color:value===v?"#08090c":v<=6?T.red:v<=8?T.amber:T.green }}>
            {v}
          </button>
        ))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",
        fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>
        <span>Nada probable</span><span>Muy probable</span>
      </div>
    </div>
  );
}

function MultiChoice({ q, value, onChange, multi }) {
  const opts = q.config_json?.options || [];
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  function toggle(opt) {
    if (multi) {
      onChange(selected.includes(opt) ? selected.filter(o=>o!==opt) : [...selected,opt]);
    } else {
      onChange([opt]);
    }
  }
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {opts.map((opt,i)=>{
        const checked = selected.includes(opt);
        return (
          <div key={i} onClick={()=>toggle(opt)}
            style={{ display:"flex",alignItems:"center",gap:12,
              padding:"12px 14px",background:checked?"#1d2535":"#111520",
              border:`1px solid ${checked?"var(--ac)30":"#232d42"}`,
              borderRadius:10,cursor:"pointer",transition:"all .15s" }}>
            <div style={{ width:18,height:18,borderRadius:multi?4:"50%",
              border:`2px solid ${checked?"var(--ac)":"#2e3a52"}`,
              background:checked?"var(--ac)":"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,transition:"all .15s" }}>
              {checked&&<span style={{ color:"#08090c",fontSize:11,fontWeight:700 }}>✓</span>}
            </div>
            <span style={{ fontSize:14,color:checked?T.t1:T.t2 }}>{opt}</span>
          </div>
        );
      })}
    </div>
  );
}

function TextAnswer({ q, value, onChange }) {
  const cfg = q.config_json || {};
  return (
    <textarea value={value||""} onChange={e=>onChange(e.target.value)}
      placeholder={cfg.placeholder||"Escribe tu respuesta..."}
      maxLength={cfg.max_length||500}
      rows={4}
      style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
        borderRadius:10,padding:"12px 14px",color:T.t1,fontSize:14,
        resize:"vertical",outline:"none",boxSizing:"border-box",
        fontFamily:"'Instrument Sans',sans-serif",lineHeight:1.6 }}/>
  );
}

function MatrixAnswer({ q, value={}, onChange }) {
  const cfg = q.config_json || {};
  const rows = cfg.rows || [], cols = cfg.cols || [];
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%",borderCollapse:"collapse" }}>
        <thead>
          <tr>
            <th style={{ padding:"8px 12px",textAlign:"left",
              color:T.t3,fontSize:12,fontWeight:400 }}></th>
            {cols.map((col,j)=>(
              <th key={j} style={{ padding:"8px 10px",color:T.t2,
                fontSize:12,fontWeight:400,textAlign:"center" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} style={{ borderTop:`1px solid ${T.b1}` }}>
              <td style={{ padding:"12px 12px",fontSize:13,color:T.t2 }}>{row}</td>
              {cols.map((col,j)=>(
                <td key={j} style={{ padding:"12px 10px",textAlign:"center" }}>
                  <div onClick={()=>onChange({...value,[row]:col})}
                    style={{ width:20,height:20,borderRadius:"50%",margin:"0 auto",
                      cursor:"pointer",transition:"all .15s",
                      border:`2px solid ${value[row]===col?"var(--ac)":"#2e3a52"}`,
                      background:value[row]===col?"var(--ac)":"transparent" }}/>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingAnswer({ q, value=[], onChange }) {
  const cfg = q.config_json || {};
  const items = cfg.items || [];
  const [ranked, setRanked] = useState(value.length ? value : [...items]);
  const dragRef = useRef(null);

  function handleDragStart(e,i) { dragRef.current=i; e.dataTransfer.effectAllowed="move"; }
  function handleDrop(e,i) {
    e.preventDefault();
    const from=dragRef.current;
    if(from===i||from===null) return;
    const arr=[...ranked];
    const [moved]=arr.splice(from,1);
    arr.splice(i,0,moved);
    setRanked(arr);
    onChange(arr);
    dragRef.current=null;
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      <div style={{ fontSize:12,color:T.t3,marginBottom:4 }}>
        Arrastra para reordenar de mayor a menor importancia:
      </div>
      {ranked.map((item,i)=>(
        <div key={item} draggable
          onDragStart={e=>handleDragStart(e,i)}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>handleDrop(e,i)}
          style={{ display:"flex",alignItems:"center",gap:12,
            padding:"12px 14px",background:T.s2,
            border:`1px solid ${T.b2}`,borderRadius:10,cursor:"grab" }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",
            fontSize:18,fontWeight:700,color:"var(--ac)",width:28,
            textAlign:"center",flexShrink:0 }}>{i+1}</span>
          <span style={{ flex:1,fontSize:14,color:T.t1 }}>{item}</span>
          <span style={{ color:T.t3,fontSize:16 }}>⠿</span>
        </div>
      ))}
    </div>
  );
}

function QuestionCard({ q, value, onChange, color }) {
  const answered = value!==null&&value!==undefined&&value!=="";
  return (
    <div style={{ padding:"22px 24px",background:T.s1,
      border:`1px solid ${answered?"var(--ac)25":T.b1}`,
      borderRadius:16,transition:"border-color .2s" }}>
      <div style={{ fontSize:14,color:T.t1,lineHeight:1.65,marginBottom:18,fontWeight:500 }}>
        {q.text}
        {q.required&&<span style={{ color:"var(--ac)",marginLeft:4,fontSize:12 }}>*</span>}
      </div>
      {q.type==="likert"          && <ScaleLikert q={q} value={value} onChange={onChange}/>}
      {q.type==="nps"             && <ScaleNPS value={value} onChange={onChange}/>}
      {q.type==="multiple_single" && <MultiChoice q={q} value={value} onChange={v=>onChange(v[0])} multi={false}/>}
      {q.type==="multiple_multi"  && <MultiChoice q={q} value={value} onChange={onChange} multi={true}/>}
      {q.type==="text"            && <TextAnswer q={q} value={value} onChange={onChange}/>}
      {q.type==="matrix"          && <MatrixAnswer q={q} value={value} onChange={onChange}/>}
      {q.type==="ranking"         && <RankingAnswer q={q} value={value} onChange={onChange}/>}
    </div>
  );
}

export default function FormPage({ token }) {
  const [form,     setForm]     = useState(null);
  const [questions,setQuestions]= useState([]);
  const [answers,  setAnswers]  = useState({});
  const [name,     setName]     = useState("");
  const [role,     setRole]     = useState("");
  const [step,     setStep]     = useState(0); // 0=loading, 1=intro, 2=form, 3=done, -1=error
  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);

  useEffect(()=>{
    if(!token){ setStep(-1); setError("Link inválido"); return; }
    anonFetch(`form_templates?token=eq.${token}&status=eq.active&select=*`)
      .then(data=>{
        const form = Array.isArray(data) ? data[0] : data;
        if(!form){ setStep(-1); setError("Este formulario no existe o ha expirado."); return null; }
        if(form.expires_at&&new Date(form.expires_at)<new Date()){
          setStep(-1); setError("Este formulario ha cerrado."); return null; }
        setForm(form);
        return anonFetch(`form_questions?form_id=eq.${form.id}&order=order_index`);
      })
      .then(data=>{
        if(!data) return;
        setQuestions(data||[]);
        setStep(1);
      })
      .catch(e=>{ setStep(-1); setError("Error cargando formulario: "+e.message); });
  },[token]);

  async function handleSubmit() {
    setSaving(true);
    try {
      // Insert response
      const respData = await anonFetch("form_responses", "POST", {
        form_id:         form.id,
        respondent_name: name.trim()||null,
        respondent_role: role.trim()||null,
        submitted_at:    new Date().toISOString(),
        is_complete:     true,
      });
      const resp = Array.isArray(respData) ? respData[0] : respData;
      if (!resp?.id) throw new Error("No se obtuvo ID de respuesta");

      // Insert answers
      const rows = questions.map(q=>{
        const val = answers[q.id];
        const row = { response_id:resp.id, question_id:q.id };
        if(q.type==="likert"||q.type==="nps") row.value_integer=val??null;
        else if(q.type==="text") row.value_text=val||null;
        else row.value_json=val??null;
        return row;
      }).filter(r=>r.value_integer!=null||r.value_text||r.value_json!=null);

      if(rows.length){
        await anonFetch("form_answers", "POST", rows);
      }
      setStep(3);
    } catch(e){
      alert("Error al enviar: "+e.message);
    } finally { setSaving(false); }
  }

  const color = MOD_COLOR[form?.module_key] || T.blue;
  const required = questions.filter(q=>q.required);
  const answeredRequired = required.filter(q=>{
    const v=answers[q.id];
    return v!==null&&v!==undefined&&v!=="";
  });
  const canSubmit = answeredRequired.length===required.length;

  const CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};font-family:'Instrument Sans',sans-serif;color:${T.t2};}
    :root{--ac:${color};}
    button:focus,input:focus,textarea:focus{outline:none;}`;

  if(step===0) return (<><style>{CSS}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:T.t3,letterSpacing:2}}>CARGANDO…</div></div></>);

  if(step===-1) return (<><style>{CSS}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{textAlign:"center",maxWidth:400}}><div style={{fontSize:48,marginBottom:16}}>⚠</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.t1,marginBottom:12}}>Formulario no disponible</div><div style={{fontSize:14,color:T.t3,lineHeight:1.7}}>{error}</div></div></div></>);

  if(step===3) return (<><style>{CSS}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{textAlign:"center",maxWidth:440}}><div style={{fontSize:52,marginBottom:20}}>✓</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.t1,marginBottom:12}}>¡Gracias por responder!</div><div style={{fontSize:14,color:T.t2,lineHeight:1.7,marginBottom:24}}>Tus respuestas han sido registradas para <strong>{form.title}</strong>.</div><div style={{padding:"12px 18px",background:`${color}10`,border:`1px solid ${color}25`,borderRadius:10,fontSize:13,color:T.t3}}>Puedes cerrar esta ventana.</div></div></div></>);

  // Intro
  if(step===1) return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"40px 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:540,width:"100%"}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>
          {form.module_key?.toUpperCase()} · THO Compass
        </div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,color:T.t1,marginBottom:8,lineHeight:1.2}}>{form.title}</div>
        {form.target_group&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3,marginBottom:20}}>Dirigido a: {form.target_group}</div>}
        {form.description&&<div style={{fontSize:14,color:T.t2,lineHeight:1.75,marginBottom:28,padding:"16px 20px",background:T.s2,borderRadius:12,border:`1px solid ${T.b1}`}}>{form.description}</div>}
        <div style={{fontSize:13,color:T.t3,marginBottom:28,lineHeight:1.7}}>
          Este formulario tiene <strong style={{color:T.t2}}>{questions.length} preguntas</strong>.
          Tus respuestas son confidenciales.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
          <div><label style={{fontSize:11,color:T.t3,display:"block",marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>Tu nombre (opcional)</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. María González"
              style={{width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:9,padding:"10px 14px",color:T.t1,fontSize:14}}/></div>
          <div><label style={{fontSize:11,color:T.t3,display:"block",marginBottom:5,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>Tu rol o cargo (opcional)</label>
            <input value={role} onChange={e=>setRole(e.target.value)} placeholder="Ej. Dirigente vecinal, Trabajador/a"
              style={{width:"100%",background:T.s2,border:`1px solid ${T.b2}`,borderRadius:9,padding:"10px 14px",color:T.t1,fontSize:14}}/></div>
        </div>
        <button onClick={()=>setStep(2)} style={{width:"100%",padding:"14px",background:color,border:"none",borderRadius:10,color:"#08090c",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif"}}>
          Comenzar →
        </button>
      </div>
    </div>
  );

  // Form
  const answered = Object.keys(answers).length;
  const progress = Math.round((answeredRequired.length/Math.max(required.length,1))*100);
  return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"32px 24px"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:600,margin:"0 auto"}}>
        {/* Progress */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color,letterSpacing:2,textTransform:"uppercase",flex:1}}>{form.title}</div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.t3}}>{answeredRequired.length}/{required.length}</span>
        </div>
        <div style={{height:3,background:T.b2,borderRadius:2,marginBottom:28,overflow:"hidden"}}>
          <div style={{height:"100%",background:color,width:`${progress}%`,transition:"width .3s",borderRadius:2}}/>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {questions.map(q=>(
            <QuestionCard key={q.id} q={q} value={answers[q.id]??null} color={color}
              onChange={v=>setAnswers(p=>({...p,[q.id]:v}))}/>
          ))}
        </div>

        <div style={{marginTop:28,marginBottom:48}}>
          {!canSubmit&&<div style={{textAlign:"center",fontSize:13,color:T.t3,marginBottom:14}}>
            Completa las preguntas obligatorias (*) para continuar
          </div>}
          <button onClick={handleSubmit} disabled={!canSubmit||saving}
            style={{width:"100%",padding:"14px",border:"none",borderRadius:10,fontSize:15,fontWeight:700,
              fontFamily:"'Instrument Sans',sans-serif",
              cursor:canSubmit?"pointer":"not-allowed",
              background:canSubmit?color:T.b2,
              color:canSubmit?"#08090c":T.t3,transition:"all .2s"}}>
            {saving?"Enviando…":"Enviar respuestas ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
