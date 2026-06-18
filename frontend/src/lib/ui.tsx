'use client'
import React, { useEffect } from 'react'

export const C = {
  bg:'#0F0A06',bg2:'#150E08',bg3:'#1C1209',
  surface:'rgba(255,255,255,0.04)',surface2:'rgba(255,255,255,0.07)',
  border:'rgba(255,255,255,0.08)',border2:'rgba(255,255,255,0.14)',
  gold:'#C4956A',gold2:'#8B6F47',goldLight:'rgba(196,149,106,0.15)',
  text:'rgba(255,255,255,0.92)',text2:'rgba(255,255,255,0.65)',text3:'rgba(255,255,255,0.35)',
  green:'#6B8E6E',greenLight:'rgba(107,142,110,0.15)',
  red:'#E74C3C',redLight:'rgba(192,57,43,0.15)',
  blue:'#3498DB',blueLight:'rgba(52,152,219,0.15)',
  purple:'#9B59B6',orange:'#E67E22',teal:'#1ABC9C',
}

const SVGS: Record<string,React.ReactNode> = {
  home:<path d="M3 12L12 3l9 9M5 10v9h5v-5h4v5h5v-9" strokeLinecap="round" strokeLinejoin="round"/>,
  users:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/></>,
  dollar:<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/></>,
  target:<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  mail:<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 7 10-7" strokeLinecap="round"/></>,
  cpu:<><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  search:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  chevronL:<polyline points="15 18 9 12 15 6"/>,
  chevronR:<polyline points="9 18 15 12 9 6"/>,
  chevronD:<polyline points="6 9 12 15 18 9"/>,
  chevronU:<polyline points="18 15 12 9 6 15"/>,
  plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  x:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:<polyline points="20 6 9 17 4 12" strokeWidth="2.5"/>,
  zap:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  file:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  msg:<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>,
  upload:<><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" strokeLinecap="round"/></>,
  mic:<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 01-14 0M12 19v4M8 23h8" strokeLinecap="round"/></>,
  shield:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>,
  trending:<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  award:<><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
  calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  send:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  video:<><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,
  info:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  more:<><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
  logout:<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  edit:<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round"/></>,
  trash:<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" strokeLinecap="round"/></>,
  lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></>,
  refresh:<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" strokeLinecap="round"/></>,
  download:<><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" strokeLinecap="round"/></>,
  star:<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  phone:<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round"/>,
  grid:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
  arrowR:<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  filter:<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
  map:<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
}

export const Ic = ({ n, s=16, c='currentColor', style={} }: { n:string, s?:number, c?:string, style?:React.CSSProperties }) => (
  <span style={{width:s,height:s,display:'inline-flex',alignItems:'center',justifyContent:'center',color:c,flexShrink:0,...style}}>
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {SVGS[n]||SVGS.info}
    </svg>
  </span>
)

export const Avatar = ({ name='?', size=32, color='#8B6F47' }: { name?:string, size?:number, color?:string }) => {
  const initials = (name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()
  return <div style={{width:size,height:size,borderRadius:'50%',background:`linear-gradient(135deg,${color},${color}99)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.35,fontWeight:700,color:'#fff',flexShrink:0,fontFamily:'Montserrat'}}>{initials}</div>
}

export const MiniChart = ({ data=[], color=C.gold, h=48 }: { data?:number[], color?:string, h?:number }) => {
  if(!data.length) return null
  const max = Math.max(...data,1)
  const pts = data.map((v,i)=>`${(i/(data.length-1))*100},${h-(v/max)*h}`).join(' ')
  const fill = pts+` 100,${h} 0,${h}`
  const id = `gc${color.replace(/[^a-z0-9]/gi,'')}`
  return (
    <svg width="100%" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={fill} fill={`url(#${id})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

export const DonutChart = ({ pct=75, color=C.gold, size=80, label, sub }: { pct?:number, color?:string, size?:number, label?:string|number, sub?:string }) => {
  const r=30, circ=2*Math.PI*r, dash=circ*(pct/100)
  return (
    <div style={{position:'relative',width:size,height:size,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={size} height={size} viewBox="0 0 80 80" style={{transform:'rotate(-90deg)',position:'absolute'}}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{textAlign:'center',zIndex:1}}>
        {label!=null&&<div style={{fontSize:size*0.19,fontWeight:800,color:C.text,lineHeight:1}}>{label}</div>}
        {sub&&<div style={{fontSize:size*0.13,color:C.text3,marginTop:2}}>{sub}</div>}
      </div>
    </div>
  )
}

export const ProgressBar = ({ pct, color=C.gold, height=4 }: { pct:number, color?:string, height?:number }) => (
  <div style={{height,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
    <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:99,transition:'width 0.8s ease'}}/>
  </div>
)

export const Badge = ({ children, type='gold' }: { children:React.ReactNode, type?:string }) => {
  const styles: Record<string,any> = {
    gold:{bg:C.goldLight,color:C.gold,border:`1px solid ${C.gold}44`},
    green:{bg:C.greenLight,color:C.green,border:`1px solid ${C.green}44`},
    red:{bg:C.redLight,color:C.red,border:`1px solid ${C.red}44`},
    blue:{bg:C.blueLight,color:C.blue,border:`1px solid ${C.blue}44`},
    purple:{bg:'rgba(155,89,182,0.15)',color:C.purple,border:`1px solid ${C.purple}44`},
  }
  const s = styles[type]||styles.gold
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,background:s.bg,color:s.color,border:s.border}}>{children}</span>
}

export const StatCard = ({ icon, label, value, sub, trend, color=C.gold, chart, onClick }: { icon:string, label:string, value:string|number, sub?:string, trend?:number, color?:string, chart?:number[], onClick?:()=>void }) => (
  <div onClick={onClick} style={{flex:'1 1 150px',background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px',transition:'all 0.2s',cursor:onClick?'pointer':'default'}}
    onMouseEnter={e=>{if(onClick){(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.07)';(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';}}}
    onMouseLeave={e=>{if(onClick){(e.currentTarget as HTMLDivElement).style.background=C.surface;(e.currentTarget as HTMLDivElement).style.transform='translateY(0)';}}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${color}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n={icon} s={18} c={color}/></div>
      {trend!=null&&<span style={{fontSize:11,fontWeight:600,color:trend>0?C.green:C.red,background:trend>0?C.greenLight:C.redLight,border:`1px solid ${trend>0?C.green+'44':C.red+'44'}`,padding:'2px 8px',borderRadius:99}}>{trend>0?'↑':'↓'}{Math.abs(trend)}%</span>}
    </div>
    <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:2}}>{value}</div>
    <div style={{fontSize:11,color:C.text3}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:C.text2,marginTop:2}}>{sub}</div>}
    {chart&&<div style={{marginTop:8}}><MiniChart data={chart} color={color} h={36}/></div>}
  </div>
)

export const Modal = ({ title, onClose, children, width=480 }: { title:string, onClose:()=>void, children:React.ReactNode, width?:number }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.bg2,border:`1px solid ${C.border2}`,borderRadius:18,width:'100%',maxWidth:width,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,0.6)',animation:'fadeUp 0.25s ease'}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <span style={{fontSize:15,fontWeight:700,color:C.text}}>{title}</span>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,display:'flex',padding:4}} onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.color=C.text} onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.color=C.text3}><Ic n="x" s={18}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'20px 22px'}}>{children}</div>
    </div>
  </div>
)

export const Field = ({ label, children, required }: { label:string, children:React.ReactNode, required?:boolean }) => (
  <div style={{marginBottom:14}}>
    <label style={{display:'block',fontSize:11,fontWeight:600,color:C.text3,marginBottom:5,letterSpacing:0.5,textTransform:'uppercase'}}>{label}{required&&<span style={{color:C.red,marginLeft:3}}>*</span>}</label>
    {children}
  </div>
)

export const Input = ({ placeholder, value, onChange, type='text', style={} }: { placeholder?:string, value?:string|number, onChange?:(e:React.ChangeEvent<HTMLInputElement>)=>void, type?:string, style?:React.CSSProperties }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border2}`,borderRadius:10,padding:'10px 14px',color:C.text,fontFamily:'Montserrat',fontSize:13,outline:'none',width:'100%',transition:'all 0.2s',...style}}
    onFocus={e=>{e.target.style.borderColor=C.gold;e.target.style.boxShadow=`0 0 0 3px ${C.gold}20`;}}
    onBlur={e=>{e.target.style.borderColor=C.border2;e.target.style.boxShadow='none';}}/>
)

export const Select = ({ value, onChange, options, style={} }: { value?:string, onChange?:(e:React.ChangeEvent<HTMLSelectElement>)=>void, options:Array<string|{value:string,label:string}>, style?:React.CSSProperties }) => (
  <select value={value} onChange={onChange}
    style={{background:C.bg3,border:`1px solid ${C.border2}`,borderRadius:10,padding:'10px 14px',color:C.text,fontFamily:'Montserrat',fontSize:13,outline:'none',width:'100%',...style}}>
    {options.map(o=>{
      const val = typeof o==='string'?o:(o as any).value
      const lbl = typeof o==='string'?o:(o as any).label
      return <option key={val} value={val}>{lbl}</option>
    })}
  </select>
)

export const Toggle = ({ val, onChange, label }: { val:boolean, onChange:(v:boolean)=>void, label?:string }) => (
  <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>onChange(!val)}>
    <div style={{width:42,height:24,borderRadius:99,background:val?C.gold:'rgba(255,255,255,0.1)',transition:'all 0.25s',position:'relative',flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:val?21:3,transition:'all 0.25s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
    </div>
    {label&&<span style={{fontSize:13,color:C.text2}}>{label}</span>}
  </div>
)

export const Tabs = ({ tabs, active, onChange }: { tabs:Array<{id:string,label:string,icon?:string}>, active:string, onChange:(id:string)=>void }) => (
  <div style={{display:'flex',gap:2,background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:12,padding:3,flexShrink:0}}>
    {tabs.map(t=>(
      <div key={t.id} onClick={()=>onChange(t.id)} style={{padding:'7px 14px',borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:active===t.id?600:500,color:active===t.id?C.gold:C.text3,background:active===t.id?C.goldLight:'transparent',transition:'all 0.18s',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
        {t.icon&&<Ic n={t.icon} s={13}/>}{t.label}
      </div>
    ))}
  </div>
)

export const EmptyState = ({ icon, title, sub, action }: { icon:string, title:string, sub?:string, action?:React.ReactNode }) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 20px',gap:12,textAlign:'center'}}>
    <div style={{width:64,height:64,borderRadius:20,background:C.surface,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n={icon} s={28} c={C.text3}/></div>
    <div style={{fontSize:15,fontWeight:700,color:C.text2}}>{title}</div>
    {sub&&<div style={{fontSize:12,color:C.text3,maxWidth:300}}>{sub}</div>}
    {action&&<div style={{marginTop:8}}>{action}</div>}
  </div>
)

export const Toast = ({ msg, type='success', onClose }: { msg:string, type?:string, onClose:()=>void }) => {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[])
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,background:type==='success'?C.bg3:C.redLight,border:`1px solid ${type==='success'?C.gold+'44':C.red+'44'}`,borderRadius:12,padding:'12px 18px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',animation:'slideUp 0.3s ease',minWidth:280}}>
      <Ic n={type==='success'?'check':'x'} s={16} c={type==='success'?C.gold:C.red}/>
      <span style={{fontSize:13,color:C.text,fontWeight:500}}>{msg}</span>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,marginLeft:'auto'}}><Ic n="x" s={14}/></button>
    </div>
  )
}
