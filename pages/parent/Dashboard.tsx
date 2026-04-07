import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStudentById, getSystemSettings, getTeacherByClass,
  getReceipts, getAssessmentRecordsForStudent
} from '../../services/dataService';
import { Student, Teacher, SystemSettings, TermAssessmentRecord, PRE_PRIMARY_AREAS } from '../../types';
import { Loader } from '../../components/ui/Loader';
import {
  User, BookOpen, DollarSign, CheckCircle, Clock,
  AlertTriangle, ArrowRight, Download, FileText,
  Bell, TrendingUp, ChevronRight, Banknote, GraduationCap,
  MessageCircle, Calendar, Star
} from 'lucide-react';
import { printGrade0Report } from '../../utils/printGrade0Report';

interface ParentDashboardProps { user: any; }

/* ─── Ring chart ─── */
const Ring = ({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) => {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
};

/* ─── Avatar ─── */
const Av = ({ name, size = 44 }: { name: string; size?: number }) => {
  const palette = ['#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#8b5cf6','#06b6d4'];
  const bg = palette[(name.charCodeAt(0) + (name.charCodeAt(1)||0)) % palette.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 900, color: 'white' }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [financials, setFinancials] = useState({ totalFees: 0, paid: 0, balance: 0 });
  const [assessmentRecords, setAssessmentRecords] = useState<TermAssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      if (user?.id) {
        const stud = await getStudentById(user.id);
        const setts = await getSystemSettings();
        setStudent(stud);
        setSettings(setts);
        if (stud) {
          if (stud.assignedClass) {
            const t = await getTeacherByClass(stud.assignedClass);
            setTeacher(t);
          }
          if (stud.grade === 'Grade 0') {
            const recs = await getAssessmentRecordsForStudent('Grade 0', stud.id);
            setAssessmentRecords(recs.filter(r => r.isComplete));
          }
          if (setts?.fees) {
            const feeItem = setts.fees.find((f: any) => f.category.includes('Tuition'));
            const monthly = parseFloat(feeItem?.amount || '0');
            const allReceipts = await getReceipts();
            const paid = allReceipts
              .filter((r: any) => r.usedByStudentId === stud.id)
              .reduce((a: number, r: any) => a + parseFloat(r.amount), 0);
            const total = monthly * 12;
            setFinancials({ totalFees: total, paid, balance: total - paid });
          }
        }
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loader />;
  if (!student) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
      Student not found.
    </div>
  );

  const isEnrolled       = student.studentStatus === 'ENROLLED';
  const isAssessment     = student.studentStatus === 'ASSESSMENT';
  const isWaitingPayment = student.studentStatus === 'WAITING_PAYMENT';
  const collectionPct    = financials.totalFees > 0
    ? Math.round((financials.paid / financials.totalFees) * 100) : 0;

  const handleReport = async (record: TermAssessmentRecord) => {
    setReportLoading(p => ({ ...p, [record.termId]: true }));
    try {
      const termName = settings?.schoolCalendars?.find((c: any) => c.id === record.termId)?.termName || record.termId;
      await printGrade0Report(student, record, termName, new Date().getFullYear().toString(), teacher?.name || 'Class Teacher');
    } finally {
      setReportLoading(p => ({ ...p, [record.termId]: false }));
    }
  };

  const card: React.CSSProperties = {
    background: 'white', borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04)',
    overflow: 'hidden',
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: '#f8fafc', color: '#1e293b', minHeight: '100vh' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,800;9..40,900&display=swap');
        .pdg{display:grid;grid-template-columns:1fr 290px;gap:20px}
        .pcg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .prg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        @media(max-width:1080px){.pdg{grid-template-columns:1fr}}
        @media(max-width:800px){.pcg{grid-template-columns:1fr 1fr}.prg{grid-template-columns:1fr 1fr}}
        @media(max-width:520px){.pcg{grid-template-columns:1fr}.prg{grid-template-columns:1fr}}
        .phi:hover{background:#f8fafc}
        .phi{transition:background .14s}
        .pbp{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;
          font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
          cursor:pointer;border:none;transition:filter .15s,transform .12s;color:white}
        .pbp:hover{filter:brightness(.9);transform:translateY(-1px)}
        .pbo{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;
          font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;
          cursor:pointer;background:white;border:1.5px solid #e2e8f0;color:#334155;
          transition:border-color .15s,transform .12s}
        .pbo:hover{border-color:#6366f1;color:#6366f1;transform:translateY(-1px)}
        .pai{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f8fafc}
        .pai:last-child{border-bottom:none}
        .fadeup{animation:pfu .4s ease both}
        @keyframes pfu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}
        .spin{animation:pspin 1s linear infinite}
        @keyframes pspin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em',
            textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 4px' }}>
            Academic Year 2025–2026
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1.5,
            color: '#0f172a', lineHeight: 1, margin: '0 0 4px' }}>
            Welcome back, {student.parentName?.split(' ')[0] || 'Parent'}
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, margin: 0 }}>
            Parent Portal · <span style={{ color: '#6366f1', fontWeight: 800 }}>{student.name}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10,
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative' }}>
            <Bell size={16} color="#64748b" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white',
            border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '6px 14px 6px 8px' }}>
            <Av name={student.name} size={30} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.1 }}>
                {student.name}
              </p>
              <p style={{ fontSize: 10, margin: 0, fontWeight: 600,
                color: isEnrolled ? '#10b981' : isWaitingPayment ? '#f43f5e' : '#f59e0b' }}>
                ● {student.studentStatus.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ padding: '0 24px 48px' }}>

        {/* ── ACTION BANNER — waiting payment ── */}
        {isWaitingPayment && (
          <div style={{ background: 'linear-gradient(135deg,#fef2f2,#fff5f5)',
            border: '1.5px solid #fecaca', borderRadius: 16, padding: '20px 24px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, marginBottom: 18,
            boxShadow: '0 4px 24px rgba(244,63,94,.12)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ background: '#fecaca', padding: 12, borderRadius: 12, flexShrink: 0 }}>
                <AlertTriangle size={22} color="#f43f5e" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#be123c',
                  textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 4px' }}>
                  Action Required
                </p>
                <p style={{ fontSize: 13, color: '#9f1239', fontWeight: 600, margin: 0 }}>
                  Your application is conditionally approved. Pay the <strong>N$300</strong> registration
                  fee to secure your child's place.
                </p>
              </div>
            </div>
            <button className="pbp" style={{ background: '#f43f5e', whiteSpace: 'nowrap' }}
              onClick={() => navigate('/parent/assessment-form')}>
              Enter Receipt <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* ── ASSESSMENT COMPLETE BANNER ── */}
        {isEnrolled && student.assessment?.isComplete && (
          <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border: '1.5px solid #bbf7d0', borderRadius: 16, padding: '18px 24px',
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18,
            flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(16,185,129,.1)' }}>
            <div style={{ background: '#bbf7d0', padding: 10, borderRadius: 12, flexShrink: 0 }}>
              <CheckCircle size={22} color="#10b981" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#065f46',
                textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 2px' }}>
                Assessment Complete!
              </p>
              <p style={{ fontSize: 12, color: '#047857', fontWeight: 600, margin: 0 }}>
                {student.name} has been placed in{' '}
                <span style={{ fontWeight: 900, color: '#065f46' }}>{student.assignedClass}</span>.
              </p>
            </div>
            <span style={{ background: '#10b981', color: 'white', fontSize: 11,
              fontWeight: 900, padding: '4px 14px', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {student.assignedClass}
            </span>
          </div>
        )}

        <div className="pdg">

          {/* ════ LEFT ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* INFO CARDS */}
            <div className="pcg">

              {/* Class card */}
              <div style={{ ...card, padding: 22 }} className="fadeup">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#eef2ff', padding: 10, borderRadius: 10, color: '#6366f1' }}>
                    <GraduationCap size={18} />
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>Class Details</p>
                </div>
                <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.2,
                  color: '#0f172a', lineHeight: 1, margin: '0 0 14px' }}>
                  {student.assignedClass || '—'}
                </p>
                {[
                  { l: 'Division', v: student.division || '—' },
                  { l: 'Academic Term', v: 'Term 1, 2026' },
                  { l: 'Grade', v: student.grade || '—' },
                ].map(x => (
                  <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '.1em', color: '#94a3b8' }}>{x.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>{x.v}</span>
                  </div>
                ))}
              </div>

              {/* Teacher card */}
              <div style={{ ...card, padding: 22 }} className="fadeup d1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#fdf4ff', padding: 10, borderRadius: 10, color: '#a855f7' }}>
                    <User size={18} />
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>Class Teacher</p>
                </div>
                {teacher ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <Av name={teacher.name} size={42} />
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 900, color: '#0f172a',
                          margin: '0 0 3px', letterSpacing: -.3 }}>{teacher.name}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: 0,
                          textTransform: 'uppercase', letterSpacing: '.06em' }}>
                          {student.assignedClass} Teacher
                        </p>
                      </div>
                    </div>
                    {teacher.email && (
                      <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600,
                        margin: '0 0 14px', wordBreak: 'break-all' }}>{teacher.email}</p>
                    )}
                    <button className="pbo" style={{ width: '100%', justifyContent: 'center' }}>
                      <MessageCircle size={13} /> Message Teacher
                    </button>
                  </>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <Clock size={28} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: 0 }}>
                      Teacher assigned after assessment.
                    </p>
                  </div>
                )}
              </div>

              {/* Finance card */}
              <div style={{ ...card, padding: 22 }} className="fadeup d2">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#f0fdf4', padding: 10, borderRadius: 10, color: '#10b981' }}>
                    <Banknote size={18} />
                  </div>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>Fees Summary</p>
                </div>

                {/* Ring + percentage */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Ring pct={collectionPct} color={collectionPct >= 100 ? '#10b981' : '#f59e0b'} size={60} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900,
                      color: collectionPct >= 100 ? '#10b981' : '#f59e0b' }}>
                      {collectionPct}%
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 2px',
                      textTransform: 'uppercase', letterSpacing: '.06em' }}>Paid</p>
                    <p style={{ fontSize: 20, fontWeight: 900, color: '#10b981',
                      letterSpacing: -1, margin: 0 }}>
                      N$ {financials.paid.toLocaleString()}
                    </p>
                  </div>
                </div>

                {[
                  { l: 'Annual Total', v: `N$ ${financials.totalFees.toLocaleString()}`, c: '#334155' },
                  { l: 'Balance Due', v: `N$ ${Math.max(0,financials.balance).toLocaleString()}`,
                    c: financials.balance > 0 ? '#f43f5e' : '#10b981' },
                ].map(x => (
                  <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '.1em', color: '#94a3b8' }}>{x.l}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: x.c }}>{x.v}</span>
                  </div>
                ))}

                <button className="pbp" style={{ background: '#0f172a', width: '100%',
                  marginTop: 14, justifyContent: 'center' }}>
                  <DollarSign size={13} /> View Receipts
                </button>
              </div>
            </div>

            {/* ASSESSMENT REPORTS */}
            {student.grade === 'Grade 0' && assessmentRecords.length > 0 && (
              <div style={{ ...card, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
                      textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 4px' }}>
                      Progress Reports
                    </p>
                    <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: -1,
                      color: '#0f172a', margin: 0 }}>Term Assessment Records</p>
                  </div>
                  <span style={{ background: '#eef2ff', color: '#6366f1', fontSize: 10,
                    fontWeight: 800, padding: '4px 12px', borderRadius: 20 }}>
                    {assessmentRecords.length} term{assessmentRecords.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="prg">
                  {assessmentRecords.map(record => {
                    const isLoading = reportLoading[record.termId];
                    return (
                      <div key={record.termId}
                        style={{ border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 18,
                          display: 'flex', flexDirection: 'column', gap: 14,
                          transition: 'border-color .15s, box-shadow .15s' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a',
                              letterSpacing: -.4, margin: '0 0 3px' }}>{record.termId}</p>
                            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8',
                              textTransform: 'uppercase', letterSpacing: '.1em', margin: 0 }}>
                              {new Date(record.updatedAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </p>
                          </div>
                          <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 9,
                            fontWeight: 900, padding: '3px 10px', borderRadius: 20,
                            textTransform: 'uppercase', letterSpacing: '.08em',
                            display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={10} /> Complete
                          </span>
                        </div>

                        {/* Area progress bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {PRE_PRIMARY_AREAS.map(area => {
                            const ratings = area.components.map(c => record.ratings[c.id]).filter(Boolean);
                            let score = 0;
                            ratings.forEach((r: string) => { if(r==='FM') score+=2; else if(r==='AM') score+=1; });
                            const max = ratings.length * 2;
                            const pct = max === 0 ? 0 : Math.round((score/max)*100);
                            const col = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
                            return (
                              <div key={area.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between',
                                  marginBottom: 3 }}>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b',
                                    textTransform: 'uppercase', letterSpacing: '.08em',
                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                    textOverflow: 'ellipsis', maxWidth: '75%' }}>
                                    {area.name}
                                  </span>
                                  <span style={{ fontSize: 9, fontWeight: 900, color: col }}>
                                    {pct}%
                                  </span>
                                </div>
                                <div style={{ height: 5, background: '#f1f5f9',
                                  borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%',
                                    background: col, borderRadius: 3,
                                    transition: 'width 1s ease' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Download button */}
                        <button
                          onClick={() => handleReport(record)}
                          disabled={isLoading}
                          className="pbp"
                          style={{ background: isLoading ? '#94a3b8' : '#6366f1',
                            width: '100%', justifyContent: 'center',
                            opacity: isLoading ? 0.8 : 1 }}>
                          {isLoading ? (
                            <>
                              <svg className="spin" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="12" cy="12" r="10" strokeOpacity=".25"/>
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                              </svg>
                              Generating…
                            </>
                          ) : (
                            <><Download size={13}/> Download Report</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No reports placeholder for Grade 0 with no completed records */}
            {student.grade === 'Grade 0' && assessmentRecords.length === 0 && (
              <div style={{ ...card, padding: 32, textAlign: 'center' }}>
                <FileText size={32} color="#e2e8f0" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 6px' }}>
                  No Reports Yet
                </p>
                <p style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600, margin: 0 }}>
                  Term assessment reports will appear here once completed.
                </p>
              </div>
            )}
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Student profile card */}
            <div style={{ ...card, padding: 22,
              background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)' }}>
              <div style={{ display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', gap: 10 }}>
                <Av name={student.name} size={56} />
                <div>
                  <p style={{ fontSize: 17, fontWeight: 900, color: 'white',
                    letterSpacing: -.5, margin: '0 0 3px' }}>{student.name}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 600, margin: 0,
                    textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    {student.grade}
                  </p>
                </div>
                <span style={{ background: isEnrolled ? '#10b981' : isWaitingPayment ? '#f43f5e' : '#f59e0b',
                  color: 'white', fontSize: 9, fontWeight: 900, padding: '4px 14px',
                  borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {student.studentStatus.replace('_', ' ')}
                </span>
              </div>

              <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 16 }}>
                {[
                  { l: 'Student ID', v: student.id },
                  { l: 'Date of Birth', v: student.dob || '—' },
                  { l: 'Division', v: student.division || '—' },
                  { l: 'Stage', v: student.stage ? `Stage ${student.stage}` : '—' },
                ].map(x => (
                  <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700,
                      color: 'rgba(255,255,255,.35)', textTransform: 'uppercase',
                      letterSpacing: '.08em' }}>{x.l}</span>
                    <span style={{ fontSize: 11, fontWeight: 800,
                      color: 'rgba(255,255,255,.7)' }}>{x.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observation progress (if in assessment and not Mainstream) */}
            {isAssessment && student.division !== 'Mainstream' && (
              <div style={{ ...card, padding: 22,
                background: 'linear-gradient(135deg,#fefce8,#fef9c3)',
                border: '1.5px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ background: '#fde68a', padding: 8, borderRadius: 10 }}>
                    <Clock size={16} color="#b45309" />
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
                    textTransform: 'uppercase', color: '#b45309', margin: 0 }}>Under Observation</p>
                </div>
                {(() => {
                  const days = student.assessment?.teacherAssessments
                    ? Object.values(student.assessment.teacherAssessments).filter((d: any) => d.completed).length
                    : 0;
                  const pct = Math.round((days / 14) * 100);
                  return (
                    <>
                      <p style={{ fontSize: 30, fontWeight: 900, color: '#92400e',
                        letterSpacing: -1.5, margin: '0 0 4px', lineHeight: 1 }}>
                        Day {days}<span style={{ fontSize: 16, color: '#d97706' }}>/14</span>
                      </p>
                      <p style={{ fontSize: 11, color: '#b45309', fontWeight: 600, margin: '0 0 12px' }}>
                        14-day observation period
                      </p>
                      <div style={{ height: 8, background: '#fde68a', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%',
                          background: 'linear-gradient(90deg,#f59e0b,#d97706)',
                          borderRadius: 4, transition: 'width 1s ease' }} />
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#b45309',
                        margin: '6px 0 0', textAlign: 'right' }}>{pct}% complete</p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Quick links */}
            <div style={{ ...card, padding: 22 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
                textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 14px' }}>
                Quick Actions
              </p>
              {[
                { icon: <DollarSign size={15}/>, label: 'View Fee Receipts', color: '#10b981', bg: '#f0fdf4', path: '#' },
                { icon: <FileText size={15}/>, label: 'Progress Reports', color: '#6366f1', bg: '#eef2ff', path: '/parent/assessment' },
                { icon: <MessageCircle size={15}/>, label: 'Contact Teacher', color: '#a855f7', bg: '#fdf4ff', path: '#' },
                { icon: <Calendar size={15}/>, label: 'School Calendar', color: '#f59e0b', bg: '#fefce8', path: '/parent/register' },
              ].map((x, i) => (
                <div key={i} className="pai" style={{ cursor: 'pointer' }} onClick={() => x.path !== '#' && navigate(x.path)}>
                  <div style={{ background: x.bg, color: x.color, padding: 8, borderRadius: 9 }}>
                    {x.icon}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#334155',
                    flex: 1, alignSelf: 'center' }}>{x.label}</span>
                  <ChevronRight size={14} color="#cbd5e1" style={{ alignSelf: 'center' }} />
                </div>
              ))}
            </div>

            {/* School info */}
            <div style={{ ...card, padding: 22 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em',
                textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 14px' }}>
                School Info
              </p>
              {[
                { l: 'School', v: 'Circle of Hope Private Academy' },
                { l: 'Contact', v: '+264 81 666 4074' },
                { l: 'Email', v: 'circleofhopeacademy@yahoo.com' },
                { l: 'Reg No.', v: '7826' },
              ].map(x => (
                <div key={x.l} style={{ padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '.1em', color: '#94a3b8', margin: '0 0 1px' }}>{x.l}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', margin: 0 }}>{x.v}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};