import React, { useMemo, useState } from "react";

const C = {
  bg: "#07090d", s1: "#0d1017", s2: "#121620", s3: "#141820",
  b1: "#1c2333", b2: "#232d40", b3: "#2a364d",
  t1: "#edf2fa", t2: "#8fa3be", t3: "#435570", t4: "#1e2d42",
  rc: "#f97316", amber: "#f59e0b", green: "#22c55e",
  red: "#ef4444", blue: "#3b82f6",
};

const MOCK_PENDING = [
  {
    id: "u1", email: "rosa.fernandez@mlosandes.cl",
    full_name: "Rosa Fernández", role: "client",
    approval_status: "pending", created_at: "2025-03-17T14:23:00Z",
    assigned_client: null,
  },
  {
    id: "u2", email: "andres.mora@biobio.cl",
    full_name: "Andrés Mora", role: "client",
    approval_status: "pending", created_at: "2025-03-18T09:11:00Z",
    assigned_client: null,
  },
];

const MOCK_APPROVED = [
  {
    id: "u3", email: "jefa@mlosandes.cl",
    full_name: "Carmen López", role: "client",
    approval_status: "approved", created_at: "2025-02-10T10:00:00Z",
    assigned_client: { id: "c1", name: "Minera Los Andes", logo: "⛏️" },
  },
  {
    id: "u4", email: "rrhh@biobio.cl",
    full_name: "Felipe Torres", role: "client",
    approval_status: "disabled", created_at: "2025-01-20T08:00:00Z",
    assigned_client: { id: "c2", name: "Constructora BíoBío", logo: "🏗️" },
  },
];

const MOCK_CLIENTS = [
  { id: "c1", name: "Minera Los Andes", logo: "⛏️", industry: "Minería" },
  { id: "c2", name: "Constructora BíoBío", logo: "🏗️", industry: "Construcción" },
];

const CSS = `
.ap-wrap { font-family: 'Space Grotesk', sans-serif; color: ${C.t1}; }
.ap-sh { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; gap:12px; flex-wrap:wrap; }
.ap-title { font-family:'Fraunces',serif; font-size:17px; color:${C.t1}; letter-spacing:-.2px; }
.ap-count {
  display:inline-flex; align-items:center; gap:5px;
  padding:3px 10px; border-radius:20px; font-size:11px;
  font-family:'JetBrains Mono',monospace;
}
.ap-count-pending { background:rgba(245,158,11,.12); color:${C.amber}; }
.ap-count-none { background:${C.s2}; color:${C.t3}; }
.ap-banner {
  background:rgba(245,158,11,.07);
  border:1px solid rgba(245,158,11,.2);
  border-radius:11px; padding:14px 18px;
  display:flex; align-items:flex-start; gap:12px;
  margin-bottom:22px;
}
.ap-banner-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
.ap-banner-text { font-size:13px; color:#fbbf24; line-height:1.55; }
.ap-banner-text strong { display:block; margin-bottom:2px; font-size:14px; }
.ap-pending-card {
  background:${C.s1}; border:1px solid ${C.b1};
  border-radius:13px; padding:20px 22px; margin-bottom:12px;
  transition:border-color .15s; position:relative; overflow:hidden;
}
.ap-pending-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg,${C.amber},${C.rc});
}
.ap-pending-card:hover { border-color:${C.b2}; }
.ap-user-row { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
.ap-avatar {
  width:42px; height:42px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-family:'Fraunces',serif; font-weight:700; font-size:15px;
  background:rgba(245,158,11,.1); color:${C.amber};
  border:1px solid rgba(245,158,11,.2);
}
.ap-uname { font-size:14px; font-weight:600; color:${C.t1}; margin-bottom:2px; }
.ap-uemail { font-family:'JetBrains Mono',monospace; font-size:11px; color:${C.t3}; }
.ap-udate { font-family:'JetBrains Mono',monospace; font-size:10px; color:${C.t4}; margin-top:2px; }
.ap-assign-row { display:flex; gap:10px; align-items:flex-end; margin-bottom:14px; }
.ap-assign-label {
  font-family:'JetBrains Mono',monospace; font-size:10px;
  color:${C.t3}; letter-spacing:1.5px; text-transform:uppercase;
  display:block; margin-bottom:6px;
}
.ap-select {
  flex:1; width:100%; background:${C.s2}; border:1px solid ${C.b2}; border-radius:8px;
  padding:9px 12px; color:${C.t1}; font-size:13px; outline:none;
  font-family:'Space Grotesk',sans-serif; transition:border-color .15s;
}
.ap-select:focus { border-color:${C.blue}; }
.ap-select option { background:${C.s2}; }
.ap-actions { display:flex; gap:9px; flex-wrap:wrap; }
.apb {
  padding:8px 16px; border-radius:8px; font-size:13px;
  font-weight:600; cursor:pointer; transition:all .15s;
  border:none; font-family:'Space Grotesk',sans-serif;
  display:inline-flex; align-items:center; gap:6px;
}
.apb-approve { background:${C.green}; color:#07090d; }
.apb-approve:hover { filter:brightness(1.1); }
.apb-approve:disabled { opacity:.5; cursor:not-allowed; }
.apb-deny { background:none; border:1px solid ${C.b2}; color:${C.red}; }
.apb-deny:hover { background:rgba(239,68,68,.08); border-color:${C.red}; }
.apb-deny:disabled, .apb-reenable:disabled { opacity:.5; cursor:not-allowed; }
.apb-reenable { background:none; border:1px solid ${C.b2}; color:${C.blue}; }
.apb-reenable:hover { background:rgba(59,130,246,.08); border-color:${C.blue}; }
.apb-edit { background:none; border:1px solid ${C.b2}; color:${C.t2}; }
.apb-edit:hover { border-color:${C.blue}; color:${C.blue}; }
.ap-div { height:1px; background:${C.b1}; margin:26px 0; }
.ap-tbl { width:100%; border-collapse:collapse; }
.ap-tbl th {
  font-family:'JetBrains Mono',monospace; font-size:9px;
  color:${C.t3}; letter-spacing:1.5px; text-transform:uppercase;
  text-align:left; padding:9px 14px; border-bottom:1px solid ${C.b1}; font-weight:400;
}
.ap-tbl td {
  padding:13px 14px; font-size:13px; color:${C.t2};
  border-bottom:1px solid ${C.b1}; vertical-align:middle;
}
.ap-tbl tr:last-child td { border-bottom:none; }
.ap-tbl tr:hover td { background:${C.s2}; }
.ap-badge {
  display:inline-flex; align-items:center; gap:4px;
  padding:3px 9px; border-radius:20px;
  font-size:11px; font-family:'JetBrains Mono',monospace;
}
.ab-green { background:rgba(34,197,94,.12); color:${C.green}; }
.ab-amber { background:rgba(245,158,11,.12); color:${C.amber}; }
.ab-red { background:rgba(239,68,68,.12); color:${C.red}; }
.ab-blue { background:rgba(59,130,246,.12); color:${C.blue}; }
.ap-empty {
  text-align:center; padding:40px 20px;
  background:${C.s1}; border:1px dashed ${C.b1};
  border-radius:13px;
}
.ap-empty-icon { font-size:36px; margin-bottom:12px; }
.ap-empty-text { font-size:13px; color:${C.t3}; }
.ap-spin {
  width:14px; height:14px; border:2px solid rgba(255,255,255,.2);
  border-top-color:white; border-radius:50%;
  animation:apSpin .7s linear infinite; display:inline-block;
}
.ap-muted { font-size:12px; color:${C.t3}; }
@keyframes apSpin { to { transform:rotate(360deg); } }
`;

function initials(name, email) {
  if (name) return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return email?.[0]?.toUpperCase() ?? "?";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PendingCard({ user, clients, onApprove, onDisable }) {
  const [selectedClient, setSelectedClient] = useState(user.assigned_client?.id || "");
  const [loading, setLoading] = useState(null);

  async function handleApprove() {
    if (!selectedClient) return;
    setLoading("approve");
    await onApprove(user.id, selectedClient);
    setLoading(null);
  }

  async function handleDeny() {
    setLoading("deny");
    await onDisable(user.id);
    setLoading(null);
  }

  return (
    <div className="ap-pending-card">
      <div className="ap-user-row">
        <div className="ap-avatar">{initials(user.full_name, user.email)}</div>
        <div>
          <div className="ap-uname">{user.full_name || "Sin nombre"}</div>
          <div className="ap-uemail">{user.email}</div>
          <div className="ap-udate">Registrado {formatDate(user.created_at)}</div>
        </div>
      </div>

      <div className="ap-assign-row">
        <div style={{ flex: 1 }}>
          <label className="ap-assign-label">Asignar a cliente</label>
          <select className="ap-select" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
            <option value="">— Seleccionar empresa —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.logo} {c.name} · {c.industry}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ap-actions">
        <button className="apb apb-approve" onClick={handleApprove} disabled={!selectedClient || loading === "approve"}>
          {loading === "approve" ? <><span className="ap-spin" /> Aprobando…</> : "✓ Aprobar acceso"}
        </button>
        <button className="apb apb-deny" onClick={handleDeny} disabled={loading === "deny"}>
          {loading === "deny" ? <><span className="ap-spin" /> Procesando…</> : "✕ Rechazar"}
        </button>
      </div>
    </div>
  );
}

export default function ApprovalPanel({
  pendingUsers = MOCK_PENDING,
  approvedUsers = MOCK_APPROVED,
  clients = MOCK_CLIENTS,
  onApprove = async () => {},
  onDisable = async () => {},
  onReEnable = async () => {},
  statusMessage = "",
  isUsingMocks = false,
}) {
  const displayPendingUsers = isUsingMocks && pendingUsers.length === 0 ? MOCK_PENDING : pendingUsers;
  const displayApprovedUsers = isUsingMocks && approvedUsers.length === 0 ? MOCK_APPROVED : approvedUsers;
  const displayClients = isUsingMocks && clients.length === 0 ? MOCK_CLIENTS : clients;

  const totals = useMemo(() => ({
    approved: displayApprovedUsers.filter((u) => u.approval_status === "approved").length,
    disabled: displayApprovedUsers.filter((u) => u.approval_status === "disabled").length,
  }), [displayApprovedUsers]);

  return (
    <>
      <style>{CSS}</style>
      <div className="ap-wrap">
        <div className="ap-sh">
          <div className="ap-title">Usuarios pendientes de aprobación</div>
          {displayPendingUsers.length > 0
            ? <span className="ap-count ap-count-pending">⚠ {displayPendingUsers.length} pendiente{displayPendingUsers.length > 1 ? "s" : ""}</span>
            : <span className="ap-count ap-count-none">Sin pendientes</span>}
        </div>

        {isUsingMocks && <div className="alert al-b" style={{ marginBottom: 18 }}>Mostrando datos demo porque Supabase no está configurado o no devolvió resultados todavía.</div>}
        {statusMessage && <div className="alert al-b" style={{ marginBottom: 18 }}>{statusMessage}</div>}

        {displayPendingUsers.length > 0 && (
          <div className="ap-banner">
            <div className="ap-banner-icon">⚠️</div>
            <div className="ap-banner-text">
              <strong>Acción requerida</strong>
              {displayPendingUsers.length === 1
                ? "Hay 1 usuario esperando ser aprobado. Asígnalo a una empresa y activa su acceso."
                : `Hay ${displayPendingUsers.length} usuarios esperando ser aprobados. Asígnalos a sus empresas para activar su acceso.`}
            </div>
          </div>
        )}

        {displayPendingUsers.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon">✅</div>
            <div className="ap-empty-text">No hay usuarios pendientes de aprobación.</div>
          </div>
        ) : (
          displayPendingUsers.map((u) => (
            <PendingCard key={u.id} user={u} clients={displayClients} onApprove={onApprove} onDisable={onDisable} />
          ))
        )}

        <div className="ap-div" />

        <div className="ap-sh">
          <div>
            <div className="ap-title">Todos los usuarios cliente</div>
            <div className="ap-muted" style={{ marginTop: 6 }}>Activos: {totals.approved} · Deshabilitados: {totals.disabled}</div>
          </div>
          <span className="ap-count ap-count-none">{displayApprovedUsers.length} registrados</span>
        </div>

        {displayApprovedUsers.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon">👤</div>
            <div className="ap-empty-text">No hay usuarios cliente registrados aún.</div>
          </div>
        ) : (
          <div style={{ background: C.s1, border: `1px solid ${C.b1}`, borderRadius: 13, overflow: "hidden" }}>
            <table className="ap-tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa asignada</th>
                  <th>Estado</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayApprovedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 12,
                          background: u.approval_status === "disabled" ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)",
                          color: u.approval_status === "disabled" ? C.red : C.green,
                          border: `1px solid ${u.approval_status === "disabled" ? "rgba(239,68,68,.2)" : "rgba(34,197,94,.2)"}`,
                        }}>
                          {initials(u.full_name, u.email)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{u.full_name || "Sin nombre"}</div>
                          <div style={{ fontSize: 11, color: C.t3, fontFamily: "'JetBrains Mono',monospace" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.assigned_client
                        ? <span style={{ color: C.t1 }}>{u.assigned_client.logo} {u.assigned_client.name}</span>
                        : <span style={{ color: C.t4 }}>Sin asignar</span>}
                    </td>
                    <td>
                      <span className={`ap-badge ${u.approval_status === "approved" ? "ab-green" : u.approval_status === "disabled" ? "ab-red" : "ab-amber"}`}>
                        {u.approval_status === "approved" ? "● Activo" : u.approval_status === "disabled" ? "● Desactivado" : "● Pendiente"}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.t3 }}>{new Date(u.created_at).toLocaleDateString("es-CL")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button className="apb apb-edit" style={{ padding: "5px 11px", fontSize: 12 }} disabled>
                          Editar
                        </button>
                        {u.approval_status === "approved"
                          ? <button className="apb apb-deny" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => onDisable(u.id)}>Desactivar</button>
                          : u.approval_status === "disabled"
                            ? <button className="apb apb-reenable" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => onReEnable(u.id)}>Reactivar</button>
                            : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
