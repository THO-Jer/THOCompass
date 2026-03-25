// FormResults.jsx — Dashboard de análisis de respuestas
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const T = {
  s1:"#0d0f14", s2:"#111520", b1:"#1d2535", b2:"#232d42",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", blue:"#3b82f6",
};

function avg(arr) { return arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : null; }
function median(arr) {
  if(!arr.length) return null;
  const s=[...arr].sort((a,b)=>a-b);
  const m=Math.floor(s.length/2);
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
}
function freq(arr, opts) {
  const counts={};
  opts.forEach(o=>counts[o]=0);
  arr.forEach(v=>{ if(counts[v]!==undefined) counts[v]++; });
  return opts.map(o=>({ name:o, count:counts[o],
    pct:arr.length?Math.round(counts[o]/arr.length*100):0 }));
}
function npsScore(vals) {
  if(!vals.length) return null;
  const prom=vals.filter(v=>v>=9).length/vals.length*100;
  const det=vals.filter(v=>v<=6).length/vals.length*100;
  return Math.round(prom-det);
}

function StatBox({ label, value, color="#e8ecf4", sub }) {
  return (
    <div style={{ padding:"14px 16px",background:T.s2,borderRadius:10,
      border:`1px solid ${T.b1}`,textAlign:"center" }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:24,
        fontWeight:700,color,marginBottom:2 }}>{value??"-"}</div>
      <div style={{ fontSize:11,color:T.t3,textTransform:"uppercase",
        fontFamily:"'JetBrains Mono',monospace",letterSpacing:1 }}>{label}</div>
      {sub&&<div style={{ fontSize:10,color:T.t4,marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function LikertChart({ answers, q, color }) {
  const cfg = q.config_json||{};
  const min=cfg.scale_min||1, max=cfg.scale_max||5;
  const steps=Array.from({length:max-min+1},(_,i)=>min+i);
  const counts=freq(answers,steps.map(String));
  const vals=answers.map(Number).filter(v=>!isNaN(v));
  const mean=avg(vals);

  return (
    <div>
      <div style={{ display:"flex",gap:10,marginBottom:14 }}>
        <StatBox label="Promedio" value={mean?mean.toFixed(1):"-"} color={color}/>
        <StatBox label="Mediana" value={median(vals)??"-"} color={T.t1}/>
        <StatBox label="Respuestas" value={vals.length} color={T.t1}/>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={steps.map(s=>({
          name:String(s),
          count:answers.filter(a=>Number(a)===s).length
        }))} barSize={32}>
          <XAxis dataKey="name" tick={{fill:T.t3,fontSize:11}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:T.t3,fontSize:10}} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12}}/>
          <Bar dataKey="count" radius={[5,5,0,0]}>
            {steps.map((s,i)=>(
              <Cell key={i} fill={mean&&Math.round(mean)===s?color:`${color}40`}/>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function NPSChart({ answers, color }) {
  const vals=answers.map(Number).filter(v=>!isNaN(v));
  const score=npsScore(vals);
  const promoters=vals.filter(v=>v>=9).length;
  const passives=vals.filter(v=>v>=7&&v<=8).length;
  const detractors=vals.filter(v=>v<=6).length;
  const npsColor=score===null?T.t3:score>=50?T.green:score>=0?T.amber:T.red;
  return (
    <div>
      <div style={{ display:"flex",gap:10,marginBottom:14 }}>
        <StatBox label="NPS" value={score??"-"} color={npsColor}
          sub={score===null?null:score>=50?"Excelente":score>=0?"Aceptable":"Crítico"}/>
        <StatBox label="Promotores" value={promoters} color={T.green}
          sub={vals.length?`${Math.round(promoters/vals.length*100)}%`:"-"}/>
        <StatBox label="Pasivos" value={passives} color={T.amber}
          sub={vals.length?`${Math.round(passives/vals.length*100)}%`:"-"}/>
        <StatBox label="Detractores" value={detractors} color={T.red}
          sub={vals.length?`${Math.round(detractors/vals.length*100)}%`:"-"}/>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={[0,1,2,3,4,5,6,7,8,9,10].map(v=>({
          name:String(v), count:vals.filter(a=>a===v).length
        }))} barSize={22}>
          <XAxis dataKey="name" tick={{fill:T.t3,fontSize:10}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:T.t3,fontSize:9}} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12}}/>
          <Bar dataKey="count" radius={[4,4,0,0]}>
            {[0,1,2,3,4,5,6,7,8,9,10].map((v,i)=>(
              <Cell key={i} fill={v<=6?T.red:v<=8?T.amber:T.green}/>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MultiChart({ answers, q, color }) {
  const opts=q.config_json?.options||[];
  const flat=answers.flatMap(a=>Array.isArray(a)?a:[a]).filter(Boolean);
  const data=freq(flat,opts);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120,opts.length*40)}>
      <BarChart data={data} layout="vertical" barSize={20}>
        <XAxis type="number" tick={{fill:T.t3,fontSize:10}} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="name" width={140}
          tick={{fill:T.t2,fontSize:12}} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={{background:T.s2,border:`1px solid ${T.b2}`,borderRadius:8,fontSize:12}}
          formatter={(v,n,p)=>[`${v} (${p.payload.pct}%)`, "Respuestas"]}/>
        <Bar dataKey="count" fill={color} radius={[0,5,5,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TextAnswers({ answers }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:300,overflowY:"auto" }}>
      {answers.filter(Boolean).map((txt,i)=>(
        <div key={i} style={{ padding:"10px 14px",background:T.s2,
          borderRadius:9,border:`1px solid ${T.b1}`,
          fontSize:13,color:T.t2,lineHeight:1.6,fontStyle:"italic" }}>
          "{txt}"
        </div>
      ))}
      {!answers.filter(Boolean).length&&(
        <div style={{ color:T.t4,fontSize:13,textAlign:"center",padding:"16px 0" }}>
          Sin respuestas de texto aún.
        </div>
      )}
    </div>
  );
}

function MatrixChart({ answers, q, color }) {
  const cfg=q.config_json||{};
  const rows=cfg.rows||[], cols=cfg.cols||[];
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
        <thead>
          <tr>
            <th style={{ padding:"8px 12px",textAlign:"left",color:T.t3,fontWeight:400 }}></th>
            {cols.map((col,j)=>(
              <th key={j} style={{ padding:"8px 10px",color:T.t2,fontWeight:500,textAlign:"center" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>{
            const rowAnswers=answers.map(a=>a?.[row]).filter(Boolean);
            return (
              <tr key={i} style={{ borderTop:`1px solid ${T.b1}` }}>
                <td style={{ padding:"10px 12px",color:T.t2 }}>{row}</td>
                {cols.map((col,j)=>{
                  const cnt=rowAnswers.filter(v=>v===col).length;
                  const pct=rowAnswers.length?Math.round(cnt/rowAnswers.length*100):0;
                  return (
                    <td key={j} style={{ padding:"10px",textAlign:"center" }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",
                        fontSize:13,color:pct>50?color:T.t3,fontWeight:pct>50?700:400 }}>
                        {pct}%
                      </div>
                      <div style={{ fontSize:9,color:T.t4 }}>{cnt}</div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankingChart({ answers, q, color }) {
  const items=q.config_json?.items||[];
  const scores={};
  items.forEach(item=>{scores[item]=0;});
  answers.forEach(ranking=>{
    if(!Array.isArray(ranking)) return;
    ranking.forEach((item,i)=>{
      if(scores[item]!==undefined) scores[item]+=(ranking.length-i);
    });
  });
  const sorted=items.map(item=>({name:item,score:scores[item]}))
    .sort((a,b)=>b.score-a.score);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
      {sorted.map((item,i)=>(
        <div key={item.name} style={{ display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",
            fontSize:16,fontWeight:700,color:i===0?color:T.t3,width:24 }}>{i+1}</span>
          <span style={{ flex:1,fontSize:13,color:T.t2 }}>{item.name}</span>
          <div style={{ width:120,height:8,background:T.b2,borderRadius:4,overflow:"hidden" }}>
            <div style={{ height:"100%",background:i===0?color:`${color}50`,borderRadius:4,
              width:`${sorted[0].score?Math.round(item.score/sorted[0].score*100):0}%` }}/>
          </div>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
            color:T.t3,width:40,textAlign:"right" }}>{item.score}pts</span>
        </div>
      ))}
    </div>
  );
}

export default function FormResults({ form, supabase, accentColor, onAnalyzeAI }) {
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers,   setAnswers]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    if(!supabase||!form?.id) return;
    load();
  },[form?.id]);

  async function load() {
    setLoading(true);
    const [qRes, rRes] = await Promise.all([
      supabase.from("form_questions").select("*").eq("form_id",form.id).order("order_index"),
      supabase.from("form_responses").select("*, form_answers(*)").eq("form_id",form.id)
        .not("submitted_at","is",null).order("submitted_at",{ascending:false}),
    ]);
    setQuestions(qRes.data||[]);
    setResponses(rRes.data||[]);
    setAnswers((rRes.data||[]).flatMap(r=>r.form_answers||[]));
    setLoading(false);
  }

  function getAnswersForQuestion(qId) {
    return answers.filter(a=>a.question_id===qId).map(a=>
      a.value_integer??a.value_text??a.value_json
    );
  }

  if(loading) return (
    <div style={{ textAlign:"center",padding:"24px 0",color:T.t3,
      fontSize:13,fontFamily:"'JetBrains Mono',monospace" }}>Cargando resultados…</div>
  );

  if(!responses.length) return (
    <div style={{ textAlign:"center",padding:"36px 0",
      background:T.s2,borderRadius:12,border:`1px dashed ${T.b2}` }}>
      <div style={{ fontSize:28,marginBottom:8 }}>📭</div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:4 }}>
        Sin respuestas aún
      </div>
      <div style={{ fontSize:12,color:T.t3 }}>
        Las respuestas aparecerán aquí cuando los encuestados completen el formulario.
      </div>
    </div>
  );

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display:"flex",gap:10,marginBottom:20,flexWrap:"wrap" }}>
        <StatBox label="Respuestas" value={responses.length} color={accentColor}/>
        <StatBox label="Preguntas" value={questions.length} color={T.t1}/>
        <StatBox label="Completadas" value={responses.filter(r=>r.is_complete).length} color={T.green}/>
        {responses[0]?.submitted_at&&(
          <StatBox label="Última resp." color={T.t1}
            value={new Date(responses[0].submitted_at).toLocaleDateString("es-CL",{day:"numeric",month:"short"})}/>
        )}
      </div>

      {/* Analyze with AI button */}
      {onAnalyzeAI&&(
        <button onClick={()=>onAnalyzeAI(questions,responses,answers)}
          style={{ width:"100%",padding:"10px 16px",marginBottom:20,
            background:`${accentColor}15`,border:`1px solid ${accentColor}35`,
            borderRadius:9,color:accentColor,cursor:"pointer",fontSize:13,
            fontFamily:"'Instrument Sans',sans-serif",fontWeight:600 }}>
          🤖 Analizar con IA → proponer scores y compromisos
        </button>
      )}

      {/* Per-question results */}
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        {questions.map((q,i)=>{
          const qAnswers=getAnswersForQuestion(q.id);
          const typeMeta={
            likert:"⭐ Escala Likert", nps:"📊 NPS",
            multiple_single:"◉ Opción única", multiple_multi:"☑ Opción múltiple",
            text:"✏️ Texto libre", matrix:"⊞ Matriz", ranking:"🏆 Ranking"
          }[q.type]||q.type;
          return (
            <div key={q.id} style={{ padding:"18px 20px",background:T.s2,
              borderRadius:12,border:`1px solid ${T.b1}` }}>
              <div style={{ display:"flex",alignItems:"flex-start",
                justifyContent:"space-between",gap:10,marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:10,color:accentColor,fontFamily:"'JetBrains Mono',monospace",
                    letterSpacing:1.5,textTransform:"uppercase",marginBottom:4 }}>
                    {i+1}. {typeMeta}
                  </div>
                  <div style={{ fontSize:14,color:T.t1,fontWeight:500,lineHeight:1.5 }}>{q.text}</div>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                  color:T.t3,flexShrink:0 }}>{qAnswers.filter(a=>a!=null).length} resp.</span>
              </div>
              {q.type==="likert"          && <LikertChart answers={qAnswers.filter(a=>a!=null)} q={q} color={accentColor}/>}
              {q.type==="nps"             && <NPSChart answers={qAnswers.filter(a=>a!=null)} color={accentColor}/>}
              {(q.type==="multiple_single"||q.type==="multiple_multi") && <MultiChart answers={qAnswers.filter(a=>a!=null)} q={q} color={accentColor}/>}
              {q.type==="text"            && <TextAnswers answers={qAnswers}/>}
              {q.type==="matrix"          && <MatrixChart answers={qAnswers.filter(a=>a!=null)} q={q} color={accentColor}/>}
              {q.type==="ranking"         && <RankingChart answers={qAnswers.filter(a=>Array.isArray(a))} q={q} color={accentColor}/>}
            </div>
          );
        })}
      </div>

      {/* Respondents list */}
      <div style={{ marginTop:20 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3,
          letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>
          Respondentes ({responses.length})
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto" }}>
          {responses.map(r=>(
            <div key={r.id} style={{ display:"flex",alignItems:"center",gap:12,
              padding:"8px 12px",background:T.s1,borderRadius:8,border:`1px solid ${T.b1}` }}>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:12,color:T.t1 }}>{r.respondent_name||"Anónimo"}</span>
                {r.respondent_role&&<span style={{ color:T.t3,marginLeft:8,fontSize:11 }}>· {r.respondent_role}</span>}
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.t3 }}>
                {new Date(r.submitted_at).toLocaleDateString("es-CL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
