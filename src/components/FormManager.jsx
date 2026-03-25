// FormManager.jsx — Gestión de formularios por módulo
// Reemplaza SurveyManager con soporte completo de tipos de pregunta
import { useState, useEffect } from "react";
import FormBuilder from "./FormBuilder.jsx";
import FormResults from "./FormResults.jsx";

const T = {
  s1:"#0d0f14", s2:"#111520", b1:"#1d2535", b2:"#232d42",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", blue:"#3b82f6",
};

const STATUS_META = {
  draft:  { label:"Borrador",  color:T.t3,    bg:`${T.t3}12`    },
  active: { label:"Activo",    color:T.green, bg:`${T.green}12` },
  closed: { label:"Cerrado",   color:T.amber, bg:`${T.amber}12` },
};

export default function FormManager({ projectId, moduleKey, supabase, accentColor, onApplyScores }) {
  const [forms,      setForms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [building,   setBuilding]   = useState(false);
  const [viewForm,   setViewForm]   = useState(null); // form to view results
  const [copied,     setCopied]     = useState(null);

  const BASE = window.location.origin;

  useEffect(()=>{
    if(!supabase||!projectId) return;
    load();
  },[supabase,projectId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("form_templates").select("id,title,status,token,target_group,expires_at,created_at")
      .eq("project_id",projectId).eq("module_key",moduleKey)
      .order("created_at",{ascending:false});
    // Get response counts
    if(data?.length) {
      const counts = await Promise.all(data.map(f=>
        supabase.from("form_responses").select("id",{count:"exact",head:true})
          .eq("form_id",f.id).not("submitted_at","is",null)
      ));
      setForms(data.map((f,i)=>({...f,response_count:counts[i].count||0})));
    } else { setForms([]); }
    setLoading(false);
  }

  async function toggleStatus(form) {
    const next = form.status==="active" ? "closed" : "active";
    await supabase.from("form_templates").update({status:next,updated_at:new Date().toISOString()}).eq("id",form.id);
    setForms(p=>p.map(f=>f.id===form.id?{...f,status:next}:f));
  }

  async function deleteForm(id) {
    if(!window.confirm("¿Eliminar este formulario y todas sus respuestas?")) return;
    await supabase.from("form_templates").delete().eq("id",id);
    setForms(p=>p.filter(f=>f.id!==id));
    if(viewForm?.id===id) setViewForm(null);
  }

  function copyLink(token) {
    navigator.clipboard.writeText(`${BASE}/#/form/${token}`);
    setCopied(token); setTimeout(()=>setCopied(null),2000);
  }

  async function handleAnalyzeAI(questions, responses, answers) {
    if(!questions.length||!responses.length) return;
    // Build text representation of answers for IA
    const textAnswers = questions.map(q=>{
      const qAnswers = answers.filter(a=>a.question_id===q.id);
      const vals = qAnswers.map(a=>a.value_integer??a.value_text??JSON.stringify(a.value_json)).filter(v=>v!=null);
      return `### ${q.text}\n${vals.join("\n")}`;
    }).join("\n\n");

    // Call existing analyze endpoint
    const endpoint = { rc:"analyze-rc", do:"analyze-do", esg:"analyze-esg" }[moduleKey];
    if(!endpoint) return;
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          fileContents:[{ name:`Formulario: ${viewForm?.title}`, content:textAnswers }],
          projectName: viewForm?.title,
          currentScores:{},
          projectContext:{},
        }),
      });
      if(!res.ok) throw new Error(await res.text());
      const result = await res.json();
      onApplyScores?.(result, viewForm?.title);
    } catch(e) { alert("Error al analizar: "+e.message); }
  }

  if(loading) return (
    <div style={{ textAlign:"center",padding:"24px 0",color:T.t3,
      fontSize:13,fontFamily:"'JetBrains Mono',monospace" }}>Cargando formularios…</div>
  );

  return (
    <div>
      {building && (
        <FormBuilder
          projectId={projectId} moduleKey={moduleKey}
          supabase={supabase} accentColor={accentColor}
          onClose={()=>setBuilding(false)}
          onSaved={()=>{ setBuilding(false); load(); }}/>
      )}

      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",
        justifyContent:"space-between",gap:16,marginBottom:18 }}>
        <div>
          <div style={{ fontSize:13,color:T.t2,marginBottom:2 }}>
            Crea formularios personalizados con distintos tipos de pregunta.
          </div>
          <div style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace" }}>
            Las respuestas se analizan automáticamente y pueden convertirse en scores.
          </div>
        </div>
        <button onClick={()=>setBuilding(true)} style={{
          padding:"8px 16px",background:accentColor,border:"none",borderRadius:8,
          color:"#08090c",fontSize:12,fontWeight:600,cursor:"pointer",
          fontFamily:"'Instrument Sans',sans-serif",whiteSpace:"nowrap",flexShrink:0 }}>
          + Nuevo formulario
        </button>
      </div>

      {/* Forms list */}
      {forms.length===0 && (
        <div style={{ textAlign:"center",padding:"36px 0",
          background:T.s2,borderRadius:12,border:`1px dashed ${T.b2}` }}>
          <div style={{ fontSize:28,marginBottom:8 }}>📋</div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:4 }}>
            Sin formularios aún
          </div>
          <div style={{ fontSize:12,color:T.t3 }}>
            Crea tu primer formulario para comenzar a recopilar datos.
          </div>
        </div>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {forms.map(form=>{
          const sm = STATUS_META[form.status]||STATUS_META.draft;
          const isViewing = viewForm?.id===form.id;
          return (
            <div key={form.id} style={{ background:T.s2,
              border:`1px solid ${form.status==="active"?`${accentColor}30`:T.b1}`,
              borderRadius:12,overflow:"hidden" }}>

              {/* Form header */}
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"'Playfair Display',serif",
                        fontSize:14,color:T.t1,fontWeight:600 }}>{form.title}</span>
                      <span style={{ padding:"2px 8px",borderRadius:20,fontSize:10,
                        fontFamily:"'JetBrains Mono',monospace",
                        background:sm.bg,color:sm.color }}>
                        ● {sm.label}
                      </span>
                    </div>
                    {form.target_group&&(
                      <div style={{ fontSize:11,color:T.t3,marginBottom:8 }}>👥 {form.target_group}</div>
                    )}

                    {/* Link */}
                    {form.status!=="draft"&&(
                      <div style={{ display:"flex",alignItems:"center",gap:8,
                        background:T.s1,borderRadius:7,padding:"6px 10px",
                        border:`1px solid ${T.b1}`,marginBottom:4 }}>
                        <span style={{ fontSize:11,color:T.t3,
                          fontFamily:"'JetBrains Mono',monospace",flex:1,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          {BASE}/#/form/{form.token}
                        </span>
                        <button onClick={()=>copyLink(form.token)}
                          style={{ background:"none",border:"none",cursor:"pointer",
                            color:copied===form.token?T.green:T.t3,fontSize:11,
                            fontFamily:"'JetBrains Mono',monospace",padding:"2px 6px",flexShrink:0 }}>
                          {copied===form.token?"✓ copiado":"copiar"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Response count */}
                  <div style={{ textAlign:"center",flexShrink:0,padding:"8px 14px",
                    background:T.s1,borderRadius:9,border:`1px solid ${T.b1}` }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,
                      color:form.response_count>0?accentColor:T.t3 }}>
                      {form.response_count}
                    </div>
                    <div style={{ fontSize:10,color:T.t4,
                      fontFamily:"'JetBrains Mono',monospace" }}>
                      {form.response_count===1?"respuesta":"respuestas"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex",gap:8,marginTop:10,flexWrap:"wrap" }}>
                  {form.response_count>0&&(
                    <button onClick={()=>setViewForm(isViewing?null:form)}
                      style={{ padding:"6px 12px",
                        background:isViewing?`${accentColor}25`:`${accentColor}12`,
                        border:`1px solid ${accentColor}35`,borderRadius:7,
                        color:accentColor,cursor:"pointer",fontSize:12,
                        fontFamily:"'Instrument Sans',sans-serif" }}>
                      {isViewing?"▲ Ocultar resultados":"▼ Ver resultados"}
                    </button>
                  )}
                  <button onClick={()=>toggleStatus(form)} style={{
                    padding:"6px 12px",background:"none",
                    border:`1px solid ${T.b2}`,borderRadius:7,
                    color:T.t3,cursor:"pointer",fontSize:12,
                    fontFamily:"'Instrument Sans',sans-serif" }}>
                    {form.status==="active"?"Cerrar":"Activar"}
                  </button>
                  <button onClick={()=>deleteForm(form.id)} style={{
                    padding:"6px 12px",background:"none",
                    border:`1px solid ${T.red}30`,borderRadius:7,
                    color:T.red,cursor:"pointer",fontSize:12,opacity:.7,
                    fontFamily:"'Instrument Sans',sans-serif" }}>
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Results panel */}
              {isViewing&&(
                <div style={{ borderTop:`1px solid ${T.b1}`,padding:"16px" }}>
                  <FormResults form={form} supabase={supabase} accentColor={accentColor}
                    onAnalyzeAI={(qs,rs,as)=>handleAnalyzeAI(qs,rs,as)}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
