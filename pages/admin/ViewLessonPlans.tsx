import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Eye, FileText, GraduationCap, Hash, MousePointerClick, UserCheck, Users } from 'lucide-react';
import { WeeklyLessonPlan, SystemSettings, Teacher } from '../../types';
import { getAllLessonPlans, getSystemSettings, getTeachers } from '../../services/dataService';
import { getPromotionalSubjects, getNonPromotionalSubjects } from '../../utils/subjects';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';
import { FolderTabs } from '../../components/admin/FolderTabs';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const CORE_SUBJECTS = ['REL. ED.', 'MATHEMATICS', 'ENGLISH', 'HANDWRITING'];
const EXTENDED_SUBJECTS = ['ENV. STUDIES', 'ARTS', 'PHYSICAL EDUCATION'];

const getClassNumber = (className: string) => {
  const match = className.match(/\d+/);
  return match ? Number(match[0]) : 999;
};

const orderedClassesFromSettings = (settings: SystemSettings | null) => {
  if (!settings) return [];
  const levels = [...(settings.specialNeedsLevels || [])].sort((a, b) => getClassNumber(a) - getClassNumber(b));
  const grades = [...(settings.grades || [])].sort((a, b) => getClassNumber(a) - getClassNumber(b));
  return [...levels, ...grades];
};

const SUB_HEADINGS: Record<string, Record<string, string>> = {
  'MATHEMATICS': {
    'MON': 'Number concept',
    'TUE': 'Classification',
    'WED': 'Seriation',
    'THU': 'Spatial relations',
    'FRI': 'Measurement'
  },
  'ENGLISH': {
    'MON': 'Listen & respond',
    'TUE': 'Speak & comm.',
    'WED': 'Preparatory reading',
    'THU': 'Incidental reading',
    'FRI': 'Preparatory writing'
  },
  'ARTS': {
    'MON': 'Drawing / Modelling',
    'TUE': 'Music / Collage',
    'WED': 'Painting',
    'THU': 'Dance / Drama',
    'FRI': 'Construction'
  },
  'PHYSICAL EDUCATION': {
    'MON': 'GMD — Dominance',
    'TUE': 'Balance / Relaxation',
    'WED': 'Eye-hand coord. / Fine muscle / Rhythm',
    'THU': 'Eye-foot coord. / Gross motor / Laterality',
    'FRI': 'FMC — Follow finger with eyes / Body knowledge'
  }
};

export const ViewLessonPlans: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WeeklyLessonPlan[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeClass, setActiveClass] = useState<string>('');
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<WeeklyLessonPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'core' | 'extended'>('core');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allPlans, sysSettings, allTeachers] = await Promise.all([
          getAllLessonPlans(),
          getSystemSettings(),
          getTeachers()
        ]);
        
        // Sort by uploadedAt descending (newest first)
        const sortedPlans = allPlans.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setPlans(sortedPlans);
        setSettings(sysSettings);
        setTeachers(allTeachers);
        
        if (sysSettings) {
          const allClasses = orderedClassesFromSettings(sysSettings);
          if (allClasses.length > 0) {
            setActiveClass(allClasses[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching lesson plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const teachersForClass = teachers.filter(t => (t.assignedClasses || [t.assignedClass || '']).includes(activeClass));
    if (teachersForClass.length === 1) {
      setActiveTeacherId(teachersForClass[0].id);
    } else {
      setActiveTeacherId(null);
    }
  }, [activeClass, teachers]);

  const allClasses = orderedClassesFromSettings(settings);
  const teachersForClass = teachers.filter(t => (t.assignedClasses || [t.assignedClass || '']).includes(activeClass));
  const activeTeacher = teachers.find(t => t.id === activeTeacherId);
  const filteredPlans = plans.filter(p => p.classLevel === activeClass && p.teacherId === activeTeacherId);

  const renderTable = (isCore: boolean, plan: WeeklyLessonPlan) => {
    const isGradeLevel = plan.classLevel?.toLowerCase().includes('grade');
    
    const grade = plan.classLevel || '';
    const promotionalSubjects = getPromotionalSubjects(grade).map(s => {
      if (s === 'Environmental Studies') return 'ENV. STUDIES';
      if (s === 'Religious Education') return 'REL. ED.';
      return s.toUpperCase();
    });
    const nonPromotionalSubjects = getNonPromotionalSubjects(grade).map(s => s.toUpperCase());

    const subjects = isGradeLevel 
      ? (isCore ? promotionalSubjects : nonPromotionalSubjects)
      : (isCore ? CORE_SUBJECTS : EXTENDED_SUBJECTS);
    const data = isCore ? plan.coreSubjects : plan.extendedSubjects;

    return (
      <div className="overflow-x-auto pb-4">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className="w-16"></th>
              {subjects.map(subject => (
                <th key={subject} className="text-left p-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    subject === 'REL. ED.' ? 'bg-purple-100 text-purple-700' :
                    subject === 'MATHEMATICS' ? 'bg-teal-100 text-teal-700' :
                    subject === 'ENGLISH' ? 'bg-blue-100 text-blue-700' :
                    subject === 'HANDWRITING' ? 'bg-orange-100 text-orange-700' :
                    subject === 'ENV. STUDIES' ? 'bg-green-100 text-green-700' :
                    subject === 'ARTS' ? 'bg-pink-100 text-pink-700' :
                    subject === 'LIFE SKILLS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {subject}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, index) => (
              <tr key={day} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}`}>
                <td className="p-3 text-sm font-bold text-gray-600 align-top pt-6">{day}</td>
                {subjects.map(subject => {
                  const subHeading = SUB_HEADINGS[subject]?.[day];
                  const value = data?.[day]?.[subject] || '';
                  
                  return (
                    <td key={`${day}-${subject}`} className="p-3 align-top border-l border-gray-100/50">
                      <div className="flex flex-col gap-1 min-h-[80px]">
                        {subHeading && (
                          <span className="text-xs font-bold text-gray-800">{subHeading}</span>
                        )}
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{value}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (selectedPlan) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedPlan(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Weekly Lesson Plan — {selectedPlan.classLevel}</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-wrap gap-8 items-end justify-between bg-gray-50/50">
              <div className="flex gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Theme</label>
                  <div className="text-sm font-semibold text-gray-900">{selectedPlan.theme}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Week</label>
                  <div className="text-sm font-semibold text-gray-900">{selectedPlan.weekNumber}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Grade / Level</label>
                  <div className="text-sm font-semibold text-gray-900 border-b border-transparent pb-1">
                    {selectedPlan.grade}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dates</label>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedPlan.dates}
                </div>
              </div>
            </div>

            <div className="px-6 pt-4 border-b border-gray-100 flex gap-6">
              <button 
                onClick={() => setActiveTab('core')}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'core' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {selectedPlan.classLevel?.toLowerCase().includes('grade') ? 'Promotional subjects' : 'Core subjects'}
                {activeTab === 'core' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('extended')}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'extended' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {selectedPlan.classLevel?.toLowerCase().includes('grade') ? 'Non-promotional subjects' : 'Extended subjects'}
                {activeTab === 'extended' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
            </div>

            <div className="p-6">
              {renderTable(activeTab === 'core', selectedPlan)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-6 pt-4">
        <FolderTabs
          tabs={allClasses.map((className) => ({
            id: className,
            label: className,
            icon: className.toLowerCase().includes('level') ? GraduationCap : BookOpen,
          }))}
          activeId={activeClass}
          onChange={setActiveClass}
          loading={loading}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-0">
        {loading ? (
          <div className="w-full overflow-hidden border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
              <thead>
                <tr>
                  <TableHeaderCell icon={FileText}>Theme</TableHeaderCell>
                  <TableHeaderCell icon={Hash}>Week</TableHeaderCell>
                  <TableHeaderCell icon={CalendarDays}>Dates</TableHeaderCell>
                  <TableHeaderCell icon={GraduationCap}>Level / Grade</TableHeaderCell>
                  <TableHeaderCell icon={UserCheck}>Teacher</TableHeaderCell>
                  <TableHeaderCell icon={MousePointerClick}>Action</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                <TableSkeletonRows rows={8} columns={6} />
              </tbody>
            </table>
          </div>
        ) : teachersForClass.length === 0 ? (
          <div className="w-full overflow-hidden border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <TableHeaderCell icon={Users}>Teacher</TableHeaderCell>
                  <TableHeaderCell icon={BookOpen}>Subject</TableHeaderCell>
                  <TableHeaderCell icon={GraduationCap}>Class</TableHeaderCell>
                  <TableHeaderCell icon={MousePointerClick}>Action</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
                    No teachers are assigned to {activeClass || 'this class'} yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : !activeTeacherId ? (
          <div className="w-full overflow-hidden border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
              <thead>
                <tr>
                  <TableHeaderCell icon={Users}>Teacher</TableHeaderCell>
                  <TableHeaderCell icon={BookOpen}>Subject</TableHeaderCell>
                  <TableHeaderCell icon={GraduationCap}>Assigned Class</TableHeaderCell>
                  <TableHeaderCell icon={MousePointerClick}>Action</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
              {teachersForClass.map(teacher => (
                <tr key={teacher.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-700 text-sm font-black text-white">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-black text-slate-900">{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-600">{teacher.subject || 'Teacher'}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-600">{activeClass}</td>
                  <td className="px-6 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveTeacherId(teacher.id)}
                      className="inline-flex items-center gap-2 rounded-[8px] bg-purple-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-purple-800"
                    >
                      <Eye size={14} /> View Plans
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full">
            {teachersForClass.length > 1 && (
              <div className="mb-6 flex items-center justify-between border border-purple-100 bg-purple-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-700 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    {activeTeacher?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Viewing plans for</p>
                    <p className="font-bold text-purple-950">{activeTeacher?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTeacherId(null)}
                  className="text-sm font-semibold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-4 py-2 rounded-[8px] shadow-sm border border-purple-200 transition-colors"
                >
                  Change Teacher
                </button>
              </div>
            )}

            <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
                <thead>
                  <tr>
                    <TableHeaderCell icon={FileText}>Theme</TableHeaderCell>
                    <TableHeaderCell icon={Hash}>Week</TableHeaderCell>
                    <TableHeaderCell icon={CalendarDays}>Dates</TableHeaderCell>
                    <TableHeaderCell icon={GraduationCap}>Level / Grade</TableHeaderCell>
                    <TableHeaderCell icon={CalendarDays}>Submitted</TableHeaderCell>
                    <TableHeaderCell icon={MousePointerClick}>Action</TableHeaderCell>
                  </tr>
                </thead>
                <tbody>
                {filteredPlans.map(plan => (
                  <tr key={plan.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-black text-slate-900">{plan.theme}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-slate-600">Week {plan.weekNumber}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-slate-600">{plan.dates}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-slate-600">{plan.grade || plan.classLevel}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-slate-600">{new Date(plan.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className="inline-flex items-center gap-2 rounded-[8px] bg-purple-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-purple-800"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPlans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
                      No lesson plans have been submitted by {activeTeacher?.name} yet.
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewLessonPlans;
