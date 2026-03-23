// CommitmentsPanel.jsx
// Panel de compromisos reutilizable para RC, DO y ESG
// Props:
//   projectId    — UUID del proyecto
//   clientId     — UUID del cliente
//   moduleKey    — "rc" | "do" | "esg"
//   supabase     — cliente Supabase
//   isConsultant — boolean: muestra controles de edición
//   accentColor  — color del módulo

import { useState, useEffect } from "react";

const T = {
  s1:"#0d0f14", s2:"#111520", b1:"#1d2535", b2:"#232d42",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", blue:"#3b82f6",
};

const STATUS_META = {
  pending:     { label:"Pendiente",    color:T.t3,    bg:`${T.t3}12`,   icon:"○" },
  in_progress: { label:"En curso",     color:T.blue,  bg:`${T.blue}12`, icon:"◐" },
  completed:   { label:"Completado",   color:T.green, bg:`${T.green}12`,icon:"●" },
  overdue:     { label:"Atrasado",     color:T.red,   bg:`${T.red}12`,  icon:"⚠" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr) {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr).toLocaleDateString("es-CL", { day:"numeric", month:"short", year:"numeric" });
}

function CommitmentCard({ commitment, onEdit, onStatusChange, isConsultant, accentColor }) {
  const st   = STATUS_META[commitment.status] || STATUS_META.pending;
  const days = daysUntil(commitment.due_date);
  const isOverdue = days !== null && days < 0 && commitment.status !== "completed";

  return (
    <div style={{ background:T.s2, border:`1px solid ${isOverdue ? T.red+"40" : T.b1}`,
      borderRadius:12, padding:"14px 16px", transition:"border-color .15s" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
        {/* Status indicator */}
        <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:st.bg, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, color:st.color, marginTop:1 }}>
          {st.icon}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:T.t1, marginBottom:3,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {commitment.title}
          </div>
          {commitment.description && (
            <div style={{ fontSize:12, color:T.t3, lineHeight:1.5, marginBottom:6 }}>
              {commitment.description}
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            {commitment.due_date && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                color: isOverdue ? T.red : days !== null && days <= 7 ? T.amber : T.t3 }}>
                {isOverdue
                  ? `⚠ Atrasado ${Math.abs(days)}d`
                  : days === 0 ? "⚡ Vence hoy"
                  : days !== null && days <= 7 ? `⏰ ${days}d restantes`
                  : `📅 ${fmtDate(commitment.due_date)}`}
              </span>
            )}
            {commitment.responsible && (
              <span style={{ fontSize:11, color:T.t3 }}>
                👤 {commitment.responsible}
              </span>
            )}
            <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10,
              fontFamily:"'JetBrains Mono',monospace",
              background:st.bg, color:st.color }}>
              {st.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isConsultant && (
          <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
            <select value={commitment.status}
              onChange={e=>onStatusChange(commitment.id, e.target.value)}
              style={{ background:T.s1, border:`1px solid ${T.b2}`, borderRadius:6,
                color:T.t2, fontSize:11, padding:"3px 6px", cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace", outline:"none" }}>
              {Object.entries(STATUS_META).map(([k,v])=>(
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button onClick={()=>onEdit(commitment)} style={{ background:"none",
              border:`1px solid ${T.b2}`, borderRadius:6, color:T.t3, fontSize:10,
              cursor:"pointer", padding:"3px 8px", fontFamily:"'Instrument Sans',sans-serif" }}>
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommitmentModal({ commitment, moduleKey, projectId, onSave, onClose, accentColor }) {
  const isEdit = !!commitment;
  const [title,       setTitle]       = useState(commitment?.title || "");
  const [description, setDesc]        = useState(commitment?.description || "");
  const [dueDate,     setDueDate]     = useState(commitment?.due_date || "");
  const [responsible, setResponsible] = useState(commitment?.responsible || "");
  const [status,      setStatus]      = useState(commitment?.status || "pending");
  const [loading,     setLoading]     = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);
    onSave({ id:commitment?.id, project_id:projectId, title, description,
      due_date:dueDate||null, responsible, status });
    setLoading(false);
  }

  const labelMap = {
    rc:"Compromiso con comunidad", do:"Plan de acción", esg:"Compromiso de sostenibilidad"
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20 }}>
      <div style={{ background:T.s1,border:`1px solid ${T.b2}`,borderRadius:14,
        width:"100%",maxWidth:480,boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
        <div style={{ padding:"18px 22px",borderBottom:`1px solid ${T.b1}`,
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:15,color:T.t1 }}>
            {isEdit ? "Editar" : "Nuevo"} {labelMap[moduleKey]}
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",
            color:T.t3,cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:"20px 22px", display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:1,display:"block",marginBottom:6,textTransform:"uppercase" }}>
              Título *
            </label>
            <input value={title} onChange={e=>setTitle(e.target.value)}
              placeholder={moduleKey==="rc" ? "Ej. Instalar sistema de riego sector norte"
                : moduleKey==="do" ? "Ej. Implementar programa de mentoring"
                : "Ej. Publicar reporte GRI 2025"}
              style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                borderRadius:8,padding:"9px 12px",color:T.t1,fontSize:13,
                outline:"none",fontFamily:"'Instrument Sans',sans-serif",boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:1,display:"block",marginBottom:6,textTransform:"uppercase" }}>
              Descripción
            </label>
            <textarea value={description} onChange={e=>setDesc(e.target.value)}
              placeholder="Detalle del compromiso, contexto, condiciones..."
              style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                borderRadius:8,padding:"9px 12px",color:T.t1,fontSize:13,
                outline:"none",fontFamily:"'Instrument Sans',sans-serif",
                resize:"vertical",minHeight:70,boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:1,display:"block",marginBottom:6,textTransform:"uppercase" }}>
                Fecha límite
              </label>
              <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                  borderRadius:8,padding:"9px 12px",color:T.t1,fontSize:13,
                  outline:"none",fontFamily:"'Instrument Sans',sans-serif",boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:1,display:"block",marginBottom:6,textTransform:"uppercase" }}>
                Responsable
              </label>
              <input value={responsible} onChange={e=>setResponsible(e.target.value)}
                placeholder="Nombre o cargo"
                style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                  borderRadius:8,padding:"9px 12px",color:T.t1,fontSize:13,
                  outline:"none",fontFamily:"'Instrument Sans',sans-serif",boxSizing:"border-box" }}/>
            </div>
          </div>
          {isEdit && (
            <div>
              <label style={{ fontSize:11,color:T.t3,fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:1,display:"block",marginBottom:6,textTransform:"uppercase" }}>
                Estado
              </label>
              <select value={status} onChange={e=>setStatus(e.target.value)}
                style={{ width:"100%",background:T.s2,border:`1px solid ${T.b2}`,
                  borderRadius:8,padding:"9px 12px",color:T.t1,fontSize:13,
                  outline:"none",fontFamily:"'Instrument Sans',sans-serif",
                  cursor:"pointer",boxSizing:"border-box" }}>
                {Object.entries(STATUS_META).map(([k,v])=>(
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ padding:"14px 22px",borderTop:`1px solid ${T.b1}`,
          display:"flex",gap:10,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 16px",background:"none",
            border:`1px solid ${T.b2}`,borderRadius:8,color:T.t2,cursor:"pointer",
            fontSize:13,fontFamily:"'Instrument Sans',sans-serif" }}>Cancelar</button>
          <button onClick={handleSave} disabled={!title.trim()||loading}
            style={{ padding:"9px 18px",background:accentColor||T.blue,border:"none",
              borderRadius:8,color:"#08090c",cursor:title.trim()?"pointer":"not-allowed",
              fontSize:13,fontWeight:600,fontFamily:"'Instrument Sans',sans-serif" }}>
            {loading?"Guardando…":isEdit?"Guardar cambios":"Crear compromiso"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommitmentsPanel({ projectId, clientId, moduleKey, supabase,
  isConsultant=true, accentColor=T.blue }) {
  const [commitments, setCommitments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null); // null | "new" | commitment object
  const [filter,      setFilter]      = useState("active"); // "active" | "all" | "completed"

  useEffect(() => {
    if (!supabase || !projectId) return;
    loadCommitments();
  }, [supabase, projectId]);

  async function loadCommitments() {
    setLoading(true);
    const { data } = await supabase
      .from("project_commitments")
      .select("*")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsLast: true });
    // Auto-mark overdue
    const now = new Date().toISOString().split("T")[0];
    const updated = (data || []).map(c => ({
      ...c,
      status: c.status !== "completed" && c.due_date && c.due_date < now
        ? "overdue" : c.status,
    }));
    setCommitments(updated);

    // Auto-generate alerts for overdue commitments
    if (isConsultant && clientId) {
      const overdue = updated.filter(c => c.status === "overdue");
      for (const c of overdue) {
        await supabase.from("client_alerts").upsert({
          client_id:         clientId,
          type:              "red",
          text:              `Compromiso vencido: "${c.title}"`,
          module:            moduleKey,
          visible_to_client: true,
        }, { onConflict: "client_id,text" }).catch(()=>{});
      }
    }
    setLoading(false);
  }

  async function handleSave(data) {
    if (data.id) {
      await supabase.from("project_commitments")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", data.id);
    } else {
      await supabase.from("project_commitments")
        .insert({ ...data, project_id: projectId });
    }
    setModal(null);
    await loadCommitments();
  }

  async function handleStatusChange(id, newStatus) {
    await supabase.from("project_commitments")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
    setCommitments(p => p.map(c => c.id===id ? {...c, status:newStatus} : c));
  }

  const filtered = commitments.filter(c => {
    if (filter === "completed") return c.status === "completed";
    if (filter === "active")    return c.status !== "completed";
    return true;
  });

  const counts = {
    total:     commitments.length,
    overdue:   commitments.filter(c=>c.status==="overdue").length,
    completed: commitments.filter(c=>c.status==="completed").length,
    pending:   commitments.filter(c=>c.status==="pending"||c.status==="in_progress").length,
  };

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18 }}>
        {[
          { label:"Activos",     val:counts.pending,   color:T.blue  },
          { label:"Atrasados",   val:counts.overdue,   color:T.red   },
          { label:"Completados", val:counts.completed, color:T.green },
        ].map(s=>(
          <div key={s.label} style={{ background:T.s1,border:`1px solid ${T.b1}`,
            borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:22,
              color:s.color,marginBottom:2 }}>{s.val}</div>
            <div style={{ fontSize:11,color:T.t3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
        <div style={{ display:"flex",gap:4,background:T.s2,borderRadius:8,padding:3 }}>
          {[["active","Activos"],["completed","Completados"],["all","Todos"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{ padding:"5px 12px",
              borderRadius:6,border:"none",fontSize:12,cursor:"pointer",
              fontFamily:"'Instrument Sans',sans-serif",transition:"all .15s",
              background:filter===k?T.s1:"none",
              color:filter===k?T.t1:T.t3 }}>
              {l}
            </button>
          ))}
        </div>
        {isConsultant && (
          <button onClick={()=>setModal("new")} style={{ padding:"7px 14px",
            background:accentColor,border:"none",borderRadius:8,color:"#08090c",
            fontSize:12,fontWeight:600,cursor:"pointer",
            fontFamily:"'Instrument Sans',sans-serif" }}>
            + Nuevo compromiso
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:"center",padding:"32px 0",color:T.t3,fontSize:13 }}>
          Cargando compromisos…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center",padding:"36px 0",
          background:T.s2,border:`1px dashed ${T.b2}`,borderRadius:12 }}>
          <div style={{ fontSize:28,marginBottom:10 }}>
            {filter==="completed"?"✅":"📋"}
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:14,color:T.t1,marginBottom:4 }}>
            {filter==="completed"?"Sin compromisos completados aún":"Sin compromisos activos"}
          </div>
          {isConsultant && filter!=="completed" && (
            <div style={{ fontSize:12,color:T.t3 }}>
              Haz clic en "+ Nuevo compromiso" para registrar el primero.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {filtered.map(c=>(
            <CommitmentCard key={c.id} commitment={c}
              onEdit={setModal} onStatusChange={handleStatusChange}
              isConsultant={isConsultant} accentColor={accentColor}/>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <CommitmentModal
          commitment={modal==="new" ? null : modal}
          moduleKey={moduleKey}
          projectId={projectId}
          accentColor={accentColor}
          onSave={handleSave}
          onClose={()=>setModal(null)}/>
      )}
    </div>
  );
}
