// ScoreLog.jsx
// Historial de cambios de score por proyecto.
// Muestra quién cambió qué, cuándo y por qué método.
// Props: projectId, supabase, accentColor

import { useState, useEffect } from "react";

const T = {
  bg:"#040915",
  s1:"#070f1f",
  s2:"#0b1426",
  s3:"#111d33",
  b1:"#1a2740",
  b2:"#243454",
  b3:"#30446b",
  t1:"#f5f8ff",
  t2:"#c0cce4",
  t3:"#8ea0c2",
  t4:"#65779a",
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

const METHOD_META = {
  baseline_instrument: { label:"Instrumento de observación", icon:"📋", color:T.blue  },
  ai_analysis:         { label:"Análisis IA",               icon:"✦",  color:"#a855f7" },
  manual:              { label:"Ajuste manual",             icon:"✎",  color:T.amber  },
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day:"numeric", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

function ScoreBadge({ before, after, color }) {
  const diff  = after - (before ?? after);
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  const col   = diff > 0 ? T.green : diff < 0 ? T.red : T.t3;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      {before != null && (
        <>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13,
            color:T.t3 }}>{before}</span>
          <span style={{ color:col, fontSize:14 }}>{arrow}</span>
        </>
      )}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15,
        fontWeight:700, color:color || T.t1 }}>{after}</span>
      {before != null && diff !== 0 && (
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
          color:col }}>({diff > 0 ? "+" : ""}{diff})</span>
      )}
    </div>
  );
}

export default function ScoreLog({ projectId, supabase, accentColor }) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!supabase || !projectId) return;
    loadLog();
  }, [supabase, projectId]);

  async function loadLog() {
    setLoading(true);
    const { data } = await supabase
      .from("project_score_log")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    setEntries(data || []);
    setLoading(false);
  }

  // Group entries by created_at batch (same second = same save operation)
  const batches = [];
  const seen = new Set();
  (entries || []).forEach(e => {
    const batchKey = e.created_at?.slice(0, 19); // truncate to seconds
    if (!seen.has(batchKey)) {
      seen.add(batchKey);
      batches.push({
        key:     batchKey,
        time:    e.created_at,
        method:  e.method,
        notes:   e.notes,
        source:  e.source_file,
        entries: entries.filter(x => x.created_at?.slice(0,19) === batchKey),
      });
    }
  });

  if (loading) return (
    <div style={{ textAlign:"center", padding:"24px 0", color:T.t3, fontSize:13 }}>
      Cargando historial…
    </div>
  );

  if (batches.length === 0) return (
    <div style={{ textAlign:"center", padding:"36px 0",
      background:T.s2, borderRadius:12, border:`1px dashed ${T.b2}` }}>
      <div style={{ fontSize:28, marginBottom:8 }}>📊</div>
      <div style={{ fontFamily:"'Inter','Instrument Sans',sans-serif", fontSize:14, color:T.t1, marginBottom:4 }}>
        Sin cambios registrados aún
      </div>
      <div style={{ fontSize:12, color:T.t3 }}>
        Los cambios de score se registrarán automáticamente desde aquí.
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {batches.map(batch => {
        const meta    = METHOD_META[batch.method] || METHOD_META.manual;
        const overall = batch.entries.find(e => e.dimension === "overall");
        const dims    = batch.entries.filter(e => e.dimension !== "overall");
        const isOpen  = expanded === batch.key;

        return (
          <div key={batch.key} style={{ background:T.s2,
            border:`1px solid ${isOpen ? accentColor+"40" : T.b1}`,
            borderRadius:12, overflow:"hidden", transition:"border-color .15s" }}>

            {/* Header row */}
            <div onClick={() => setExpanded(isOpen ? null : batch.key)}
              style={{ display:"flex", alignItems:"center", gap:14,
                padding:"12px 16px", cursor:"pointer" }}>
              {/* Method badge */}
              <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                background:`${meta.color}15`, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:15 }}>
                {meta.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:meta.color }}>
                    {meta.label}
                  </span>
                  {batch.source && (
                    <span style={{ fontSize:10, color:T.t3,
                      fontFamily:"'JetBrains Mono',monospace",
                      padding:"1px 6px", background:T.s1, borderRadius:4 }}>
                      {batch.source}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:11, color:T.t3,
                  fontFamily:"'JetBrains Mono',monospace" }}>
                  {fmtDate(batch.time)}
                </div>
              </div>
              {/* Overall score change */}
              {overall && (
                <ScoreBadge
                  before={overall.value_before}
                  after={overall.value_after}
                  color={accentColor}/>
              )}
              <span style={{ color:T.t3, fontSize:12, marginLeft:4 }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${T.b1}`, padding:"14px 16px" }}>
                {batch.notes && (
                  <div style={{ fontSize:13, color:T.t2, lineHeight:1.6,
                    marginBottom:14, padding:"10px 14px",
                    background:`${accentColor}08`,
                    border:`1px solid ${accentColor}20`, borderRadius:8 }}>
                    "{batch.notes}"
                  </div>
                )}
                {dims.length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                    {dims.map(d => (
                      <div key={d.id} style={{ padding:"8px 12px", background:T.s1,
                        borderRadius:8, border:`1px solid ${T.b1}` }}>
                        <div style={{ fontSize:10, color:T.t3,
                          fontFamily:"'JetBrains Mono',monospace",
                          textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>
                          {d.dimension}
                        </div>
                        <ScoreBadge
                          before={d.value_before}
                          after={d.value_after}
                          color={accentColor}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
