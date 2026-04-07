import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, LayoutGrid, List as ListIcon, Eye, Users } from 'lucide-react';
import { WeeklyLessonPlan, SystemSettings, Teacher } from '../../types';
import { getAllLessonPlans, getSystemSettings, getTeachers } from '../../services/dataService';
import { getPromotionalSubjects, getNonPromotionalSubjects } from '../../utils/subjects';

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

export const ViewLessonPlans: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WeeklyLessonPlan[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeClass, setActiveClass] = useState<string>('');
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
          const allClasses = [...sysSettings.grades, ...sysSettings.specialNeedsLevels];
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
    const teachersForClass = teachers.filter(t => t.assignedClass === activeClass);
    if (teachersForClass.length === 1) {
      setActiveTeacherId(teachersForClass[0].id);
    } else {
      setActiveTeacherId(null);
    }
  }, [activeClass, teachers]);

  const allClasses = settings ? [...settings.grades, ...settings.specialNeedsLevels] : [];
  const teachersForClass = teachers.filter(t => t.assignedClass === activeClass);
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
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/teachers')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">View Lesson Plans</h1>
            <p className="text-sm text-gray-500">Review submitted lesson plans by class.</p>
          </div>
        </div>
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

      <div className="px-6 pt-4 bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {allClasses.map(className => (
            <button 
              key={className}
              onClick={() => setActiveClass(className)}
              className={`pb-3 text-sm font-bold transition-colors relative ${activeClass === className ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {className}
              {activeClass === className && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : teachersForClass.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-600">No teachers assigned</p>
            <p className="text-sm">There are no teachers assigned to {activeClass} yet.</p>
          </div>
        ) : !activeTeacherId ? (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Select a Teacher</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {teachersForClass.map(teacher => (
                <div 
                  key={teacher.id}
                  onClick={() => setActiveTeacherId(teacher.id)}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-900 truncate">{teacher.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{teacher.subject || 'Teacher'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {teachersForClass.length > 1 && (
              <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold shrink-0">
                    {activeTeacher?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Viewing plans for</p>
                    <p className="font-bold text-blue-900">{activeTeacher?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTeacherId(null)}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-4 py-2 rounded-lg shadow-sm border border-blue-200 transition-colors"
                >
                  Change Teacher
                </button>
              </div>
            )}

            {filteredPlans.length === 0 ? (
              <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-200">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">No lesson plans found</p>
                <p className="text-sm">There are no lesson plans submitted by {activeTeacher?.name} yet.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3 max-w-4xl mx-auto'}>
                {filteredPlans.map(plan => (
                  <div 
                    key={plan.id} 
                    onClick={() => setSelectedPlan(plan)}
                    className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900 line-clamp-2">{plan.theme}</h3>
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap ml-3">
                        Wk {plan.weekNumber}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Dates:</span>
                        <span className="font-medium text-gray-900">{plan.dates}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Submitted:</span>
                        <span className="font-medium text-gray-900">{new Date(plan.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-center text-blue-600 text-sm font-medium group-hover:text-blue-700 transition-colors">
                      <Eye size={16} className="mr-1.5" /> View Full Plan
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewLessonPlans;
