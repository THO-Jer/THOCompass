// ============================================================
// ApprovalPanel.jsx — plain JSX (no TypeScript)
// Panel de aprobación de usuarios para la vista consultora.
// Props:
//   pendingUsers  — array de user_profiles con approval_status='pending'
//   approvedUsers — array de user_profiles con approval_status='approved'|'disabled'
//   clients       — array de { id, name, industry }
//   onApprove(userId, clientId, role) — aprueba y asigna
//   onDisable(userId)                 — desactiva
//   onReEnable(userId)                — reactiva
// ============================================================

import { useState } from 'react'

const T = {
  bg:'#08090c', s1:'#0d0f14', s2:'#111520', s3:'#161b28',
  b1:'#1d2535', b2:'#232d42',
  t1:'#e8ecf4', t2:'#8a97b0', t3:'#3d4d66', t4:'#1e2a3e',
  rc:'#f97316', blue:'#3b82f6', amber:'#f59e0b', red:'#ef4444', green:'#22c55e',
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Megrim&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.ap-wrap{font-family:'Instrument Sans',sans-serif;}
.ap-tabs{display:flex;gap:3px;background:${T.s2};border-radius:10px;padding:4px;width:fit-content;margin-bottom:20px;}
.ap-tab{padding:7px 16px;border-radius:7px;border:none;background:none;color:${T.t3};font-size:13px;font-weight:500;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:all .15s;}
.ap-tab.active{background:${T.s1};color:${T.t1};box-shadow:0 1px 6px rgba(0,0,0,.3);}
.ap-card{background:${T.s1};border:1px solid ${T.b1};border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.ap-row{display:flex;align-items:center;gap:12px;}
.ap-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-weight:700;font-size:13px;flex-shrink:0;}
.ap-name{font-size:13px;font-weight:600;color:${T.t1};margin-bottom:2px;}
.ap-email{font-family:'JetBrains Mono',monospace;font-size:11px;color:${T.t3};}
.ap-meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:${T.t4};margin-top:2px;}
.ap-actions{display:flex;gap:8px;margin-top:14px;}
.ap-btn{padding:6px 13px;border-radius:7px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:'Instrument Sans',sans-serif;transition:all .15s;}
.ap-btn:disabled{opacity:.5;cursor:not-allowed;}
.ap-btn-approve{background:${T.green};color:#08090c;}
.ap-btn-deny{background:none;color:${T.red};border:1px solid rgba(239,68,68,.3);}
.ap-btn-disable{background:none;color:${T.t2};border:1px solid ${T.b2};}
.ap-btn-enable{background:none;color:${T.green};border:1px solid rgba(34,197,94,.3);}
.ap-select{background:${T.s2};border:1px solid ${T.b2};border-radius:7px;padding:7px 11px;color:${T.t1};font-size:12px;outline:none;font-family:'Instrument Sans',sans-serif;cursor:pointer;width:100%;margin-top:10px;}
.ap-pill{padding:2px 8px;border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:10px;white-space:nowrap;}
.ap-empty{text-align:center;padding:32px 0;font-size:13px;color:${T.t3};}
`

function initials(name, email) {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return email?.[0]?.toUpperCase() || '?'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' })
}

function PendingRow({ user, clients, onApprove, onDisable }) {
  const [selClient, setSelClient] = useState('')
  const [selRole,   setSelRole]   = useState('client')
  const [loading,   setLoading]   = useState(null)

  async function approve() {
    if (selRole === 'client' && !selClient) return
    setLoading('approve')
    try { await onApprove(user.id, selClient, selRole) }
    finally { setLoading(null) }
  }

  async function deny() {
    setLoading('deny')
    try { await onDisable(user.id) }
    finally { setLoading(null) }
  }

  return (
    <div className="ap-card" style={{ borderLeft:`3px solid ${T.amber}` }}>
      <div className="ap-row">
        <div className="ap-avatar" style={{ background:`rgba(245,158,11,.15)`, color:T.amber,
          border:`1px solid rgba(245,158,11,.25)` }}>
          {initials(user.full_name, user.email)}
        </div>
        <div style={{ flex:1 }}>
          <div className="ap-name">{user.full_name || 'Sin nombre'}</div>
          <div className="ap-email">{user.email}</div>
          <div className="ap-meta">Registrado {formatDate(user.created_at)}</div>
        </div>
        <span className="ap-pill" style={{ background:`rgba(245,158,11,.15)`, color:T.amber,
          border:`1px solid rgba(245,158,11,.25)` }}>Pendiente</span>
      </div>

      <select className="ap-select" value={selRole} onChange={e => setSelRole(e.target.value)}>
        <option value="client">Rol: Cliente</option>
        <option value="consultant">Rol: Consultor/a</option>
      </select>

      {selRole === 'client' && (
        <select className="ap-select" value={selClient} onChange={e => setSelClient(e.target.value)}>
          <option value="">— Asignar a empresa —</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}{c.industry ? ` · ${c.industry}` : ''}</option>
          ))}
        </select>
      )}

      <div className="ap-actions">
        <button className="ap-btn ap-btn-approve" onClick={approve}
          disabled={loading === 'approve' || (selRole === 'client' && !selClient)}>
          {loading === 'approve' ? 'Aprobando…' : '✓ Aprobar'}
        </button>
        <button className="ap-btn ap-btn-deny" onClick={deny} disabled={loading === 'deny'}>
          {loading === 'deny' ? 'Rechazando…' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}

function ApprovedRow({ user, onDisable, onReEnable }) {
  const [loading, setLoading] = useState(null)
  const isDisabled = user.approval_status === 'disabled'
  const clientName = user.client_user_access?.[0]?.clients?.name

  async function handleDisable() {
    setLoading('disable')
    try { await onDisable(user.id) }
    finally { setLoading(null) }
  }

  async function handleEnable() {
    setLoading('enable')
    try { await onReEnable(user.id) }
    finally { setLoading(null) }
  }

  return (
    <div className="ap-card">
      <div className="ap-row">
        <div className="ap-avatar" style={{
          background: isDisabled ? `rgba(239,68,68,.1)` : `rgba(59,130,246,.15)`,
          color: isDisabled ? T.red : T.blue,
          border: `1px solid ${isDisabled ? 'rgba(239,68,68,.25)' : 'rgba(59,130,246,.25)'}`,
        }}>
          {initials(user.full_name, user.email)}
        </div>
        <div style={{ flex:1 }}>
          <div className="ap-name">{user.full_name || 'Sin nombre'}</div>
          <div className="ap-email">{user.email}</div>
          {clientName && <div className="ap-meta">Empresa: {clientName}</div>}
        </div>
        <span className="ap-pill" style={{
          background: isDisabled ? `rgba(239,68,68,.12)` : `rgba(34,197,94,.12)`,
          color: isDisabled ? T.red : T.green,
          border: `1px solid ${isDisabled ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.25)'}`,
        }}>
          {isDisabled ? '● Desactivado' : '● Activo'}
        </span>
      </div>
      <div className="ap-actions">
        {isDisabled
          ? <button className="ap-btn ap-btn-enable" onClick={handleEnable} disabled={loading === 'enable'}>
              {loading === 'enable' ? 'Reactivando…' : 'Reactivar'}
            </button>
          : <button className="ap-btn ap-btn-disable" onClick={handleDisable} disabled={loading === 'disable'}>
              {loading === 'disable' ? 'Desactivando…' : 'Desactivar'}
            </button>
        }
      </div>
    </div>
  )
}

export default function ApprovalPanel({
  pendingUsers  = [],
  approvedUsers = [],
  clients       = [],
  onApprove,
  onDisable,
  onReEnable,
}) {
  const [tab, setTab] = useState('pending')

  return (
    <div className="ap-wrap">
      <style>{css}</style>
      <div className="ap-tabs">
        <button className={`ap-tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}>
          Pendientes {pendingUsers.length > 0 && `(${pendingUsers.length})`}
        </button>
        <button className={`ap-tab ${tab === 'approved' ? 'active' : ''}`}
          onClick={() => setTab('approved')}>
          Usuarios activos
        </button>
      </div>

      {tab === 'pending' && (
        pendingUsers.length === 0
          ? <div className="ap-empty">Sin usuarios pendientes de aprobación.</div>
          : pendingUsers.map(u => (
              <PendingRow key={u.id} user={u} clients={clients}
                onApprove={onApprove} onDisable={onDisable}/>
            ))
      )}

      {tab === 'approved' && (
        approvedUsers.length === 0
          ? <div className="ap-empty">Sin usuarios registrados.</div>
          : approvedUsers.map(u => (
              <ApprovedRow key={u.id} user={u}
                onDisable={onDisable} onReEnable={onReEnable}/>
            ))
      )}
    </div>
  )
}
