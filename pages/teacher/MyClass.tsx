import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, ClipboardList, Clock, Edit2, Search, Send } from 'lucide-react';
import {
  getAssessmentRecordsForClass,
  getCustomTopicEntries,
  getStudentsForTeacher,
  getSystemSettings,
  getTeacherById,
  getTeacherTeachingClasses,
  getTopicAssessments,
  getTopicOverrides,
  updateTeacher,
} from '../../services/dataService';
import { Student, TermAssessmentRecord, TermCalendar } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Toast } from '../../components/ui/Toast';
import {
  getAssessmentRecordKey,
  getAssessmentSubjects,
  getDefaultThemesForSubject,
  getDefaultTopicsForTheme,
  isGrade1To7Class,
} from '../../utils/assessmentWorkflow';
import { getSelectedTeachingClass, matchesTeachingClass, withTeachingClass } from '../../utils/teacherClassSelection';

interface MyClassProps {
  user: any;
}

const TAB_COLORS = ['#ea580c', '#2563eb', '#16a34a', '#7c3aed', '#db2777', '#0f766e'];

const Av = ({ name, imageUrl, size = 36 }: { name: string; imageUrl?: string; size?: number }) => {
  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4', '#f43f5e'];
  const bg = palette[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % palette.length];
  if (imageUrl) {
    return <img src={imageUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 900, color: 'white' }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export const MyClass: React.FC<MyClassProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});
  const [progressMap, setProgressMap] = useState<Record<string, { done: number; total: number; percent: number; label: string }>>({});
  const [toast, setToast] = useState({ show: false, msg: '' });
  const [terms, setTerms] = useState<TermCalendar[]>([]);
  const [activeTermId, setActiveTermId] = useState('');
  const [teachingClasses, setTeachingClasses] = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState('');
  const [studentMode, setStudentMode] = useState<'ENROLLED' | 'ASSESSMENT'>('ENROLLED');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSetup = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [teacher, assignedStudents, classes, settings] = await Promise.all([
          getTeacherById(user.id),
          getStudentsForTeacher(user.id),
          getTeacherTeachingClasses(user.id),
          getSystemSettings(),
        ]);

        const selectedClass = getSelectedTeachingClass(teacher || user, location.search) || classes[0] || '';
        const nextTermId = teacher?.activeTermId || settings?.activeTermId || 'term-1';

        setStudents(assignedStudents);
        setTeachingClasses(classes);
        setTerms(settings?.schoolCalendars || []);
        setActiveClass(selectedClass);
        setActiveTermId(nextTermId);
      } catch (error) {
        console.error('Error fetching class data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSetup();
  }, [location.search, user]);

  const classStudents = useMemo(() => {
    return students
      .filter((student) => matchesTeachingClass(student.assignedClass || student.grade || student.level || '', activeClass))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeClass, students]);

  const enrolledStudents = classStudents.filter((student) => student.studentStatus === 'ENROLLED');
  const assessmentStudents = classStudents.filter((student) => student.studentStatus === 'ASSESSMENT');
  const visibleStudents = studentMode === 'ASSESSMENT' ? assessmentStudents : enrolledStudents;
  const filteredStudents = visibleStudents.filter((student) => student.name.toLowerCase().includes(search.toLowerCase()));
  const isGradeWorkflow = isGrade1To7Class(activeClass);
  const currentColor = TAB_COLORS[Math.max(0, teachingClasses.indexOf(activeClass)) % TAB_COLORS.length] || '#2563eb';
  const enrolledStudentIds = useMemo(() => enrolledStudents.map((student) => student.id).join('|'), [enrolledStudents]);

  useEffect(() => {
    const loadAssessmentState = async () => {
      if (!activeClass || !activeTermId) return;

      const nextRecords: Record<string, TermAssessmentRecord> = {};
      const nextProgress: Record<string, { done: number; total: number; percent: number; label: string }> = {};

      if (!isGradeWorkflow) {
        const classRecordKey = getAssessmentRecordKey(activeClass);
        if (enrolledStudents.length > 0) {
          const recs = await getAssessmentRecordsForClass(classRecordKey, activeTermId, enrolledStudents.map((student) => student.id));
          recs.forEach((record) => {
            nextRecords[record.studentId] = record;
          });
        }

        const subjects = getAssessmentSubjects(activeClass).map((item) => item.id);
        const total = subjects.reduce((sum, subject) => {
          const themes = getDefaultThemesForSubject(activeClass, activeTermId, subject);
          return sum + themes.reduce(
            (inner, _theme, index) => inner + getDefaultTopicsForTheme(activeClass, activeTermId, subject, String(index)).length,
            0
          );
        }, 0);

        enrolledStudents.forEach((student) => {
          const done = Object.values(nextRecords[student.id]?.rawScores || {}).filter(Boolean).length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          nextProgress[student.id] = {
            done,
            total,
            percent,
            label: nextRecords[student.id]?.isComplete ? 'Complete' : percent > 0 ? 'In Progress' : 'Not Started',
          };
        });
      } else {
        const subjects = getAssessmentSubjects(activeClass).map((item) => item.id);
        const subjectData = await Promise.all(subjects.map(async (subject) => {
          const [topicAssessments, customTopics, overrides] = await Promise.all([
            getTopicAssessments(activeClass, activeTermId, subject),
            getCustomTopicEntries(activeClass, activeTermId, subject),
            getTopicOverrides(activeClass, activeTermId, subject),
          ]);

          const baseTopics = getDefaultTopicsForTheme(activeClass, activeTermId, subject, 'default').map((item) => item.label);
          const adjustedTopics = baseTopics.reduce<string[]>((acc, topic) => {
            const override = overrides.find((item) => item.originalTopic === topic);
            if (override?.deleted) return acc;
            acc.push(override?.topic || topic);
            return acc;
          }, []);

          customTopics.forEach((item) => {
            if (!adjustedTopics.includes(item.topic)) adjustedTopics.push(item.topic);
          });
          topicAssessments.forEach((item) => {
            if (!adjustedTopics.includes(item.topic)) adjustedTopics.push(item.topic);
          });

          return { topicAssessments, totalTopics: adjustedTopics.length };
        }));

        enrolledStudents.forEach((student) => {
          let done = 0;
          let total = 0;
          subjectData.forEach(({ topicAssessments, totalTopics }) => {
            const studentTopics = new Set(topicAssessments.filter((item) => item.studentId === student.id).map((item) => item.topic));
            done += studentTopics.size;
            total += totalTopics;
          });
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          nextProgress[student.id] = {
            done,
            total,
            percent,
            label: percent >= 100 ? 'Complete' : percent > 0 ? 'In Progress' : 'Not Started',
          };
        });
      }

      setRecords(nextRecords);
      setProgressMap(nextProgress);
    };

    loadAssessmentState();
  }, [activeClass, activeTermId, enrolledStudentIds, isGradeWorkflow]);

  const handleClassSelect = async (className: string) => {
    setActiveClass(className);
    navigate(withTeachingClass('/teacher/classes', className), { replace: true });
    if (user?.id) {
      await updateTeacher(user.id, { activeTeachingClass: className });
    }
  };

  const handleTermChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = event.target.value;
    setActiveTermId(termId);
    if (user?.id) {
      await updateTeacher(user.id, { activeTermId: termId });
    }
  };

  if (loading) return <Loader />;

  if (teachingClasses.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', padding: 32 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, letterSpacing: -1, textTransform: 'uppercase' }}>No Classes Assigned</h2>
        <p style={{ color: '#94a3b8', marginTop: 8 }}>Contact the administrator to get students assigned to you.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: '#f8fafc', color: '#1e293b', minHeight: '100vh' }}>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ show: false, msg: '' })} variant="success" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,800;0,9..40,900&display=swap');
        .hrow:hover{background:#f8fafc}
        .hrow{transition:background .14s}
        .bp{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:12px;font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;border:none;transition:filter .15s,transform .12s;color:white}
        .bp:hover{filter:brightness(.94);transform:translateY(-1px)}
        .bo{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:12px;font-weight:900;font-size:11px;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;background:white;border:1.5px solid #e2e8f0;color:#334155;transition:border-color .15s,transform .12s}
        .bo:hover{border-color:#334155;transform:translateY(-1px)}
        .si{width:100%;padding:11px 12px 11px 38px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:12px;outline:none;background:white;font-family:inherit;transition:border-color .15s}
        .si:focus{border-color:#0f172a}
        .mode-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:14px;font-weight:900;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border:1.5px solid transparent;transition:transform .12s,border-color .15s,background .15s}
        .mode-btn:hover{transform:translateY(-1px)}
        th.rth{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;padding:10px 14px;border-bottom:1px solid #f1f5f9;white-space:nowrap;text-align:left}
        td.rtd{padding:12px 14px}
        @media(max-width:700px){.hm{display:none}th.rth,td.rtd{padding:8px 8px;font-size:11px}}
      `}</style>

      <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.2, color: '#0f172a', lineHeight: 1 }}>My Classes</h1>
          <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 6 }}>
            Switch tabs to work with the correct learners, register, assessment sheet, and lesson-plan template.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="bp" style={{ background: '#2563eb' }} onClick={() => navigate(withTeachingClass('/teacher/lesson-plan', activeClass))}>
            <ClipboardList size={13} /> Lesson Plan
          </button>
          {terms.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '8px 12px' }}>
              <Calendar size={16} color="#64748b" />
              <select
                value={activeTermId}
                onChange={handleTermChange}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{term.termName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 24px 14px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {teachingClasses.map((className, index) => {
          const active = className === activeClass;
          const color = TAB_COLORS[index % TAB_COLORS.length];
          return (
            <button
              key={className}
              type="button"
              onClick={() => handleClassSelect(className)}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: `2px solid ${active ? color : `${color}30`}`,
                background: active ? color : 'white',
                color: active ? 'white' : color,
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              {className}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '0 24px 18px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          onClick={() => setStudentMode('ENROLLED')}
          className="mode-btn"
          style={{
            background: studentMode === 'ENROLLED' ? '#16a34a' : '#ecfdf5',
            color: studentMode === 'ENROLLED' ? 'white' : '#166534',
            borderColor: studentMode === 'ENROLLED' ? '#16a34a' : '#bbf7d0',
          }}
        >
          <CheckCircle size={14} /> Enrolled ({enrolledStudents.length})
        </button>
        <button
          type="button"
          onClick={() => setStudentMode('ASSESSMENT')}
          className="mode-btn"
          style={{
            background: studentMode === 'ASSESSMENT' ? '#ea580c' : '#fff7ed',
            color: studentMode === 'ASSESSMENT' ? 'white' : '#c2410c',
            borderColor: studentMode === 'ASSESSMENT' ? '#ea580c' : '#fed7aa',
          }}
        >
          <Clock size={14} /> Under Assessment ({assessmentStudents.length})
        </button>
      </div>

      <div style={{ padding: '0 24px 48px' }}>
        <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 1px 4px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 3px' }}>Class Register</p>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, margin: 0 }}>
                {activeClass} · {filteredStudents.length} learner{filteredStudents.length !== 1 ? 's' : ''} {studentMode === 'ASSESSMENT' ? 'under assessment' : 'enrolled'}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button className="bp" style={{ background: '#10b981' }} onClick={() => navigate(withTeachingClass('/teacher/register', activeClass))}>
                <ClipboardList size={13} /> Mark Register
              </button>
              <button className="bp" style={{ background: '#6366f1' }} onClick={() => setToast({ show: true, msg: `${activeClass} assessments submitted to admin.` })}>
                <Send size={13} /> Submit
              </button>
              <button className="bo" onClick={() => navigate(withTeachingClass('/teacher/summary-form', activeClass))}>
                Summary Form
              </button>
              {studentMode === 'ASSESSMENT' ? (
                <button className="bp" style={{ background: '#ea580c' }} onClick={() => filteredStudents[0] && navigate(withTeachingClass(`/teacher/assessment/${filteredStudents[0].id}`, activeClass))}>
                  <ClipboardList size={13} /> Start Observation
                </button>
              ) : (
                <button className="bp" style={{ background: currentColor }} onClick={() => navigate(withTeachingClass('/teacher/assess', activeClass))}>
                  <ClipboardList size={13} /> Assess Students
                </button>
              )}
              <div style={{ position: 'relative', minWidth: 180 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input className="si" placeholder="Search learners…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="rth">Student</th>
                  <th className="rth hm">Status</th>
                  <th className="rth hm">Class</th>
                  <th className="rth">Assessment</th>
                  <th className="rth" style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const observationDone = student.assessment?.teacherAssessments
                    ? Object.values(student.assessment.teacherAssessments).filter((day: any) => day?.completed).length
                    : 0;
                  const progress = studentMode === 'ASSESSMENT'
                    ? {
                        done: observationDone,
                        total: 14,
                        percent: Math.round((observationDone / 14) * 100),
                        label: observationDone > 0 ? 'In Progress' : 'Not Started',
                      }
                    : (progressMap[student.id] || { done: 0, total: 0, percent: 0, label: 'Not Started' });
                  const isComplete = studentMode === 'ASSESSMENT'
                    ? !!student.assessment?.isComplete
                    : records[student.id]?.isComplete || progress.percent >= 100;

                  return (
                    <tr key={student.id} className="hrow" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td className="rtd">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Av name={student.name} imageUrl={student.profileImageBase64} size={32} />
                          <div>
                            <p style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: 13 }}>{student.name}</p>
                            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              {student.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="rtd hm">
                        <span style={{
                          background: studentMode === 'ASSESSMENT' ? '#ffedd5' : '#dcfce7',
                          color: studentMode === 'ASSESSMENT' ? '#c2410c' : '#16a34a',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '.06em'
                        }}>
                          {studentMode === 'ASSESSMENT' ? 'Under Assessment' : 'Enrolled'}
                        </span>
                      </td>
                      <td className="rtd hm">
                        <span style={{ fontSize: 12, fontWeight: 700, color: currentColor }}>{student.assignedClass || student.grade || student.level}</span>
                      </td>
                      <td className="rtd">
                        <div style={{ minWidth: 190 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: isComplete ? '#16a34a' : progress.percent > 0 ? '#2563eb' : '#b45309', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                              {isComplete ? <CheckCircle size={13} /> : <Clock size={13} />}
                              {isComplete ? 'Complete' : progress.label}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>
                              {progress.done}/{progress.total} · {progress.percent}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ width: `${progress.percent}%`, height: '100%', background: isComplete ? '#16a34a' : currentColor }} />
                          </div>
                        </div>
                      </td>
                      <td className="rtd" style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(withTeachingClass(studentMode === 'ASSESSMENT' ? `/teacher/assessment/${student.id}` : `/teacher/assess/student/${student.id}`, activeClass))}
                          className="bp"
                          style={{ background: studentMode === 'ASSESSMENT' ? '#ea580c' : currentColor, padding: '7px 14px' }}
                        >
                          <Edit2 size={12} /> {studentMode === 'ASSESSMENT' ? 'Assess' : 'Record'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: '#cbd5e1', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      No {studentMode === 'ASSESSMENT' ? 'under-assessment' : 'enrolled'} learners found for this class
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Showing {filteredStudents.length} of {visibleStudents.length}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Active Term: {terms.find((term) => term.id === activeTermId)?.termName || activeTermId}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
