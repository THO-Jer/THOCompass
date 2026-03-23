// FilesPanel.jsx
// Panel de archivos cargados por proyecto.
// Props:
//   projectId    — UUID del proyecto
//   moduleKey    — "rc" | "do" | "esg"
//   supabase
//   isConsultant — muestra opción de eliminar y marcar visibilidad
//   accentColor

import { useState, useEffect } from "react";

const T = {
  s1:"#0d0f14", s2:"#111520", b1:"#1d2535", b2:"#232d42",
  t1:"#e8ecf4", t2:"#8a97b0", t3:"#3d4d66", t4:"#1e2a3e",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", blue:"#3b82f6",
};

const BUCKET = { rc:"rc-documents", do:"do-documents", esg:"esg-documents" };

function fileIcon(mimeType, name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf")                          return "📄";
  if (["xlsx","xls","ods"].includes(ext))     return "📊";
  if (["doc","docx"].includes(ext))           return "📝";
  if (["csv","txt"].includes(ext))            return "📋";
  if (mimeType?.includes("pdf"))              return "📄";
  if (mimeType?.includes("sheet"))            return "📊";
  return "📎";
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day:"numeric", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

export default function FilesPanel({ projectId, moduleKey, supabase, isConsultant=true, accentColor }) {
  const [files,     setFiles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    if (!supabase || !projectId) return;
    load();
  }, [supabase, projectId]);

  async function load() {
    setLoading(true);
    const query = supabase
      .from("client_files")
      .select("id, original_name, mime_type, size_bytes, created_at, storage_path, storage_bucket, visible_to_client")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    // Clientes solo ven archivos visibles
    if (!isConsultant) query.eq("visible_to_client", true);

    const { data } = await query;
    setFiles(data || []);
    setLoading(false);
  }

  async function toggleVisibility(file) {
    const newVal = !file.visible_to_client;
    await supabase.from("client_files")
      .update({ visible_to_client: newVal })
      .eq("id", file.id);
    setFiles(p => p.map(f => f.id===file.id ? {...f, visible_to_client:newVal} : f));
  }

  async function deleteFile(file) {
    // Delete from storage
    if (file.storage_bucket && file.storage_path) {
      await supabase.storage.from(file.storage_bucket).remove([file.storage_path]);
    }
    // Delete from DB
    await supabase.from("client_files").delete().eq("id", file.id);
    setFiles(p => p.filter(f => f.id !== file.id));
    setConfirmId(null);
  }

  async function getDownloadUrl(file) {
    if (!file.storage_bucket || !file.storage_path) return null;
    const { data } = await supabase.storage
      .from(file.storage_bucket)
      .createSignedUrl(file.storage_path, 60); // 60 second expiry
    return data?.signedUrl || null;
  }

  async function handleDownload(file) {
    const url = await getDownloadUrl(file);
    if (url) {
      const a = document.createElement("a");
      a.href = url; a.download = file.original_name; a.click();
    }
  }

  if (loading) return (
    <div style={{ textAlign:"center", padding:"24px 0", color:T.t3, fontSize:13,
      fontFamily:"'JetBrains Mono',monospace" }}>Cargando archivos…</div>
  );

  if (files.length === 0) return (
    <div style={{ textAlign:"center", padding:"36px 0",
      background:T.s2, borderRadius:12, border:`1px dashed ${T.b2}` }}>
      <div style={{ fontSize:28, marginBottom:8 }}>📁</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:T.t1, marginBottom:4 }}>
        {isConsultant ? "Sin archivos cargados aún" : "Sin documentos disponibles"}
      </div>
      <div style={{ fontSize:12, color:T.t3 }}>
        {isConsultant
          ? "Los archivos analizados con IA aparecerán aquí."
          : "El consultor no ha compartido documentos para este módulo aún."}
      </div>
    </div>
  );

  return (
    <div>
      {isConsultant && (
        <div style={{ fontSize:12, color:T.t3, marginBottom:14, lineHeight:1.6 }}>
          El ojo 👁 controla si el cliente puede ver y descargar cada archivo.
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {files.map(f => (
          <div key={f.id} style={{ display:"flex", alignItems:"center", gap:12,
            padding:"12px 16px", background:T.s2,
            border:`1px solid ${f.visible_to_client && isConsultant ? `${accentColor}30` : T.b1}`,
            borderRadius:11, transition:"border-color .15s" }}>

            {/* Icon */}
            <span style={{ fontSize:20, flexShrink:0 }}>
              {fileIcon(f.mime_type, f.original_name)}
            </span>

            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>
                {f.original_name}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3 }}>
                  {fmtDate(f.created_at)}
                </span>
                {f.size_bytes > 0 && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:T.t3 }}>
                    {fmtSize(f.size_bytes)}
                  </span>
                )}
                {isConsultant && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                    color: f.visible_to_client ? accentColor : T.t4 }}>
                    {f.visible_to_client ? "● visible al cliente" : "○ oculto"}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              {/* Download */}
              <button onClick={() => handleDownload(f)}
                title="Descargar"
                style={{ background:"none", border:`1px solid ${T.b2}`,
                  borderRadius:7, color:T.t2, cursor:"pointer",
                  fontSize:13, padding:"5px 9px" }}>
                ↓
              </button>

              {/* Toggle visibility (consultant only) */}
              {isConsultant && (
                <button onClick={() => toggleVisibility(f)}
                  title={f.visible_to_client ? "Ocultar al cliente" : "Mostrar al cliente"}
                  style={{ background: f.visible_to_client ? `${accentColor}15` : "none",
                    border:`1px solid ${f.visible_to_client ? accentColor+"40" : T.b2}`,
                    borderRadius:7,
                    color: f.visible_to_client ? accentColor : T.t3,
                    cursor:"pointer", fontSize:13, padding:"5px 9px" }}>
                  👁
                </button>
              )}

              {/* Delete (consultant only) */}
              {isConsultant && (
                <button onClick={() => setConfirmId(f.id)}
                  title="Eliminar archivo"
                  style={{ background:"none", border:`1px solid ${T.red}30`,
                    borderRadius:7, color:T.red, cursor:"pointer",
                    fontSize:12, padding:"5px 9px", opacity:.7 }}>
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirm */}
      {confirmId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}>
          <div style={{ background:T.s1, border:`1px solid ${T.b2}`, borderRadius:14,
            padding:"24px 28px", maxWidth:360, width:"100%",
            boxShadow:"0 24px 64px rgba(0,0,0,.7)" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, color:T.t1, marginBottom:8 }}>
              ¿Eliminar archivo?
            </div>
            <div style={{ fontSize:13, color:T.t3, marginBottom:6 }}>
              {files.find(f=>f.id===confirmId)?.original_name}
            </div>
            <div style={{ fontSize:12, color:T.t3, marginBottom:20 }}>
              Se eliminará del bucket de almacenamiento. Esta acción no se puede deshacer.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => deleteFile(files.find(f=>f.id===confirmId))}
                style={{ padding:"9px 18px", background:T.red, border:"none",
                  borderRadius:8, color:"white", cursor:"pointer",
                  fontSize:13, fontWeight:600, fontFamily:"'Instrument Sans',sans-serif" }}>
                Eliminar
              </button>
              <button onClick={() => setConfirmId(null)}
                style={{ padding:"9px 16px", background:"none", border:`1px solid ${T.b2}`,
                  borderRadius:8, color:T.t2, cursor:"pointer",
                  fontSize:13, fontFamily:"'Instrument Sans',sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
