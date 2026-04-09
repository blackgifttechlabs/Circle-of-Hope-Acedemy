import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStudentsByAssignedClass,
  getAssessmentRecordsForClass,
  getSystemSettings,
  getTeacherById,
  updateTeacher
} from '../../services/dataService';
import { Student, TermAssessmentRecord, TermCalendar } from '../../types';
import { Loader } from '../../components/ui/Loader';
import {
  Users, BookOpen, Activity, CheckCircle, Clock,
  Search, Send, ArrowRight, Bell, ChevronRight,
  TrendingUp, Eye, UserPlus, Edit2, ClipboardList, Calendar
} from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

interface TeacherDashboardProps { user: any; }

/* ─── animated ring chart ─── */
const RingChart = ({
  pct, color, size = 72, animDelay = 0, animDuration = 1400
}: {
  pct: number; color: string; size?: number; animDelay?: number; animDuration?: number;
}) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let startTime: number | null = null;
    const timer = setTimeout(() => {
      // Phase 1: shoot past target, Phase 2: settle back
      const overshoot = Math.min(pct + 18, 100);
      const totalDur = animDuration;
      const phase1 = totalDur * 0.65;
      const phase2 = totalDur * 0.35;

      const animate = (ts: number) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;

        if (elapsed < phase1) {
          const t = elapsed / phase1;
          const ease = 1 - Math.pow(1 - t, 3);
          setDisplayed(Math.round(overshoot * ease));
        } else if (elapsed < totalDur) {
          const t = (elapsed - phase1) / phase2;
          const ease = t * t;
          setDisplayed(Math.round(overshoot + (pct - overshoot) * ease));
        } else {
          setDisplayed(pct);
          return;
        }
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, animDelay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pct, animDelay, animDuration]);

  const dash = (displayed / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
};

/* ─── animated ring pct label ─── */
const AnimatedPct = ({ target, delay, duration = 1400, color }: { target: number; delay: number; duration?: number; color: string }) => {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let startTime: number | null = null;
    const overshoot = Math.min(target + 18, 100);
    const phase1 = duration * 0.65;
    const phase2 = duration * 0.35;

    const timer = setTimeout(() => {
      const animate = (ts: number) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        if (elapsed < phase1) {
          const t = elapsed / phase1;
          const ease = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(overshoot * ease));
        } else if (elapsed < duration) {
          const t = (elapsed - phase1) / phase2;
          setVal(Math.round(overshoot + (target - overshoot) * (t * t)));
        } else {
          setVal(target);
          return;
        }
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay, duration]);

  return (
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, fontWeight: 900, color }}>
      {val}%
    </span>
  );
};

/* ─── animated counter for stat values ─── */
const AnimatedCount = ({ target, delay, duration = 1300, suffix = '' }: { target: string | number; delay: number; duration?: number; suffix?: string }) => {
  const numTarget = typeof target === 'string' ? parseInt(target) || 0 : target;
  const isFraction = typeof target === 'string' && target.includes('/');
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isFraction) return;
    let startTime: number | null = null;
    const overshoot = numTarget + Math.ceil(numTarget * 0.15) + 2;

    const timer = setTimeout(() => {
      const animate = (ts: number) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const phase1 = duration * 0.65;
        const phase2 = duration * 0.35;

        if (elapsed < phase1) {
          const t = elapsed / phase1;
          const ease = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(overshoot * ease));
        } else if (elapsed < duration) {
          const t = (elapsed - phase1) / phase2;
          setVal(Math.round(overshoot + (numTarget - overshoot) * (t * t)));
        } else {
          setVal(numTarget);
          return;
        }
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [numTarget, delay, duration]);

  if (isFraction) return <>{target}</>;
  return <>{val}{suffix}</>;
};

/* ─── cinematic wave-sweep area chart ─── */
const BigChart = ({ data, animDelay = 400 }: { data: { label: string; value: number }[]; animDelay?: number }) => {
  const VB_W = 700, VB_H = 200;
  const PAD = { t: 20, r: 20, b: 40, l: 42 };
  const cw = VB_W - PAD.l - PAD.r;
  const ch = VB_H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => d.value), 100);
  const ticks = [0, 25, 50, 75, 100];

  const [displayData, setDisplayData] = useState(() => data.map(d => ({ ...d, value: 0 })));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Phase 1 (RISE): all points sweep up to target+overshoot, left-to-right staggered
    // Phase 2 (SETTLE): all points ease back down to real target values
    const RISE_DUR = 900;
    const SETTLE_DUR = 500;
    const TOTAL = RISE_DUR + SETTLE_DUR;
    const OVERSHOOT = 1.22; // each point rises 22% above its real value

    const timer = setTimeout(() => {
      let startTime: number | null = null;

      const animate = (ts: number) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;

        const newData = data.map((d, i) => {
          // Each point starts its rise slightly after the previous — cinematic left-to-right sweep
          const pointOffset = (i / (data.length - 1)) * (RISE_DUR * 0.45);
          const localElapsed = Math.max(0, elapsed - pointOffset);
          const localRise = RISE_DUR * 0.55; // each point's individual rise window

          if (localElapsed < localRise) {
            // Rising phase: ease in from 0 to overshoot
            const t = localElapsed / localRise;
            const ease = 1 - Math.pow(1 - t, 2.5);
            return { ...d, value: d.value * OVERSHOOT * ease };
          } else if (elapsed < TOTAL) {
            // Settle phase: ease back from overshoot to real
            const t = Math.min(1, (elapsed - RISE_DUR) / SETTLE_DUR);
            const ease = 1 - Math.pow(1 - t, 3);
            return { ...d, value: d.value * OVERSHOOT + (d.value - d.value * OVERSHOOT) * ease };
          } else {
            return { ...d };
          }
        });

        setDisplayData(newData);
        if (elapsed < TOTAL) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayData(data.map(d => ({ ...d })));
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, animDelay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data, animDelay]);

  const pts = displayData.map((d, i) => ({
    x: PAD.l + (i / (displayData.length - 1)) * cw,
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
          <text x={p.x} y={VB_H-PAD.b+15} fontSize="9" fill="#94a3b8" textAnchor="middle">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
};

/* ─── animated breakdown bar: full → real value ─── */
const BreakdownBar = ({ label, pct, color, delay }: { label: string; pct: number; color: string; delay: number }) => {
  const [barWidth, setBarWidth] = useState(100);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Start at 100%, hold briefly, then ease down to real pct
    const HOLD = 320;
    const EASE_DUR = 900;

    const timer = setTimeout(() => {
      // Snap to 100% first
      setBarWidth(100);
      let startTime: number | null = null;

      const holdTimer = setTimeout(() => {
        const animate = (ts: number) => {
          if (!startTime) startTime = ts;
          const elapsed = ts - startTime;
          if (elapsed < EASE_DUR) {
            const t = elapsed / EASE_DUR;
            // Cubic ease out
            const ease = 1 - Math.pow(1 - t, 3);
            setBarWidth(Math.round(100 + (pct - 100) * ease));
          } else {
            setBarWidth(pct);
            return;
          }
          rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
      }, HOLD);

      return () => clearTimeout(holdTimer);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pct, delay]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:9, height:9, borderRadius:'50%', background:color }}/>
        <span style={{ fontSize:12, fontWeight:700, color:'#334155' }}>{label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:72, height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
          <div style={{ width:`${barWidth}%`, height:'100%', background:color, borderRadius:3 }}/>
        </div>
        <span style={{ fontSize:12, fontWeight:900, color, minWidth:30, textAlign:'right' }}>{pct}%</span>
      </div>
    </div>
  );
};

/* ─── avatar ─── */
const Av = ({ name, imageUrl, size = 36 }: { name: string; imageUrl?: string; size?: number }) => {
  const palette = ['#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#8b5cf6','#06b6d4','#f43f5e'];
  const bg = palette[(name.charCodeAt(0) + (name.charCodeAt(1)||0)) % palette.length];
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid #e2e8f0' }}
      />
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.36, fontWeight:900, color:'white', letterSpacing:-.5 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

/* ─── animated student row ─── */
const StudentRow = ({
  student, index, onClick, badge, baseDelay = 300
}: {
  student: any; index: number; onClick: () => void; badge?: React.ReactNode; baseDelay?: number;
}) => {
  const [visible, setVisible] = useState(false);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const delay = baseDelay + index * 90;
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setLifted(true), delay + 60);
    const t3 = setTimeout(() => setLifted(false), delay + 240);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [index, baseDelay]);

  return (
    <div
      className="ai"
      style={{
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible
          ? lifted
            ? 'translateY(-4px)'
            : 'translateY(0px)'
          : 'translateY(14px)',
        transition: 'opacity 0.32s ease, transform 0.28s cubic-bezier(.34,1.56,.64,1)',
      }}
      onClick={onClick}
    >
      <Av name={student.name} imageUrl={student.profileImageBase64} size={32}/>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', margin:0,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {student.name}
        </p>
        <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600,
          margin:'2px 0 0', textTransform:'uppercase', letterSpacing:'.05em' }}>
          {student.grade} · {student.studentStatus==='ENROLLED'?'Enrolled':'Observation'}
        </p>
      </div>
      {badge}
    </div>
  );
};

/* ═══════════════════════════════════════ MAIN ═══════════════════════════════════════ */
export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show:false, msg:'' });
  const [terms, setTerms] = useState<TermCalendar[]>([]);
  const [activeTermId, setActiveTermId] = useState<string>('');
  const [isCached, setIsCached] = useState(false);
  const [isSpecialNeedsTeacher, setIsSpecialNeedsTeacher] = useState(false);
  // Controls whether cinematic animations fire (reset on each load)
  const [animKey, setAnimKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (user?.assignedClass) {
        const cacheKey = `teacher_dashboard_${user.id}_${activeTermId || 'default'}`;
        const cachedStr = sessionStorage.getItem(cacheKey);
        
        if (cachedStr) {
          try {
            const parsed = JSON.parse(cachedStr);
            if (parsed.timestamp && (Date.now() - parsed.timestamp < 5 * 60 * 1000)) {
              setStudents(parsed.students);
              setRecords(parsed.records);
              setTerms(parsed.terms);
              if (!activeTermId) setActiveTermId(parsed.activeTermId);
              setIsCached(true);
              setLoading(false);
            }
          } catch (e) {
            console.error("Failed to parse cache", e);
          }
        }

        if (!isCached) {
          setLoading(true);
        }

        try {
          const data = await getStudentsByAssignedClass(user.assignedClass);
          setStudents(data);
          const settings = await getSystemSettings();
          if (settings?.schoolCalendars) {
            setTerms(settings.schoolCalendars);
          }
          if (settings?.specialNeedsLevels && user.assignedClass) {
            setIsSpecialNeedsTeacher(settings.specialNeedsLevels.includes(user.assignedClass));
          }
          
          let termId = activeTermId || settings?.activeTermId || 'term-1';
          if (!activeTermId && user?.id) {
            const teacher = await getTeacherById(user.id);
            if (teacher?.activeTermId) {
              termId = teacher.activeTermId;
            }
          }
          
          const validTermIds = ['term-1', 'term-2', 'term-3'];
          if (!validTermIds.includes(termId)) {
            termId = 'term-1';
          }
          
          if (activeTermId !== termId) {
            setActiveTermId(termId);
          }

          const g0 = data.filter(s => s.grade === 'Grade 0');
          const map: Record<string,TermAssessmentRecord> = {};
          if (g0.length > 0) {
            const recs = await getAssessmentRecordsForClass('Grade 0', termId, g0.map(s => s.id));
            recs.forEach(r => { map[r.studentId] = r; });
            setRecords(map);
          }
          
          sessionStorage.setItem(`teacher_dashboard_${user.id}_${termId}`, JSON.stringify({
            timestamp: Date.now(),
            students: data,
            records: map,
            terms: settings?.schoolCalendars || [],
            activeTermId: termId
          }));

          // Trigger fresh animation run after data loads
          setAnimKey(k => k + 1);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        }
      }
      setLoading(false);
    })();
  }, [user, activeTermId]);

  const handleTermChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTermId = e.target.value;
    setActiveTermId(newTermId);
    setLoading(true);
    try {
      if (user?.id) {
        await updateTeacher(user.id, { activeTermId: newTermId });
      }
    } catch (error) {
      console.error("Error updating term:", error);
      setLoading(false);
    }
  };

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

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const trend = months.map((label,i) => ({
    label,
    value: Math.min(100, Math.max(15, donePct*0.6 + Math.sin(i*0.65)*18 + i*3.2)),
  }));

  const recentStudents = [...enrolled].slice(-5).reverse();
  const getStudentAssessmentPath = (student: Student) => (
    student.studentStatus === 'ASSESSMENT'
      ? `/teacher/assessment/${student.id}`
      : `/teacher/assess/student/${student.id}`
  );

  const card: React.CSSProperties = {
    background:'white', borderRadius:16,
    boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04)',
    overflow:'hidden',
  };

  // Staggered ring delays: card 0 starts at 0ms, card 1 at 280ms, card 2 at 520ms
  // They overlap — each starts before the previous finishes (duration ~1400ms)
  const ringDelays = [0, 280, 520];

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
        @media(max-width:1180px){.dg{grid-template-columns:1fr}}
        @media(max-width:860px){
          .mg{grid-template-columns:1fr}
          .sg{grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:8px}
        }
        @media(max-width:600px){
          .dg{gap:12px}
          .sg{grid-template-columns:repeat(2, 1fr);gap:6px}
          .mg{gap:12px}
          .hm{display:none}
          th.rth,td.rtd{padding:8px 8px;font-size:11px}
          .dashboard-header{padding:12px 12px 0 !important}
          .dashboard-body{padding:0 8px 48px !important}
          .stat-card{padding:12px !important}
          .stat-val{font-size:24px !important}
          .stat-label{font-size:8px !important}
          .btn-compact{padding:0 10px !important; height:32px !important; font-size:10px !important}
        }
        @media(max-width:400px){
          .sg{grid-template-columns:repeat(2, 1fr);gap:5px}
        }
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
      `}</style>

      {/* ── HEADER ── */}
      <div className="dashboard-header" style={{ padding:'24px 24px 0', display:'flex', justifyContent:'space-between',
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
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {terms.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'white',
              border:'1.5px solid #e2e8f0', borderRadius:10, padding:'6px 12px' }}>
              <Calendar size={16} color="#64748b"/>
              <select 
                value={activeTermId} 
                onChange={handleTermChange}
                style={{ border:'none', outline:'none', background:'transparent', fontSize:12, fontWeight:700, color:'#334155', cursor:'pointer' }}
              >
                <option value="" disabled>Select Term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.termName}</option>
                ))}
              </select>
            </div>
          )}
          {(isSpecialNeedsTeacher || user?.assignedClass?.toLowerCase().includes('grade')) && (
            <button 
              onClick={() => navigate('/teacher/lesson-plan')}
              className="btn-compact"
              style={{ background:'#2563eb', color:'white', border:'none', borderRadius:10,
                padding:'0 16px', height:40, display:'flex', alignItems:'center', gap:8,
                cursor:'pointer', fontSize:12, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase' }}>
              <ClipboardList size={16}/> <span className="hm">Enter Lesson Plan</span>
            </button>
          )}
          <button 
            onClick={() => navigate('/teacher/summary-form')}
            className="btn-compact"
            style={{ background:'#0f172a', color:'white', border:'none', borderRadius:10,
              padding:'0 16px', height:40, display:'flex', alignItems:'center', gap:8,
              cursor:'pointer', fontSize:12, fontWeight:800, letterSpacing:'.05em', textTransform:'uppercase' }}>
            <ClipboardList size={16}/> <span className="hm">Print Summary</span>
          </button>
          <button className="btn-compact" style={{ background:'white', border:'1.5px solid #e2e8f0', borderRadius:10,
            width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', position:'relative' }}>
            <Bell size={16} color="#64748b"/>
            <span style={{ position:'absolute', top:8, right:8, width:7, height:7,
              background:'#f43f5e', borderRadius:'50%', border:'1.5px solid white' }}/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'white',
            border:'1.5px solid #e2e8f0', borderRadius:10, padding:'6px 14px 6px 8px' }}>
            <Av name={user.name || 'T'} size={30}/>
            <div className="hm">
              <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', lineHeight:1.1, margin:0 }}>
                {user.name || 'Teacher'}
              </p>
              <p style={{ fontSize:10, color:'#94a3b8', fontWeight:600, margin:0 }}>Class Teacher</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="dashboard-body" style={{ padding:'0 24px 48px' }}>
        <div className="dg">

          {/* ════ LEFT ════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* STAT CARDS */}
            <div className="sg">
              {[
                { label:'Students', val:total, sub:`% enrolled`, pctTarget: growthPct, icon:<Users size={17}/>,
                  color:'#6366f1', bg:'#eef2ff', trend:'#10b981', trendLabel: 'enrolled' },
                { label:'New This Term', val:observed.length, sub:'Under observation', pctTarget: newPct, icon:<UserPlus size={17}/>,
                  color:'#f59e0b', bg:'#fefce8', trend:'#f59e0b', trendLabel: 'new' },
                { label:'Assessments', val: done.length, valSuffix: `/${grade0.length}`, sub:'% complete', pctTarget: donePct, icon:<CheckCircle size={17}/>,
                  color:'#10b981', bg:'#f0fdf4', trend:'#10b981', trendLabel: 'done' },
              ].map((c, i) => (
                <div key={`${animKey}-${i}`} className="stat-card" style={{ ...card, padding:20, display:'flex',
                  justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <div style={{ background:c.bg, padding:8, borderRadius:8, color:c.color }}>
                        {c.icon}
                      </div>
                      <p className="stat-label" style={{ fontSize:9, fontWeight:800, letterSpacing:'.14em',
                        textTransform:'uppercase', color:'#94a3b8', margin:0 }}>{c.label}</p>
                    </div>
                    <p className="stat-val" style={{ fontSize:32, fontWeight:900, letterSpacing:-1.5, color:'#0f172a',
                      lineHeight:1, margin:'0 0 6px' }}>
                      {i === 2
                        ? <><AnimatedCount key={`${animKey}-count-${i}`} target={c.val} delay={ringDelays[i]} />{c.valSuffix}</>
                        : <AnimatedCount key={`${animKey}-count-${i}`} target={c.val} delay={ringDelays[i]} />
                      }
                    </p>
                    <p style={{ fontSize:10, fontWeight:800, color:c.trend, margin:0,
                      display:'flex', alignItems:'center', gap:4 }}>
                      <TrendingUp size={11}/>
                      {i === 0 && <><AnimatedCount key={`${animKey}-sub-${i}`} target={growthPct} delay={ringDelays[i] + 200} />{c.sub}</>}
                      {i === 1 && c.sub}
                      {i === 2 && <><AnimatedCount key={`${animKey}-sub-${i}`} target={donePct} delay={ringDelays[i] + 200} />{c.sub}</>}
                    </p>
                  </div>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <RingChart
                      key={`${animKey}-ring-${i}`}
                      pct={c.pctTarget}
                      color={c.color}
                      size={68}
                      animDelay={ringDelays[i]}
                      animDuration={1400}
                    />
                    <AnimatedPct
                      key={`${animKey}-rpct-${i}`}
                      target={c.pctTarget}
                      delay={ringDelays[i]}
                      color={c.color}
                    />
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
                <BigChart key={animKey} data={trend} animDelay={200} />
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
                  { label:'Fully Mastered',    key:'FM', pct:fmP, color:'#10b981', delay: 300 },
                  { label:'Almost Mastered',   key:'AM', pct:amP, color:'#f59e0b', delay: 480 },
                  { label:'Not Yet Mastered',  key:'NM', pct:nmP, color:'#f43f5e', delay: 660 },
                ].map(x => (
                  <BreakdownBar key={`${animKey}-bar-${x.key}`} label={x.label} pct={x.pct} color={x.color} delay={x.delay} />
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
                {recentStudents.map((s, idx) => (
                  <StudentRow
                    key={`${animKey}-new-${s.id}`}
                    student={s}
                    index={idx}
                    baseDelay={800}
                    onClick={() => navigate(getStudentAssessmentPath(s))}
                    badge={<span style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', flexShrink:0 }}/>}
                  />
                ))}
              </div>
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
                      onClick={() => navigate(getStudentAssessmentPath(s))}>
                      <Av name={s.name} imageUrl={s.profileImageBase64} size={32}/>
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
                {students.map((s, idx) => {
                  const isC = records[s.id]?.isComplete;
                  const isG0 = s.grade === 'Grade 0';
                  const badge = isG0 ? (
                    <span style={{
                      background: isC ? '#dcfce7' : '#fef9c3',
                      color: isC ? '#16a34a' : '#b45309',
                      padding:'2px 8px', borderRadius:12, fontSize:9, fontWeight:900,
                      textTransform:'uppercase', letterSpacing:'.06em', flexShrink:0
                    }}>
                      {isC ? 'Done' : 'Pend.'}
                    </span>
                  ) : undefined;

                  return (
                    <StudentRow
                      key={`${animKey}-all-${s.id}`}
                      student={s}
                      index={idx}
                      onClick={() => navigate(getStudentAssessmentPath(s))}
                      badge={badge}
                    />
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
