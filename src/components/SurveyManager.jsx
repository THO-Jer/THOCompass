// SurveyManager.jsx
// Panel para que el consultor gestione links de encuesta y vea respuestas.
// Props: projectId, moduleKey, supabase, accentColor

import { useState, useEffect } from "react";

const T = {
  bg:"#050505", s1:"#0a0a0a", s2:"#111111", s3:"#1a1a1a",
  b1:"#1f1f1f", b2:"#2a2a2a", b3:"#363636",
  t1:"#f0ece4", t2:"#9a9080", t3:"#4a4540", t4:"#282420",
  rc:"#c8813a", do:"#8b6fa8", esg:"#4a8c6a",
  blue:"#5b7fa6", amber:"#b8860b", red:"#a84040", green:"#4a8c6a",
};

// Same mapping as BaselineInstrument for score calculation
const DIM_WEIGHTS = {
  rc:  { percepcion:30, compromisos:25, dialogo:25, conflictividad:20 },
  do:  { cultura:35, engagement:35, liderazgo:30 },
  esg: { ambiental:33, social:34, gobernanza:33 },
};

const DIM_QUESTIONS = {
  rc:  { percepcion:["p1","p2","p3"], compromisos:["c1","c2"], dialogo:["d1","d2"], conflictividad:["x1","x2"] },
  do:  { cultura:["cu1","cu2","cu3"], engagement:["en1","en2","en3"], liderazgo:["li1","li2","li3"] },
  esg: { ambiental:["am1","am2"], social:["so1","so2"], gobernanza:["go1","go2"] },
};

const INVERSE = { x1:true, x2:true };

function likertToScore(avg, inverse=false) {
  const mapped = {1:10, 2:30, 3:55, 4:75, 5:95};
  const floor=Math.floor(avg), ceil=Math.ceil(avg), frac=avg-floor;
  const s = floor===ceil ? mapped[floor] : mapped[floor]+(mapped[ceil]-mapped[floor])*frac;
  return inverse ? Math.round(100-s+10) : Math.round(s);
}

function computeScoresFromResponses(responses, moduleKey) {
  if (!responses.length) return null;
  const dimMap = DIM_QUESTIONS[moduleKey] || {};
  const weights = DIM_WEIGHTS[moduleKey] || {};
  const scores = {};

  Object.entries(dimMap).forEach(([dim, qIds]) => {
    const vals = responses.flatMap(r =>
      qIds.map(qId => r.answers_json?.[qId]).filter(v => v != null)
    );
    if (!vals.length) return;
    const avg = vals.reduce((s,v)=>s+v,0) / vals.length;
    const isInverse = qIds.some(q => INVERSE[q]);
    scores[dim] = likertToScore(avg, isInverse);
  });

  const overall = Math.round(
    Object.entries(weights).reduce((sum,[dim,w])=>
      scores[dim]!=null ? sum+(scores[dim]*w/100) : sum, 0)
  );

  return { ...scores, overall };
}

export default function SurveyManager({ projectId, moduleKey, supabase, accentColor, onApplyScores }) {
  const [links,      setLinks]     = useState([]);
  const [responses,  setResponses] = useState({});  // { linkId: [] }
  const [creating,   setCreating]  = useState(false);
  const [loading,    setLoading]   = useState(true);
  const [newTitle,   setNewTitle]  = useState("");
  const [newDesc,    setNewDesc]   = useState("");
  const [newGroup,   setNewGroup]  = useState("");
  const [newExpires, setNewExpires]= useState("");
  const [copied,     setCopied]    = useState(null);
  const [expanded,   setExpanded]  = useState(null);

  const BASE_URL = window.location.origin;

  useEffect(() => {
    if (!supabase || !projectId) return;
    load();
  }, [supabase, projectId]);

  async function load() {
    setLoading(true);
    const { data: linksData } = await supabase
      .from("survey_links")
      .select("*")
      .eq("project_id", projectId)
      .eq("module_key", moduleKey)
      .order("created_at", { ascending: false });

    setLinks(linksData || []);

    // Load responses for each link
    if (linksData?.length) {
      const { data: respData } = await supabase
        .from("survey_responses")
        .select("*")
        .in("survey_link_id", linksData.map(l=>l.id))
        .order("created_at", { ascending: false });

      const grouped = {};
      (respData || []).forEach(r => {
        if (!grouped[r.survey_link_id]) grouped[r.survey_link_id] = [];
        grouped[r.survey_link_id].push(r);
      });
      setResponses(grouped);
    }
    setLoading(false);
  }

  async function createLink() {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase.from("survey_links").insert({
      project_id:   projectId,
      module_key:   moduleKey,
      title:        newTitle.trim(),
      description:  newDesc.trim() || null,
      target_group: newGroup.trim() || null,
      expires_at:   newExpires || null,
      active:       true,
    }).select().single();

    if (error) { alert("Error: " + error.message); return; }
    setLinks(p => [data, ...p]);
    setCreating(false);
    setNewTitle(""); setNewDesc(""); setNewGroup(""); setNewExpires("");
  }

  async function toggleActive(link) {
    await supabase.from("survey_links")
      .update({ active: !link.active })
      .eq("id", link.id);
    setLinks(p => p.map(l => l.id===link.id ? {...l, active:!l.active} : l));
  }

  async function deleteLink(id) {
    if (!window.confirm("¿Eliminar este link y todas sus respuestas?")) return;
    await supabase.from("survey_links").delete().eq("id", id);
    setLinks(p => p.filter(l => l.id!==id));
  }

  function copyLink(token) {
    navigator.clipboard.writeText(`${BASE_URL}/#/survey/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const PLACEHOLDER_GROUP = {
    rc:  "Ej. Comunidad Villa El Bosque, Dirigentes territoriales",
    do:  "Ej. Todos los trabajadores, Solo jefaturas",
    esg: "Ej. Equipo de sostenibilidad, Alta dirección",
  }[moduleKey] || "";

  if (loading) return (
    <div style={{ textAlign:"center", padding:"24px 0", color:T.t3, fontSize:13,
      fontFamily:"'JetBrains Mono',monospace" }}>Cargando encuestas…</div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div>
          <div style={{ fontSize:13, color:T.t2, marginBottom:2 }}>
            Genera links para que stakeholders respondan directamente, sin necesidad de login.
          </div>
          <div style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace" }}>
            Los resultados se agregan automáticamente en scores.
          </div>
        </div>
        <button onClick={()=>setCreating(true)} style={{
          padding:"8px 16px", background:accentColor, border:"none",
          borderRadius:8, color:"#08090c", fontSize:12, fontWeight:600,
          cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif", whiteSpace:"nowrap",
          marginLeft:16 }}>
          + Nuevo link
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ padding:"20px", background:T.s2, borderRadius:12,
          border:`1px solid ${accentColor}30`, marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14,
            color:T.t1, marginBottom:16 }}>Nuevo link de encuesta</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:T.t3, display:"block", marginBottom:5,
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>
                Título *
              </label>
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                placeholder={`Ej. Encuesta ${moduleKey==="rc"?"comunidad":"equipo"} Q2 2025`}
                style={{ width:"100%", background:T.s1, border:`1px solid ${T.b2}`,
                  borderRadius:8, padding:"9px 12px", color:T.t1, fontSize:13,
                  fontFamily:"'Instrument Sans',sans-serif", boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, color:T.t3, display:"block", marginBottom:5,
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>
                Instrucciones para el encuestado
              </label>
              <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)}
                placeholder="Ej. Responde según tu experiencia en el último trimestre..."
                rows={3}
                style={{ width:"100%", background:T.s1, border:`1px solid ${T.b2}`,
                  borderRadius:8, padding:"9px 12px", color:T.t1, fontSize:13, resize:"vertical",
                  fontFamily:"'Instrument Sans',sans-serif", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={{ fontSize:11, color:T.t3, display:"block", marginBottom:5,
                  fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>
                  Grupo objetivo
                </label>
                <input value={newGroup} onChange={e=>setNewGroup(e.target.value)}
                  placeholder={PLACEHOLDER_GROUP}
                  style={{ width:"100%", background:T.s1, border:`1px solid ${T.b2}`,
                    borderRadius:8, padding:"9px 12px", color:T.t1, fontSize:13,
                    fontFamily:"'Instrument Sans',sans-serif", boxSizing:"border-box" }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:T.t3, display:"block", marginBottom:5,
                  fontFamily:"'JetBrains Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>
                  Fecha de cierre (opcional)
                </label>
                <input type="date" value={newExpires} onChange={e=>setNewExpires(e.target.value ? e.target.value+"T23:59:00" : "")}
                  style={{ width:"100%", background:T.s1, border:`1px solid ${T.b2}`,
                    borderRadius:8, padding:"9px 12px", color:T.t1, fontSize:13,
                    fontFamily:"'Instrument Sans',sans-serif", boxSizing:"border-box" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
              <button onClick={()=>setCreating(false)} style={{ padding:"8px 16px",
                background:"none", border:`1px solid ${T.b2}`, borderRadius:8,
                color:T.t2, cursor:"pointer", fontSize:13, fontFamily:"'Instrument Sans',sans-serif" }}>
                Cancelar
              </button>
              <button onClick={createLink} disabled={!newTitle.trim()} style={{
                padding:"8px 18px", background:newTitle.trim()?accentColor:T.b2,
                border:"none", borderRadius:8, color:newTitle.trim()?"#08090c":T.t4,
                cursor:newTitle.trim()?"pointer":"not-allowed", fontSize:13,
                fontWeight:600, fontFamily:"'Instrument Sans',sans-serif" }}>
                Crear link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 && !creating && (
        <div style={{ textAlign:"center", padding:"36px 0",
          background:T.s2, borderRadius:12, border:`1px dashed ${T.b2}` }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🔗</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14,
            color:T.t1, marginBottom:4 }}>Sin links creados</div>
          <div style={{ fontSize:12, color:T.t3 }}>
            Crea un link para compartir con stakeholders.
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {links.map(link => {
          const resps       = responses[link.id] || [];
          const scores      = computeScoresFromResponses(resps, moduleKey);
          const isExpanded  = expanded === link.id;

          return (
            <div key={link.id} style={{ background:T.s2,
              border:`1px solid ${link.active ? `${accentColor}30` : T.b1}`,
              borderRadius:12, overflow:"hidden" }}>

              {/* Link header */}
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontFamily:"'Playfair Display',serif",
                        fontSize:14, color:T.t1, fontWeight:600 }}>
                        {link.title}
                      </span>
                      <span style={{ padding:"2px 7px", borderRadius:20, fontSize:10,
                        fontFamily:"'JetBrains Mono',monospace",
                        background: link.active ? `${T.green}12` : `${T.t3}12`,
                        color:      link.active ? T.green : T.t3 }}>
                        {link.active ? "● activo" : "○ inactivo"}
                      </span>
                    </div>
                    {link.target_group && (
                      <div style={{ fontSize:11, color:T.t3, marginBottom:6 }}>
                        👥 {link.target_group}
                      </div>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:8,
                      background:T.s1, borderRadius:7, padding:"6px 10px",
                      border:`1px solid ${T.b1}` }}>
                      <span style={{ fontSize:11, color:T.t3, fontFamily:"'JetBrains Mono',monospace",
                        flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {BASE_URL}/#/survey/{link.token}
                      </span>
                      <button onClick={()=>copyLink(link.token)} style={{
                        background:"none", border:"none", cursor:"pointer",
                        color: copied===link.token ? T.green : T.t3,
                        fontSize:12, fontFamily:"'JetBrains Mono',monospace",
                        padding:"2px 6px", flexShrink:0 }}>
                        {copied===link.token ? "✓ copiado" : "copiar"}
                      </button>
                    </div>
                  </div>

                  {/* Response count */}
                  <div style={{ textAlign:"center", flexShrink:0, padding:"8px 14px",
                    background:T.s1, borderRadius:9, border:`1px solid ${T.b1}` }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22,
                      color:resps.length>0?accentColor:T.t3 }}>{resps.length}</div>
                    <div style={{ fontSize:10, color:T.t4, fontFamily:"'JetBrains Mono',monospace" }}>
                      {resps.length===1?"respuesta":"respuestas"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  {resps.length > 0 && (
                    <button onClick={()=>setExpanded(isExpanded?null:link.id)} style={{
                      padding:"6px 12px", background:`${accentColor}15`,
                      border:`1px solid ${accentColor}30`, borderRadius:7,
                      color:accentColor, cursor:"pointer", fontSize:12,
                      fontFamily:"'Instrument Sans',sans-serif" }}>
                      {isExpanded ? "▲ Ocultar" : "▼ Ver resultados"}
                    </button>
                  )}
                  <button onClick={()=>toggleActive(link)} style={{
                    padding:"6px 12px", background:"none",
                    border:`1px solid ${T.b2}`, borderRadius:7,
                    color:T.t3, cursor:"pointer", fontSize:12,
                    fontFamily:"'Instrument Sans',sans-serif" }}>
                    {link.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={()=>deleteLink(link.id)} style={{
                    padding:"6px 12px", background:"none",
                    border:`1px solid ${T.red}30`, borderRadius:7,
                    color:T.red, cursor:"pointer", fontSize:12, opacity:.7,
                    fontFamily:"'Instrument Sans',sans-serif" }}>
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Results panel */}
              {isExpanded && resps.length > 0 && (
                <div style={{ borderTop:`1px solid ${T.b1}`, padding:"16px" }}>
                  {/* Score summary */}
                  {scores && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                        color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>
                        Scores calculados ({resps.length} respuestas)
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
                        {Object.entries(scores).map(([dim, val]) => (
                          <div key={dim} style={{ padding:"8px 14px",
                            background:`${accentColor}10`, borderRadius:8,
                            border:`1px solid ${accentColor}20` }}>
                            <div style={{ fontSize:10, color:T.t3,
                              fontFamily:"'JetBrains Mono',monospace",
                              textTransform:"uppercase", marginBottom:3 }}>{dim}</div>
                            <div style={{ fontFamily:"'JetBrains Mono',monospace",
                              fontSize:18, color:accentColor, fontWeight:700 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>onApplyScores&&onApplyScores(scores, `Encuesta: ${link.title} (${resps.length} respuestas)`)}
                        style={{ padding:"8px 16px", background:accentColor, border:"none",
                          borderRadius:8, color:"#08090c", fontSize:12, fontWeight:600,
                          cursor:"pointer", fontFamily:"'Instrument Sans',sans-serif" }}>
                        ✓ Aplicar estos scores al proyecto
                      </button>
                    </div>
                  )}

                  {/* Individual responses */}
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                    color:T.t3, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>
                    Respuestas individuales
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto" }}>
                    {resps.map(r => (
                      <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12,
                        padding:"8px 12px", background:T.s1, borderRadius:8,
                        border:`1px solid ${T.b1}` }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, color:T.t1 }}>
                            {r.respondent_name || "Anónimo"}
                            {r.respondent_role && (
                              <span style={{ color:T.t3, marginLeft:8, fontSize:11 }}>
                                · {r.respondent_role}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace",
                          fontSize:10, color:T.t3, flexShrink:0 }}>
                          {new Date(r.created_at).toLocaleDateString("es-CL", {
                            day:"numeric", month:"short"
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
