import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStudentsByAssignedClass,
  getAssessmentRecordsForClass,
  getSystemSettings,
} from '../../services/dataService';
import { Student, TermAssessmentRecord } from '../../types';
import { Loader } from '../../components/ui/Loader';
import {
  Users, BookOpen, Activity, CheckCircle, Clock,
  Search, Send, ArrowRight, Bell, ChevronRight,
  TrendingUp, Eye, UserPlus, Edit2
} from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

interface TeacherDashboardProps { user: any; }

/* ─── ring chart ─── */
const RingChart = ({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
};

/* ─── big area chart ─── */
const BigChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const VB_W = 700, VB_H = 200;
  const PAD = { t: 20, r: 20, b: 40, l: 42 };
  const cw = VB_W - PAD.l - PAD.r;
  const ch = VB_H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => d.value), 100);
  const ticks = [0, 25, 50, 75, 100];

  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * cw,
    y: PAD.t + ch - (d.value / maxVal) * ch,
    label: d.label, value: d.value,
  }));

  const smooth = (points: typeof pts) => {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const pr = points[i - 1], cu = points[i];
      const cpx = (pr.x + cu.x) / 2;
      d += ` C ${cpx} ${pr.y} ${cpx} ${cu.y} ${cu.x} ${cu.y}`;
    }
    return d;
  };
  const linePath = smooth(pts);
  const areaPath = `${linePath} L ${pts[pts.length-1].x} ${PAD.t+ch} L ${pts[0].x} ${PAD.t+ch} Z`;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet"
      style={{ width:'100%', height:'100%' }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
          <stop offset="80%" stopColor="#6366f1" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {ticks.map(t => {
        const y = PAD.t + ch - (t / maxVal) * ch;
        return (
          <g key={t}>
            <line x1={PAD.l} y1={y} x2={PAD.l+cw} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
            <text x={PAD.l-6} y={y+3.5} fontSize="9" fill="#94a3b8" textAnchor="end">{t}%</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#cg)"/>
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#gl)"/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="#6366f1" strokeWidth="2.5"/>
          <text x={p.x} y={VB_H-PAD.b+15} fontSize="9" fill="#94a3b8" textAnchor="middle">{p.label}</text>
        </g>
      ))}
    </svg>
  );
};

/* ─── avatar ─── */
const Av = ({ name, size = 36 }: { name: string; size?: number }) => {
  const palette = ['#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#8b5cf6','#06b6d4','#f43f5e'];
  const bg = palette[(name.charCodeAt(0) + (name.charCodeAt(1)||0)) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.36, fontWeight:900, color:'white', letterSpacing:-.5 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

/* ═══════════════════════════════════════ MAIN ═══════════════════════════════════════ */
export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show:false, msg:'' });
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (user?.assignedClass) {
        const data = await getStudentsByAssignedClass(user.assignedClass);
        setStudents(data);
        const settings = await getSystemSettings();
        const termId = settings?.activeTermId || 'Term 1';
        const g0 = data.filter(s => s.grade === 'Grade 0');
        if (g0.length > 0) {
          const recs = await getAssessmentRecordsForClass('Grade 0', termId, g0.map(s => s.id));
          const map: Record<string,TermAssessmentRecord> = {};
          recs.forEach(r => { map[r.studentId] = r; });
          setRecords(map);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loader />;

  if (!user.assignedClass) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'60vh', textAlign:'center', padding:32 }}>
      <div style={{ background:'#fef9c3', border:'2px solid #fde68a',
        padding:24, borderRadius:12, marginBottom:20 }}>
        <BookOpen size={40} color="#f59e0b"/>
      </div>
      <h2 style={{ fontWeight:900, fontSize:22, letterSpacing:-1, textTransform:'uppercase' }}>No Class Assigned</h2>
      <p style={{ color:'#94a3b8', marginTop:8 }}>Contact the administrator to get assigned.</p>
    </div>
  );

  /* ── derived ── */
  const enrolled  = students.filter(s => s.studentStatus === 'ENROLLED');
  const observed  = students.filter(s => s.studentStatus === 'ASSESSMENT');
  const grade0    = enrolled.filter(s => s.grade === 'Grade 0');
  const done      = grade0.filter(s => records[s.id]?.isComplete);
  const pending   = grade0.filter(s => !records[s.id]?.isComplete);
  const total     = students.length;

  const growthPct  = total > 0 ? Math.round((enrolled.length / total) * 100) : 0;
  const newPct     = total > 0 ? Math.round((observed.length / total) * 100) : 0;
  const donePct    = grade0.length > 0 ? Math.round((done.length / grade0.length) * 100) : 0;

  /* FM/AM/NM */
  let fm=0, am=0, nm=0, tot=0;
  done.forEach(s => {
    const r = records[s.id];
    if (r?.ratings) Object.values(r.ratings).forEach((v:any) => {
      tot++; if(v==='FM') fm++; else if(v==='AM') am++; else if(v==='NM') nm++;
    });
  });
  const fmP = tot>0 ? Math.round(fm/tot*100) : 0;
  const amP = tot>0 ? Math.round(am/tot*100) : 0;
  const nmP = tot>0 ? Math.round(nm/tot*100) : 0;

  /* trend */
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const trend = months.map((label,i) => ({
    label,
    value: Math.min(100, Math.max(15, donePct*0.6 + Math.sin(i*0.65)*18 + i*3.2)),
  }));

  const recentStudents = [...enrolled].slice(-5).reverse();
  const filtered = enrolled.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  /* ── css helpers ── */
  const card: React.CSSProperties = {
    background:'white', borderRadius:16,
    boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04)',
    overflow:'hidden',
  };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:'#f8fafc',
      color:'#1e293b', minHeight:'100vh' }}>

      <Toast message={toast.msg} isVisible={toast.show}
        onClose={() => setToast({show:false,msg:''})} variant="success"/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,800;0,9..40,900&display=swap');
        .dg{display:grid;grid-template-columns:1fr 290px;gap:20px}
        .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .mg{display:grid;grid-template-columns:1fr 260px;gap:14px}
        @media(max-width:1080px){.dg{grid-template-columns:1fr}}
        @media(max-width:860px){.mg{grid-template-columns:1fr}.sg{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:520px){.sg{grid-template-columns:1fr}}
        .hrow:hover{background:#f8fafc}
        .hrow{transition:background .14s}
        .bp{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:9px;
           font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
           cursor:pointer;border:none;transition:filter .15s,transform .12s}
        .bp:hover{filter:brightness(.92);transform:translateY(-1px)}
        .bo{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;
           font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
           cursor:pointer;background:white;border:1.5px solid #e2e8f0;color:#334155;
           transition:border-color .15s,transform .12s}
        .bo:hover{border-color:#6366f1;color:#6366f1;transform:translateY(-1px)}
        .si{width:100%;padding:9px 12px 9px 36px;border:1.5px solid #e2e8f0;
           border-radius:9px;font-size:12px;outline:none;background:white;
           font-family:inherit;transition:border-color .15s}
        .si:focus{border-color:#6366f1}
        th.rth{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;
           color:#94a3b8;padding:10px 14px;border-bottom:1px solid #f1f5f9;white-space:nowrap;text-align:left}
        td.rtd{padding:12px 14px}
        .sb{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
        .ai{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f8fafc}
        .ai:last-child{border-bottom:none}
        @media(max-width:600px){.hm{display:none}th.rth,td.rtd{padding:8px 8px;font-size:11px}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding:'24px 24px 0', display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase',
            color:'#94a3b8', margin:'0 0 4px' }}>Academic Year 2025–2026</p>
          <h1 style={{ fontSize:26, fontWeight:900, letterSpacing:-1.5, color:'#0f172a',
            lineHeight:1, margin:'0 0 4px' }}>
            {user.assignedClass} — Dashboard
          </h1>
          <p style={{ fontSize:12, color:'#64748b', fontWeight:600, margin:0 }}>
            {user.name || 'Teacher'} · Class Teacher
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10,
            width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', position:'relative' }}>
            <Bell size={16} color="#64748b"/>
            <span style={{ position:'absolute', top:8, right:8, width:7, height:7,
              background:'#f43f5e', borderRadius:'50%', border:'1.5px solid white' }}/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'white',
            border:'1.5px solid #e2e8f0', borderRadius:10, padding:'6px 14px 6px 8px' }}>
            <Av name={user.name || 'T'} size={30}/>
            <div>
              <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', lineHeight:1.1, margin:0 }}>
                {user.name || 'Teacher'}
              </p>
              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:0 }}>Class Teacher</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding:'0 24px 48px' }}>
        <div className="dg">

          {/* ════ LEFT ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* STAT CARDS */}
            <div className="sg">
              {[
                { label:'Students', val:total, sub:`${growthPct}% enrolled`, icon:<Users size={17}/>,
                  pct:growthPct, color:'#6366f1', bg:'#eef2ff', trend:'#10b981' },
                { label:'New This Term', val:observed.length, sub:'Under observation', icon:<UserPlus size={17}/>,
                  pct:newPct, color:'#f59e0b', bg:'#fefce8', trend:'#f59e0b' },
                { label:'Assessments', val:`${done.length}/${grade0.length}`, sub:`${donePct}% complete`, icon:<CheckCircle size={17}/>,
                  pct:donePct, color:'#10b981', bg:'#f0fdf4', trend:'#10b981' },
              ].map((c,i) => (
                <div key={i} style={{ ...card, padding:20, display:'flex',
                  justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <div style={{ background:c.bg, padding:8, borderRadius:8, color:c.color }}>
                        {c.icon}
                      </div>
                      <p style={{ fontSize:9, fontWeight:800, letterSpacing:'.14em',
                        textTransform:'uppercase', color:'#94a3b8', margin:0 }}>{c.label}</p>
                    </div>
                    <p style={{ fontSize:32, fontWeight:900, letterSpacing:-1.5, color:'#0f172a',
                      lineHeight:1, margin:'0 0 6px' }}>{c.val}</p>
                    <p style={{ fontSize:10, fontWeight:800, color:c.trend, margin:0,
                      display:'flex', alignItems:'center', gap:4 }}>
                      <TrendingUp size={11}/> {c.sub}
                    </p>
                  </div>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <RingChart pct={typeof c.pct==='number'?c.pct:0} color={c.color} size={68}/>
                    <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:12, fontWeight:900, color:c.color }}>
                      {c.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* CHART */}
            <div style={{ ...card, padding:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                marginBottom:16, flexWrap:'wrap', gap:8 }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:'0 0 4px' }}>Pass Rate Trend</p>
                  <p style={{ fontSize:18, fontWeight:900, letterSpacing:-1, color:'#0f172a', margin:0 }}>
                    Average Assessment Performance
                  </p>
                </div>
                <span style={{ background:'#eef2ff', color:'#6366f1', fontSize:10,
                  fontWeight:800, padding:'4px 12px', borderRadius:20 }}>Full Year</span>
              </div>
              <div style={{ height:210 }}>
                <BigChart data={trend}/>
              </div>
            </div>

            {/* BREAKDOWN + NEW STUDENTS */}
            <div className="mg">

              {/* Breakdown */}
              <div style={{ ...card, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:0 }}>Assessment Breakdown</p>
                  <span style={{ fontSize:10, fontWeight:700, color:'#64748b' }}>This Term</span>
                </div>

                {/* stacked bar */}
                <div style={{ display:'flex', height:8, borderRadius:6, overflow:'hidden', marginBottom:18 }}>
                  {fmP>0 && <div style={{ width:`${fmP}%`, background:'#10b981', transition:'width 1s ease' }}/>}
                  {amP>0 && <div style={{ width:`${amP}%`, background:'#f59e0b', transition:'width 1s ease' }}/>}
                  {nmP>0 && <div style={{ width:`${nmP}%`, background:'#f43f5e', transition:'width 1s ease' }}/>}
                  {(fmP+amP+nmP)===0 && <div style={{ width:'100%', background:'#f1f5f9' }}/>}
                </div>

                {[
                  { label:'Fully Mastered',    key:'FM', pct:fmP, color:'#10b981' },
                  { label:'Almost Mastered',   key:'AM', pct:amP, color:'#f59e0b' },
                  { label:'Not Yet Mastered',  key:'NM', pct:nmP, color:'#f43f5e' },
                ].map(x => (
                  <div key={x.key} style={{ display:'flex', alignItems:'center',
                    justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:9, height:9, borderRadius:'50%', background:x.color }}/>
                      <span style={{ fontSize:12, fontWeight:700, color:'#334155' }}>{x.label}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:72, height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${x.pct}%`, height:'100%', background:x.color,
                          borderRadius:3, transition:'width 1s ease' }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:900, color:x.color, minWidth:30,
                        textAlign:'right' }}>{x.pct}%</span>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop:16, padding:14, background:'#f8fafc', borderRadius:10,
                  display:'flex', justifyContent:'space-around' }}>
                  {[
                    { l:'Complete', v:done.length,    c:'#10b981' },
                    { l:'Pending',  v:pending.length, c:'#f59e0b' },
                    { l:'Grade 0',  v:grade0.length,  c:'#6366f1' },
                  ].map(x => (
                    <div key={x.l} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:22, fontWeight:900, color:x.c, margin:0, letterSpacing:-1 }}>{x.v}</p>
                      <p style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase',
                        letterSpacing:'.1em', margin:'3px 0 0' }}>{x.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* New students */}
              <div style={{ ...card, padding:22 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:14 }}>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:0 }}>New Students</p>
                  <span style={{ fontSize:10, fontWeight:800, color:'#6366f1',
                    display:'flex', alignItems:'center', gap:2, cursor:'pointer' }}>
                    This term <ChevronRight size={12}/>
                  </span>
                </div>
                {recentStudents.length === 0 && (
                  <p style={{ fontSize:12, color:'#94a3b8', textAlign:'center', padding:'20px 0' }}>
                    No new students yet.
                  </p>
                )}
                {recentStudents.map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10,
                    padding:'9px 0', borderBottom:'1px solid #f8fafc' }}>
                    <Av name={s.name} size={34}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0,
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {s.name}
                      </p>
                      <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:'2px 0 0' }}>
                        {s.grade} · {new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                      </p>
                    </div>
                    <span style={{ width:7, height:7, borderRadius:'50%',
                      background:'#10b981', flexShrink:0 }}/>
                  </div>
                ))}
              </div>
            </div>

            {/* CLASS REGISTER */}
            <div style={{ ...card }}>
              <div style={{ padding:'18px 20px', borderBottom:'1px solid #f1f5f9',
                display:'flex', flexWrap:'wrap', gap:12,
                justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:'0 0 3px' }}>Class Register</p>
                  <p style={{ fontSize:11, color:'#64748b', fontWeight:600, margin:0 }}>
                    {filtered.length} learner{filtered.length!==1?'s':''} enrolled
                  </p>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
                  <button className="bp" style={{ background:'#10b981' }}
                    onClick={() => setToast({show:true, msg:'Assessments submitted to admin!'})}>
                    <Send size={13}/> Submit
                  </button>
                  <button className="bo"
                    onClick={() => navigate('/teacher/term-assessment-component')}>
                    Component Mode
                  </button>
                  <div style={{ position:'relative', minWidth:160 }}>
                    <Search size={14} style={{ position:'absolute', left:10, top:'50%',
                      transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    <input className="si" placeholder="Search…"
                      value={search} onChange={e => setSearch(e.target.value)}/>
                  </div>
                </div>
              </div>

              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      <th className="rth">Student</th>
                      <th className="rth hm">Status</th>
                      <th className="rth hm">Stage</th>
                      <th className="rth">Assessment</th>
                      <th className="rth" style={{ textAlign:'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => {
                      const isC = records[s.id]?.isComplete;
                      const g0 = s.grade === 'Grade 0';
                      return (
                        <tr key={s.id} className="hrow" style={{ borderBottom:'1px solid #f8fafc' }}>
                          <td className="rtd">
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <Av name={s.name} size={32}/>
                              <div>
                                <p style={{ fontWeight:800, color:'#0f172a', margin:0,
                                  fontSize:13, letterSpacing:-.3 }}>{s.name}</p>
                                <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600,
                                  margin:'2px 0 0', textTransform:'uppercase', letterSpacing:'.05em' }}>
                                  {s.grade}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="rtd hm">
                            <span style={{ background:'#dcfce7', color:'#16a34a', padding:'3px 10px',
                              borderRadius:20, fontSize:10, fontWeight:800, textTransform:'uppercase',
                              letterSpacing:'.06em', display:'inline-flex', alignItems:'center', gap:4 }}>
                              <span style={{ width:6, height:6, borderRadius:'50%',
                                background:'#22c55e', display:'inline-block' }}/>
                              Enrolled
                            </span>
                          </td>
                          <td className="rtd hm">
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:12, fontWeight:700, color:'#334155' }}>
                                {s.assignedClass || s.grade}
                              </span>
                              {s.stage && (
                                <span style={{ background:'#0f172a', color:'white', fontSize:9,
                                  fontWeight:800, padding:'2px 7px', borderRadius:4,
                                  textTransform:'uppercase' }}>S{s.stage}</span>
                              )}
                            </div>
                          </td>
                          <td className="rtd">
                            {g0 ? (
                              isC ? (
                                <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                                  color:'#16a34a', fontWeight:800, fontSize:11,
                                  textTransform:'uppercase', letterSpacing:'.06em' }}>
                                  <CheckCircle size={13}/> Complete
                                </span>
                              ) : (
                                <span style={{ display:'inline-flex', alignItems:'center', gap:5,
                                  color:'#b45309', fontWeight:800, fontSize:11,
                                  textTransform:'uppercase', letterSpacing:'.06em' }}>
                                  <Clock size={13}/> Pending
                                </span>
                              )
                            ) : <span style={{ color:'#cbd5e1', fontWeight:700 }}>—</span>}
                          </td>
                          <td className="rtd" style={{ textAlign:'right' }}>
                            {g0 && (
                              <button
                                onClick={() => navigate(`/teacher/term-assessment/${s.id}`)}
                                className={isC ? 'bo' : 'bp'}
                                style={{ background: isC ? 'white' : '#6366f1',
                                  padding:'7px 14px' }}>
                                {isC ? <><Edit2 size={12}/> Edit</> : <><ArrowRight size={12}/> Add</>}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding:'40px 16px', textAlign:'center',
                          color:'#cbd5e1', fontWeight:800, fontSize:11,
                          textTransform:'uppercase', letterSpacing:'.1em' }}>
                          No learners found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > 0 && (
                <div style={{ padding:'10px 20px', borderTop:'1px solid #f8fafc',
                  display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8',
                    textTransform:'uppercase', letterSpacing:'.08em' }}>
                    Showing {filtered.length} of {enrolled.length}
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8',
                    textTransform:'uppercase', letterSpacing:'.08em' }}>
                    {done.length}/{grade0.length} assessments complete
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Observations */}
            {observed.length > 0 && (
              <div style={{ ...card, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:14 }}>
                  <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                    textTransform:'uppercase', color:'#94a3b8', margin:0 }}>Active Observations</p>
                  <span style={{ background:'#fef9c3', color:'#b45309', fontSize:9,
                    fontWeight:900, padding:'3px 10px', borderRadius:20,
                    textTransform:'uppercase', letterSpacing:'.08em' }}>
                    {observed.length}
                  </span>
                </div>
                {observed.slice(0,5).map(s => {
                  const days = s.assessment?.teacherAssessments
                    ? Object.values(s.assessment.teacherAssessments).filter((d:any)=>d.completed).length : 0;
                  const pct = Math.round((days/14)*100);
                  return (
                    <div key={s.id} className="ai" style={{ cursor:'pointer' }}
                      onClick={() => navigate(`/teacher/assessment/${s.id}`)}>
                      <Av name={s.name} size={32}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center', marginBottom:5 }}>
                          <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                            maxWidth:150 }}>{s.name}</p>
                          <ChevronRight size={13} color="#94a3b8" style={{ flexShrink:0 }}/>
                        </div>
                        <div style={{ height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:'#f59e0b',
                            borderRadius:2, transition:'width 1s ease' }}/>
                        </div>
                        <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8',
                          margin:'3px 0 0' }}>Day {days}/14 · {pct}%</p>
                      </div>
                    </div>
                  );
                })}
                <button className="bo" style={{ width:'100%', marginTop:12, justifyContent:'center' }}
                  onClick={() => navigate('/teacher/assessment')}>
                  View all <ArrowRight size={12}/>
                </button>
              </div>
            )}

            {/* All students list */}
            <div style={{ ...card, padding:20, flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:14 }}>
                <p style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em',
                  textTransform:'uppercase', color:'#94a3b8', margin:0 }}>All Students</p>
                <span style={{ fontSize:10, fontWeight:800, color:'#6366f1' }}>
                  {students.length} total
                </span>
              </div>
              <div style={{ overflowY:'auto', maxHeight:420, paddingRight:2 }}>
                {students.map(s => {
                  const isC = records[s.id]?.isComplete;
                  const g0 = s.grade === 'Grade 0';
                  return (
                    <div key={s.id} className="ai" style={{ cursor:'pointer' }}
                      onClick={() => navigate(`/teacher/term-assessment/${s.id}`)}>
                      <Av name={s.name} size={32}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0,
                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {s.name}
                        </p>
                        <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600,
                          margin:'2px 0 0', textTransform:'uppercase', letterSpacing:'.05em' }}>
                          {s.grade} · {s.studentStatus==='ENROLLED'?'Enrolled':'Observation'}
                        </p>
                      </div>
                      {g0 && (
                        <span style={{
                          background: isC ? '#dcfce7' : '#fef9c3',
                          color: isC ? '#16a34a' : '#b45309',
                          padding:'2px 8px', borderRadius:12, fontSize:9, fontWeight:900,
                          textTransform:'uppercase', letterSpacing:'.06em', flexShrink:0
                        }}>
                          {isC ? 'Done' : 'Pend.'}
                        </span>
                      )}
                    </div>
                  );
                })}
                {students.length === 0 && (
                  <p style={{ fontSize:12, color:'#94a3b8', textAlign:'center', padding:'24px 0' }}>
                    No students found.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};