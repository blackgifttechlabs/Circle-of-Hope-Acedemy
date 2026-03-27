import React, { useEffect, useState } from 'react';
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
  CheckCircle, Clock, Search, Send, ArrowRight, Edit2, ClipboardList, Calendar
} from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

interface MyClassProps { user: any; }

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

export const MyClass: React.FC<MyClassProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show:false, msg:'' });
  const [terms, setTerms] = useState<TermCalendar[]>([]);
  const [activeTermId, setActiveTermId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (user?.assignedClass) {
        setLoading(true);
        try {
          const data = await getStudentsByAssignedClass(user.assignedClass);
          setStudents(data);
          const settings = await getSystemSettings();
          if (settings?.schoolCalendars) {
            setTerms(settings.schoolCalendars);
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
        } catch (error) {
          console.error("Error fetching class data:", error);
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
      <h2 style={{ fontWeight:900, fontSize:22, letterSpacing:-1, textTransform:'uppercase' }}>No Class Assigned</h2>
      <p style={{ color:'#94a3b8', marginTop:8 }}>Contact the administrator to get assigned.</p>
    </div>
  );

  const enrolled  = students.filter(s => s.studentStatus === 'ENROLLED');
  const grade0    = enrolled.filter(s => s.grade === 'Grade 0');
  const done      = grade0.filter(s => records[s.id]?.isComplete);
  const filtered = enrolled.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

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
        .hrow:hover{background:#f8fafc}
        .hrow{transition:background .14s}
        .bp{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:9px;
           font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
           cursor:pointer;border:none;transition:filter .15s,transform .12s; color: white;}
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
        @media(max-width:600px){.hm{display:none}th.rth,td.rtd{padding:8px 8px;font-size:11px}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding:'24px 24px 0', display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:900, letterSpacing:-1.5, color:'#0f172a',
            lineHeight:1, margin:'0 0 4px' }}>
            My Class
          </h1>
          <p style={{ fontSize:12, color:'#64748b', fontWeight:600, margin:0 }}>
            {user.assignedClass}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
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
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding:'0 24px 48px' }}>
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
                onClick={() => navigate('/teacher/register')}>
                <ClipboardList size={13}/> Mark Register
              </button>
              <button className="bp" style={{ background:'#6366f1' }}
                onClick={() => setToast({show:true, msg:'Assessments submitted to admin!'})}>
                <Send size={13}/> Submit
              </button>
              <button className="bo"
                onClick={() => navigate('/teacher/class-list-form')}>
                Class List Form
              </button>
              <button className="bo"
                onClick={() => navigate('/teacher/summary-form')}>
                Summary Form
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
    </div>
  );
};
