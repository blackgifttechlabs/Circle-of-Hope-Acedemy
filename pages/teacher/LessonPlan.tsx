import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Download, Eye, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, Edit2, Trash2, X } from 'lucide-react';
import { Teacher, WeeklyLessonPlan, SystemSettings } from '../../types';
import { uploadLessonPlan, getLessonPlans, getSystemSettings, updateLessonPlan, deleteLessonPlan } from '../../services/dataService';
import { CLASS_LIST_SKILLS } from '../../utils/classListSkills';
import { getSelectedTeachingClass, getTeacherAssignedClasses, getTeachingClassParts, getTeachingClassStageOptions, withTeachingClass } from '../../utils/teacherClassSelection';
import { printLessonPlanPDF } from '../../utils/printLessonPlan';
import { UploadResultModal } from '../../components/ui/UploadResultModal';

interface LessonPlanProps {
  user: Teacher | null;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const CORE_SUBJECTS = ['REL. ED.', 'MATHEMATICS', 'ENGLISH', 'HANDWRITING'];
const EXTENDED_SUBJECTS = ['ENV. STUDIES', 'ARTS', 'PHYSICAL EDUCATION'];

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

const formatThemeName = (themeStr: string) => {
  const match = themeStr.match(/THEME \d+:\s*(.*)/i);
  const name = match ? match[1] : themeStr;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const getThemesForTerm = (termId: string) => {
  const termSkills = CLASS_LIST_SKILLS[termId];
  if (!termSkills) return [];
  
  const themes = new Set<string>();
  Object.values(termSkills).forEach(area => {
    area.forEach(t => {
      themes.add(formatThemeName(t.theme));
    });
  });
  return Array.from(themes);
};

const getWeekNumber = (startDateStr: string | undefined, currentDate: Date) => {
  if (!startDateStr) return 1;
  const start = new Date(startDateStr);
  const diffTime = currentDate.getTime() - start.getTime();
  if (diffTime < 0) return 1;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return Math.ceil(diffDays / 7) || 1;
};

const getWeekDates = (startDateStr: string | undefined, weekNum: number) => {
  let start = new Date();
  if (startDateStr) {
    start = new Date(startDateStr);
  }
  
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const firstMonday = new Date(start.setDate(diff));
  
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  
  const targetFriday = new Date(targetMonday);
  targetFriday.setDate(targetMonday.getDate() + 4);
  
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${targetMonday.getDate()}–${targetFriday.toLocaleDateString('en-GB', options)}`;
};

const LessonPlanPage: React.FC<LessonPlanProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClass = getSelectedTeachingClass(user, location.search);
  const teacherClasses = getTeacherAssignedClasses(user);
  const lessonPlanClassOptions = useMemo(
    () => getTeachingClassStageOptions(teacherClasses.length ? teacherClasses : [selectedClass]),
    [selectedClass, teacherClasses]
  );
  const lessonPlanLoadClasses = useMemo(
    () => getTeachingClassStageOptions(selectedClass ? [selectedClass] : []),
    [selectedClass]
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [uploadedPlans, setUploadedPlans] = useState<WeeklyLessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTermId, setActiveTermId] = useState<string>('term-1');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'core' | 'extended'>('core');

  const [formData, setFormData] = useState<Omit<WeeklyLessonPlan, 'id' | 'teacherId' | 'classLevel' | 'termId' | 'uploadedAt'>>({
    theme: '',
    weekNumber: 1,
    grade: '0',
    dates: '',
    coreSubjects: {},
    extendedSubjects: {},
    competencyLabels: {}
  });

  const [selectedPlan, setSelectedPlan] = useState<WeeklyLessonPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<WeeklyLessonPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyLessonPlan | null>(null);
  const [resultModal, setResultModal] = useState<{
    status: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const isReadOnly = !!selectedPlan && !editingPlan;

  useEffect(() => {
    if (!user || !selectedClass) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const sysSettings = await getSystemSettings();
        setSettings(sysSettings);
        const termId = user.activeTermId || sysSettings?.activeTermId || 'term-1';
        setActiveTermId(termId);

        const themes = getThemesForTerm(termId);
        setAvailableThemes(themes);

        const weekNum = getWeekNumber(sysSettings?.termStartDate, new Date());
        const dates = getWeekDates(sysSettings?.termStartDate, weekNum);

        setFormData(prev => ({
          ...prev,
          theme: themes[0] || '',
          weekNumber: weekNum,
          dates: dates,
          grade: selectedClass || '0'
        }));

        const planGroups = await Promise.all(
          lessonPlanLoadClasses.map((className) => getLessonPlans(user.id, className))
        );
        const plans = Array.from(
          new Map(planGroups.flat().map((plan) => [plan.id || `${plan.classLevel}-${plan.uploadedAt}`, plan])).values()
        );
        setUploadedPlans(plans.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lessonPlanLoadClasses, selectedClass, user]);

  const handleHeaderChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: name === 'weekNumber' ? parseInt(value) || 1 : value };
      if (name === 'weekNumber') {
        newData.dates = getWeekDates(settings?.termStartDate, newData.weekNumber);
      }
      return newData;
    });
  };

  const levelOptions = Array.from(new Set([...lessonPlanClassOptions, formData.grade].filter(Boolean)));

  const handleCellChange = (day: string, subject: string, value: string, isCore: boolean) => {
    setFormData(prev => {
      const target = isCore ? 'coreSubjects' : 'extendedSubjects';
      return {
        ...prev,
        [target]: {
          ...prev[target],
          [day]: {
            ...(prev[target][day] || {}),
            [subject]: value
          }
        }
      };
    });
  };

  const handleCompetencyLabelChange = (day: string, subject: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      competencyLabels: {
        ...(prev.competencyLabels || {}),
        [day]: {
          ...(prev.competencyLabels?.[day] || {}),
          [subject]: value
        }
      }
    }));
  };

  const handleSubmit = async () => {
    if (!user || !selectedClass) return;

    setIsSubmitting(true);
    try {
      const selectedPlanClass = formData.grade || selectedClass;
      const classParts = getTeachingClassParts(selectedPlanClass);
      const newPlan: Omit<WeeklyLessonPlan, 'id' | 'uploadedAt'> = {
        teacherId: user.id,
        classLevel: selectedPlanClass,
        termId: activeTermId,
        ...formData,
        grade: selectedPlanClass,
        level: classParts.level,
        ...(classParts.stage ? { stage: classParts.stage } : {})
      };

      if (editingPlan?.id) {
        await updateLessonPlan(editingPlan.id, newPlan);
        const updatedPlan: WeeklyLessonPlan = {
          ...editingPlan,
          ...newPlan,
        };
        setUploadedPlans(prev => prev.map(plan => plan.id === editingPlan.id ? updatedPlan : plan));
        setSelectedPlan(updatedPlan);
        setEditingPlan(null);
        setResultModal({
          status: 'success',
          title: 'Lesson plan updated',
          message: `${selectedPlanClass} week ${newPlan.weekNumber} was saved successfully.`,
        });
      } else {
        const id = await uploadLessonPlan(newPlan);
        const completePlan: WeeklyLessonPlan = {
          ...newPlan,
          id,
          uploadedAt: new Date().toISOString()
        };
        setUploadedPlans(prev => [completePlan, ...prev]);
        setSelectedPlan(null);
        setResultModal({
          status: 'success',
          title: 'Lesson plan uploaded',
          message: `${selectedPlanClass} week ${newPlan.weekNumber} was submitted successfully.`,
        });
      }
    } catch (error) {
      console.error("Error submitting lesson plan:", error);
      setResultModal({
        status: 'error',
        title: editingPlan ? 'Update failed' : 'Upload failed',
        message: 'The lesson plan could not be submitted. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPlan = (plan: WeeklyLessonPlan) => {
    setSelectedPlan(plan);
    setEditingPlan(null);
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedPlan(null);
    setEditingPlan(null);
  };

  const handleEditPlan = (plan: WeeklyLessonPlan) => {
    setSelectedPlan(plan);
    setEditingPlan(plan);
    setActiveTermId(plan.termId || activeTermId);
    setFormData({
      theme: plan.theme || '',
      weekNumber: plan.weekNumber || 1,
      grade: plan.grade || plan.classLevel || selectedClass || '',
      dates: plan.dates || '',
      coreSubjects: plan.coreSubjects || {},
      extendedSubjects: plan.extendedSubjects || {},
      competencyLabels: plan.competencyLabels || {},
    });
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!deleteTarget) return;
    const success = await deleteLessonPlan(deleteTarget);
    if (success) {
      setUploadedPlans(prev => prev.filter(plan => plan.id !== deleteTarget.id));
      if (selectedPlan?.id === deleteTarget.id) {
        setSelectedPlan(null);
        setEditingPlan(null);
      }
      setDeleteTarget(null);
    } else {
      alert("Failed to delete lesson plan. Please try again.");
    }
  };

  const handleDownloadPDF = async (plan: WeeklyLessonPlan) => {
    await printLessonPlanPDF({
      plan,
      teacher: user,
      settings,
      days: DAYS,
      competencyLabels: plan.competencyLabels,
      sections: [
        { title: 'Core Subjects', subjects: CORE_SUBJECTS, data: plan.coreSubjects || {} },
        { title: 'Extended Subjects', subjects: EXTENDED_SUBJECTS, data: plan.extendedSubjects || {} },
      ],
    });
  };

  const renderTable = (isCore: boolean) => {
    const subjects = isCore ? CORE_SUBJECTS : EXTENDED_SUBJECTS;
    const data = isReadOnly ? (isCore ? selectedPlan?.coreSubjects : selectedPlan?.extendedSubjects) : (isCore ? formData.coreSubjects : formData.extendedSubjects);

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
                  const defaultSubHeading = SUB_HEADINGS[subject]?.[day] || '';
                  const subHeading = isReadOnly
                    ? (selectedPlan.competencyLabels?.[day]?.[subject] || defaultSubHeading)
                    : (formData.competencyLabels?.[day]?.[subject] ?? defaultSubHeading);
                  const value = data?.[day]?.[subject] || '';
                  const hasValue = value.trim().length > 0;
                  
                  return (
                    <td key={`${day}-${subject}`} className="p-3 align-top border-l border-gray-100/50">
                      <div className="flex flex-col gap-1 min-h-[80px]">
                        {isReadOnly ? (
                          <>
                            {hasValue && subHeading && (
                              <span className="text-xs font-bold text-gray-800">{subHeading}</span>
                            )}
                            {hasValue ? (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">{value}</div>
                            ) : (
                              <div className="flex min-h-[58px] items-center justify-center text-gray-300">
                                <FileText size={22} aria-label="No record" />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <input
                              value={subHeading}
                              onChange={(e) => handleCompetencyLabelChange(day, subject, e.target.value)}
                              placeholder="Type label..."
                              className="w-full rounded border border-gray-200 bg-white/70 px-2 py-1 text-xs font-bold text-gray-800 outline-none transition-all hover:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <textarea
                              value={value}
                              onChange={(e) => handleCellChange(day, subject, e.target.value, isCore)}
                              placeholder="Add activity..."
                              className="w-full text-sm p-2 border border-gray-300 bg-white/50 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded resize-none outline-none transition-all"
                              rows={3}
                              data-gramm="false"
                              spellCheck="false"
                            />
                          </>
                        )}
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

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Main Content (70%) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(withTeachingClass('/teacher/classes', selectedClass))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Weekly Lesson Plan — {selectedClass || 'Special Needs'}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedPlan && (
              <button 
                onClick={handleCreateNew}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Create New
              </button>
            )}
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || isReadOnly}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Upload size={16} />
              {isSubmitting ? (editingPlan ? 'Saving...' : 'Uploading...') : editingPlan ? 'Save Changes' : 'Upload Lesson Plan'}
            </button>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Plan Header Info */}
            <div className="p-6 border-b border-gray-100 flex flex-wrap gap-8 items-end justify-between bg-gray-50/50">
              <div className="flex gap-8">
                <div className="relative w-64">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Theme</label>
                  {isReadOnly ? (
                    <div className="text-sm font-semibold text-gray-900 border-b border-transparent pb-1">{selectedPlan.theme}</div>
                  ) : (
                    <input
                      name="theme"
                      value={formData.theme}
                      onChange={handleHeaderChange}
                      list="lesson-plan-theme-options"
                      placeholder="Type theme"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500"
                    />
                  )}
                  {!selectedPlan && availableThemes.length > 0 && (
                    <datalist id="lesson-plan-theme-options">
                      {availableThemes.map((theme) => (
                        <option key={theme} value={theme} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Week</label>
                  {isReadOnly ? (
                    <div className="text-sm font-semibold text-gray-900 border-b border-transparent pb-1">{selectedPlan.weekNumber}</div>
                  ) : (
                    <input
                      name="weekNumber"
                      type="number"
                      min={1}
                      value={formData.weekNumber}
                      onChange={handleHeaderChange}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Selected Class</label>
                  {isReadOnly ? (
                    <div className="text-sm font-semibold text-gray-900 border-b border-transparent pb-1">{selectedPlan.grade}</div>
                  ) : (
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleHeaderChange}
                      className="min-w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-500"
                    >
                      {levelOptions.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dates</label>
                <div className="text-sm font-semibold text-gray-900">
                  {isReadOnly ? selectedPlan?.dates : formData.dates}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 border-b border-gray-100 flex gap-6">
              <button 
                onClick={() => setActiveTab('core')}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'core' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Core subjects
                {activeTab === 'core' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('extended')}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'extended' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Extended subjects
                {activeTab === 'extended' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
            </div>

            {/* Table Area */}
            <div className="p-6">
              {renderTable(activeTab === 'core')}
            </div>

            {/* Footer Actions */}
            {!isReadOnly && (
              <div className="p-6 border-t border-gray-100 flex gap-6 bg-gray-50/50">
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, coreSubjects: {}, extendedSubjects: {} }))}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 ml-auto"
                >
                  Clear all
                </button>
              </div>
            )}
            {!isReadOnly && (
              <div className="px-6 pb-6 text-xs text-gray-400">
                Edit the small label and the activity in each cell. Switch tabs to view core vs extended subjects.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar (30%) */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-gray-50 border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-40 md:relative md:translate-x-0 flex flex-col ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Uploaded Plans
          </h2>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ListIcon size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : uploadedPlans.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p>No lesson plans uploaded yet.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
              {uploadedPlans.map((plan) => (
                <div key={plan.id} className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">{plan.theme}</h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">Wk {plan.weekNumber}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{plan.dates}</div>
                  
                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleViewPlan(plan)}
                      className="flex-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button 
                      onClick={() => handleDownloadPDF(plan)}
                      className="flex-1 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button 
                      onClick={() => handleEditPlan(plan)}
                      className="flex-1 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(plan)}
                      className="flex-1 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Edge Button */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="md:hidden fixed top-1/2 right-0 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-xl shadow-lg z-50 flex items-center justify-center"
        style={{ width: '32px', height: '64px' }}
      >
        {isMobileSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Delete lesson plan?</h3>
                <p className="mt-1 text-sm text-gray-500">This action cannot be undone.</p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="h-9 w-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              Delete <span className="font-black">{deleteTarget.theme || `Week ${deleteTarget.weekNumber}`}</span> for {deleteTarget.classLevel}?
            </div>
            <div className="flex justify-end gap-3 bg-gray-50 px-5 py-4">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">
                Cancel
              </button>
              <button onClick={confirmDeletePlan} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <UploadResultModal
        open={!!resultModal}
        status={resultModal?.status || 'success'}
        title={resultModal?.title || ''}
        message={resultModal?.message || ''}
        onClose={() => setResultModal(null)}
      />
    </div>
  );
};

export default LessonPlanPage;
