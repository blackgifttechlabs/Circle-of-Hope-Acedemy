import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Download, Eye, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Teacher, WeeklyLessonPlan, SystemSettings } from '../../types';
import { uploadLessonPlan, getLessonPlans, getSystemSettings } from '../../services/dataService';
import { getPromotionalSubjects, getNonPromotionalSubjects } from '../../utils/subjects';
import { getSelectedTeachingClass, withTeachingClass } from '../../utils/teacherClassSelection';

interface LessonPlanProps {
  user: Teacher | null;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

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

const LessonPlanGradePage: React.FC<LessonPlanProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClass = getSelectedTeachingClass(user, location.search);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [uploadedPlans, setUploadedPlans] = useState<WeeklyLessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTermId, setActiveTermId] = useState<string>('term-1');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  const [activeTab, setActiveTab] = useState<'promotional' | 'non-promotional'>('promotional');

  const [formData, setFormData] = useState<Omit<WeeklyLessonPlan, 'id' | 'teacherId' | 'classLevel' | 'termId' | 'uploadedAt'>>({
    theme: 'Weekly Plan',
    weekNumber: 1,
    grade: '0',
    dates: '',
    coreSubjects: {},
    extendedSubjects: {}
  });

  const [selectedPlan, setSelectedPlan] = useState<WeeklyLessonPlan | null>(null);

  useEffect(() => {
    if (!user || !selectedClass) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const sysSettings = await getSystemSettings();
        setSettings(sysSettings);
        const termId = user.activeTermId || sysSettings?.activeTermId || 'term-1';
        setActiveTermId(termId);

        const weekNum = getWeekNumber(sysSettings?.termStartDate, new Date());
        const dates = getWeekDates(sysSettings?.termStartDate, weekNum);

        setFormData(prev => ({
          ...prev,
          weekNumber: weekNum,
          dates: dates,
          grade: selectedClass || '0'
        }));

        const plans = await getLessonPlans(user.id, selectedClass);
        setUploadedPlans(plans.sort((a: WeeklyLessonPlan, b: WeeklyLessonPlan) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClass, user]);

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

  const handleCellChange = (day: string, subject: string, value: string, isPromotional: boolean) => {
    setFormData(prev => {
      const target = isPromotional ? 'coreSubjects' : 'extendedSubjects';
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

  const handleSubmit = async () => {
    if (!user || !selectedClass) return;

    setIsSubmitting(true);
    try {
      const newPlan: Omit<WeeklyLessonPlan, 'id' | 'uploadedAt'> = {
        teacherId: user.id,
        classLevel: selectedClass,
        termId: activeTermId,
        ...formData
      };

      const id = await uploadLessonPlan(newPlan);
      
      const completePlan: WeeklyLessonPlan = {
        ...newPlan,
        id,
        uploadedAt: new Date().toISOString()
      };

      setUploadedPlans(prev => [completePlan, ...prev]);
      setSelectedPlan(null);
      alert("Lesson plan uploaded successfully!");
    } catch (error) {
      console.error("Error submitting lesson plan:", error);
      alert("Failed to upload lesson plan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPlan = (plan: WeeklyLessonPlan) => {
    setSelectedPlan(plan);
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleDownloadPDF = (plan: WeeklyLessonPlan) => {
    alert("PDF generation would trigger here for week: " + plan.weekNumber);
  };

  const renderTable = (isPromotional: boolean) => {
    const grade = selectedClass || '';
    const promotionalSubjects = getPromotionalSubjects(grade).map(s => {
      if (s === 'Environmental Studies') return 'ENV. STUDIES';
      if (s === 'Religious Education') return 'REL. ED.';
      return s.toUpperCase();
    });
    const nonPromotionalSubjects = getNonPromotionalSubjects(grade).map(s => s.toUpperCase());

    const subjects = isPromotional ? promotionalSubjects : nonPromotionalSubjects;
    const data = selectedPlan ? (isPromotional ? selectedPlan.coreSubjects : selectedPlan.extendedSubjects) : (isPromotional ? formData.coreSubjects : formData.extendedSubjects);

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
                  const value = data?.[day]?.[subject] || '';
                  
                  return (
                    <td key={`${day}-${subject}`} className="p-3 align-top border-l border-gray-100/50">
                      <div className="flex flex-col gap-1 min-h-[80px]">
                        {selectedPlan ? (
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{value}</div>
                        ) : (
                          <textarea
                            value={value}
                            onChange={(e) => handleCellChange(day, subject, e.target.value, isPromotional)}
                            placeholder="Add activity..."
                            className="w-full text-sm p-2 border border-gray-300 bg-white/50 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded resize-none outline-none transition-all"
                            rows={4}
                            data-gramm="false"
                            spellCheck="false"
                          />
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
            <h1 className="text-xl font-bold text-gray-900">Weekly Lesson Plan — {selectedClass || 'Grades 1-7'}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedPlan && (
              <button 
                onClick={() => setSelectedPlan(null)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Create New
              </button>
            )}
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !!selectedPlan}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Upload size={16} />
              {isSubmitting ? 'Uploading...' : 'Upload Lesson Plan'}
            </button>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Plan Header Info */}
            <div className="p-6 border-b border-gray-100 flex flex-wrap gap-8 items-end justify-between bg-gray-50/50">
              <div className="flex gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Week</label>
                  {selectedPlan ? (
                    <div className="text-sm font-semibold text-gray-900 border-b border-transparent pb-1">
                      {selectedPlan.weekNumber}
                    </div>
                  ) : (
                    <input
                      type="number"
                      name="weekNumber"
                      min="1"
                      max="52"
                      value={formData.weekNumber}
                      onChange={handleHeaderChange}
                      className="w-20 text-sm p-1 border border-gray-300 rounded"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Grade / Level</label>
                  <div className="text-sm font-semibold text-gray-900 border-b border-transparent pb-1">
                    {selectedPlan ? selectedPlan.grade : selectedClass}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dates</label>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedPlan ? selectedPlan.dates : formData.dates}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 border-b border-gray-100 flex gap-6">
              <button 
                onClick={() => setActiveTab('promotional')}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'promotional' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Promotional subjects
                {activeTab === 'promotional' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('non-promotional')}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'non-promotional' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Non-promotional subjects
                {activeTab === 'non-promotional' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
            </div>

            {/* Table Area */}
            <div className="p-6">
              {renderTable(activeTab === 'promotional')}
            </div>

            {/* Footer Actions */}
            {!selectedPlan && (
              <div className="p-6 border-t border-gray-100 flex gap-6 bg-gray-50/50">
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, coreSubjects: {}, extendedSubjects: {} }))}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 ml-auto"
                >
                  Clear all
                </button>
              </div>
            )}
            {!selectedPlan && (
              <div className="px-6 pb-6 text-xs text-gray-400">
                Click any cell to edit. Switch tabs to view promotional vs non-promotional subjects.
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
                    <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">Week {plan.weekNumber}</h4>
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
    </div>
  );
};

export default LessonPlanGradePage;
