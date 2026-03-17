import { useState, useRef, useEffect, createContext, useContext } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

// ─── THEME CONTEXT ────────────────────────────────────────────────────────────
const ThemeCtx = createContext();
const useTheme = () => useContext(ThemeCtx);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const darkTokens = {
  bg:"#07090d", s1:"#0d1017", s2:"#121620", s3:"#181e28",
  b1:"#1c2333", b2:"#232d40", b3:"#2a364d",
  t1:"#edf2fa", t2:"#8fa3be", t3:"#435570", t4:"#1e2d42",
  shadow:"0 8px 32px rgba(0,0,0,.5)", shadowLg:"0 24px 64px rgba(0,0,0,.7)",
};
const lightTokens = {
  bg:"#f4f6fb", s1:"#ffffff", s2:"#f0f3f9", s3:"#e8ecf5",
  b1:"#dde3ef", b2:"#ccd4e4", b3:"#b8c4d8",
  t1:"#0f1a2e", t2:"#3d5070", t3:"#8898b0", t4:"#c5cfe0",
  shadow:"0 4px 20px rgba(15,26,46,.08)", shadowLg:"0 16px 48px rgba(15,26,46,.14)",
};

// Brand colors (same both modes)
const brand = {
  rc:"#f97316", rc2:"#ea580c", rcA:"rgba(249,115,22,.12)", rcB:"rgba(249,115,22,.06)",
  do:"#c026d3", do2:"#a21caf", doA:"rgba(192,38,211,.12)", doB:"rgba(192,38,211,.06)",
  esg:"#16a34a", esg2:"#15803d", esgA:"rgba(22,163,74,.12)", esgB:"rgba(22,163,74,.06)",
  blue:"#3b82f6", blue2:"#2563eb", blueA:"rgba(59,130,246,.12)",
  amber:"#f59e0b", red:"#ef4444", redA:"rgba(239,68,68,.12)",
  green:"#22c55e", greenA:"rgba(34,197,94,.12)",
};

function buildCSS(t) {
  return `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,700;1,400&family=Figtree:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:${t.bg};color:${t.t1};font-family:'Figtree',sans-serif;font-size:14px;line-height:1.55;transition:background .25s,color .25s;}
input,textarea,select,button{font-family:'Figtree',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:${t.s1};}
::-webkit-scrollbar-thumb{background:${t.b2};border-radius:2px;}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes slideIn{from{transform:translateX(-12px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes tourPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.fu{animation:fadeUp .35s ease both;}
.fu1{animation-delay:.06s;} .fu2{animation-delay:.12s;} .fu3{animation-delay:.18s;} .fu4{animation-delay:.24s;}

/* LAYOUT */
.shell{display:flex;min-height:100vh;}
.sidebar{
  width:228px;flex-shrink:0;background:${t.s1};border-right:1px solid ${t.b1};
  display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;
  transition:width .22s cubic-bezier(.4,0,.2,1);z-index:200;overflow:hidden;
}
.sidebar.col{width:58px;}
.main{margin-left:228px;flex:1;min-height:100vh;transition:margin-left .22s cubic-bezier(.4,0,.2,1);}
.main.col{margin-left:58px;}

/* SIDEBAR */
.sb-head{
  display:flex;align-items:center;gap:10px;padding:18px 14px 16px;
  border-bottom:1px solid ${t.b1};min-height:62px;overflow:hidden;white-space:nowrap;
}
.sb-mark{
  width:30px;height:30px;border-radius:8px;flex-shrink:0;
  background:linear-gradient(135deg,${brand.rc},${brand.do});
  display:flex;align-items:center;justify-content:center;
  font-family:'Fraunces',serif;font-weight:700;font-size:14px;color:white;
  box-shadow:0 2px 8px rgba(249,115,22,.3);
}
.sb-title{font-family:'Fraunces',serif;font-weight:700;font-size:16px;color:${t.t1};transition:opacity .2s;}
.sb-title span{background:linear-gradient(90deg,${brand.rc},${brand.do});-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.sidebar.col .sb-title,.sidebar.col .sb-section-lbl,.sidebar.col .nav-lbl,.sidebar.col .nav-badge,.sidebar.col .sb-user-info,.sidebar.col .sb-logout{opacity:0;pointer-events:none;}
.sb-toggle{
  margin-left:auto;flex-shrink:0;background:none;border:1px solid ${t.b2};border-radius:6px;
  color:${t.t3};cursor:pointer;padding:4px 7px;font-size:12px;transition:all .15s;
}
.sb-toggle:hover{border-color:${brand.blue};color:${brand.blue};}
.sb-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:10px 8px;}
.sb-section-lbl{
  font-family:'JetBrains Mono',monospace;font-size:9px;color:${t.t3};
  letter-spacing:2px;text-transform:uppercase;padding:0 8px;margin:14px 0 5px;
  white-space:nowrap;overflow:hidden;transition:opacity .2s;
}
.nav-item{
  display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:8px;
  cursor:pointer;color:${t.t3};font-size:13px;font-weight:500;
  transition:all .15s;white-space:nowrap;overflow:hidden;
  border:1px solid transparent;position:relative;
}
.nav-item:hover{background:${t.s2};color:${t.t1};}
.nav-item.active{background:${brand.blueA};color:${brand.blue};border-color:rgba(59,130,246,.18);}
.nav-item.active.rc-active{background:${brand.rcA};color:${brand.rc};border-color:rgba(249,115,22,.2);}
.nav-item.active.do-active{background:${brand.doA};color:${brand.do};border-color:rgba(192,38,211,.2);}
.nav-item.active.esg-active{background:${brand.esgA};color:${brand.esg};border-color:rgba(22,163,74,.2);}
.nav-icon{font-size:16px;flex-shrink:0;width:22px;text-align:center;}
.nav-lbl{transition:opacity .2s;flex:1;}
.nav-badge{
  background:${brand.red};color:white;font-size:10px;
  font-family:'JetBrains Mono',monospace;padding:1px 6px;border-radius:10px;flex-shrink:0;
}
.nav-locked{font-size:11px;color:${t.t4};margin-left:auto;}
.sb-bottom{padding:10px 8px;border-top:1px solid ${t.b1};}
.sb-user{display:flex;align-items:center;gap:9px;padding:8px;border-radius:8px;overflow:hidden;white-space:nowrap;}
.sb-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:700;font-size:12px;}
.av-c{background:${brand.blueA};color:${brand.blue};border:1px solid rgba(59,130,246,.25);}
.av-cl{background:${brand.rcA};color:${brand.rc};border:1px solid rgba(249,115,22,.25);}
.sb-user-info{overflow:hidden;}
.sb-uname{font-size:12px;font-weight:600;color:${t.t1};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sb-urole{font-size:10px;color:${t.t3};font-family:'JetBrains Mono',monospace;}
.sb-logout{
  width:100%;margin-top:7px;padding:7px;background:none;border:1px solid ${t.b2};
  border-radius:7px;color:${t.t3};font-size:12px;cursor:pointer;transition:all .15s;
}
.sb-logout:hover{border-color:${brand.red};color:${brand.red};}

/* TOPBAR */
.topbar{
  height:54px;background:${t.s1};border-bottom:1px solid ${t.b1};
  display:flex;align-items:center;justify-content:space-between;
  padding:0 28px;position:sticky;top:0;z-index:100;
}
.breadcrumb{font-size:13px;color:${t.t3};}
.breadcrumb strong{color:${t.t1};font-weight:600;}
.tb-right{display:flex;align-items:center;gap:10px;}
.tb-btn{
  background:none;border:1px solid ${t.b2};border-radius:7px;
  color:${t.t2};cursor:pointer;padding:6px 11px;font-size:13px;transition:all .15s;
  display:flex;align-items:center;gap:6px;
}
.tb-btn:hover{border-color:${brand.blue};color:${brand.blue};}
.tb-theme{font-size:16px;}
.notif-wrap{position:relative;}
.notif-dot{position:absolute;top:3px;right:3px;width:7px;height:7px;border-radius:50%;background:${brand.red};border:2px solid ${t.s1};}
.client-chip{
  background:${t.s2};border:1px solid ${t.b2};border-radius:7px;
  padding:6px 12px;color:${t.t1};font-size:13px;font-weight:500;
  display:flex;align-items:center;gap:8px;cursor:pointer;transition:all .15s;
}
.client-chip:hover{border-color:${brand.blue};}
.online-dot{width:7px;height:7px;border-radius:50%;background:${brand.green};animation:pulse 2s infinite;}

/* PAGE */
.page{padding:32px 36px;max-width:1220px;}
.ph{margin-bottom:26px;}
.ph-eye{font-family:'JetBrains Mono',monospace;font-size:10px;color:${t.t3};letter-spacing:2px;text-transform:uppercase;margin-bottom:7px;}
.ph-title{font-family:'Fraunces',serif;font-size:30px;color:${t.t1};letter-spacing:-.5px;margin-bottom:5px;}
.ph-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}

/* CARDS */
.card{background:${t.s1};border:1px solid ${t.b1};border-radius:14px;padding:22px 24px;}
.card-sm{padding:16px 20px;}
.card-xs{padding:12px 16px;}
.ctitle{font-family:'Fraunces',serif;font-size:16px;color:${t.t1};margin-bottom:14px;letter-spacing:-.2px;}
.ctitle-sm{font-family:'Fraunces',serif;font-size:14px;color:${t.t1};margin-bottom:11px;}
.sec-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}

/* GRIDS */
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:18px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:18px;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;}
.g-2-3{display:grid;grid-template-columns:2fr 3fr;gap:16px;margin-bottom:18px;}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-family:'JetBrains Mono',monospace;}
.bg{background:${brand.greenA};color:${brand.green};}
.ba{background:rgba(245,158,11,.12);color:${brand.amber};}
.br{background:${brand.redA};color:${brand.red};}
.bb{background:${brand.blueA};color:${brand.blue};}
.brc{background:${brand.rcA};color:${brand.rc};}
.bdo{background:${brand.doA};color:${brand.do};}
.besg{background:${brand.esgA};color:${brand.esg};}

/* SCORE */
.score-ring{border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;}
.score-inner{border-radius:50%;background:${t.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;}

/* PROGRESS */
.prog{margin-bottom:9px;}
.prog-hdr{display:flex;justify-content:space-between;font-size:11px;color:${t.t3};margin-bottom:4px;font-family:'JetBrains Mono',monospace;}
.prog-track{height:5px;background:${t.b2};border-radius:3px;overflow:hidden;}
.prog-fill{height:100%;border-radius:3px;transition:width .9s cubic-bezier(.4,0,.2,1);}

/* MODULE CARD */
.mod-card{
  background:${t.s1};border:1px solid ${t.b1};border-radius:14px;padding:22px;
  transition:all .2s;cursor:pointer;position:relative;overflow:hidden;
}
.mod-card:hover{transform:translateY(-2px);box-shadow:${t.shadow};}
.mod-bar{position:absolute;top:0;left:0;right:0;height:3px;}
.mod-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:14px;}
.mod-score{font-family:'JetBrains Mono',monospace;font-size:40px;line-height:1;margin-bottom:2px;}
.mod-name{font-family:'Fraunces',serif;font-size:14px;color:${t.t1};margin-bottom:3px;}
.mod-sub{font-size:11px;color:${t.t3};margin-bottom:14px;}
.mod-locked{opacity:.32;pointer-events:none;}
.mod-lock-lbl{position:absolute;top:14px;right:14px;font-size:11px;color:${t.t4};}

/* STAT CHIP */
.stat-chip{background:${t.s1};border:1px solid ${t.b1};border-radius:12px;padding:16px 18px;}
.stat-val{font-family:'JetBrains Mono',monospace;font-size:24px;color:${t.t1};margin-bottom:2px;}
.stat-lbl{font-size:11px;color:${t.t3};}
.stat-delta{font-size:11px;font-family:'JetBrains Mono',monospace;margin-top:2px;}

/* TABLE */
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-family:'JetBrains Mono',monospace;font-size:9px;color:${t.t3};letter-spacing:1.5px;text-transform:uppercase;text-align:left;padding:9px 14px;border-bottom:1px solid ${t.b1};font-weight:400;}
.tbl td{padding:13px 14px;font-size:13px;color:${t.t2};border-bottom:1px solid ${t.b1};vertical-align:middle;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:${t.s2};}

/* FORM */
.fl{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;color:${t.t3};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:7px;}
.fi,.fsel,.fta{
  width:100%;background:${t.s2};border:1px solid ${t.b2};border-radius:8px;
  padding:10px 13px;color:${t.t1};font-size:13px;outline:none;transition:border-color .2s;
}
.fi:focus,.fsel:focus,.fta:focus{border-color:${brand.blue};}
.fta{resize:vertical;min-height:90px;line-height:1.6;}
.fsel option{background:${t.s2};}
.fg{margin-bottom:16px;}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
.frow3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px;}

/* BUTTONS */
.btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;border:none;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;}
.btn-p{background:${brand.blue};color:white;} .btn-p:hover{background:${brand.blue2};}
.btn-g{background:none;border:1px solid ${t.b2};color:${t.t2};} .btn-g:hover{border-color:${brand.blue};color:${brand.blue};}
.btn-s{background:${brand.green};color:white;}
.btn-d{background:none;border:1px solid ${t.b2};color:${brand.red};} .btn-d:hover{background:${brand.redA};}
.btn-rc{background:${brand.rc};color:white;} .btn-rc:hover{background:${brand.rc2};}
.btn-do{background:${brand.do};color:white;} .btn-do:hover{background:${brand.do2};}
.btn-esg{background:${brand.esg};color:white;} .btn-esg:hover{background:${brand.esg2};}
.btn-sm{padding:6px 13px;font-size:12px;}
.btn-row{display:flex;gap:9px;margin-top:18px;flex-wrap:wrap;}

/* TABS */
.tabs{display:flex;gap:3px;margin-bottom:20px;background:${t.s2};border-radius:11px;padding:4px;}
.tab{flex:1;padding:8px 12px;border-radius:8px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;background:none;color:${t.t3};}
.tab.active{background:${t.s1};color:${t.t1};box-shadow:0 1px 6px rgba(0,0,0,.12);}

/* ALERTS */
.alert{padding:12px 16px;border-radius:8px;font-size:13px;display:flex;align-items:flex-start;gap:10px;margin-bottom:9px;line-height:1.5;}
.al-g{background:${brand.greenA};border:1px solid rgba(34,197,94,.2);color:#4ade80;}
.al-a{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);color:#fbbf24;}
.al-r{background:${brand.redA};border:1px solid rgba(239,68,68,.2);color:#f87171;}
.al-b{background:${brand.blueA};border:1px solid rgba(59,130,246,.2);color:#93c5fd;}
.al-rc{background:${brand.rcA};border:1px solid rgba(249,115,22,.2);color:#fb923c;}

/* DIVIDER */
.div{height:1px;background:${t.b1};margin:20px 0;}

/* HERO */
.hero{
  background:linear-gradient(135deg,${t.s1} 0%,${t.s2} 60%,${t.s3} 100%);
  border:1px solid ${t.b2};border-radius:18px;padding:30px 34px;
  display:grid;grid-template-columns:1fr auto;gap:32px;align-items:center;
  margin-bottom:20px;position:relative;overflow:hidden;
}
.hero::after{
  content:'';position:absolute;top:-60px;right:-60px;width:280px;height:280px;
  border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,.06),transparent 65%);
  pointer-events:none;
}
.hero-eye{font-family:'JetBrains Mono',monospace;font-size:9px;color:${t.t3};letter-spacing:3px;text-transform:uppercase;margin-bottom:9px;}
.hero-co{font-family:'Fraunces',serif;font-size:22px;color:${t.t1};margin-bottom:3px;}
.hero-per{font-size:12px;color:${t.t3};margin-bottom:14px;}
.hero-desc{font-size:13px;color:${t.t2};line-height:1.65;max-width:460px;}
.hero-tags{display:flex;gap:7px;margin-top:13px;flex-wrap:wrap;}
.mod-tag{padding:4px 10px;border-radius:20px;font-size:11px;font-family:'JetBrains Mono',monospace;border:1px solid;background:transparent;}

/* SLIDER */
.sldr-wrap{display:flex;align-items:center;gap:12px;}
.sldr{flex:1;-webkit-appearance:none;height:4px;border-radius:2px;background:${t.b2};outline:none;cursor:pointer;}
.sldr::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${brand.blue};cursor:pointer;}
.sldr-val{font-family:'JetBrains Mono',monospace;font-size:13px;color:${brand.blue};width:36px;text-align:right;}

/* TOGGLE */
.tgl{position:relative;width:36px;height:19px;flex-shrink:0;}
.tgl input{opacity:0;width:0;height:0;}
.tgl-sl{position:absolute;inset:0;border-radius:10px;background:${t.b2};cursor:pointer;transition:.2s;}
.tgl-sl::before{content:'';position:absolute;width:13px;height:13px;left:3px;top:3px;background:${t.t3};border-radius:50%;transition:.2s;}
.tgl input:checked+.tgl-sl{background:${brand.blue};}
.tgl input:checked+.tgl-sl::before{transform:translateX(17px);background:white;}

/* MESSAGES */
.msg-thread{display:flex;flex-direction:column;gap:12px;margin-bottom:18px;max-height:300px;overflow-y:auto;padding-right:4px;}
.msg-bubble{max-width:78%;}
.from-c{align-self:flex-start;} .from-t{align-self:flex-end;}
.msg-body{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.55;}
.from-c .msg-body{background:${t.s2};border:1px solid ${t.b2};color:${t.t2};border-bottom-left-radius:3px;}
.from-t .msg-body{background:${brand.blueA};border:1px solid rgba(59,130,246,.2);color:${t.t1};border-bottom-right-radius:3px;}
.msg-meta{font-size:10px;color:${t.t3};font-family:'JetBrains Mono',monospace;margin-top:3px;}
.from-t .msg-meta{text-align:right;}
.msg-row{display:flex;gap:9px;}
.msg-inp{flex:1;background:${t.s2};border:1px solid ${t.b2};border-radius:8px;padding:9px 13px;color:${t.t1};font-size:13px;outline:none;}
.msg-inp:focus{border-color:${brand.blue};}

/* UPLOAD */
.drop-zone{border:2px dashed ${t.b2};border-radius:12px;padding:28px;text-align:center;cursor:pointer;transition:all .2s;background:${t.s2};}
.drop-zone:hover,.drop-zone.dz-over{border-color:${brand.rc};background:${brand.rcB};}
.dz-icon{font-size:30px;margin-bottom:8px;}
.dz-title{font-family:'Fraunces',serif;font-size:14px;color:${t.t1};margin-bottom:4px;}
.dz-sub{font-size:12px;color:${t.t3};}
.fchip{display:flex;align-items:center;gap:7px;background:${t.s3};border:1px solid ${t.b2};border-radius:7px;padding:5px 11px;font-size:12px;color:${t.t2};}
.fchip-rm{cursor:pointer;color:${t.t4};transition:color .15s;} .fchip-rm:hover{color:${brand.red};}
.ai-box{background:${t.s3};border:1px solid rgba(249,115,22,.25);border-radius:12px;padding:18px;margin-top:14px;}
.ai-hdr{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.ai-tag{background:${brand.rcA};border:1px solid rgba(249,115,22,.25);border-radius:20px;padding:3px 10px;font-size:11px;font-family:'JetBrains Mono',monospace;color:${brand.rc};}
.ai-spin{width:13px;height:13px;border:2px solid ${t.b2};border-top-color:${brand.rc};border-radius:50%;animation:spin .8s linear infinite;}
.ai-score-row{background:${t.s2};border:1px solid ${t.b2};border-radius:8px;padding:11px 14px;margin-bottom:9px;}

/* HEATMAP */
.hm-grid{display:grid;grid-template-columns:auto repeat(5,1fr);gap:5px;align-items:center;}
.hm-lbl{font-size:11px;color:${t.t3};text-align:right;padding-right:9px;font-family:'JetBrains Mono',monospace;}
.hm-cell{height:38px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;cursor:default;transition:transform .15s;}
.hm-cell:hover{transform:scale(1.06);}
.hm-clbl{font-size:9px;color:${t.t4};text-align:center;font-family:'JetBrains Mono',monospace;}

/* CALENDAR */
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.cal-hdr{font-family:'JetBrains Mono',monospace;font-size:10px;color:${t.t3};text-align:center;padding:3px 0;}
.cal-day{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:${t.t3};cursor:pointer;transition:all .15s;position:relative;}
.cal-day:hover{background:${t.s3};color:${t.t1};}
.cal-day.today{background:${brand.blueA};color:${brand.blue};font-weight:600;}
.cal-day.has-evt::after{content:'';position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:${brand.esg};}
.cal-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.cal-month{font-family:'Fraunces',serif;font-size:14px;color:${t.t1};}
.cal-nbtn{background:none;border:1px solid ${t.b2};border-radius:6px;color:${t.t2};padding:3px 9px;cursor:pointer;transition:all .15s;font-size:13px;}
.cal-nbtn:hover{border-color:${brand.blue};color:${brand.blue};}
.evt-item{display:flex;gap:11px;padding:10px 0;border-bottom:1px solid ${t.b1};align-items:flex-start;}
.evt-item:last-child{border-bottom:none;}
.evt-dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;}

/* PUB BANNER */
.pub-banner{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-radius:11px;margin-bottom:20px;}
.pub-live{background:${brand.greenA};border:1px solid rgba(34,197,94,.2);}
.pub-draft{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);}
.pub-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;animation:pulse 2s infinite;}
.pub-info{display:flex;align-items:center;gap:11px;}

/* FILE ROW */
.file-row{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid ${t.b1};}
.file-row:last-child{border-bottom:none;}
.f-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.f-info{flex:1;}
.f-name{font-size:13px;color:${t.t1};font-weight:500;}
.f-meta{font-size:11px;color:${t.t3};font-family:'JetBrains Mono',monospace;margin-top:1px;}

/* ONBOARDING TOUR */
.tour-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center;}
.tour-card{background:${t.s1};border:1px solid ${t.b2};border-radius:18px;padding:40px;width:480px;max-width:90vw;box-shadow:${t.shadowLg};animation:tourPop .3s ease both;}
.tour-step-num{font-family:'JetBrains Mono',monospace;font-size:10px;color:${t.t3};letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;}
.tour-title{font-family:'Fraunces',serif;font-size:24px;color:${t.t1};margin-bottom:10px;letter-spacing:-.3px;}
.tour-desc{font-size:14px;color:${t.t2};line-height:1.65;margin-bottom:24px;}
.tour-dots{display:flex;gap:6px;margin-bottom:20px;}
.tour-dot{width:8px;height:8px;border-radius:50%;background:${t.b2};transition:.2s;}
.tour-dot.active{background:${brand.rc};width:20px;border-radius:4px;}
.tour-btns{display:flex;justify-content:space-between;align-items:center;}
.tour-img{font-size:56px;margin-bottom:20px;text-align:center;}

/* MODULE DETAIL PANELS */
.detail-kpi{background:${t.s2};border:1px solid ${t.b1};border-radius:10px;padding:16px;text-align:center;}
.dkpi-val{font-family:'JetBrains Mono',monospace;font-size:28px;margin-bottom:3px;}
.dkpi-lbl{font-size:11px;color:${t.t3};}
.dkpi-delta{font-size:11px;font-family:'JetBrains Mono',monospace;margin-top:2px;}

/* PROFILE */
.profile-avatar-lg{
  width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-family:'Fraunces',serif;font-weight:700;font-size:26px;
  background:linear-gradient(135deg,${brand.rcA},${brand.doA});
  border:2px solid ${t.b2};
}

/* METRICS (consultant home) */
.metric-hero{
  background:linear-gradient(135deg,${t.s1},${t.s2});
  border:1px solid ${t.b2};border-radius:16px;padding:28px 32px;
  margin-bottom:18px;position:relative;overflow:hidden;
}
.metric-hero::before{
  content:'';position:absolute;bottom:-40px;right:-40px;width:200px;height:200px;
  border-radius:50%;background:radial-gradient(circle,${brand.doA},transparent 70%);
}

/* ADMIN */
.client-admin-row{background:${t.s2};border:1px solid ${t.b1};border-radius:10px;padding:15px;margin-bottom:11px;}

/* COMPARE */
.cmp-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid ${t.b1};}
.cmp-row:last-child{border-bottom:none;}
.cmp-lbl{font-size:12px;color:${t.t2};width:140px;flex-shrink:0;}
.cmp-val{font-family:'JetBrains Mono',monospace;font-size:14px;}
.arr-up{color:${brand.green};} .arr-dn{color:${brand.red};} .arr-fl{color:${t.t4};}

/* MISC */
.mono{font-family:'JetBrains Mono',monospace;}
.muted{color:${t.t3};}
.mb0{margin-bottom:0;}
`;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const MOD = {
  rc:  { key:"rc",  label:"Relacionamiento Comunitario", short:"RC",  icon:"🤝", color:brand.rc,  color2:"#fb923c", cA:brand.rcA,  cB:brand.rcB,  scoreLabel:"Índice LSO",        btnCls:"btn-rc"  },
  do:  { key:"do",  label:"Desarrollo Organizacional",   short:"DO",  icon:"🏛️", color:brand.do,  color2:"#e879f9", cA:brand.doA,  cB:brand.doB,  scoreLabel:"Salud Org.",        btnCls:"btn-do"  },
  esg: { key:"esg", label:"Sostenibilidad Corporativa",  short:"ESG", icon:"🌿", color:brand.esg, color2:"#4ade80", cA:brand.esgA, cB:brand.esgB, scoreLabel:"Madurez ESG",       btnCls:"btn-esg" },
};

const INIT_CLIENTS = [
  {
    id:1, name:"Minera Los Andes", industry:"Minería", contact:"Rosa Fernández", email:"rfernandez@mlosandes.cl",
    published:true, period:"Q1 2025", logo:"⛏️",
    modules:{ rc:true, do:true, esg:true },
    ircs:72, rc:68, do:78, esg:71,
    weights:{ rc:40, do:35, esg:25 },
    rc_subs:{ percepcion:65, compromisos:72, dialogo:70, conflictividad:62 },
    do_subs:{ cultura:80, engagement:76, liderazgo:78 },
    esg_subs:{ ambiental:68, social:74, gobernanza:72 },
    trend:[
      {p:"Q2'24",ircs:61,rc:58,do:70,esg:62},{p:"Q3'24",ircs:65,rc:62,do:72,esg:65},
      {p:"Q4'24",ircs:69,rc:65,do:75,esg:68},{p:"Q1'25",ircs:72,rc:68,do:78,esg:71},
    ],
    alerts:[
      {type:"amber",text:"Reunión con comunidad La Greda pendiente de reagendar",date:"12 Mar 2025"},
      {type:"green",text:"Compromiso de reforestación completado al 100%",date:"8 Mar 2025"},
      {type:"red",text:"Índice de conflictividad sobre umbral en sector norte",date:"3 Mar 2025"},
    ],
    recommendations:["Priorizar mesa de diálogo sector norte.","Plan de comunicación trimestral para stakeholders.","Avanzar en certificación ISO 45001."],
    internal_notes:"Cliente sensible al tema de agua. Encuesta comunidades Caimanes y Los Molles en Q2.",
    messages:[
      {from:"client",text:"¿Cuándo tendremos el análisis del sector norte?",date:"14 Mar · 10:32"},
      {from:"consultant",text:"Esta semana enviamos el análisis detallado con acciones recomendadas.",date:"14 Mar · 11:05"},
    ],
    files:[
      {name:"Encuesta_Stakeholders_Q1_2025.xlsx",type:"excel",date:"5 Mar 2025",module:"RC",ai_score:68,status:"applied"},
      {name:"Acta_Mesa_Dialogo_Feb2025.docx",type:"doc",date:"28 Feb 2025",module:"RC",ai_score:71,status:"applied"},
      {name:"Reporte_Ambiental_2024.pdf",type:"pdf",date:"20 Feb 2025",module:"ESG",ai_score:65,status:"applied"},
      {name:"Encuesta_Clima_Laboral.xlsx",type:"excel",date:"10 Feb 2025",module:"DO",ai_score:76,status:"applied"},
    ],
    events:[
      {day:18,text:"Mesa de diálogo Sector Norte",color:brand.red},
      {day:22,text:"Entrega reporte Q1",color:brand.blue},
      {day:28,text:"Encuesta engagement DO",color:brand.do},
    ],
    profile:{sector:"Minería y Recursos Naturales",size:"Grande (>1000 empleados)",region:"Coquimbo",since:"2024"},
  },
  {
    id:2, name:"Constructora BíoBío", industry:"Construcción", contact:"Andrés Mora", email:"amora@biobio.cl",
    published:false, period:"Q1 2025", logo:"🏗️",
    modules:{ rc:true, do:true, esg:false },
    ircs:58, rc:52, do:65, esg:null,
    weights:{ rc:50, do:50, esg:0 },
    rc_subs:{ percepcion:50, compromisos:55, dialogo:52, conflictividad:50 },
    do_subs:{ cultura:62, engagement:68, liderazgo:65 },
    esg_subs:{ ambiental:null, social:null, gobernanza:null },
    trend:[
      {p:"Q3'24",ircs:54,rc:48,do:60,esg:null},{p:"Q4'24",ircs:56,rc:50,do:62,esg:null},
      {p:"Q1'25",ircs:58,rc:52,do:65,esg:null},
    ],
    alerts:[
      {type:"red",text:"Score LSO bajo umbral crítico — acción prioritaria",date:"10 Mar 2025"},
      {type:"amber",text:"Encuesta de engagement pendiente",date:"5 Mar 2025"},
    ],
    recommendations:["Diagnóstico cultural antes de intervenciones de clima.","Plan de RC para proyecto Coronel."],
    internal_notes:"Reporte NO publicado. Esperando datos de encuesta engagement de RRHH.",
    messages:[],
    files:[{name:"Notas_Entrevista_Comunidad.txt",type:"txt",date:"8 Mar 2025",module:"RC",ai_score:52,status:"applied"}],
    events:[{day:20,text:"Call kick-off Coronel",color:brand.blue}],
    profile:{sector:"Construcción e Inmobiliario",size:"Mediana (200–500 empleados)",region:"Biobío",since:"2025"},
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const sc = v => v===null||v===undefined?"var(--t3)":v>=70?brand.green:v>=50?brand.amber:brand.red;
const ScoreBadge = ({v})=>{
  if(v===null||v===undefined)return null;
  const cls=v>=70?"bg":v>=50?"ba":"br";
  return <span className={`badge ${cls}`}>{v>=70?"▲ Favorable":v>=50?"◆ En desarrollo":"▼ Crítico"}</span>;
};
const Prog=({label,val,color})=>{
  if(val===null)return null;
  return(
    <div className="prog">
      <div className="prog-hdr"><span>{label}</span><span>{val}</span></div>
      <div className="prog-track"><div className="prog-fill" style={{width:`${val}%`,background:color}}/></div>
    </div>
  );
};
function ScoreRing({val,size=120,color}){
  const c=color||sc(val); const pct=val||0; const inner=size*.78;
  return(
    <div className="score-ring" style={{width:size,height:size,background:`conic-gradient(${c} 0% ${pct}%,var(--b1) ${pct}% 100%)`}}>
      <div className="score-inner" style={{width:inner,height:inner}}>
        <span className="mono" style={{fontSize:size*.27,color:c,lineHeight:1}}>{val??"—"}</span>
        <span className="mono muted" style={{fontSize:size*.1}}>/100</span>
      </div>
    </div>
  );
}
const fileIcon=t=>({excel:"📊",pdf:"📄",doc:"📝",txt:"📋"})[t]||"📎";
const fileColor=t=>({excel:brand.esgA,pdf:brand.redA,doc:brand.blueA,txt:brand.rcA})[t]||"var(--s3)";

// ─── ONBOARDING TOUR ──────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {emoji:"👋",title:"Bienvenido a THO Compass",desc:"Esta plataforma centraliza el seguimiento de reputación corporativa de tus clientes en tres dimensiones: relacionamiento, desarrollo organizacional y sostenibilidad."},
  {emoji:"📊",title:"Tu dashboard principal",desc:"El IRCS (Índice de Reputación Corporativa Sostenible) integra los tres módulos activos en un solo número ejecutivo. Cada módulo puede activarse o desactivarse por cliente."},
  {emoji:"🤝",title:"Módulo Relacionamiento Comunitario",desc:"El índice LSO mide la Licencia Social de Operación. Alimentado con encuestas, actas y registros de compromisos con stakeholders territoriales."},
  {emoji:"🏛️",title:"Módulo Desarrollo Organizacional",desc:"Mide cultura, engagement y liderazgo. Los datos provienen de encuestas internas y la IA puede tabular y proponer scores automáticamente."},
  {emoji:"🌿",title:"Módulo Sostenibilidad Corporativa",desc:"Índice de madurez ESG en tres pilares: ambiental, social y gobernanza. Alineado con estándares GRI e ISO 26000."},
  {emoji:"✦",title:"Análisis con IA",desc:"Sube cualquier archivo — entrevistas, encuestas, reportes PDF — y la IA detectará indicadores relevantes y propondrá actualizaciones de score para tu revisión."},
];

function OnboardingTour({onClose,t}){
  const [step,setStep]=useState(0);
  const s=TOUR_STEPS[step];
  return(
    <div className="tour-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="tour-card">
        <div className="tour-step-num">Paso {step+1} de {TOUR_STEPS.length}</div>
        <div className="tour-img">{s.emoji}</div>
        <div className="tour-title">{s.title}</div>
        <div className="tour-desc">{s.desc}</div>
        <div className="tour-dots">
          {TOUR_STEPS.map((_,i)=><div key={i} className={`tour-dot ${i===step?"active":""}`}/>)}
        </div>
        <div className="tour-btns">
          <button className="btn btn-g btn-sm" onClick={onClose}>Saltar tour</button>
          <div style={{display:"flex",gap:9}}>
            {step>0&&<button className="btn btn-g btn-sm" onClick={()=>setStep(s=>s-1)}>← Anterior</button>}
            {step<TOUR_STEPS.length-1
              ?<button className="btn btn-p btn-sm" onClick={()=>setStep(s=>s+1)}>Siguiente →</button>
              :<button className="btn btn-rc btn-sm" onClick={onClose}>Comenzar ✓</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function Calendar({events=[]}){
  const [mo,setMo]=useState(2);
  const [yr]=useState(2025);
  const MOS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const DYS=["Lu","Ma","Mi","Ju","Vi","Sá","Do"];
  const first=new Date(yr,mo,1).getDay();
  const off=first===0?6:first-1;
  const total=new Date(yr,mo+1,0).getDate();
  const cells=[...Array(off).fill(null),...Array(total).fill(0).map((_,i)=>i+1)];
  const edays=events.map(e=>e.day);
  return(
    <div>
      <div className="cal-nav">
        <button className="cal-nbtn" onClick={()=>setMo(m=>Math.max(0,m-1))}>‹</button>
        <div className="cal-month">{MOS[mo]} {yr}</div>
        <button className="cal-nbtn" onClick={()=>setMo(m=>Math.min(11,m+1))}>›</button>
      </div>
      <div className="cal-grid">
        {DYS.map(d=><div key={d} className="cal-hdr">{d}</div>)}
        {cells.map((day,i)=>(
          <div key={i} className={`cal-day ${!day?"":""} ${day===17?"today":""} ${edays.includes(day)?"has-evt":""}`} style={{opacity:!day?.3:1}}>
            {day||""}
          </div>
        ))}
      </div>
      {events.length>0&&(
        <div style={{marginTop:14}}>
          {events.map((e,i)=>(
            <div key={i} className="evt-item">
              <div className="evt-dot" style={{background:e.color}}/>
              <div>
                <div style={{fontSize:13,color:"var(--t2)"}}>{e.text}</div>
                <div style={{fontSize:11,color:"var(--t3)",fontFamily:"'JetBrains Mono',monospace"}}>{MOS[mo]} {e.day}, {yr}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
function RiskHeatmap(){
  const areas=["Comunidad","Trabajadores","Regulatorio","Ambiental","Reputación"];
  const dims=["Probabilidad","Impacto","Urgencia","Tendencia","Control"];
  const data=[[30,45,60,70,55],[75,60,50,40,65],[55,70,45,50,60],[65,80,55,60,45],[85,75,70,65,50]];
  const cc=v=>v>=70?`rgba(239,68,68,${.12+(v-70)/80})`
    :v>=50?`rgba(245,158,11,${.12+(v-50)/100})`:`rgba(34,197,94,${.1+v/220})`;
  const ct=v=>v>=70?brand.red:v>=50?brand.amber:brand.green;
  return(
    <div>
      <div className="hm-grid">
        <div/>
        {dims.map(d=><div key={d} className="hm-clbl">{d}</div>)}
        {areas.map((a,ai)=>[
          <div key={`l${ai}`} className="hm-lbl">{a}</div>,
          ...data[ai].map((v,di)=>(
            <div key={`c${ai}${di}`} className="hm-cell" style={{background:cc(v),color:ct(v)}}>{v}</div>
          ))
        ])}
      </div>
      <div style={{display:"flex",gap:14,marginTop:12}}>
        {[[brand.green,"Bajo (<50)"],[brand.amber,"Medio (50–70)"],[brand.red,"Alto (>70)"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--t3)"}}>
            <div style={{width:10,height:10,borderRadius:3,background:c,opacity:.6}}/>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FILE UPLOAD + AI ─────────────────────────────────────────────────────────
function FileUpload({onApply}){
  const [files,setFiles]=useState([]);
  const [analyzing,setAnalyzing]=useState(false);
  const [proposal,setProposal]=useState(null);
  const [drag,setDrag]=useState(false);
  const ref=useRef();
  const addFiles=list=>{
    const m=Array.from(list).map(f=>({
      name:f.name,
      type:f.name.match(/\.(xlsx|csv)$/i)?"excel":f.name.match(/\.pdf$/i)?"pdf":f.name.match(/\.docx?$/i)?"doc":"txt"
    }));
    setFiles(p=>[...p,...m]);
  };
  const analyze=()=>{
    if(!files.length)return;
    setAnalyzing(true);setProposal(null);
    setTimeout(()=>{
      setAnalyzing(false);
      setProposal({
        module:files[0].type==="excel"?"DO":files[0].type==="pdf"?"ESG":"RC",
        summary:"El análisis detectó tono positivo con 3 compromisos nuevos y mejora en índices de participación comunitaria respecto al período anterior.",
        scores:[
          {label:"Percepción y confianza",cur:65,prop:69,reason:"Mejora en satisfacción comunitaria (+4 pts vs período anterior)"},
          {label:"Calidad del diálogo",cur:70,prop:73,reason:"Aumento de reuniones formales y acuerdos cumplidos al 92%"},
        ]
      });
    },2200);
  };
  return(
    <div>
      <div className={`drop-zone ${drag?"dz-over":""}`}
        onClick={()=>ref.current.click()}
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files);}}>
        <div className="dz-icon">📁</div>
        <div className="dz-title">Arrastra archivos o haz clic para cargar</div>
        <div className="dz-sub">Soporta .xlsx · .csv · .pdf · .docx · .txt</div>
        <input ref={ref} type="file" multiple style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
      </div>
      {files.length>0&&(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
          {files.map((f,i)=>(
            <div key={i} className="fchip">
              <span>{fileIcon(f.type)}</span><span>{f.name}</span>
              <span className="fchip-rm" onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}>✕</span>
            </div>
          ))}
        </div>
      )}
      <div className="btn-row">
        <button className="btn btn-rc btn-sm" onClick={analyze} disabled={!files.length||analyzing}>
          {analyzing?"Analizando…":"✦ Analizar con IA"}
        </button>
        <button className="btn btn-g btn-sm" onClick={()=>{setFiles([]);setProposal(null);}}>Limpiar</button>
      </div>
      {analyzing&&(
        <div className="ai-box">
          <div className="ai-hdr"><span className="ai-tag">✦ IA</span>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--t3)"}}>
              <div className="ai-spin"/>Procesando…
            </div>
          </div>
          <div style={{fontSize:12,color:"var(--t3)"}}>Detectando tipo de contenido · Extrayendo indicadores · Generando propuesta de scores…</div>
        </div>
      )}
      {proposal&&(
        <div className="ai-box">
          <div className="ai-hdr"><span className="ai-tag">✦ Propuesta IA</span><span className={`badge b${proposal.module==="RC"?"rc":proposal.module==="DO"?"do":"esg"}`}>{proposal.module}</span></div>
          <div style={{fontSize:13,color:"var(--t2)",marginBottom:14,lineHeight:1.65}}>{proposal.summary}</div>
          {proposal.scores.map((s,i)=>(
            <div key={i} className="ai-score-row">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:13,color:"var(--t1)",fontWeight:500}}>{s.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span className="mono muted" style={{fontSize:12}}>{s.cur}</span>
                  <span style={{color:"var(--t4)"}}>→</span>
                  <span className="mono" style={{fontSize:14,color:brand.green,fontWeight:600}}>{s.prop}</span>
                </div>
              </div>
              <div style={{fontSize:11,color:"var(--t3)"}}>{s.reason}</div>
            </div>
          ))}
          <div className="btn-row">
            <button className="btn btn-s btn-sm" onClick={()=>{onApply&&onApply();setProposal(null);setFiles([]);}}>✓ Aplicar propuesta</button>
            <button className="btn btn-g btn-sm" onClick={()=>setProposal(null)}>Descartar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
function Messages({messages,onSend}){
  const [txt,setTxt]=useState("");
  const endRef=useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);
  const send=()=>{if(!txt.trim())return;onSend(txt.trim());setTxt("");};
  return(
    <div>
      <div className="msg-thread">
        {messages.length===0&&<div style={{color:"var(--t4)",fontSize:12,textAlign:"center",padding:"20px 0",fontFamily:"'JetBrains Mono',monospace"}}>Sin mensajes aún</div>}
        {messages.map((m,i)=>(
          <div key={i} className={`msg-bubble ${m.from==="client"?"from-c":"from-t"}`}>
            <div className="msg-body">{m.text}</div>
            <div className="msg-meta">{m.from==="client"?"Cliente":"THO Consultora"} · {m.date}</div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      <div className="msg-row">
        <input className="msg-inp" placeholder="Escribe un mensaje…" value={txt}
          onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button className="btn btn-p btn-sm" onClick={send}>Enviar</button>
      </div>
    </div>
  );
}

// ─── MODULE DETAIL: RC ────────────────────────────────────────────────────────
function ModuleRC({client,isConsultant}){
  const m=MOD.rc; const [tab,setTab]=useState("overview");
  const radar=[
    {s:"Percepción",A:client.rc_subs.percepcion},{s:"Compromisos",A:client.rc_subs.compromisos},
    {s:"Diálogo",A:client.rc_subs.dialogo},{s:"Conflictividad",A:client.rc_subs.conflictividad},
    {s:"NPS",A:Math.round((client.rc_subs.percepcion+client.rc_subs.dialogo)/2)},
  ];
  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">Módulo 1 · Relacionamiento Comunitario</div>
        <div className="ph-title" style={{color:m.color}}>Índice LSO</div>
        <div className="ph-row"><span className="badge brc">Licencia Social de Operación</span><ScoreBadge v={client.rc}/></div>
      </div>
      <div className="tabs">
        {[["overview","Resumen"],["subs","Subindicadores"],["trend","Evolución"],["stakeholders","Stakeholders"]].map(([id,l])=>(
          <button key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{l}</button>
        ))}
      </div>
      {tab==="overview"&&(
        <>
          <div className="g4 fu">
            {[["LSO Global",client.rc,m.color],["Percepción",client.rc_subs.percepcion,m.color],["Compromisos",client.rc_subs.compromisos,m.color],["Conflictividad",client.rc_subs.conflictividad,brand.red]].map(([l,v,c])=>(
              <div key={l} className="detail-kpi"><div className="dkpi-val" style={{color:c}}>{v}</div><div className="dkpi-lbl">{l}</div></div>
            ))}
          </div>
          <div className="g2">
            <div className="card">
              <div className="ctitle">Score LSO</div>
              <div style={{display:"flex",justifyContent:"center",padding:"12px 0"}}>
                <ScoreRing val={client.rc} size={140} color={m.color}/>
              </div>
              <div style={{marginTop:18}}>
                <Prog label="Percepción y confianza" val={client.rc_subs.percepcion} color={m.color}/>
                <Prog label="Gestión de compromisos" val={client.rc_subs.compromisos} color={m.color}/>
                <Prog label="Calidad del diálogo" val={client.rc_subs.dialogo} color={m.color}/>
                <Prog label="Conflictividad activa" val={client.rc_subs.conflictividad} color={brand.red}/>
              </div>
            </div>
            <div className="card">
              <div className="ctitle">Perfil de indicadores</div>
              <div style={{height:240}}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar}>
                    <PolarGrid stroke="var(--b2)"/><PolarAngleAxis dataKey="s" tick={{fill:"var(--t3)",fontSize:10,fontFamily:"JetBrains Mono"}}/>
                    <Radar dataKey="A" stroke={m.color} fill={m.color} fillOpacity={.1} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="ctitle">Alertas RC</div>
            {client.alerts.filter(a=>["red","amber"].includes(a.type)).map((a,i)=>(
              <div key={i} className={`alert al-${a.type==="red"?"r":"a"}`}>
                <span>{a.type==="red"?"✕":"⚠"}</span>
                <div><div>{a.text}</div><div style={{fontSize:10,opacity:.6,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{a.date}</div></div>
              </div>
            ))}
          </div>
        </>
      )}
      {tab==="subs"&&(
        <div className="card fu">
          <div className="ctitle">Detalle de subindicadores LSO</div>
          <table className="tbl">
            <thead><tr><th>Subindicador</th><th>Descripción</th><th>Score</th><th>Estado</th></tr></thead>
            <tbody>
              {[
                ["Percepción y confianza","NPS adaptado a stakeholders comunitarios",client.rc_subs.percepcion],
                ["Gestión de compromisos","Seguimiento a acuerdos y compromisos adquiridos",client.rc_subs.compromisos],
                ["Calidad del diálogo","Frecuencia y calidad de mesas de trabajo y reuniones",client.rc_subs.dialogo],
                ["Conflictividad activa","Registro de incidentes, reclamos y conflictos abiertos",client.rc_subs.conflictividad],
              ].map(([n,d,v],i)=>(
                <tr key={i}>
                  <td style={{color:"var(--t1)",fontWeight:500}}>{n}</td>
                  <td style={{fontSize:12}}>{d}</td>
                  <td><span className="mono" style={{color:sc(v),fontSize:14,fontWeight:600}}>{v}</span></td>
                  <td><ScoreBadge v={v}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==="trend"&&(
        <div className="card fu">
          <div className="ctitle">Evolución histórica — LSO</div>
          <div style={{height:240}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={client.trend}>
                <defs><linearGradient id="rc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={m.color} stopOpacity={.2}/><stop offset="95%" stopColor={m.color} stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="p" tick={{fill:"var(--t3)",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[30,100]} tick={{fill:"var(--t3)",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:8,fontSize:12}}/>
                <Area type="monotone" dataKey="rc" stroke={m.color} strokeWidth={2} fill="url(#rc-g)" name="LSO"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {tab==="stakeholders"&&(
        <div className="card fu">
          <div className="ctitle">Mapa de stakeholders</div>
          <table className="tbl">
            <thead><tr><th>Stakeholder</th><th>Tipo</th><th>Nivel de influencia</th><th>Relación</th><th>Última interacción</th></tr></thead>
            <tbody>
              {[
                ["Comunidad La Greda","Comunidad","Alta","En riesgo","Feb 2025"],
                ["Municipalidad de Ovalle","Gobierno local","Alta","Estable","Mar 2025"],
                ["Junta de vigilancia río","Comunidad","Media","Favorable","Ene 2025"],
                ["Sindicato trabajadores","Interno","Alta","Favorable","Mar 2025"],
                ["ONGs ambientales","Sociedad civil","Media","Neutral","Feb 2025"],
              ].map(([n,t,inf,rel,f],i)=>(
                <tr key={i}>
                  <td style={{color:"var(--t1)",fontWeight:500}}>{n}</td>
                  <td>{t}</td>
                  <td><span className={`badge ${inf==="Alta"?"br":"ba"}`}>{inf}</span></td>
                  <td><span className={`badge ${rel==="Favorable"?"bg":rel==="En riesgo"?"br":"ba"}`}>{rel}</span></td>
                  <td className="mono muted" style={{fontSize:11}}>{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MODULE DETAIL: DO ────────────────────────────────────────────────────────
function ModuleDO({client}){
  const m=MOD.do; const [tab,setTab]=useState("overview");
  const barData=[
    {name:"Cultura",score:client.do_subs.cultura},{name:"Engagement",score:client.do_subs.engagement},{name:"Liderazgo",score:client.do_subs.liderazgo},
  ];
  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">Módulo 2 · Desarrollo Organizacional</div>
        <div className="ph-title" style={{color:m.color}}>Índice de Salud Organizacional</div>
        <div className="ph-row"><span className="badge bdo">Cultura · Engagement · Liderazgo</span><ScoreBadge v={client.do}/></div>
      </div>
      <div className="tabs">
        {[["overview","Resumen"],["cultura","Cultura"],["engagement","Engagement"],["liderazgo","Liderazgo"]].map(([id,l])=>(
          <button key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{l}</button>
        ))}
      </div>
      {tab==="overview"&&(
        <>
          <div className="g4 fu">
            {[["Salud Global",client.do,m.color],["Cultura",client.do_subs.cultura,m.color],["Engagement",client.do_subs.engagement,"#e879f9"],["Liderazgo",client.do_subs.liderazgo,brand.blue]].map(([l,v,c])=>(
              <div key={l} className="detail-kpi"><div className="dkpi-val" style={{color:c}}>{v}</div><div className="dkpi-lbl">{l}</div></div>
            ))}
          </div>
          <div className="g2">
            <div className="card">
              <div className="ctitle">Score global DO</div>
              <div style={{display:"flex",justifyContent:"center",padding:"12px 0"}}>
                <ScoreRing val={client.do} size={140} color={m.color}/>
              </div>
              <div style={{marginTop:18}}>
                <Prog label="Cultura organizacional" val={client.do_subs.cultura} color={m.color}/>
                <Prog label="Engagement y clima" val={client.do_subs.engagement} color="#e879f9"/>
                <Prog label="Liderazgo" val={client.do_subs.liderazgo} color={brand.blue}/>
              </div>
            </div>
            <div className="card">
              <div className="ctitle">Comparativa dimensiones</div>
              <div style={{height:240}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barSize={40}>
                    <XAxis dataKey="name" tick={{fill:"var(--t3)",fontSize:11,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tick={{fill:"var(--t3)",fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:8,fontSize:12}}/>
                    <Bar dataKey="score" radius={[6,6,0,0]}>
                      {barData.map((_,i)=><Cell key={i} fill={[m.color,"#e879f9",brand.blue][i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
      {tab==="cultura"&&(
        <div className="card fu">
          <div className="ctitle">Cultura Organizacional</div>
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:14,color:"var(--t1)",fontWeight:600}}>Score cultura</span>
              <span className="mono" style={{fontSize:24,color:m.color}}>{client.do_subs.cultura}</span>
            </div>
          </div>
          <table className="tbl">
            <thead><tr><th>Dimensión cultural</th><th>Descripción</th><th>Score</th></tr></thead>
            <tbody>
              {[["Valores en práctica","Coherencia entre valores declarados y conductas observadas",82],["Comunicación interna","Calidad y transparencia de canales internos",78],["Identidad corporativa","Sentido de pertenencia y orgullo organizacional",80],["Innovación y cambio","Apertura al cambio y capacidad de adaptación",75]].map(([n,d,v],i)=>(
                <tr key={i}><td style={{color:"var(--t1)"}}>{n}</td><td style={{fontSize:12}}>{d}</td><td><span className="mono" style={{color:sc(v)}}>{v}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==="engagement"&&(
        <div className="card fu">
          <div className="ctitle">Engagement y Clima Laboral</div>
          <div className="g4" style={{marginBottom:20}}>
            {[["eNPS","+42",brand.green],["Retención","87%",m.color],["Satisfacción",client.do_subs.engagement,m.color],["Ausencia","3.2%",brand.amber]].map(([l,v,c])=>(
              <div key={l} className="detail-kpi"><div className="dkpi-val" style={{color:c}}>{v}</div><div className="dkpi-lbl">{l}</div></div>
            ))}
          </div>
          <div className="div"/>
          <div className="ctitle-sm">Dimensiones Gallup Q12 (adaptado)</div>
          {[["Claridad de expectativas",85],["Recursos disponibles",72],["Reconocimiento",68],["Relación con jefatura",79],["Desarrollo profesional",74],["Misión y propósito",82]].map(([l,v])=>(
            <Prog key={l} label={l} val={v} color="#e879f9"}/>
          ))}
        </div>
      )}
      {tab==="liderazgo"&&(
        <div className="card fu">
          <div className="ctitle">Evaluación de Liderazgo</div>
          <div className="alert al-b" style={{marginBottom:18}}>ℹ️ Datos basados en evaluación 180° — percepción de colaboradores directos.</div>
          {[["Comunicación efectiva",82],["Orientación al logro",78],["Desarrollo de equipo",75],["Toma de decisiones",80],["Gestión del cambio",70],["Empatía y escucha",76]].map(([l,v])=>(
            <Prog key={l} label={l} val={v} color={brand.blue}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MODULE DETAIL: ESG ───────────────────────────────────────────────────────
function ModuleESG({client}){
  const m=MOD.esg; const [tab,setTab]=useState("overview");
  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">Módulo 3 · Sostenibilidad Corporativa</div>
        <div className="ph-title" style={{color:m.color}}>Índice de Madurez ESG</div>
        <div className="ph-row"><span className="badge besg">Ambiental · Social · Gobernanza</span><ScoreBadge v={client.esg}/></div>
      </div>
      <div className="tabs">
        {[["overview","Resumen"],["e","Ambiental (E)"],["s","Social (S)"],["g","Gobernanza (G)"]].map(([id,l])=>(
          <button key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{l}</button>
        ))}
      </div>
      {tab==="overview"&&(
        <>
          <div className="g4 fu">
            {[["ESG Global",client.esg,m.color],["Ambiental (E)",client.esg_subs?.ambiental,"#4ade80"],["Social (S)",client.esg_subs?.social,brand.blue],["Gobernanza (G)",client.esg_subs?.gobernanza,"#a78bfa"]].map(([l,v,c])=>(
              <div key={l} className="detail-kpi"><div className="dkpi-val" style={{color:c}}>{v??"—"}</div><div className="dkpi-lbl">{l}</div></div>
            ))}
          </div>
          <div className="g2">
            <div className="card">
              <div className="ctitle">Score ESG</div>
              <div style={{display:"flex",justifyContent:"center",padding:"12px 0"}}>
                <ScoreRing val={client.esg} size={140} color={m.color}/>
              </div>
              <div style={{marginTop:18}}>
                <Prog label="Ambiental" val={client.esg_subs?.ambiental} color="#4ade80"/>
                <Prog label="Social" val={client.esg_subs?.social} color={brand.blue}/>
                <Prog label="Gobernanza" val={client.esg_subs?.gobernanza} color="#a78bfa}"/>
              </div>
            </div>
            <div className="card">
              <div className="ctitle">Niveles de madurez por pilar</div>
              {[["Ambiental (E)","#4ade80",3],[("Social (S)"),brand.blue,4],["Gobernanza (G)","#a78bfa",4]].map(([l,c,lvl])=>(
                <div key={l} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:13,color:"var(--t1)"}}>{l}</span>
                    <span className="mono" style={{fontSize:12,color:c}}>Nivel {lvl}/5</span>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    {[1,2,3,4,5].map(i=>(
                      <div key={i} style={{flex:1,height:6,borderRadius:3,background:i<=lvl?c:"var(--b2)"}}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {tab==="e"&&(
        <div className="card fu">
          <div className="ctitle">Pilar Ambiental</div>
          {[["Gestión de residuos",72],["Huella de carbono",65],["Consumo energético",70],["Cumplimiento normativo ambiental",68],["Biodiversidad y ecosistemas",60]].map(([l,v])=>(
            <Prog key={l} label={l} val={v} color="#4ade80"/>
          ))}
        </div>
      )}
      {tab==="s"&&(
        <div className="card fu">
          <div className="ctitle">Pilar Social</div>
          {[["Condiciones laborales",78],["Diversidad e inclusión",70],["Relacionamiento comunitario",68],["Proveedores locales",75],["Salud y seguridad",80]].map(([l,v])=>(
            <Prog key={l} label={l} val={v} color={brand.blue}/>
          ))}
        </div>
      )}
      {tab==="g"&&(
        <div className="card fu">
          <div className="ctitle">Pilar Gobernanza</div>
          {[["Prevención de delitos (Ley 21.595)",74],["Ética empresarial",76],["Transparencia y reporte",70],["Políticas internas",72],["Gestión de riesgos",68]].map(([l,v])=>(
            <Prog key={l} label={l} val={v} color="#a78bfa}"/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({session,isConsultant,client}){
  const [saved,setSaved]=useState(false);
  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">{isConsultant?"Configuración de cuenta":"Mi empresa"}</div>
        <div className="ph-title">Perfil y configuración</div>
      </div>
      <div className="g2">
        <div className="card">
          <div className="ctitle">Datos de {isConsultant?"la consultora":"la empresa"}</div>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
            <div className="profile-avatar-lg">{isConsultant?"T":client.logo}</div>
            <div>
              <div style={{fontSize:16,fontFamily:"'Fraunces',serif",color:"var(--t1)",marginBottom:2}}>{isConsultant?"THO Consultora":client.name}</div>
              <div className="mono muted" style={{fontSize:11}}>{isConsultant?"equipo@tho.cl":client.email}</div>
            </div>
          </div>
          <div className="fg"><label className="fl">Nombre</label><input className="fi" defaultValue={isConsultant?"THO Consultora":client.name}/></div>
          <div className="fg"><label className="fl">Email de contacto</label><input className="fi" type="email" defaultValue={isConsultant?"equipo@tho.cl":client.email}/></div>
          {!isConsultant&&(
            <>
              <div className="fg"><label className="fl">Sector</label><input className="fi" defaultValue={client.profile.sector}/></div>
              <div className="frow">
                <div className="fg"><label className="fl">Tamaño</label><input className="fi" defaultValue={client.profile.size}/></div>
                <div className="fg"><label className="fl">Región</label><input className="fi" defaultValue={client.profile.region}/></div>
              </div>
            </>
          )}
          <div className="btn-row">
            <button className="btn btn-p btn-sm" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);}}>
              {saved?"✓ Guardado":"Guardar cambios"}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="ctitle">Preferencias</div>
          {[["Notificaciones por email","Recibir alertas cuando se publica un reporte",true],["Resumen semanal","Email con resumen de métricas cada lunes",false],["Alertas críticas","Notificación inmediata en umbrales críticos",true]].map(([l,d,def],i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"13px 0",borderBottom:"1px solid var(--b1)"}}>
              <div style={{paddingRight:16}}>
                <div style={{fontSize:13,color:"var(--t1)",fontWeight:500,marginBottom:2}}>{l}</div>
                <div style={{fontSize:12,color:"var(--t3)"}}>{d}</div>
              </div>
              <label className="tgl" style={{marginTop:2}}><input type="checkbox" defaultChecked={def}/><div className="tgl-sl"/></label>
            </div>
          ))}
          <div className="div"/>
          <div className="ctitle-sm">Seguridad</div>
          <div className="fg"><label className="fl">Nueva contraseña</label><input className="fi" type="password" placeholder="••••••••"/></div>
          <button className="btn btn-g btn-sm">Actualizar contraseña</button>
        </div>
      </div>
    </div>
  );
}

// ─── CONSULTANT METRICS HOME ──────────────────────────────────────────────────
function ConsultantHome({clients}){
  const published=clients.filter(c=>c.published).length;
  const avgIRCS=Math.round(clients.reduce((a,c)=>a+c.ircs,0)/clients.length);
  const allScores=clients.flatMap(c=>[c.rc,c.do,c.esg].filter(Boolean));
  const avgScore=Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length);
  const radarData=[{s:"Minera Los Andes",A:72},{s:"Constructora BíoBío",A:58}];
  const trendData=[
    {p:"Q2'24",avg:57.5},{p:"Q3'24",avg:65},{p:"Q4'24",avg:62.5},{p:"Q1'25",avg:65},
  ];
  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">Panel de Administración · THO Consultora</div>
        <div className="ph-title">Métricas internas</div>
        <div className="ph-desc muted">Resumen de desempeño de tu cartera de clientes</div>
      </div>
      <div className="metric-hero fu">
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--t3)",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>IRCS promedio de cartera</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:8}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:56,color:sc(avgIRCS),lineHeight:1}}>{avgIRCS}</div>
          <div style={{paddingBottom:8}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:brand.green}}>↑ +3.5</div>
            <div style={{fontSize:12,color:"var(--t3)"}}>vs Q4 2024</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--t2)"}}>Promedio basado en {clients.length} clientes activos · {published} reporte(s) publicado(s)</div>
      </div>
      <div className="g4 fu fu1">
        {[
          ["Clientes activos",clients.length,"var(--t1)"],
          ["Reportes publicados",published,brand.green],
          ["Score promedio",avgScore,sc(avgScore)],
          ["Módulos activos",clients.reduce((a,c)=>a+Object.values(c.modules).filter(Boolean).length,0),"var(--t1)"],
        ].map(([l,v,c])=>(
          <div key={l} className="stat-chip"><div className="stat-val" style={{color:c}}>{v}</div><div className="stat-lbl">{l}</div></div>
        ))}
      </div>
      <div className="g2">
        <div className="card fu fu2">
          <div className="ctitle">Evolución IRCS promedio cartera</div>
          <div style={{height:200}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs><linearGradient id="avg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={brand.blue} stopOpacity={.15}/><stop offset="95%" stopColor={brand.blue} stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="p" tick={{fill:"var(--t3)",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[40,100]} tick={{fill:"var(--t3)",fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:8,fontSize:12}}/>
                <Area type="monotone" dataKey="avg" stroke={brand.blue} strokeWidth={2} fill="url(#avg-g)" name="IRCS Prom."/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card fu fu3">
          <div className="ctitle">Estado de clientes</div>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>IRCS</th><th>Estado</th><th>Módulos</th></tr></thead>
            <tbody>
              {clients.map(c=>(
                <tr key={c.id}>
                  <td style={{color:"var(--t1)",fontWeight:500}}>{c.logo} {c.name}</td>
                  <td><span className="mono" style={{color:sc(c.ircs),fontSize:14}}>{c.ircs}</span></td>
                  <td><span className={`badge ${c.published?"bg":"ba"}`}>{c.published?"Publicado":"Borrador"}</span></td>
                  <td className="mono muted" style={{fontSize:11}}>{Object.entries(c.modules).filter(([,v])=>v).map(([k])=>k.toUpperCase()).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card fu fu4">
        <div className="ctitle">Actividad reciente</div>
        {[
          {icon:"📊",text:"Encuesta_Stakeholders_Q1_2025.xlsx procesada con IA para Minera Los Andes",date:"5 Mar 2025",c:brand.rc},
          {icon:"✓",text:"Reporte Q1 publicado para Minera Los Andes",date:"1 Mar 2025",c:brand.green},
          {icon:"⚠",text:"Alerta de conflictividad activada — Minera Los Andes, sector norte",date:"3 Mar 2025",c:brand.amber},
          {icon:"📁",text:"Reporte_Ambiental_2024.pdf cargado para análisis ESG",date:"20 Feb 2025",c:brand.esg},
        ].map((a,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"11px 0",borderBottom:"1px solid var(--b1)"}}>
            <div style={{width:32,height:32,borderRadius:8,background:`${a.c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{a.icon}</div>
            <div><div style={{fontSize:13,color:"var(--t2)"}}>{a.text}</div><div style={{fontSize:11,color:"var(--t3)",fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{a.date}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────
function ClientDashboard({client,onMsg}){
  const [tab,setTab]=useState("overview");
  const activeM=Object.entries(client.modules).filter(([,v])=>v);
  const prev=client.trend[client.trend.length-2];
  const curr=client.trend[client.trend.length-1];
  const radarData=[
    {s:"Percepción",A:client.rc_subs.percepcion},{s:"Compromisos",A:client.rc_subs.compromisos},
    {s:"Cultura",A:client.do_subs.cultura},{s:"Engagement",A:client.do_subs.engagement},
    {s:"Ambiental",A:client.esg_subs.ambiental||0},{s:"Gobernanza",A:client.esg_subs.gobernanza||0},
  ];
  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">Dashboard Ejecutivo · {client.period}</div>
        <div className="ph-title">{client.name}</div>
        <div className="ph-row">
          <span style={{fontSize:13,color:"var(--t3)"}}>{client.industry}</span>
          <ScoreBadge v={client.ircs}/>
          {activeM.map(([k])=>(
            <span key={k} className="mod-tag" style={{color:MOD[k].color,borderColor:MOD[k].color,opacity:.75}}>{MOD[k].short}</span>
          ))}
        </div>
      </div>
      <div className="tabs">
        {[["overview","Resumen"],["calendar","Agenda"],["messages","Mensajes"]].map(([id,l])=>(
          <button key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>
            {l}{id==="messages"&&client.messages.length>0&&<span style={{marginLeft:6,background:brand.blue,color:"white",borderRadius:10,padding:"0 5px",fontSize:10}}>{client.messages.length}</span>}
          </button>
        ))}
      </div>
      {tab==="overview"&&(
        <>
          <div className="hero fu">
            <div>
              <div className="hero-eye">THO · Índice de Reputación Corporativa Sostenible</div>
              <div className="hero-co">{client.name}</div>
              <div className="hero-per">{client.industry} · Período {client.period}</div>
              <div className="hero-desc">Su organización mantiene una posición <strong style={{color:sc(client.ircs)}}>{client.ircs>=70?"favorable":client.ircs>=50?"en desarrollo":"crítica"}</strong> en el IRCS, que integra los servicios activos de relacionamiento, desarrollo organizacional y sostenibilidad.</div>
              <div className="hero-tags">
                {activeM.map(([k])=>(
                  <span key={k} className="mod-tag" style={{color:MOD[k].color,borderColor:MOD[k].color}}>{MOD[k].icon} {MOD[k].short} · {client[k]}</span>
                ))}
              </div>
            </div>
            <div style={{textAlign:"center"}}>
              <ScoreRing val={client.ircs} size={128}/>
              <div style={{marginTop:9,fontSize:12,color:"var(--t3)"}}>IRCS Global</div>
              <div className="mono" style={{fontSize:11,color:brand.green,marginTop:3}}>↑ +{curr.ircs-prev.ircs} vs período anterior</div>
            </div>
          </div>
          <div className="g3 fu fu1">
            {Object.entries(MOD).map(([key,m])=>{
              const active=client.modules[key]; const score=client[key];
              return(
                <div key={key} className={`mod-card ${!active?"mod-locked":""}`}>
                  <div className="mod-bar" style={{background:`linear-gradient(90deg,${m.color},${m.color2})`}}/>
                  {!active&&<div className="mod-lock-lbl">🔒 No activo</div>}
                  <div className="mod-icon" style={{background:m.cA}}>{m.icon}</div>
                  <div className="mod-score" style={{color:sc(score)}}>{score??"—"}</div>
                  <div className="mod-name">{m.label}</div>
                  <div className="mod-sub">{m.scoreLabel}</div>
                  {key==="rc"&&active&&<><Prog label="Percepción" val={client.rc_subs.percepcion} color={m.color}/><Prog label="Compromisos" val={client.rc_subs.compromisos} color={m.color}/><Prog label="Diálogo" val={client.rc_subs.dialogo} color={m.color}/></>}
                  {key==="do"&&active&&<><Prog label="Cultura" val={client.do_subs.cultura} color={m.color}/><Prog label="Engagement" val={client.do_subs.engagement} color="#e879f9"/><Prog label="Liderazgo" val={client.do_subs.liderazgo} color={brand.blue}/></>}
                  {key==="esg"&&active&&<><Prog label="Ambiental" val={client.esg_subs.ambiental} color="#4ade80"/><Prog label="Social" val={client.esg_subs.social} color={brand.blue}/><Prog label="Gobernanza" val={client.esg_subs.gobernanza} color="#a78bfa}/></>}
                </div>
              );
            })}
          </div>
          <div className="g2">
            <div className="card fu fu2">
              <div className="ctitle">Evolución histórica</div>
              <div style={{height:190}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={client.trend}>
                    <defs><linearGradient id="cl-g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={brand.blue} stopOpacity={.16}/><stop offset="95%" stopColor={brand.blue} stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="p" tick={{fill:"var(--t3)",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[40,100]} tick={{fill:"var(--t3)",fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:8,fontSize:12}}/>
                    <Area type="monotone" dataKey="ircs" stroke={brand.blue} strokeWidth={2} fill="url(#cl-g)" name="IRCS"/>
                    {client.modules.rc&&<Area type="monotone" dataKey="rc" stroke={brand.rc} strokeWidth={1.5} fill="none" name="RC" strokeDasharray="4 3"/>}
                    {client.modules.do&&<Area type="monotone" dataKey="do" stroke={brand.do} strokeWidth={1.5} fill="none" name="DO" strokeDasharray="4 3"/>}
                    {client.modules.esg&&<Area type="monotone" dataKey="esg" stroke={brand.esg} strokeWidth={1.5} fill="none" name="ESG" strokeDasharray="4 3"/>}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="div"/>
              <div className="ctitle-sm">Comparativa períodos</div>
              {[["IRCS","ircs"],["RC","rc"],["DO","do"]].filter(([,k])=>client[k]!==null).map(([l,k])=>{
                const diff=curr[k]-prev[k];
                return(
                  <div key={k} className="cmp-row">
                    <div className="cmp-lbl">{l}</div>
                    <div className="cmp-val" style={{color:sc(curr[k])}}>{curr[k]}</div>
                    <div className={`mono ${diff>0?"arr-up":diff<0?"arr-dn":"arr-fl"}`} style={{fontSize:12}}>
                      {diff>0?`↑ +${diff}`:diff<0?`↓ ${diff}`:"→"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="card fu fu3">
              <div className="ctitle">Radar de indicadores</div>
              <div style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--b2)"/>
                    <PolarAngleAxis dataKey="s" tick={{fill:"var(--t3)",fontSize:10,fontFamily:"JetBrains Mono"}}/>
                    <Radar dataKey="A" stroke={brand.rc} fill={brand.rc} fillOpacity={.08} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="card fu fu4">
            <div className="sec-hdr"><div className="ctitle mb0">Alertas y recomendaciones</div></div>
            {client.alerts.map((a,i)=>(
              <div key={i} className={`alert al-${a.type==="red"?"r":a.type==="amber"?"a":"g"}`}>
                <span>{a.type==="green"?"✓":a.type==="amber"?"⚠":"✕"}</span>
                <div><div>{a.text}</div><div style={{fontSize:10,opacity:.6,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{a.date}</div></div>
              </div>
            ))}
            <div className="div"/>
            <div className="ctitle-sm">Próximos pasos recomendados</div>
            {client.recommendations.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:11,padding:"9px 0",borderBottom:"1px solid var(--b1)"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:brand.blue,marginTop:5,flexShrink:0}}/>
                <div style={{fontSize:13,color:"var(--t2)"}}>{r}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {tab==="calendar"&&(
        <div className="g2">
          <div className="card fu"><div className="ctitle">Agenda</div><Calendar events={client.events}/></div>
          <div className="card fu fu1">
            <div className="ctitle">Próximas actividades</div>
            {client.events.map((e,i)=>(
              <div key={i} style={{display:"flex",gap:11,padding:"11px 0",borderBottom:"1px solid var(--b1)"}}>
                <div style={{width:34,height:34,borderRadius:8,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:e.color,border:`1px solid ${e.color}30`}}>{e.day}</div>
                <div><div style={{fontSize:13,color:"var(--t1)",fontWeight:500}}>{e.text}</div><div style={{fontSize:11,color:"var(--t3)",fontFamily:"'JetBrains Mono',monospace"}}>Mar {e.day}, 2025</div></div>
              </div>
            ))}
            <button className="btn btn-g btn-sm" style={{marginTop:12}}>+ Solicitar reunión</button>
          </div>
        </div>
      )}
      {tab==="messages"&&(
        <div className="card fu">
          <div className="ctitle">Canal de comunicación — THO Consultora</div>
          <div style={{fontSize:13,color:"var(--t3)",marginBottom:16}}>Deja comentarios, preguntas o sugerencias al equipo consultor.</div>
          <Messages messages={client.messages} onSend={txt=>onMsg(txt,"client")}/>
        </div>
      )}
    </div>
  );
}

// ─── CONSULTANT PANEL ─────────────────────────────────────────────────────────
function ConsultantPanel({clients,setClients,selId,setSelId}){
  const [tab,setTab]=useState("overview");
  const [weights,setWeights]=useState(null);
  const [saved,setSaved]=useState(false);
  const client=clients.find(c=>c.id===selId);
  useEffect(()=>setWeights({...client.weights}),[selId]);

  function toggle(f){setClients(p=>p.map(c=>c.id===selId?{...c,[f]:!c[f]}:c));}
  function toggleMod(m){setClients(p=>p.map(c=>c.id===selId?{...c,modules:{...c.modules,[m]:!c.modules[m]}}:c));}
  function sendMsg(txt,from){
    const d=new Date(); const ds=`${d.getDate()} Mar · ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
    setClients(p=>p.map(c=>c.id===selId?{...c,messages:[...c.messages,{from,text:txt,date:ds}]}:c));
  }
  function applyFile(){
    const d=new Date(); const nf={name:`Archivo_${d.getHours()}${d.getMinutes()}.xlsx`,type:"excel",date:`${d.getDate()} Mar 2025`,module:"RC",ai_score:70,status:"applied"};
    setClients(p=>p.map(c=>c.id===selId?{...c,files:[nf,...c.files]}:c));
  }

  const tabs=[["overview","Resumen"],["upload","Carga IA"],["heatmap","Mapa Riesgo"],["weights","Pesos"],["admin","Admin"],["messages","Mensajes"],["files","Historial"]];

  return(
    <div className="page fu">
      <div className="ph">
        <div className="ph-eye">Panel de Administración · THO Consultora</div>
        <div className="ph-title">Centro de control</div>
        <div className="ph-desc muted">Gestiona datos, pesos y publicación para cada cliente</div>
      </div>
      {/* Client selector */}
      <div className="card card-sm" style={{marginBottom:16}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--t3)",letterSpacing:2,textTransform:"uppercase",marginBottom:9}}>Cliente activo</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {clients.map(c=>(
            <div key={c.id} onClick={()=>setSelId(c.id)} style={{
              padding:"7px 14px",borderRadius:20,cursor:"pointer",transition:"all .15s",
              border:`1px solid ${selId===c.id?"rgba(59,130,246,.4)":"var(--b2)"}`,
              background:selId===c.id?brand.blueA:"var(--s2)",
              color:selId===c.id?brand.blue:"var(--t2)",fontSize:13,fontWeight:500,
              display:"flex",alignItems:"center",gap:8,
            }}>
              <div style={{width:6,height:6,borderRadius:"50%",background:c.published?brand.green:brand.amber}}/>
              {c.logo} {c.name}
              {!c.published&&<span style={{fontSize:10,opacity:.6}}>BORRADOR</span>}
            </div>
          ))}
        </div>
      </div>
      {/* Publish banner */}
      <div className={`pub-banner ${client.published?"pub-live":"pub-draft"}`}>
        <div className="pub-info">
          <div className="pub-dot" style={{background:client.published?brand.green:brand.amber}}/>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>{client.published?"Publicado — visible para el cliente":"Borrador — el cliente no puede verlo"}</div>
            <div style={{fontSize:11,color:"var(--t3)"}}>{client.name} · {client.period}</div>
          </div>
        </div>
        <button className={`btn btn-sm ${client.published?"btn-g":"btn-s"}`} onClick={()=>toggle("published")}>
          {client.published?"Despublicar":"✓ Publicar al cliente"}
        </button>
      </div>
      <div className="tabs" style={{flexWrap:"wrap"}}>
        {tabs.map(([id,l])=>(
          <button key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>
            {l}
            {id==="messages"&&client.messages.filter(m=>m.from==="client").length>0&&(
              <span style={{marginLeft:5,background:brand.red,color:"white",borderRadius:10,padding:"0 5px",fontSize:10}}>
                {client.messages.filter(m=>m.from==="client").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab==="overview"&&(
        <>
          <div className="g4 fu">
            {[["IRCS",client.ircs],["RC",client.rc],["DO",client.do],["ESG",client.esg]].map(([l,v])=>(
              <div key={l} className="stat-chip"><div className="stat-val" style={{color:sc(v??0)}}>{v??"—"}</div><div className="stat-lbl">{l}</div></div>
            ))}
          </div>
          <div className="card">
            <div className="sec-hdr"><div className="ctitle mb0">Todos los subindicadores</div><span className="badge bb">Solo consultora</span></div>
            <table className="tbl">
              <thead><tr><th>Módulo</th><th>Subindicador</th><th>Score</th><th>Estado</th></tr></thead>
              <tbody>
                {[["RC","Percepción y confianza",client.rc_subs.percepcion],["RC","Compromisos",client.rc_subs.compromisos],["RC","Calidad del diálogo",client.rc_subs.dialogo],["RC","Conflictividad",client.rc_subs.conflictividad],["DO","Cultura",client.do_subs.cultura],["DO","Engagement",client.do_subs.engagement],["DO","Liderazgo",client.do_subs.liderazgo],["ESG","Ambiental",client.esg_subs.ambiental],["ESG","Social",client.esg_subs.social],["ESG","Gobernanza",client.esg_subs.gobernanza]].map(([m,s,v],i)=>(
                  <tr key={i}>
                    <td><span className={`badge b${m.toLowerCase()}`}>{m}</span></td>
                    <td style={{color:"var(--t1)"}}>{s}</td>
                    <td><span className="mono" style={{color:sc(v),fontSize:14}}>{v??"—"}</span></td>
                    <td><ScoreBadge v={v}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card" style={{marginTop:16}}>
            <div className="ctitle">Notas internas</div>
            <textarea className="fta" defaultValue={client.internal_notes}/>
            <div className="btn-row"><button className="btn btn-p btn-sm">Guardar nota</button></div>
          </div>
        </>
      )}
      {tab==="upload"&&(
        <div className="card fu">
          <div className="ctitle">Carga multi-fuente con análisis IA</div>
          <div style={{fontSize:13,color:"var(--t2)",marginBottom:16,lineHeight:1.65}}>Sube cualquier archivo del período. La IA detecta el tipo de contenido, extrae indicadores y propone actualizaciones de score para tu revisión.</div>
          <div className="alert al-rc" style={{marginBottom:16}}>✦ La IA propone — tú decides. Ningún score se actualiza sin tu confirmación.</div>
          <FileUpload onApply={applyFile}/>
        </div>
      )}
      {tab==="heatmap"&&(
        <div className="card fu">
          <div className="ctitle">Mapa de calor de riesgos — {client.name}</div>
          <RiskHeatmap/>
        </div>
      )}
      {tab==="weights"&&weights&&(
        <div className="card fu">
          <div className="ctitle">Configuración de pesos IRCS — {client.name}</div>
          <div style={{fontSize:13,color:"var(--t2)",marginBottom:22}}>Ajusta el peso de cada módulo en el cálculo del IRCS. Deben sumar 100%.</div>
          {Object.entries(MOD).map(([key,m])=>(
            <div key={key} style={{marginBottom:22,opacity:client.modules[key]?1:.4}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:m.color,letterSpacing:2,textTransform:"uppercase",marginBottom:9}}>{m.label}{!client.modules[key]&&" (no activo)"}</div>
              <div className="sldr-wrap">
                <input type="range" min={0} max={80} value={weights[key]} className="sldr"
                  disabled={!client.modules[key]}
                  onChange={e=>setWeights(p=>({...p,[key]:parseInt(e.target.value)}))}/>
                <div className="sldr-val" style={{color:m.color}}>{weights[key]}%</div>
              </div>
            </div>
          ))}
          <div style={{padding:"12px 16px",background:"var(--s2)",borderRadius:8,marginBottom:16}}>
            <span className="mono" style={{fontSize:12,color:"var(--t3)"}}>
              Total: <span style={{color:weights.rc+weights.do+weights.esg===100?brand.green:brand.red}}>{weights.rc+weights.do+weights.esg}%</span>
              {weights.rc+weights.do+weights.esg!==100&&<span style={{color:brand.amber,marginLeft:10}}>· Deben sumar 100</span>}
            </span>
          </div>
          <button className="btn btn-p btn-sm" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);}}>
            {saved?"✓ Guardado":"Aplicar pesos"}
          </button>
        </div>
      )}
      {tab==="admin"&&(
        <div className="fu">
          <div className="card" style={{marginBottom:16}}>
            <div className="ctitle">Gestión de módulos por cliente</div>
            {clients.map(c=>(
              <div key={c.id} className="client-admin-row">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                  <div>
                    <div style={{fontSize:14,fontFamily:"'Fraunces',serif",color:"var(--t1)"}}>{c.logo} {c.name}</div>
                    <div style={{fontSize:11,color:"var(--t3)",fontFamily:"'JetBrains Mono',monospace"}}>{c.industry} · {c.period}</div>
                  </div>
                  <div style={{display:"flex",gap:9,alignItems:"center"}}>
                    <span className={`badge ${c.published?"bg":"ba"}`}>{c.published?"Publicado":"Borrador"}</span>
                    <button className="btn btn-g btn-sm">Editar</button>
                  </div>
                </div>
                <div style={{display:"flex",gap:20}}>
                  {Object.entries(MOD).map(([key,m])=>(
                    <div key={key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                      <label className="tgl">
                        <input type="checkbox" checked={c.modules[key]} onChange={()=>c.id===selId?toggleMod(key):null}/>
                        <div className="tgl-sl"/>
                      </label>
                      <span style={{fontSize:11,color:c.modules[key]?m.color:"var(--t4)"}}>{m.short}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn btn-g btn-sm" style={{marginTop:8}}>+ Agregar cliente</button>
          </div>
          <div className="card">
            <div className="ctitle">Usuarios y accesos</div>
            <table className="tbl">
              <thead><tr><th>Email</th><th>Empresa</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {[["rfernandez@mlosandes.cl","Minera Los Andes","Cliente","Activo"],["amora@biobio.cl","Constructora BíoBío","Cliente","Activo"],["admin@tho.cl","THO Consultora","Admin","Activo"]].map(([e,emp,r,s],i)=>(
                  <tr key={i}>
                    <td style={{color:"var(--t1)"}}>{e}</td><td>{emp}</td>
                    <td><span className={`badge ${r==="Admin"?"bb":"bg"}`}>{r}</span></td>
                    <td><span className="badge bg">{s}</span></td>
                    <td><button className="btn btn-d btn-sm">Suspender</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn btn-g btn-sm" style={{marginTop:12}}>+ Invitar usuario</button>
          </div>
        </div>
      )}
      {tab==="messages"&&(
        <div className="card fu">
          <div className="ctitle">Mensajes de {client.name}</div>
          <Messages messages={client.messages} onSend={txt=>sendMsg(txt,"consultant")}/>
        </div>
      )}
      {tab==="files"&&(
        <div className="card fu">
          <div className="sec-hdr"><div className="ctitle mb0">Historial de archivos</div><span className="badge bb">{client.files.length} archivos</span></div>
          {client.files.map((f,i)=>(
            <div key={i} className="file-row">
              <div className="f-icon" style={{background:fileColor(f.type)}}>{fileIcon(f.type)}</div>
              <div className="f-info"><div className="f-name">{f.name}</div><div className="f-meta">{f.module} · {f.date} · Score IA: {f.ai_score}</div></div>
              <span className="badge bg">Aplicado</span>
              <button className="btn btn-g btn-sm">Ver análisis</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin,t}){
  const [role,setRole]=useState("consultant");
  return(
    <div className="login-wrap">
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(${t.b1} 1px,transparent 1px)`,backgroundSize:"28px 28px",opacity:.6}}/>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,rgba(249,115,22,.05),transparent 65%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"relative",background:t.s1,border:`1px solid ${t.b2}`,borderRadius:20,padding:44,width:400,boxShadow:t.shadowLg,animation:"fadeUp .4s ease both"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:26,color:t.t1,marginBottom:3}}>
          THO <span style={{background:`linear-gradient(90deg,${brand.rc},${brand.do})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Compass</span>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:t.t3,letterSpacing:3,textTransform:"uppercase",marginBottom:32}}>Plataforma de Reputación Corporativa</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:t.t3,letterSpacing:2,textTransform:"uppercase",marginBottom:9}}>Tipo de acceso</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:22}}>
          {[["consultant","⚙️","Consultora"],["client","📊","Cliente"]].map(([r,ic,l])=>(
            <div key={r} onClick={()=>setRole(r)} style={{
              padding:"14px 10px",borderRadius:12,border:`1px solid ${role===r?"rgba(249,115,22,.4)":t.b2}`,
              background:role===r?brand.rcA:t.s2,color:role===r?brand.rc:t.t3,
              cursor:"pointer",textAlign:"center",transition:"all .2s",
            }}>
              <div style={{fontSize:22,marginBottom:5}}>{ic}</div>
              <div style={{fontSize:13,fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:14}}><label style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:t.t3,letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7}}>Email</label>
          <input style={{width:"100%",background:t.s2,border:`1px solid ${t.b2}`,borderRadius:8,padding:"10px 13px",color:t.t1,fontSize:13,outline:"none"}} placeholder={role==="consultant"?"equipo@tho.cl":"contacto@empresa.cl"}/>
        </div>
        <div style={{marginBottom:20}}><label style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:t.t3,letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:7}}>Contraseña</label>
          <input type="password" style={{width:"100%",background:t.s2,border:`1px solid ${t.b2}`,borderRadius:8,padding:"10px 13px",color:t.t1,fontSize:13,outline:"none"}} placeholder="••••••••"/>
        </div>
        <button onClick={()=>onLogin(role)} style={{width:"100%",padding:13,background:`linear-gradient(135deg,${brand.rc},${brand.do})`,border:"none",borderRadius:8,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Figtree',sans-serif"}}>
          Ingresar a THO Compass
        </button>
        <div style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:t.t3,marginTop:14}}>Prototipo v3 · Datos simulados</div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [darkMode,setDarkMode]=useState(true);
  const [session,setSession]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [clients,setClients]=useState(INIT_CLIENTS);
  const [page,setPage]=useState("home");
  const [selClientId,setSelClientId]=useState(1);
  const [showTour,setShowTour]=useState(false);

  const t=darkMode?darkTokens:lightTokens;
  const css=buildCSS(t);

  const isC=session?.role==="consultant";
  const clientData=clients[0];
  const selClient=clients.find(c=>c.id===selClientId);

  function login(role){setSession({role});if(role==="client")setShowTour(true);}
  function logout(){setSession(null);setPage("home");}
  function sendMsg(txt,from){
    const d=new Date(); const ds=`${d.getDate()} Mar · ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
    setClients(p=>p.map(c=>c.id===clientData.id?{...c,messages:[...c.messages,{from,text:txt,date:ds}]}:c));
  }

  const consultantNav=[
    {id:"home",icon:"◈",label:"Métricas generales"},
    {sep:true,label:"Gestión"},
    {id:"control",icon:"⚙",label:"Centro de control"},
    {sep:true,label:"Módulos"},
    {id:"rc",icon:"🤝",label:"Relacionamiento",activeCls:"rc-active"},
    {id:"do",icon:"🏛️",label:"Desarrollo Org.",activeCls:"do-active"},
    {id:"esg",icon:"🌿",label:"Sostenibilidad",activeCls:"esg-active"},
    {sep:true,label:"Cuenta"},
    {id:"profile",icon:"👤",label:"Perfil"},
    {id:"tour",icon:"❓",label:"Tour guiado"},
  ];

  const clientNav=[
    {id:"home",icon:"◈",label:"Mi Dashboard"},
    {sep:true,label:"Servicios activos"},
    {id:"rc",icon:"🤝",label:"Relacionamiento",activeCls:"rc-active",locked:!clientData.modules.rc},
    {id:"do",icon:"🏛️",label:"Desarrollo Org.",activeCls:"do-active",locked:!clientData.modules.do},
    {id:"esg",icon:"🌿",label:"Sostenibilidad",activeCls:"esg-active",locked:!clientData.modules.esg},
    {sep:true,label:"Cuenta"},
    {id:"messages",icon:"✉",label:"Mensajes",badge:clientData.messages.filter(m=>m.from==="consultant").length||null},
    {id:"profile",icon:"👤",label:"Mi perfil"},
    {id:"tour",icon:"❓",label:"Tour guiado"},
  ];

  const nav=isC?consultantNav:clientNav;
  const activeClient=isC?selClient:clientData;

  function navigate(id){
    if(id==="tour"){setShowTour(true);return;}
    setPage(id);
  }

  function renderPage(){
    if(isC){
      if(page==="home")return<ConsultantHome clients={clients}/>;
      if(page==="control")return<ConsultantPanel clients={clients} setClients={setClients} selId={selClientId} setSelId={setSelClientId}/>;
      if(page==="rc")return<ModuleRC client={selClient} isConsultant={true}/>;
      if(page==="do")return<ModuleDO client={selClient}/>;
      if(page==="esg")return<ModuleESG client={selClient}/>;
      if(page==="profile")return<ProfilePage isConsultant={true} client={selClient}/>;
    } else {
      if(page==="home")return<ClientDashboard client={clientData} onMsg={sendMsg}/>;
      if(page==="rc"&&clientData.modules.rc)return<ModuleRC client={clientData} isConsultant={false}/>;
      if(page==="do"&&clientData.modules.do)return<ModuleDO client={clientData}/>;
      if(page==="esg"&&clientData.modules.esg)return<ModuleESG client={clientData}/>;
      if(page==="profile")return<ProfilePage isConsultant={false} client={clientData}/>;
      if(page==="messages")return(
        <div className="page fu">
          <div className="ph"><div className="ph-eye">Comunicación</div><div className="ph-title">Mensajes</div></div>
          <div className="card"><div className="ctitle">Canal con THO Consultora</div><Messages messages={clientData.messages} onSend={txt=>sendMsg(txt,"client")}/></div>
        </div>
      );
    }
    return null;
  }

  // CSS injection for dynamic tokens
  const dynCSS=`
    .score-inner{background:${t.bg}!important;}
    :root{--b1:${t.b1};--b2:${t.b2};--s2:${t.s2};--s3:${t.s3};--t1:${t.t1};--t2:${t.t2};--t3:${t.t3};--t4:${t.t4};}
  `;

  if(!session)return(<><style>{css}{dynCSS}</style><Login onLogin={login} t={t}/></>);

  const pageLabel=nav.find(n=>n.id===page)?.label||"Dashboard";

  return(
    <>
      <style>{css}{dynCSS}</style>
      {showTour&&<OnboardingTour onClose={()=>setShowTour(false)} t={t}/>}
      <div className="shell">
        {/* SIDEBAR */}
        <div className={`sidebar ${sidebarOpen?"":"col"}`}>
          <div className="sb-head">
            <div className="sb-mark">T</div>
            <div className="sb-title">THO <span>Compass</span></div>
            <button className="sb-toggle" onClick={()=>setSidebarOpen(o=>!o)}>{sidebarOpen?"←":"→"}</button>
          </div>
          <div className="sb-nav">
            {nav.map((item,i)=>item.sep
              ?<div key={i} className="sb-section-lbl">{item.label}</div>
              :(
                <div key={item.id}
                  className={`nav-item ${page===item.id?`active ${item.activeCls||""}`:""} ${item.locked?"":""}` }
                  onClick={()=>!item.locked&&navigate(item.id)}
                  style={{opacity:item.locked?.35:1,cursor:item.locked?"default":"pointer"}}
                  title={sidebarOpen?"":item.label}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-lbl">{item.label}</span>
                  {item.badge>0&&<span className="nav-badge">{item.badge}</span>}
                  {item.locked&&<span className="nav-locked nav-lbl">🔒</span>}
                </div>
              )
            )}
          </div>
          <div className="sb-bottom">
            <div className="sb-user">
              <div className={`sb-avatar ${isC?"av-c":"av-cl"}`}>{isC?"TH":clientData.logo}</div>
              <div className="sb-user-info">
                <div className="sb-uname">{isC?"THO Team":clientData.name}</div>
                <div className="sb-urole">{isC?"consultora":"cliente"}</div>
              </div>
            </div>
            <button className="sb-logout" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>

        {/* MAIN */}
        <div className={`main ${sidebarOpen?"":"col"}`}>
          {/* TOPBAR */}
          <div className="topbar">
            <div className="tb-right" style={{marginRight:"auto"}}>
              <div className="breadcrumb">THO Compass <strong>/ {pageLabel}</strong></div>
            </div>
            <div className="tb-right">
              <button className="tb-btn" onClick={()=>setShowTour(true)} title="Tour guiado">❓</button>
              <button className="tb-btn tb-theme" onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Modo claro":"Modo oscuro"}>
                {darkMode?"☀️":"🌙"}
              </button>
              <div className="notif-wrap">
                <button className="tb-btn">🔔<div className="notif-dot"/></button>
              </div>
              {isC&&(
                <div className="client-chip" onClick={()=>setPage("control")}>
                  <div className="online-dot"/>
                  {selClient.logo} {selClient.name}
                  <span style={{color:"var(--t3)"}}>▾</span>
                </div>
              )}
            </div>
          </div>
          {renderPage()}
        </div>
      </div>
    </>
  );
}
