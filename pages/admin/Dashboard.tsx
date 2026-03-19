import React, { useEffect, useState } from 'react';
import {
  Users, GraduationCap, DollarSign, AlertCircle, X,
  TrendingUp, TrendingDown, ArrowRight, Bell, ChevronRight,
  BookOpen, Activity, BarChart2, Banknote, Clock, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { getDashboardStats } from '../../services/dataService';
import { Loader } from '../../components/ui/Loader';

/* ─── Avatar ─── */
const Av = ({ name, size = 36 }: { name: string; size?: number }) => {
  const palette = ['#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#8b5cf6','#06b6d4'];
  const bg = palette[(name.charCodeAt(0) + (name.charCodeAt(1)||0)) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38, fontWeight:900, color:'white' }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

/* ─── Custom tooltip for charts ─── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>
      <p style={{ fontSize:11, fontWeight:800, color:'#94a3b8', textTransform:'uppercase',
        letterSpacing:'.08em', margin:'0 0 4px' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize:14, fontWeight:900, color:p.color || '#6366f1', margin:0 }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

/* ─── Ring mini chart ─── */
const Ring = ({ pct, color, size=60 }: { pct:number; color:string; size?:number }) => {
  const r = (size-8)/2, circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}/>
    </svg>
  );
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDefaulters, setShowDefaulters] = useState(false);

  useEffect(() => {
    getDashboardStats().then(data => { setStats(data); setLoading(false); });
  }, []);

  if (loading) return <Loader />;

  const totalStudents   = stats?.totalStudents || 0;
  const totalTeachers   = stats?.totalTeachers || 0;
  const expectedRev     = stats?.expectedRevenue || 0;
  const outstanding     = stats?.outstandingRevenue || 0;
  const collected       = expectedRev - outstanding;
  const collectionPct   = expectedRev > 0 ? Math.round((collected / expectedRev) * 100) : 0;
  const defaulterCount  = stats?.defaulters?.length || 0;

  /* bar chart colours per bar */
  const barColors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899',
                     '#3b82f6','#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'];

  /* fee health donut data for small display */
  const feeHealth = [
    { label:'Collected', val: collected, color:'#10b981', pct: collectionPct },
    { label:'Outstanding', val: outstanding, color:'#f43f5e', pct: 100-collectionPct },
  ];

  const card: React.CSSProperties = {
    background:'white', borderRadius:16,
    boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04)',
    overflow:'hidden',
  };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif",
      background:'#f8fafc', color:'#1e293b', minHeight:'100vh' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,800;9..40,900&display=swap');
        .adg{display:grid;grid-template-columns:1fr 300px;gap:20px}
        .asg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .amg{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        @media(max-width:1100px){.adg{grid-template-columns:1fr}}
        @media(max-width:900px){.asg{grid-template-columns:repeat(2,1fr)}.amg{grid-template-columns:1fr}}
        @media(max-width:480px){.asg{grid-template-columns:1fr}}
        .ahrow:hover{background:#f8fafc}
        .ahrow{transition:background .14s;cursor:pointer}
        .abp{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;
          font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
          cursor:pointer;border:none;transition:filter .15s,transform .12s;color:white}
        .abp:hover{filter:brightness(.9);transform:translateY(-1px)}
        .abo{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;
          font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
          cursor:pointer;background:white;border:1.5px solid #e2e8f0;color:#334155;
          transition:border-color .15s,transform .12s}
        .abo:hover{border-color:#6366f1;color:#6366f1;transform:translateY(-1px)}
        .aai{display:flex;align-items:flex-start;gap:12px;padding:12px 0;
          border-bottom:1px solid #f8fafc}
        .aai:last-child{border-bottom:none}
        th.ath{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;
          color:#94a3b8;padding:11px 16px;border-bottom:1px solid #f1f5f9;text-align:left;white-space:nowrap}
        td.atd{padding:12px 16px;font-size:13px}
        @media(max-width:600px){td.atd,th.ath{padding:9px 10px;font-size:11px}.ahm{display:none}}
        .fadeup{animation:fadeup .4s ease both}
        @keyframes fadeup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .delay1{animation-delay:.05s}.delay2{animation-delay:.1s}
        .delay3{animation-delay:.15s}.delay4{animation-delay:.2s}
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{ padding:'24px 24px 0', display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.18em',
            textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
            Academic Year 2025–2026
          </p>
          <h1 style={{ fontSize:26, fontWeight:900, letterSpacing:-1.5,
            color:'#0f172a', lineHeight:1, margin:'0 0 4px' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize:12, color:'#64748b', fontWeight:600, margin:0 }}>
            Circle of Hope Private Academy · Overview
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10,
            width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', position:'relative' }}>
            <Bell size={16} color="#64748b"/>
            {defaulterCount > 0 && (
              <span style={{ position:'absolute', top:7, right:7, width:8, height:8,
                background:'#f43f5e', borderRadius:'50%', border:'2px solid white' }}/>
            )}
          </button>
          <div style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10,
            padding:'6px 14px 6px 10px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#0f172a,#6366f1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:900, color:'white' }}>A</div>
            <div>
              <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0, lineHeight:1.1 }}>Admin</p>
              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:0 }}>Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ padding:'0 24px 48px' }}>
        <div className="adg">

          {/* ════ LEFT ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* STAT CARDS */}
            <div className="asg">
              {[
                {
                  label:'Total Students', val: totalStudents,
                  sub: `${stats?.graphData?.slice(-1)[0]?.students || 0} this month`,
                  icon:<GraduationCap size={18}/>, color:'#6366f1', bg:'#eef2ff',
                  trend:true, cls:'fadeup'
                },
                {
                  label:'Teaching Staff', val: totalTeachers,
                  sub: 'Active teachers',
                  icon:<Users size={18}/>, color:'#06b6d4', bg:'#ecfeff',
                  trend:true, cls:'fadeup delay1'
                },
                {
                  label:'Expected Revenue', val: `N$${(expectedRev/1000).toFixed(0)}K`,
                  sub: `N$ ${expectedRev.toLocaleString()} total`,
                  icon:<Banknote size={18}/>, color:'#10b981', bg:'#f0fdf4',
                  trend:true, cls:'fadeup delay2'
                },
                {
                  label:'Outstanding Fees', val: `N$${(outstanding/1000).toFixed(0)}K`,
                  sub: `${defaulterCount} defaulters`,
                  icon:<AlertCircle size={18}/>, color:'#f43f5e', bg:'#fff1f2',
                  trend:false, clickable:true, cls:'fadeup delay3'
                },
              ].map((c, i) => (
                <div key={i} className={c.cls}
                  onClick={c.clickable ? () => setShowDefaulters(true) : undefined}
                  style={{ ...card, padding:20, cursor: c.clickable ? 'pointer' : 'default',
                    transition:'transform .15s, box-shadow .15s',
                    ...(c.clickable ? {} : {}) }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ background:c.bg, padding:10, borderRadius:10, color:c.color }}>
                      {c.icon}
                    </div>
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10,
                      fontWeight:800, color: c.trend ? '#10b981' : '#f43f5e',
                      background: c.trend ? '#f0fdf4' : '#fff1f2',
                      padding:'3px 8px', borderRadius:20 }}>
                      {c.trend ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                      {c.trend ? 'Up' : 'Alert'}
                    </span>
                  </div>
                  <p style={{ fontSize:9, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
                    {c.label}
                  </p>
                  <p style={{ fontSize:28, fontWeight:900, letterSpacing:-1.2,
                    color: c.color, lineHeight:1, margin:'0 0 5px' }}>{c.val}</p>
                  <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:0,
                    display:'flex', alignItems:'center', gap:3 }}>
                    {c.sub}
                    {c.clickable && <ChevronRight size={12} color="#f43f5e"/>}
                  </p>
                </div>
              ))}
            </div>

            {/* FEE HEALTH STRIP */}
            <div style={{ ...card, padding:'16px 22px', display:'flex',
              flexWrap:'wrap', gap:16, alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                  textTransform:'uppercase', color:'#94a3b8', margin:'0 0 2px' }}>
                  Fee Collection Health
                </p>
                <p style={{ fontSize:13, fontWeight:700, color:'#334155', margin:0 }}>
                  <span style={{ color:'#10b981', fontWeight:900 }}>N$ {collected.toLocaleString()}</span>
                  {' '}collected of{' '}
                  <span style={{ fontWeight:900 }}>N$ {expectedRev.toLocaleString()}</span>
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                {feeHealth.map(f => (
                  <div key={f.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ position:'relative' }}>
                      <Ring pct={f.pct} color={f.color} size={52}/>
                      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:10, fontWeight:900, color:f.color }}>
                        {f.pct}%
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase',
                        letterSpacing:'.1em', color:'#94a3b8', margin:'0 0 1px' }}>{f.label}</p>
                      <p style={{ fontSize:13, fontWeight:900, color:f.color, margin:0 }}>
                        N$ {f.val.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div style={{ height:36, width:1, background:'#f1f5f9' }}/>
                <button className="abp" style={{ background:'#f43f5e' }}
                  onClick={() => setShowDefaulters(true)}>
                  <AlertCircle size={13}/> View Defaulters
                </button>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="amg">

              {/* Enrollment trend */}
              <div style={{ ...card, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                      textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
                      Enrollment Trends
                    </p>
                    <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1,
                      color:'#0f172a', margin:0 }}>New Students by Month</p>
                  </div>
                  <span style={{ background:'#eef2ff', color:'#6366f1', fontSize:10,
                    fontWeight:800, padding:'4px 12px', borderRadius:20 }}>This Year</span>
                </div>
                <div style={{ height:200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.graphData || []} barSize={20}
                      margin={{ top:0, right:0, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                        axisLine={false} tickLine={false}/>
                      <YAxis allowDecimals={false}
                        tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                        axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>} cursor={{ fill:'#f8fafc', radius:4 }}/>
                      <Bar dataKey="students" name="Students" radius={[6,6,0,0]}>
                        {(stats?.graphData || []).map((_: any, i: number) => (
                          <Cell key={i} fill={barColors[i % barColors.length]}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue trend area chart */}
              <div style={{ ...card, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                      textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>
                      Revenue Overview
                    </p>
                    <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1,
                      color:'#0f172a', margin:0 }}>Collection vs Outstanding</p>
                  </div>
                  <span style={{ background:'#f0fdf4', color:'#10b981', fontSize:10,
                    fontWeight:800, padding:'4px 12px', borderRadius:20 }}>Live</span>
                </div>
                <div style={{ height:200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(stats?.graphData || []).map((d: any, i: number) => ({
                        ...d,
                        collected: Math.round(expectedRev * (0.4 + i * 0.05)),
                        outstanding: Math.round(outstanding * (1 - i * 0.04)),
                      }))}
                      margin={{ top:0, right:0, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                        axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:9, fill:'#94a3b8', fontWeight:700 }}
                        axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Area type="monotone" dataKey="collected" name="Collected"
                        stroke="#10b981" strokeWidth={2} fill="url(#gc)" dot={false}/>
                      <Area type="monotone" dataKey="outstanding" name="Outstanding"
                        stroke="#f43f5e" strokeWidth={2} fill="url(#go)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div style={{ ...card, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:18 }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:'0 0 3px' }}>
                    Recent Applications
                  </p>
                  <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1,
                    color:'#0f172a', margin:0 }}>Latest Activity</p>
                </div>
                <button className="abo" style={{ fontSize:10 }}>
                  View All <ArrowRight size={12}/>
                </button>
              </div>

              {stats?.recentActivities?.length > 0 ? (
                <div>
                  {stats.recentActivities.map((a: any, i: number) => (
                    <div key={i} className="aai">
                      <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                        background: ['#eef2ff','#f0fdf4','#fef9c3','#fff1f2','#ecfeff'][i%5],
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, fontWeight:900,
                        color: ['#6366f1','#10b981','#f59e0b','#f43f5e','#06b6d4'][i%5] }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:800, color:'#0f172a',
                          margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden',
                          textOverflow:'ellipsis' }}>{a.title}</p>
                        <p style={{ fontSize:11, color:'#94a3b8', fontWeight:600, margin:0,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {a.desc}
                        </p>
                      </div>
                      <span style={{ fontSize:10, color:'#94a3b8', fontWeight:700,
                        whiteSpace:'nowrap', flexShrink:0 }}>{a.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding:'32px 0', textAlign:'center',
                  color:'#cbd5e1', fontSize:12, fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.1em' }}>
                  No recent activity.
                </div>
              )}
            </div>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Quick stats */}
            <div style={{ ...card, padding:22 }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                textTransform:'uppercase', color:'#94a3b8', margin:'0 0 16px' }}>School At a Glance</p>
              {[
                { label:'Enrolled Students', val:totalStudents, icon:<GraduationCap size={15}/>, color:'#6366f1' },
                { label:'Teaching Staff', val:totalTeachers, icon:<Users size={15}/>, color:'#06b6d4' },
                { label:'Fee Defaulters', val:defaulterCount, icon:<AlertCircle size={15}/>, color:'#f43f5e' },
                { label:'Collection Rate', val:`${collectionPct}%`, icon:<BarChart2 size={15}/>, color:'#10b981' },
              ].map((x,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 0', borderBottom: i<3 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ background: x.color+'18', color:x.color, padding:7,
                      borderRadius:8 }}>{x.icon}</div>
                    <span style={{ fontSize:12, fontWeight:700, color:'#334155' }}>{x.label}</span>
                  </div>
                  <span style={{ fontSize:16, fontWeight:900, color:x.color,
                    letterSpacing:-.5 }}>{x.val}</span>
                </div>
              ))}
            </div>

            {/* Defaulters preview */}
            <div style={{ ...card, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:14 }}>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                  textTransform:'uppercase', color:'#94a3b8', margin:0 }}>Fee Defaulters</p>
                <span style={{ background:'#fff1f2', color:'#f43f5e', fontSize:9,
                  fontWeight:900, padding:'3px 10px', borderRadius:20,
                  textTransform:'uppercase', letterSpacing:'.08em' }}>
                  {defaulterCount} pending
                </span>
              </div>
              {(stats?.defaulters || []).slice(0,5).map((s: any, i: number) => (
                <div key={i} className="aai">
                  <Av name={s.name} size={32}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {s.name}
                    </p>
                    <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:'2px 0 0' }}>
                      {s.grade} · {s.parentName}
                    </p>
                  </div>
                  <span style={{ background:'#fff1f2', color:'#f43f5e', fontSize:9,
                    fontWeight:900, padding:'2px 8px', borderRadius:12, flexShrink:0,
                    textTransform:'uppercase' }}>Unpaid</span>
                </div>
              ))}
              {defaulterCount === 0 && (
                <div style={{ padding:'20px 0', textAlign:'center',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                  <CheckCircle size={28} color="#10b981"/>
                  <p style={{ fontSize:12, color:'#10b981', fontWeight:800, margin:0,
                    textTransform:'uppercase', letterSpacing:'.08em' }}>
                    All fees cleared!
                  </p>
                </div>
              )}
              {defaulterCount > 0 && (
                <button className="abp" style={{ background:'#f43f5e', width:'100%',
                  marginTop:14, justifyContent:'center' }}
                  onClick={() => setShowDefaulters(true)}>
                  View All <ArrowRight size={12}/>
                </button>
              )}
            </div>

            {/* Monthly summary */}
            <div style={{ ...card, padding:22, background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)' }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                textTransform:'uppercase', color:'rgba(255,255,255,.4)', margin:'0 0 16px' }}>
                Monthly Summary
              </p>
              <p style={{ fontSize:32, fontWeight:900, letterSpacing:-1.5,
                color:'white', lineHeight:1, margin:'0 0 4px' }}>
                N$ {(expectedRev/12).toLocaleString(undefined,{maximumFractionDigits:0})}
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', fontWeight:600,
                margin:'0 0 20px' }}>Expected monthly revenue</p>
              <div style={{ height:4, background:'rgba(255,255,255,.1)',
                borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                <div style={{ width:`${collectionPct}%`, height:'100%',
                  background:'linear-gradient(90deg,#10b981,#34d399)',
                  borderRadius:2, transition:'width 1.2s ease' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)' }}>
                  {collectionPct}% collected
                </span>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)' }}>
                  {100-collectionPct}% outstanding
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══ DEFAULTERS MODAL ══ */}
      {showDefaulters && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex',
          alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.6)', backdropFilter:'blur(4px)', padding:16 }}>
          <div style={{ background:'white', width:'100%', maxWidth:740,
            borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,.2)',
            maxHeight:'85vh', display:'flex', flexDirection:'column',
            animation:'fadeup .25s ease' }}>

            {/* Modal header */}
            <div style={{ padding:'22px 24px', borderBottom:'1px solid #f1f5f9',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <div style={{ background:'#fff1f2', padding:8, borderRadius:10 }}>
                    <AlertCircle size={20} color="#f43f5e"/>
                  </div>
                  <h3 style={{ fontSize:18, fontWeight:900, color:'#f43f5e',
                    letterSpacing:-.5, margin:0 }}>Outstanding Payments</h3>
                </div>
                <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, margin:0 }}>
                  {defaulterCount} student{defaulterCount!==1?'s':''} with pending fee payments
                </p>
              </div>
              <button onClick={() => setShowDefaulters(false)}
                style={{ background:'#f8fafc', border:'none', cursor:'pointer',
                  width:36, height:36, borderRadius:8, display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
                <X size={18} color="#64748b"/>
              </button>
            </div>

            {/* Modal table */}
            <div style={{ overflowY:'auto', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', position:'sticky', top:0 }}>
                    <th className="ath">Student</th>
                    <th className="ath ahm">Grade</th>
                    <th className="ath ahm">Parent</th>
                    <th className="ath ahm">Contact</th>
                    <th className="ath">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.defaulters?.length > 0 ? (
                    stats.defaulters.map((s: any, i: number) => (
                      <tr key={s.id || i} className="ahrow"
                        style={{ borderBottom:'1px solid #f8fafc' }}>
                        <td className="atd">
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Av name={s.name} size={32}/>
                            <div>
                              <p style={{ fontSize:13, fontWeight:800, color:'#0f172a',
                                margin:0 }}>{s.name}</p>
                              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600,
                                margin:'2px 0 0', textTransform:'uppercase' }}>{s.grade}</p>
                            </div>
                          </div>
                        </td>
                        <td className="atd ahm" style={{ color:'#334155', fontWeight:600 }}>
                          {s.grade}
                        </td>
                        <td className="atd ahm" style={{ color:'#334155', fontWeight:600 }}>
                          {s.parentName}
                        </td>
                        <td className="atd ahm">
                          <span style={{ fontFamily:'monospace', fontSize:12,
                            color:'#64748b', fontWeight:700 }}>{s.parentPhone || '—'}</span>
                        </td>
                        <td className="atd">
                          <span style={{ background:'#fff1f2', color:'#f43f5e',
                            padding:'3px 10px', borderRadius:20, fontSize:10,
                            fontWeight:900, textTransform:'uppercase', letterSpacing:'.06em' }}>
                            Unpaid
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding:'48px 16px', textAlign:'center',
                        color:'#cbd5e1', fontWeight:800, fontSize:12,
                        textTransform:'uppercase', letterSpacing:'.1em' }}>
                        No outstanding payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal footer */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9',
              background:'#f8fafc', display:'flex', justifyContent:'space-between',
              alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8',
                textTransform:'uppercase', letterSpacing:'.08em' }}>
                {defaulterCount} total defaulters · N$ {outstanding.toLocaleString()} outstanding
              </span>
              <button className="abp" style={{ background:'#0f172a' }}
                onClick={() => setShowDefaulters(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};