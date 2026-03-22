// ============================================================
// PendingAccess.jsx — plain JSX (no TypeScript)
// Props: email, name, disabled, onSignOut
// ============================================================

import { useState } from 'react'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Instrument+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
.pa-wrap{min-height:100vh;background:#08090c;display:flex;align-items:center;justify-content:center;font-family:'Instrument Sans',sans-serif;position:relative;overflow:hidden;}
.pa-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:52px 52px;}
.pa-glow{position:absolute;border-radius:50%;pointer-events:none;}
.pa-glow-1{width:480px;height:480px;top:-120px;left:-120px;background:radial-gradient(circle,rgba(249,115,22,.07) 0%,transparent 65%);}
.pa-glow-2{width:360px;height:360px;bottom:-80px;right:-80px;background:radial-gradient(circle,rgba(168,85,247,.06) 0%,transparent 65%);}
.pa-card{position:relative;background:#0d0f14;border:1px solid #232d42;border-radius:20px;padding:48px 44px;width:460px;max-width:92vw;box-shadow:0 32px 80px rgba(0,0,0,.7);animation:paFadeUp .45s cubic-bezier(.4,0,.2,1) both;}
@keyframes paFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.pa-card::before{content:'';position:absolute;top:0;left:48px;right:48px;height:2px;border-radius:0 0 2px 2px;background:linear-gradient(90deg,#f97316,#a855f7);}
.pa-logo{font-family:'Playfair Display',serif;font-weight:700;font-size:17px;color:#e8ecf4;margin-bottom:32px;display:flex;align-items:center;gap:9px;}
.pa-logo-mark{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#f97316,#a855f7);display:flex;align-items:center;justify-content:center;font-size:13px;color:white;font-weight:800;}
.pa-icon-wrap{width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:30px;}
.pa-icon-pending{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);animation:paBreath 3s ease-in-out infinite;}
.pa-icon-disabled{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);}
@keyframes paBreath{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.2)}50%{box-shadow:0 0 0 12px rgba(245,158,11,0)}}
.pa-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#e8ecf4;text-align:center;margin-bottom:10px;}
.pa-desc{font-size:13px;color:#8a97b0;text-align:center;line-height:1.7;margin-bottom:28px;}
.pa-user{display:flex;align-items:center;gap:12px;background:#111520;border:1px solid #1d2535;border-radius:12px;padding:13px 15px;margin-bottom:24px;}
.pa-avatar{width:38px;height:38px;border-radius:50%;background:rgba(249,115,22,.15);border:1px solid rgba(249,115,22,.25);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-weight:700;font-size:14px;color:#f97316;flex-shrink:0;}
.pa-user-name{font-size:13px;font-weight:600;color:#e8ecf4;margin-bottom:2px;}
.pa-user-email{font-family:'JetBrains Mono',monospace;font-size:11px;color:#3d4d66;}
.pa-steps{margin-bottom:28px;}
.pa-step{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #1d2535;align-items:flex-start;}
.pa-step:last-child{border-bottom:none;}
.pa-step-num{width:22px;height:22px;border-radius:50%;background:#161b28;border:1px solid #232d42;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#3d4d66;flex-shrink:0;margin-top:1px;}
.pa-step-num.done{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.25);color:#22c55e;}
.pa-step-text{font-size:13px;color:#8a97b0;line-height:1.55;}
.pa-step-text strong{color:#e8ecf4;font-weight:600;}
.pa-or{display:flex;align-items:center;gap:12px;margin-bottom:16px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#1d2535;letter-spacing:2px;text-transform:uppercase;}
.pa-or::before,.pa-or::after{content:'';flex:1;height:1px;background:#1d2535;}
.pa-refresh{background:#111520;border:1px solid #1d2535;border-radius:10px;padding:13px 15px;display:flex;align-items:center;gap:12px;margin-bottom:18px;cursor:pointer;transition:border-color .15s;}
.pa-refresh:hover{border-color:#3b82f6;}
.pa-refresh-icon{font-size:18px;flex-shrink:0;}
.pa-refresh-text{font-size:13px;color:#8a97b0;line-height:1.45;}
.pa-refresh-text strong{color:#e8ecf4;display:block;margin-bottom:2px;}
.pa-signout{width:100%;padding:11px;background:none;border:1px solid #1d2535;border-radius:9px;color:#3d4d66;font-family:'Instrument Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .15s;}
.pa-signout:hover{border-color:rgba(239,68,68,.4);color:#ef4444;}
`

export default function PendingAccess({ email = '', name = '', disabled = false, onSignOut }) {
  const [checking,    setChecking]    = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  function handleRefresh() {
    setChecking(true)
    setTimeout(() => {
      setLastChecked(new Date().toLocaleTimeString('es-CL'))
      setChecking(false)
      window.location.reload()
    }, 800)
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : email?.[0]?.toUpperCase() || '?'

  return (
    <>
      <style>{CSS}</style>
      <div className="pa-wrap">
        <div className="pa-grid" />
        <div className="pa-glow pa-glow-1" />
        <div className="pa-glow pa-glow-2" />
        <div className="pa-card">
          <div className="pa-logo">
            <div className="pa-logo-mark">T</div>
            THO Compass
          </div>
          <div className={`pa-icon-wrap ${disabled ? 'pa-icon-disabled' : 'pa-icon-pending'}`}>
            {disabled ? '🚫' : '⏳'}
          </div>
          {disabled ? (
            <>
              <div className="pa-title">Acceso desactivado</div>
              <div className="pa-desc">
                Tu cuenta ha sido desactivada. Contacta al equipo de THO Consultora para más información.
              </div>
            </>
          ) : (
            <>
              <div className="pa-title">Acceso en revisión</div>
              <div className="pa-desc">
                Tu cuenta fue registrada exitosamente. El equipo de THO Consultora
                está revisando tu solicitud y te habilitará el acceso en breve.
              </div>
            </>
          )}
          <div className="pa-user">
            <div className="pa-avatar">{initials}</div>
            <div>
              <div className="pa-user-name">{name || 'Usuario'}</div>
              <div className="pa-user-email">{email}</div>
            </div>
          </div>
          {!disabled && (
            <div className="pa-steps">
              <div className="pa-step">
                <div className="pa-step-num done">✓</div>
                <div className="pa-step-text">
                  <strong>Autenticación completada</strong>
                  Ingresaste correctamente con tu cuenta Microsoft o Google.
                </div>
              </div>
              <div className="pa-step">
                <div className="pa-step-num">2</div>
                <div className="pa-step-text">
                  <strong>Revisión por la consultora</strong>
                  El equipo THO verificará tu solicitud y asignará los módulos correspondientes.
                </div>
              </div>
              <div className="pa-step">
                <div className="pa-step-num">3</div>
                <div className="pa-step-text">
                  <strong>Acceso habilitado</strong>
                  Recibirás confirmación y podrás ver tu dashboard.
                </div>
              </div>
            </div>
          )}
          {!disabled && (
            <>
              <div className="pa-or">o</div>
              <div className="pa-refresh" onClick={handleRefresh}>
                <div className="pa-refresh-icon">{checking ? '⏳' : '🔄'}</div>
                <div className="pa-refresh-text">
                  <strong>¿Ya te avisaron que está listo?</strong>
                  {lastChecked ? `Última verificación: ${lastChecked}` : 'Haz clic para verificar tu estado de acceso'}
                </div>
              </div>
            </>
          )}
          <button className="pa-signout" onClick={onSignOut}>Cerrar sesión</button>
        </div>
      </div>
    </>
  )
}
