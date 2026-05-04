import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers3,
  Users,
  X,
} from 'lucide-react';
import {
  getSystemSettings,
  getStudentsForTeacher,
  getTeacherById,
  getTeacherTeachingClasses,
  getTopicAssessments,
  updateTeacher,
} from '../../services/dataService';
import { Student, TermCalendar, TopicAssessmentRecord } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { withTeachingClass, getSelectedTeachingClass, isSpecialNeedsClass, matchesTeachingClass } from '../../utils/teacherClassSelection';
import {
  getAssessmentRecordKey,
  getAssessmentSubjects,
  getDefaultThemesForSubject,
  getDefaultTopicsForTheme,
  getSubjectLabel,
  isGrade1To7Class,
} from '../../utils/assessmentWorkflow';

interface TeacherDashboardProps {
  user: any;
}

const CHART_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
const CHART_X_VALUES = [0, 110, 220, 330, 440, 550];

type SubjectMetric = {
  subjectId: string;
  label: string;
  totalTopics: number;
  startedTopics: number;
  completedTopics: number;
  recordedMarks: number;
  averageScore: number | null;
  latestUpdatedAt: number;
};

const getMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getTermIdForAssessments = (termId: string) => (['term-1', 'term-2', 'term-3'].includes(termId) ? termId : 'term-1');

const getDefaultTopicLabels = (className: string, termId: string, subjectId: string) => {
  if (isGrade1To7Class(className)) {
    return getDefaultTopicsForTheme(className, termId, subjectId, 'default').map((topic) => topic.label);
  }

  return getDefaultThemesForSubject(className, termId, subjectId).flatMap((_, index) =>
    getDefaultTopicsForTheme(className, termId, subjectId, String(index)).map((topic) => topic.label)
  );
};

const buildPolyline = (values: number[], maxValue: number) =>
  values
    .map((value, index) => {
      const y = 150 - (value / Math.max(maxValue, 1)) * 118;
      return `${CHART_X_VALUES[index]},${Number.isFinite(y) ? y.toFixed(1) : 150}`;
    })
    .join(' ');

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState('');
  const [activeTermId, setActiveTermId] = useState('');
  const [terms, setTerms] = useState<TermCalendar[]>([]);
  const [assessmentRecords, setAssessmentRecords] = useState<TopicAssessmentRecord[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
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

        const selectedClass = getSelectedTeachingClass(teacher || user, location.search) || classes[0] || '';

        setStudents(assignedStudents);
        setTeachingClasses(classes);
        setActiveClass(selectedClass);
        setTerms(settings?.schoolCalendars || []);
        setActiveTermId(teacher?.activeTermId || settings?.activeTermId || 'term-1');
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search, user]);

  useEffect(() => {
    const fetchAssessmentMetrics = async () => {
      if (!activeClass) {
        setAssessmentRecords([]);
        return;
      }

      setAssessmentsLoading(true);
      try {
        const assessmentTermId = getTermIdForAssessments(activeTermId);
        const recordKey = getAssessmentRecordKey(activeClass);
        const subjects = getAssessmentSubjects(activeClass);
        const records = await Promise.all(
          subjects.map((subject) => getTopicAssessments(recordKey, assessmentTermId, subject.id))
        );
        setAssessmentRecords(records.flat());
      } catch (error) {
        console.error('Error fetching dashboard assessment metrics:', error);
        setAssessmentRecords([]);
      } finally {
        setAssessmentsLoading(false);
      }
    };

    fetchAssessmentMetrics();
  }, [activeClass, activeTermId]);

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
  const classModeLabel = isSpecialNeedsClass(activeClass) ? 'Special Needs' : 'Mainstream';
  const classTemplateLabel = isGrade1To7Class(activeClass) ? 'Grade 1-7 Template' : 'Pre-Primary / Level Template';
  const enrolledStudentIds = useMemo(() => new Set(enrolledStudents.map((student) => student.id)), [enrolledStudents]);
  const filteredAssessmentRecords = useMemo(
    () => assessmentRecords.filter((record) => enrolledStudentIds.has(record.studentId)),
    [assessmentRecords, enrolledStudentIds]
  );
  const subjectMetrics = useMemo<SubjectMetric[]>(() => {
    const assessmentTermId = getTermIdForAssessments(activeTermId);
    const learnerCount = Math.max(enrolledStudents.length, 1);

    return getAssessmentSubjects(activeClass)
      .map((subject) => {
        const records = filteredAssessmentRecords.filter((record) => record.subject === subject.id);
        const topics = Array.from(new Set([...getDefaultTopicLabels(activeClass, assessmentTermId, subject.id), ...records.map((record) => record.topic)]));
        const completedTopics = topics.filter((topic) => new Set(records.filter((record) => record.topic === topic).map((record) => record.studentId)).size >= learnerCount).length;
        const startedTopics = topics.filter((topic) => records.some((record) => record.topic === topic)).length;
        const maxMark = isGrade1To7Class(activeClass) ? 10 : 3;
        const averageScore = records.length
          ? Math.round((records.reduce((sum, record) => sum + record.mark, 0) / (records.length * maxMark)) * 100)
          : null;

        return {
          subjectId: subject.id,
          label: getSubjectLabel(subject.id, activeClass),
          totalTopics: topics.length,
          startedTopics,
          completedTopics,
          recordedMarks: records.length,
          averageScore,
          latestUpdatedAt: Math.max(0, ...records.map((record) => getMillis(record.updatedAt))),
        };
      })
      .sort((a, b) => b.latestUpdatedAt - a.latestUpdatedAt);
  }, [activeClass, activeTermId, enrolledStudents.length, filteredAssessmentRecords]);

  const classOverview = useMemo(() => {
    const totalTopics = subjectMetrics.reduce((sum, metric) => sum + metric.totalTopics, 0);
    const completed = subjectMetrics.reduce((sum, metric) => sum + metric.completedTopics, 0);
    const inProgress = subjectMetrics.reduce((sum, metric) => sum + Math.max(metric.startedTopics - metric.completedTopics, 0), 0);
    const notStarted = Math.max(totalTopics - completed - inProgress, 0);
    return { totalTopics, completed, inProgress, notStarted };
  }, [subjectMetrics]);

  const chartSeries = useMemo(() => {
    const buckets = Array(6).fill(0) as number[];
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 35);

    filteredAssessmentRecords.forEach((record) => {
      const millis = getMillis(record.updatedAt);
      const index = millis ? Math.floor((millis - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 5;
      if (index >= 0 && index < 6) buckets[index] += 1;
    });

    const completed = buckets.reduce<number[]>((acc, count, index) => {
      acc.push((acc[index - 1] || 0) + count);
      return acc;
    }, []);
    const started = completed.map((value) => Math.min(value + classOverview.inProgress, classOverview.totalTopics * Math.max(enrolledStudents.length, 1)));
    const remaining = completed.map((value) => Math.max((classOverview.totalTopics * Math.max(enrolledStudents.length, 1)) - value, 0));
    const maxValue = Math.max(1, ...completed, ...started, ...remaining);

    return {
      completed,
      started,
      remaining,
      maxValue,
      completedPoints: buildPolyline(completed, maxValue),
      startedPoints: buildPolyline(started, maxValue),
      remainingPoints: buildPolyline(remaining, maxValue),
    };
  }, [classOverview, enrolledStudents.length, filteredAssessmentRecords]);

  const handleClassSelect = async (className: string) => {
    setActiveClass(className);
    navigate(withTeachingClass('/teacher/dashboard', className), { replace: true });
    if (user?.id) await updateTeacher(user.id, { activeTeachingClass: className });
  };

  const handleTermChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = event.target.value;
    setActiveTermId(termId);
    if (user?.id) await updateTeacher(user.id, { activeTermId: termId });
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
      <div className="flex h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
          <BookOpen size={28} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">No Teaching Classes Assigned</h2>
        <p className="mt-2 max-w-md text-slate-500">Ask the administrator to assign classes and students to your profile.</p>
      </div>
    );
  }

  const dashboardCards = [
    { label: 'Enrolled Students', value: enrolledStudents.length, note: `${classModeLabel} class`, icon: <Users size={17} />, tone: 'emerald', action: null },
    {
      label: 'Under Assessment',
      value: assessmentStudents.length,
      note: assessmentStudents.length ? '14-day observation active' : 'No learners waiting',
      icon: <FileSpreadsheet size={17} />,
      tone: 'orange',
      action: assessmentStudents[0] ? () => navigate(withTeachingClass(`/teacher/assessment/${assessmentStudents[0].id}`, activeClass)) : null,
    },
    { label: 'Classes I Teach', value: teachingClasses.length, note: `${teachingClasses.length} active classes`, icon: <Layers3 size={17} />, tone: 'sky', action: null },
    { label: 'Teaching Template', value: classTemplateLabel, note: 'Used for lesson plans and summaries', icon: <ClipboardList size={17} />, tone: 'violet', action: null },
  ];

  const toneClasses: Record<string, { card: string; icon: string; label: string; button: string }> = {
    emerald: { card: 'border-emerald-200 bg-emerald-50/60', icon: 'bg-emerald-600 text-white', label: 'text-emerald-700', button: 'bg-emerald-600 text-white hover:bg-emerald-700' },
    orange: { card: 'border-orange-200 bg-orange-50/70', icon: 'bg-orange-600 text-white', label: 'text-orange-700', button: 'bg-orange-600 text-white hover:bg-orange-700' },
    sky: { card: 'border-sky-200 bg-sky-50/70', icon: 'bg-sky-600 text-white', label: 'text-sky-700', button: 'bg-sky-600 text-white hover:bg-sky-700' },
    violet: { card: 'border-violet-200 bg-violet-50/70', icon: 'bg-violet-600 text-white', label: 'text-violet-700', button: 'bg-violet-600 text-white hover:bg-violet-700' },
  };

  return (
    <div className="-m-5 min-h-full bg-[#f8fafc] p-5 md:p-8">
      <div className="mx-auto max-w-[1370px] space-y-5">
        {summaryPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Summary Form</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Select Class</h2>
                  <p className="mt-2 text-sm text-slate-500">Choose the class you want to open.</p>
                </div>
                <button type="button" onClick={() => setSummaryPickerOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-2">
                {teachingClasses.map((className) => (
                  <button key={className} type="button" onClick={() => handleOpenSummary(className)} className="rounded-[24px] border border-slate-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-sm">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-700 text-white">
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

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#14002f]">Welcome back, {user?.name || 'Teacher'}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Here's what's happening in your classes today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate(withTeachingClass('/teacher/lesson-plan', activeClass))} className="inline-flex h-12 items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-5 text-sm font-black text-purple-700 shadow-sm">
              <ClipboardList size={16} /> Lesson Plan
            </button>
            {terms.length > 0 && (
              <div className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
                <Calendar size={16} className="text-slate-500" />
                <select value={activeTermId} onChange={handleTermChange} className="bg-transparent text-sm font-black text-slate-800 outline-none">
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>{term.termName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[330px_1fr_280px] lg:items-center">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-purple-700 text-white shadow-lg shadow-purple-700/20">
                <GraduationCap size={34} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-700">Current Class</p>
                <h2 className="mt-2 text-3xl font-black leading-none text-[#14002f]">{activeClass}</h2>
                <p className="mt-3 text-sm font-semibold text-slate-500">{activeClass ? `${activeClass.split(',')[0]} • ` : ''}{classModeLabel} class</p>
              </div>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
              {user?.name || 'Teacher'} is assigned across {teachingClasses.length} classes. The active class controls register, assessments, summaries, and lesson plans.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-2xl font-black text-[#14002f]">{enrolledStudents.length}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Enrolled Students</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-2xl font-black text-[#14002f]">{teachingClasses.length}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Classes I Teach</p>
              </div>
            </div>
          </div>
          {teachingClasses.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {teachingClasses.map((className) => (
                <button key={className} type="button" onClick={() => handleClassSelect(className)} className={`rounded-full px-4 py-2 text-xs font-black transition ${className === activeClass ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'}`}>
                  {className}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardCards.map((card) => {
            const tone = toneClasses[card.tone] || toneClasses.violet;
            return (
            <div key={card.label} className={`rounded-2xl border p-5 shadow-sm ${tone.card}`}>
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}>{card.icon}</div>
              <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone.label}`}>{card.label}</p>
              <p className="mt-3 break-words text-3xl font-black text-[#14002f]">{card.value}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{card.note}</p>
              {card.action && (
                <button
                  type="button"
                  onClick={card.action}
                  className={`mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest ${tone.button}`}
                >
                  <ClipboardList size={14} /> Assess
                </button>
              )}
            </div>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.75fr_0.95fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-black text-[#14002f]">Class Overview</h3>
                <div className="flex gap-2">
                  <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600">This Term</button>
                  <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600">All Subjects</button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-5 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-purple-700" /> Recorded Marks</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-600" /> Started Capacity</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Remaining Marks</span>
              </div>
              <div className="relative h-[250px] overflow-hidden">
                <div className="absolute inset-x-10 top-0 h-full">
                  {[0, 1, 2, 3, 4].map((line) => <div key={line} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: `${line * 22}%` }} />)}
                </div>
                <svg viewBox="0 0 550 170" className="absolute inset-x-10 top-5 h-[170px] w-[calc(100%-5rem)] overflow-visible">
                  <polyline fill="none" points={chartSeries.remainingPoints} stroke="#cbd5e1" strokeWidth="3" />
                  <polyline fill="none" points={chartSeries.startedPoints} stroke="#ff3b1f" strokeWidth="3" />
                  <polyline fill="none" points={chartSeries.completedPoints} stroke="#a100ff" strokeWidth="4" />
                  {CHART_X_VALUES.map((x, index) => (
                    <React.Fragment key={x}>
                      <circle cx={x} cy={chartSeries.completedPoints.split(' ')[index]?.split(',')[1] || 150} r="4" fill="#a100ff" />
                      <circle cx={x} cy={chartSeries.startedPoints.split(' ')[index]?.split(',')[1] || 150} r="3.5" fill="#ff3b1f" />
                    </React.Fragment>
                  ))}
                </svg>
                <div className="absolute bottom-2 left-10 right-10 grid grid-cols-6 text-center text-xs font-semibold text-slate-500">
                  {CHART_WEEKS.map((week) => <span key={week}>{week}</span>)}
                </div>
              </div>
              <div className="grid border-t border-slate-100 pt-4 sm:grid-cols-3">
                <div className="px-5 py-2"><p className="text-xs font-bold text-purple-700">Completed</p><p className="text-2xl font-black text-[#14002f]">{classOverview.completed}</p><p className="text-xs font-semibold text-slate-500">Topics</p></div>
                <div className="border-slate-100 px-5 py-2 sm:border-x"><p className="text-xs font-bold text-orange-600">In Progress</p><p className="text-2xl font-black text-[#14002f]">{classOverview.inProgress}</p><p className="text-xs font-semibold text-slate-500">Topics</p></div>
                <div className="px-5 py-2"><p className="text-xs font-bold text-slate-400">Not Started</p><p className="text-2xl font-black text-[#14002f]">{classOverview.notStarted}</p><p className="text-xs font-semibold text-slate-500">Topics</p></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-black text-[#14002f]">Recent Assessments</h3>
                <button onClick={() => navigate(withTeachingClass('/teacher/assess', activeClass))} className="text-sm font-black text-purple-700">View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <th className="pb-3">Assessment</th>
                      <th className="pb-3">Class</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Avg. Score</th>
                      <th className="pb-3">Due Date</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {subjectMetrics.filter((metric) => metric.recordedMarks > 0).slice(0, 4).map((metric) => (
                      <tr key={metric.subjectId} className="border-t border-slate-100">
                        <td className="py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-700 text-white"><FileSpreadsheet size={15} /></span><div><p className="font-black text-[#14002f]">{metric.label}</p><p className="text-xs font-semibold text-slate-500">{metric.recordedMarks} marks recorded</p></div></div></td>
                        <td className="py-4 text-sm font-semibold text-slate-600">{activeClass}</td>
                        <td className="py-4"><span className={`rounded-md px-2 py-1 text-[10px] font-black ${metric.completedTopics >= metric.totalTopics && metric.totalTopics > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{metric.completedTopics >= metric.totalTopics && metric.totalTopics > 0 ? 'COMPLETED' : 'IN PROGRESS'}</span></td>
                        <td className="py-4 text-sm font-semibold text-slate-600">{metric.averageScore === null ? '-' : `${metric.averageScore}%`}</td>
                        <td className="py-4 text-sm font-semibold text-slate-600">{metric.latestUpdatedAt ? new Date(metric.latestUpdatedAt).toLocaleDateString() : '-'}</td>
                        <td className="py-4 text-right"><ArrowRight size={16} className="ml-auto text-purple-700" /></td>
                      </tr>
                    ))}
                    {!assessmentsLoading && subjectMetrics.every((metric) => metric.recordedMarks === 0) && (
                      <tr className="border-t border-slate-100">
                        <td colSpan={6} className="py-8 text-center text-sm font-semibold text-slate-500">No assessment marks have been recorded for this term yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-black text-[#14002f]">Recent Learners</h3>
                <button onClick={() => navigate(withTeachingClass('/teacher/classes', activeClass))} className="text-sm font-black text-purple-700">View all</button>
              </div>
              {classStudents.slice(0, 1).map((student) => (
                <button key={student.id} onClick={() => navigate(withTeachingClass(`/teacher/assess/student/${student.id}`, activeClass))} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">{student.name.charAt(0)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-black text-[#14002f]">{student.name}</span><span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{student.id} • {student.studentStatus || 'ENROLLED'}</span></span>
                  <ArrowRight size={16} className="text-purple-700" />
                </button>
              ))}
              {classStudents.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">No learners assigned yet.</div>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-black text-[#14002f]">Upcoming Activities</h3>
                <button className="text-sm font-black text-purple-700">View all</button>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><Calendar size={18} /></span>
                <div><p className="font-black text-[#14002f]">No upcoming activities</p><p className="text-sm font-semibold text-slate-500">You're all caught up!</p></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-black text-[#14002f]">Quick Actions</h3>
              {[
                { label: 'Mark Daily Attendance', path: '/teacher/register', icon: <ClipboardList size={16} /> },
                { label: 'Create Assessment', path: '/teacher/assess', icon: <FileSpreadsheet size={16} /> },
                { label: 'Create Lesson Plan', path: '/teacher/lesson-plan', icon: <Calendar size={16} /> },
                { label: 'View Reports', path: '/teacher/classes', icon: <BarChart3 size={16} /> },
              ].map((action) => (
                <button key={action.label} onClick={() => navigate(withTeachingClass(action.path, activeClass))} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left last:mb-0">
                  <span className="text-purple-700">{action.icon}</span>
                  <span className="flex-1 text-sm font-bold text-slate-600">{action.label}</span>
                  <ArrowRight size={15} className="text-purple-700" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
