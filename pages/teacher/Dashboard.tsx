import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, ClipboardList, Layers3, Users, ArrowRight, FileSpreadsheet, X } from 'lucide-react';
import {
  getSystemSettings,
  getStudentsForTeacher,
  getTeacherById,
  getTeacherTeachingClasses,
  updateTeacher,
} from '../../services/dataService';
import { Student, TermCalendar } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { withTeachingClass, getSelectedTeachingClass, isSpecialNeedsClass, matchesTeachingClass } from '../../utils/teacherClassSelection';
import { isGrade1To7Class } from '../../utils/assessmentWorkflow';

interface TeacherDashboardProps {
  user: any;
}

const TAB_COLORS = ['#ea580c', '#2563eb', '#16a34a', '#7c3aed', '#db2777', '#0f766e'];

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState('');
  const [activeTermId, setActiveTermId] = useState('');
  const [terms, setTerms] = useState<TermCalendar[]>([]);
  const [summaryPickerOpen, setSummaryPickerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
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

        const nextClasses = classes;
        const selectedClass = getSelectedTeachingClass(teacher || user, location.search) || nextClasses[0] || '';

        setStudents(assignedStudents);
        setTeachingClasses(nextClasses);
        setActiveClass(selectedClass);
        setTerms(settings?.schoolCalendars || []);

        const nextTermId = teacher?.activeTermId || settings?.activeTermId || 'term-1';
        setActiveTermId(nextTermId);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search, user]);

  const classStudents = useMemo(() => {
    return students
      .filter((student) => matchesTeachingClass(student.assignedClass || student.grade || student.level || '', activeClass))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeClass, students]);
  const classCounts = useMemo(
    () =>
      teachingClasses.reduce<Record<string, number>>((acc, className) => {
        acc[className] = students.filter((student) => matchesTeachingClass(student.assignedClass || student.grade || student.level || '', className)).length;
        return acc;
      }, {}),
    [students, teachingClasses]
  );

  const enrolledStudents = classStudents.filter((student) => student.studentStatus === 'ENROLLED');
  const assessmentStudents = classStudents.filter((student) => student.studentStatus === 'ASSESSMENT');
  const currentColor = TAB_COLORS[Math.max(0, teachingClasses.indexOf(activeClass)) % TAB_COLORS.length] || '#2563eb';
  const classModeLabel = isSpecialNeedsClass(activeClass) ? 'Special Needs' : 'Mainstream';
  const classTemplateLabel = isGrade1To7Class(activeClass) ? 'Grade 1-7 Template' : 'Pre-Primary / Level Template';

  const handleClassSelect = async (className: string) => {
    setActiveClass(className);
    navigate(withTeachingClass('/teacher/dashboard', className), { replace: true });
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

  const handleOpenSummary = (className?: string) => {
    const targetClass = className || activeClass;
    if (!targetClass) return;
    navigate(withTeachingClass('/teacher/summary-form', targetClass));
    setSummaryPickerOpen(false);
  };

  if (loading) return <Loader />;

  if (teachingClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
          <BookOpen size={28} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Teaching Classes Assigned</h2>
        <p className="text-slate-500 mt-2 max-w-md">Ask the administrator to assign classes and students to your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 -m-5 p-5 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {summaryPickerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Summary Form</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Select Class</h2>
                  <p className="mt-2 text-sm text-slate-500">Choose the class you want to open. The summary will load only your students in that class.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSummaryPickerOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                {teachingClasses.map((className, index) => (
                  <button
                    key={className}
                    type="button"
                    onClick={() => handleOpenSummary(className)}
                    className="rounded-[24px] border border-slate-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  >
                    <div
                      className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: TAB_COLORS[index % TAB_COLORS.length] }}
                    >
                      <ClipboardList size={18} />
                    </div>
                    <p className="text-lg font-black text-slate-900">{className}</p>
                    <p className="mt-2 text-sm text-slate-500">{classCounts[className] || 0} assigned learner{(classCounts[className] || 0) === 1 ? '' : 's'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[28px] overflow-hidden shadow-sm border border-slate-200" style={{ background: `linear-gradient(135deg, ${currentColor} 0%, #0f172a 100%)` }}>
          <div className="p-6 md:p-8 text-white">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">Teacher Dashboard</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">{activeClass}</h1>
                <p className="mt-3 text-sm text-white/80 max-w-2xl">
                  {user?.name || 'Teacher'} is assigned across {teachingClasses.length} classes. The active class controls register, assessments, summaries, and lesson plans.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {terms.length > 0 && (
                  <div className="bg-white/10 border border-white/15 rounded-2xl px-4 py-2 flex items-center gap-3">
                    <Calendar size={16} />
                    <select
                      value={activeTermId}
                      onChange={handleTermChange}
                      className="bg-transparent text-sm font-bold outline-none"
                    >
                      {terms.map((term) => (
                        <option key={term.id} value={term.id} className="text-slate-900">
                          {term.termName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => navigate(withTeachingClass('/teacher/lesson-plan', activeClass))}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-5 py-3 text-sm font-black shadow-sm"
                >
                  <ClipboardList size={16} />
                  Lesson Plan
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {teachingClasses.map((className, index) => {
                const active = className === activeClass;
                return (
                  <button
                    key={className}
                    type="button"
                    onClick={() => handleClassSelect(className)}
                    className={`rounded-full px-4 py-2 text-sm font-black tracking-wide transition-all ${
                      active ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/10 text-white border border-white/15'
                    }`}
                    style={!active ? { boxShadow: `inset 0 0 0 1px ${TAB_COLORS[index % TAB_COLORS.length]}55` } : undefined}
                  >
                    {className}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Enrolled Students', value: enrolledStudents.length, note: `${classModeLabel} class`, icon: <Users size={18} /> },
            { label: 'Under Assessment', value: assessmentStudents.length, note: 'Not yet enrolled', icon: <FileSpreadsheet size={18} /> },
            { label: 'Classes I Teach', value: teachingClasses.length, note: teachingClasses.join(', '), icon: <Layers3 size={18} /> },
            { label: 'Teaching Template', value: classTemplateLabel, note: 'Used for lesson plans and summaries', icon: <ClipboardList size={18} /> },
          ].map((card) => (
            <div key={card.label} className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-4" style={{ backgroundColor: currentColor }}>
                {card.icon}
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-900 break-words">{card.value}</p>
              <p className="mt-2 text-sm text-slate-500">{card.note}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-5">
          <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Class</p>
                <h2 className="text-2xl font-black text-slate-900 mt-2">{activeClass}</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(withTeachingClass('/teacher/classes', activeClass))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Open Class
                </button>
                <button
                  onClick={() => (teachingClasses.length > 1 ? setSummaryPickerOpen(true) : handleOpenSummary(activeClass))}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                >
                  Summary Form
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(withTeachingClass('/teacher/register', activeClass))}
                className="text-left rounded-3xl p-5 text-white shadow-sm"
                style={{ backgroundColor: currentColor }}
              >
                <p className="text-xs uppercase tracking-[0.24em] font-black text-white/70">Register</p>
                <p className="text-xl font-black mt-3">Mark Daily Attendance</p>
                <p className="text-sm text-white/80 mt-2">Only learners from {activeClass} appear in the register.</p>
              </button>
              <button
                onClick={() => navigate(withTeachingClass('/teacher/assess', activeClass))}
                className="text-left rounded-3xl p-5 bg-orange-500 text-white shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.24em] font-black text-white/70">Assessments</p>
                <p className="text-xl font-black mt-3">Open Assessment Workflow</p>
                <p className="text-sm text-white/80 mt-2">Loads the correct subject layout for {activeClass}.</p>
              </button>
              <button
                onClick={() => navigate(withTeachingClass('/teacher/lesson-plan', activeClass))}
                className="text-left rounded-3xl p-5 bg-emerald-600 text-white shadow-sm"
              >
                <p className="text-xs uppercase tracking-[0.24em] font-black text-white/70">Lesson Plan</p>
                <p className="text-xl font-black mt-3">{classTemplateLabel}</p>
                <p className="text-sm text-white/80 mt-2">The active class decides which lesson-plan template opens.</p>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Assigned Students</p>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Recent Learners</h2>
            <div className="mt-5 space-y-3">
              {classStudents.slice(0, 6).map((student) => (
                <button
                  key={student.id}
                  onClick={() => navigate(withTeachingClass(`/teacher/assess/student/${student.id}`, activeClass))}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{student.id} · {student.studentStatus || 'ENROLLED'}</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                  </div>
                </button>
              ))}
              {classStudents.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No students are assigned to {activeClass} yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
