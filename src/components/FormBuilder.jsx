// FormBuilder.jsx — Constructor drag-and-drop de formularios
// Props: projectId, moduleKey, supabase, accentColor, onClose, editForm?

import { useState, useRef } from "react";

const T = {
  s1:"#0d0f14", s2:"#111520", s3:"#161b28",
  b1:"#1d2535", b2:"#232d42", b3:"#2e3a52",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", blue:"#3b82f6",
};

const QUESTION_TYPES = [
  { type:"likert",          label:"Escala Likert",       icon:"⭐", desc:"Acuerdo del 1 al 5" },
  { type:"nps",             label:"NPS",                 icon:"📊", desc:"Escala -100 a +100" },
  { type:"multiple_single", label:"Opción única",        icon:"◉",  desc:"Una respuesta posible" },
  { type:"multiple_multi",  label:"Opción múltiple",     icon:"☑",  desc:"Varias respuestas" },
  { type:"text",            label:"Texto libre",         icon:"✏️", desc:"Respuesta abierta" },
  { type:"matrix",          label:"Matriz",              icon:"⊞",  desc:"Varios ítems, misma escala" },
  { type:"ranking",         label:"Ranking",             icon:"🏆", desc:"Ordenar por importancia" },
];

function genId() { return Math.random().toString(36).slice(2,9); }

function defaultConfig(type) {
  switch(type) {
    case "likert":          return { scale_min:1, scale_max:5, min_label:"Muy en desacuerdo", max_label:"Muy de acuerdo" };
    case "nps":             return { label:"¿Qué tan probable es que nos recomiendes?" };
    case "multiple_single": return { options:["Opción A","Opción B","Opción C"] };
    case "multiple_multi":  return { options:["Opción A","Opción B","Opción C"] };
    case "text":            return { placeholder:"Escribe aquí...", max_length:500 };
    case "matrix":          return { rows:["Ítem 1","Ítem 2","Ítem 3"], cols:["Malo","Regular","Bueno","Muy bueno"] };
    case "ranking":         return { items:["Prioridad A","Prioridad B","Prioridad C"] };
    default:                return {};
  }
}

// ── Question Preview ──────────────────────────────────────────
function QuestionPreview({ q }) {
  const { type, text, config_json: cfg } = q;
  return (
    <div style={{ fontSize:13, color:T.t2, pointerEvents:"none", userSelect:"none" }}>
      <div style={{ fontWeight:600, color:T.t1, marginBottom:8, lineHeight:1.5 }}>{text || "Sin texto"}</div>
      {type==="likert" && (
        <div style={{ display:"flex", gap:6 }}>
          {[1,2,3,4,5].slice(0,(cfg.scale_max||5)-(cfg.scale_min||1)+1).map((_,i)=>(
            <div key={i} style={{ flex:1, padding:"6px 0", textAlign:"center",
              background:T.b2, borderRadius:7, fontSize:12,
              fontFamily:"'JetBrains Mono',monospace" }}>{(cfg.scale_min||1)+i}</div>
          ))}
        </div>
      )}
      {type==="nps" && (
        <div style={{ display:"flex", gap:3 }}>
          {[0,1,2,3,4,5,6,7,8,9,10].map(n=>(
            <div key={n} style={{ flex:1, padding:"4px 0", textAlign:"center",
              background:T.b2, borderRadius:5, fontSize:10,
              fontFamily:"'JetBrains Mono',monospace",
              color:n<=6?T.red:n<=8?T.amber:T.green }}>{n}</div>
          ))}
        </div>
      )}
      {(type==="multiple_single"||type==="multiple_multi") && (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {(cfg.options||[]).map((opt,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
              padding:"6px 10px", background:T.b2, borderRadius:7 }}>
              <div style={{ width:14, height:14, borderRadius:type==="multiple_single"?"50%":3,
                border:`1px solid ${T.b3}`, flexShrink:0 }}/>
              <span style={{ fontSize:12 }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
      {type==="text" && (
        <div style={{ padding:"8px 12px", background:T.b2, borderRadius:7,
          color:T.t4, fontSize:12, fontStyle:"italic" }}>
          {cfg.placeholder || "Respuesta abierta..."}
        </div>
      )}
      {type==="matrix" && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                <th style={{ padding:"4px 8px", textAlign:"left", color:T.t3 }}></th>
                {(cfg.cols||[]).map((col,i)=>(
                  <th key={i} style={{ padding:"4px 8px", color:T.t3,
                    fontFamily:"'JetBrains Mono',monospace", fontWeight:400 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(cfg.rows||[]).map((row,i)=>(
                <tr key={i} style={{ borderTop:`1px solid ${T.b2}` }}>
                  <td style={{ padding:"4px 8px", color:T.t2 }}>{row}</td>
                  {(cfg.cols||[]).map((_,j)=>(
                    <td key={j} style={{ padding:"4px 8px", textAlign:"center" }}>
                      <div style={{ width:14, height:14, borderRadius:"50%",
                        border:`1px solid ${T.b3}`, margin:"0 auto" }}/>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {type==="ranking" && (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {(cfg.items||[]).map((item,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"6px 10px", background:T.b2, borderRadius:7 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",
                fontSize:11, color:T.t3, width:16 }}>{i+1}.</span>
              <span style={{ fontSize:12 }}>{item}</span>
              <span style={{ marginLeft:"auto", color:T.t4, fontSize:12 }}>⇅</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Question Config Editor ────────────────────────────────────
function QuestionEditor({ q, onChange, onDelete, accentColor, index, total,
  onMoveUp, onMoveDown, dragHandleProps }) {
  const [expanded, setExpanded] = useState(true);
  const cfg = q.config_json || {};
  const typeMeta = QUESTION_TYPES.find(t=>t.type===q.type);

  function updateCfg(patch) { onChange({ ...q, config_json:{ ...cfg, ...patch } }); }
  function updateText(text) { onChange({ ...q, text }); }

  function addOption(field) {
    const arr = [...(cfg[field]||[]), `Opción ${(cfg[field]||[]).length+1}`];
    updateCfg({ [field]: arr });
  }
  function updateOption(field, i, val) {
    const arr = [...(cfg[field]||[])]; arr[i]=val; updateCfg({ [field]:arr });
  }
  function removeOption(field, i) {
    const arr = (cfg[field]||[]).filter((_,j)=>j!==i); updateCfg({ [field]:arr });
  }

  return (
    <div style={{ background:T.s2, border:`1px solid ${T.b2}`,
      borderRadius:12, overflow:"hidden", transition:"border-color .15s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=`${accentColor}40`}
      onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10,
        padding:"12px 14px", cursor:"pointer" }}
        onClick={()=>setExpanded(p=>!p)}>
        {/* Drag handle */}
        <div {...dragHandleProps} onClick={e=>e.stopPropagation()}
          style={{ cursor:"grab", color:T.t4, fontSize:16, flexShrink:0,
            padding:"2px 4px", borderRadius:4 }}
          title="Arrastrar para reordenar">⠿</div>

        <div style={{ width:28, height:28, borderRadius:8, display:"flex",
          alignItems:"center", justifyContent:"center", flexShrink:0,
          background:`${accentColor}15`, fontSize:14 }}>
          {typeMeta?.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:accentColor, fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:1, textTransform:"uppercase", marginBottom:2 }}>
            {typeMeta?.label}
          </div>
          <div style={{ fontSize:13, color:T.t1, whiteSpace:"nowrap",
            overflow:"hidden", textOverflow:"ellipsis" }}>
            {q.text || <span style={{ color:T.t4 }}>Sin texto...</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={index===0}
            style={{ background:"none", border:"none", color:index===0?T.t4:T.t3,
              cursor:index===0?"default":"pointer", fontSize:14, padding:"2px 6px" }}>↑</button>
          <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={index===total-1}
            style={{ background:"none", border:"none", color:index===total-1?T.t4:T.t3,
              cursor:index===total-1?"default":"pointer", fontSize:14, padding:"2px 6px" }}>↓</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}}
            style={{ background:"none", border:`1px solid ${T.red}30`,
              borderRadius:6, color:T.red, cursor:"pointer",
              fontSize:11, padding:"3px 8px", opacity:.7 }}>✕</button>
          <div style={{ color:T.t3, fontSize:16, padding:"2px 4px" }}>
            {expanded?"▲":"▼"}
          </div>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding:"0 14px 16px", borderTop:`1px solid ${T.b1}` }}>
          {/* Question text */}
          <div style={{ marginTop:14, marginBottom:12 }}>
            <label style={{ fontSize:10, color:T.t3, display:"block", marginBottom:5,
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:1.5,
              textTransform:"uppercase" }}>Pregunta *</label>
            <textarea value={q.text} onChange={e=>updateText(e.target.value)}
              placeholder="Escribe la pregunta..."
              rows={2}
              style={{ width:"100%", background:T.s1, border:`1px solid ${T.b2}`,
                borderRadius:8, padding:"8px 12px", color:T.t1, fontSize:13,
                resize:"vertical", outline:"none",
                fontFamily:"'Instrument Sans',sans-serif", boxSizing:"border-box" }}/>
          </div>

          {/* Type-specific config */}
          {(type=>{ switch(type) {
            case "likert": return (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:4,
                    fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                    Etiqueta mínimo</label>
                  <input value={cfg.min_label||""} onChange={e=>updateCfg({min_label:e.target.value})}
                    style={{ width:"100%",background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                      padding:"7px 10px",color:T.t1,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:4,
                    fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                    Etiqueta máximo</label>
                  <input value={cfg.max_label||""} onChange={e=>updateCfg({max_label:e.target.value})}
                    style={{ width:"100%",background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                      padding:"7px 10px",color:T.t1,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
                </div>
              </div>
            );
            case "multiple_single":
            case "multiple_multi": return (
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:6,
                  fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                  Opciones</label>
                {(cfg.options||[]).map((opt,i)=>(
                  <div key={i} style={{ display:"flex",gap:6,marginBottom:6 }}>
                    <input value={opt} onChange={e=>updateOption("options",i,e.target.value)}
                      style={{ flex:1,background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                        padding:"7px 10px",color:T.t1,fontSize:12,outline:"none" }}/>
                    <button onClick={()=>removeOption("options",i)}
                      style={{ background:"none",border:`1px solid ${T.red}25`,borderRadius:6,
                        color:T.red,cursor:"pointer",fontSize:11,padding:"4px 8px",opacity:.7 }}>✕</button>
                  </div>
                ))}
                <button onClick={()=>addOption("options")}
                  style={{ background:"none",border:`1px dashed ${T.b3}`,borderRadius:7,
                    color:T.t3,cursor:"pointer",fontSize:12,padding:"6px 14px",width:"100%",
                    fontFamily:"'Instrument Sans',sans-serif" }}>
                  + Agregar opción
                </button>
              </div>
            );
            case "text": return (
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:4,
                  fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                  Placeholder</label>
                <input value={cfg.placeholder||""} onChange={e=>updateCfg({placeholder:e.target.value})}
                  style={{ width:"100%",background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                    padding:"7px 10px",color:T.t1,fontSize:12,outline:"none",boxSizing:"border-box" }}/>
              </div>
            );
            case "matrix": return (
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div>
                    <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:6,
                      fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                      Filas (ítems)</label>
                    {(cfg.rows||[]).map((r,i)=>(
                      <div key={i} style={{ display:"flex",gap:6,marginBottom:5 }}>
                        <input value={r} onChange={e=>updateOption("rows",i,e.target.value)}
                          style={{ flex:1,background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                            padding:"6px 9px",color:T.t1,fontSize:12,outline:"none" }}/>
                        <button onClick={()=>removeOption("rows",i)}
                          style={{ background:"none",border:`1px solid ${T.red}25`,borderRadius:5,
                            color:T.red,cursor:"pointer",fontSize:10,padding:"3px 7px",opacity:.7 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={()=>addOption("rows")}
                      style={{ background:"none",border:`1px dashed ${T.b3}`,borderRadius:6,
                        color:T.t3,cursor:"pointer",fontSize:11,padding:"5px 12px",width:"100%",
                        fontFamily:"'Instrument Sans',sans-serif" }}>+ Fila</button>
                  </div>
                  <div>
                    <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:6,
                      fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                      Columnas (escala)</label>
                    {(cfg.cols||[]).map((c,i)=>(
                      <div key={i} style={{ display:"flex",gap:6,marginBottom:5 }}>
                        <input value={c} onChange={e=>updateOption("cols",i,e.target.value)}
                          style={{ flex:1,background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                            padding:"6px 9px",color:T.t1,fontSize:12,outline:"none" }}/>
                        <button onClick={()=>removeOption("cols",i)}
                          style={{ background:"none",border:`1px solid ${T.red}25`,borderRadius:5,
                            color:T.red,cursor:"pointer",fontSize:10,padding:"3px 7px",opacity:.7 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={()=>addOption("cols")}
                      style={{ background:"none",border:`1px dashed ${T.b3}`,borderRadius:6,
                        color:T.t3,cursor:"pointer",fontSize:11,padding:"5px 12px",width:"100%",
                        fontFamily:"'Instrument Sans',sans-serif" }}>+ Columna</button>
                  </div>
                </div>
              </div>
            );
            case "ranking": return (
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10,color:T.t3,display:"block",marginBottom:6,
                  fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                  Elementos a ordenar</label>
                {(cfg.items||[]).map((item,i)=>(
                  <div key={i} style={{ display:"flex",gap:6,marginBottom:5 }}>
                    <input value={item} onChange={e=>updateOption("items",i,e.target.value)}
                      style={{ flex:1,background:T.s1,border:`1px solid ${T.b2}`,borderRadius:7,
                        padding:"6px 9px",color:T.t1,fontSize:12,outline:"none" }}/>
                    <button onClick={()=>removeOption("items",i)}
                      style={{ background:"none",border:`1px solid ${T.red}25`,borderRadius:5,
                        color:T.red,cursor:"pointer",fontSize:10,padding:"3px 7px",opacity:.7 }}>✕</button>
                  </div>
                ))}
                <button onClick={()=>addOption("items")}
                  style={{ background:"none",border:`1px dashed ${T.b3}`,borderRadius:6,
                    color:T.t3,cursor:"pointer",fontSize:11,padding:"5px 12px",width:"100%",
                    fontFamily:"'Instrument Sans',sans-serif" }}>+ Elemento</button>
              </div>
            );
            default: return null;
          }})(q.type)}

          {/* Required toggle */}
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <input type="checkbox" checked={q.required}
              onChange={e=>onChange({...q,required:e.target.checked})}
              style={{ accentColor, width:14,height:14 }}/>
            <span style={{ fontSize:12,color:T.t3 }}>Respuesta obligatoria</span>
          </div>

          {/* Preview */}
          <div style={{ marginTop:14,padding:"12px 14px",background:T.s1,
            borderRadius:9,border:`1px solid ${T.b1}` }}>
            <div style={{ fontSize:9,color:T.t4,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:1.5,textTransform:"uppercase",marginBottom:8 }}>Vista previa</div>
            <QuestionPreview q={q}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main FormBuilder ──────────────────────────────────────────
export default function FormBuilder({ projectId, moduleKey, supabase, accentColor, onClose, onSaved }) {
  const [step,        setStep]        = useState("meta"); // meta | build | preview
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [expiresAt,   setExpiresAt]   = useState("");
  const [questions,   setQuestions]   = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [dragIdx,     setDragIdx]     = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  function addQuestion(type) {
    const q = { _id:genId(), type, text:"", required:true,
      order_index:questions.length, config_json:defaultConfig(type) };
    setQuestions(p=>[...p,q]);
  }

  function updateQuestion(id, updated) {
    setQuestions(p=>p.map(q=>q._id===id?{...updated,_id:id}:q));
  }

  function deleteQuestion(id) {
    setQuestions(p=>p.filter(q=>q._id!==id));
  }

  function moveQuestion(idx, dir) {
    const arr=[...questions];
    const target=idx+dir;
    if(target<0||target>=arr.length) return;
    [arr[idx],arr[target]]=[arr[target],arr[idx]];
    setQuestions(arr);
  }

  // Drag handlers
  function handleDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed="move";
  }
  function handleDragOver(e, idx) {
    e.preventDefault();
    setDragOverIdx(idx);
  }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx===null||dragIdx===idx) { setDragIdx(null);setDragOverIdx(null);return; }
    const arr=[...questions];
    const [moved]=arr.splice(dragIdx,1);
    arr.splice(idx,0,moved);
    setQuestions(arr);
    setDragIdx(null); setDragOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null);setDragOverIdx(null); }

  async function handleSave(status="draft") {
    if (!title.trim()||!supabase) return;
    setSaving(true);
    try {
      // 1. Create form template
      const { data:form, error:fErr } = await supabase
        .from("form_templates").insert({
          project_id:   projectId,
          module_key:   moduleKey,
          title:        title.trim(),
          description:  description.trim()||null,
          target_group: targetGroup.trim()||null,
          status,
          expires_at:   expiresAt ? expiresAt+"T23:59:00" : null,
        }).select().single();
      if (fErr) throw fErr;

      // 2. Insert questions
      if (questions.length) {
        const rows = questions.map((q,i)=>({
          form_id:      form.id,
          order_index:  i,
          type:         q.type,
          text:         q.text,
          required:     q.required,
          config_json:  q.config_json,
        }));
        const { error:qErr } = await supabase.from("form_questions").insert(rows);
        if (qErr) throw qErr;
      }

      onSaved?.(form);
      onClose?.();
    } catch(e) {
      alert("Error al guardar: "+e.message);
    } finally {
      setSaving(false);
    }
  }

  const CSS = `* { box-sizing:border-box; }
    textarea,input,select { font-family:'Instrument Sans',sans-serif; }
    input:focus,textarea:focus { border-color: ${accentColor} !important; }`;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",
      display:"flex",alignItems:"flex-start",justifyContent:"center",
      zIndex:600,padding:"24px 16px",overflowY:"auto" }}>
      <style>{CSS}</style>
      <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:16,
        width:"100%",maxWidth:720,boxShadow:"0 32px 80px rgba(0,0,0,.8)",marginBottom:24 }}>

        {/* Header */}
        <div style={{ padding:"18px 24px",borderBottom:`1px solid ${T.b1}`,
          display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif",fontSize:18,color:T.t1 }}>
              Nuevo formulario
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              color:T.t3,letterSpacing:2,textTransform:"uppercase",marginTop:2 }}>
              {moduleKey.toUpperCase()} · {questions.length} preguntas
            </div>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            {/* Step indicators */}
            {["meta","build","preview"].map((s,i)=>(
              <div key={s} onClick={()=>s!=="preview"&&setStep(s)}
                style={{ width:8,height:8,borderRadius:"50%",
                  background:step===s?accentColor:T.b3,
                  cursor:s!=="preview"?"pointer":"default",
                  transition:"background .2s" }}/>
            ))}
            <button onClick={onClose} style={{ background:"none",border:"none",
              color:T.t3,cursor:"pointer",fontSize:18,marginLeft:8,padding:"2px 6px" }}>✕</button>
          </div>
        </div>

        {/* Step 1: Meta */}
        {step==="meta" && (
          <div style={{ padding:"24px" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
              letterSpacing:2,textTransform:"uppercase",marginBottom:16 }}>
              1 · Información general
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ fontSize:11,color:T.t3,display:"block",marginBottom:5,
                  fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                  Título *</label>
                <input value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder="Ej. Encuesta de satisfacción Q2 2025"
                  style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                    borderRadius:9,padding:"10px 14px",color:T.t1,fontSize:14,outline:"none" }}/>
              </div>
              <div>
                <label style={{ fontSize:11,color:T.t3,display:"block",marginBottom:5,
                  fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                  Instrucciones para el encuestado</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)}
                  placeholder="Describe el objetivo y cómo responder..."
                  rows={3}
                  style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                    borderRadius:9,padding:"10px 14px",color:T.t1,fontSize:13,
                    resize:"vertical",outline:"none" }}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={{ fontSize:11,color:T.t3,display:"block",marginBottom:5,
                    fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                    Grupo objetivo</label>
                  <input value={targetGroup} onChange={e=>setTargetGroup(e.target.value)}
                    placeholder="Ej. Comunidad, Trabajadores, Líderes"
                    style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                      borderRadius:9,padding:"10px 14px",color:T.t1,fontSize:13,outline:"none" }}/>
                </div>
                <div>
                  <label style={{ fontSize:11,color:T.t3,display:"block",marginBottom:5,
                    fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,textTransform:"uppercase" }}>
                    Fecha de cierre (opcional)</label>
                  <input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}
                    style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                      borderRadius:9,padding:"10px 14px",color:T.t1,fontSize:13,outline:"none" }}/>
                </div>
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"flex-end",marginTop:20 }}>
              <button onClick={()=>setStep("build")} disabled={!title.trim()}
                style={{ padding:"10px 24px",background:title.trim()?accentColor:T.b2,
                  border:"none",borderRadius:9,color:title.trim()?"#08090c":T.t4,
                  cursor:title.trim()?"pointer":"not-allowed",fontSize:14,fontWeight:600,
                  fontFamily:"'Instrument Sans',sans-serif" }}>
                Siguiente: Preguntas →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Build */}
        {step==="build" && (
          <div style={{ padding:"24px" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
              letterSpacing:2,textTransform:"uppercase",marginBottom:16 }}>
              2 · Constructor de preguntas
            </div>

            {/* Add question palette */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12,color:T.t3,marginBottom:10 }}>
                Haz clic en un tipo para agregar:
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {QUESTION_TYPES.map(qt=>(
                  <button key={qt.type} onClick={()=>addQuestion(qt.type)}
                    style={{ display:"flex",alignItems:"center",gap:6,
                      padding:"7px 12px",background:T.s2,
                      border:`1px solid ${T.b2}`,borderRadius:8,
                      color:T.t2,cursor:"pointer",fontSize:12,
                      fontFamily:"'Instrument Sans',sans-serif",transition:"all .15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=`${accentColor}50`;e.currentTarget.style.color=T.t1}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.b2;e.currentTarget.style.color=T.t2}}>
                    <span>{qt.icon}</span>
                    <span>{qt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions list */}
            {questions.length===0 ? (
              <div style={{ textAlign:"center",padding:"40px 0",
                background:T.s2,borderRadius:12,border:`2px dashed ${T.b2}` }}>
                <div style={{ fontSize:28,marginBottom:8 }}>📋</div>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,
                  color:T.t1,marginBottom:4 }}>Sin preguntas aún</div>
                <div style={{ fontSize:12,color:T.t3 }}>
                  Haz clic en cualquier tipo de pregunta para comenzar.
                </div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {questions.map((q,idx)=>(
                  <div key={q._id}
                    draggable
                    onDragStart={e=>handleDragStart(e,idx)}
                    onDragOver={e=>handleDragOver(e,idx)}
                    onDrop={e=>handleDrop(e,idx)}
                    onDragEnd={handleDragEnd}
                    style={{ opacity:dragIdx===idx?.5:1,
                      outline:dragOverIdx===idx&&dragIdx!==idx?`2px solid ${accentColor}`:
                        "2px solid transparent",
                      borderRadius:12,transition:"outline .1s" }}>
                    <QuestionEditor
                      q={q} index={idx} total={questions.length}
                      accentColor={accentColor}
                      onChange={updated=>updateQuestion(q._id,updated)}
                      onDelete={()=>deleteQuestion(q._id)}
                      onMoveUp={()=>moveQuestion(idx,-1)}
                      onMoveDown={()=>moveQuestion(idx,1)}
                      dragHandleProps={{
                        draggable:false,
                        style:{ cursor:"grab" }
                      }}/>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex",gap:10,justifyContent:"space-between",marginTop:20 }}>
              <button onClick={()=>setStep("meta")}
                style={{ padding:"9px 18px",background:"none",
                  border:`1px solid ${T.b2}`,borderRadius:9,color:T.t2,
                  cursor:"pointer",fontSize:13,fontFamily:"'Instrument Sans',sans-serif" }}>
                ← Volver
              </button>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>handleSave("draft")} disabled={saving||!questions.length}
                  style={{ padding:"9px 18px",background:"none",
                    border:`1px solid ${T.b2}`,borderRadius:9,color:T.t2,
                    cursor:questions.length?"pointer":"not-allowed",
                    fontSize:13,fontFamily:"'Instrument Sans',sans-serif" }}>
                  Guardar borrador
                </button>
                <button onClick={()=>handleSave("active")}
                  disabled={saving||!questions.length||!title.trim()}
                  style={{ padding:"9px 22px",
                    background:questions.length&&title.trim()?accentColor:T.b2,
                    border:"none",borderRadius:9,
                    color:questions.length&&title.trim()?"#08090c":T.t4,
                    cursor:questions.length&&title.trim()?"pointer":"not-allowed",
                    fontSize:13,fontWeight:600,fontFamily:"'Instrument Sans',sans-serif" }}>
                  {saving?"Guardando…":"✓ Publicar formulario"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
