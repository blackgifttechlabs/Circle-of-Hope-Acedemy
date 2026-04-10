import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { getStudentById, getSystemSettings, saveAssessmentRecord, getAssessmentRecord, getStudentsByAssignedClass, getTeacherById } from '../../services/dataService';
import { Student, SystemSettings, PRE_PRIMARY_AREAS, TermAssessmentRecord, AssessmentRating } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, Save, ChevronRight, Download } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { printGrade0Report } from '../../utils/printGrade0Report';
import { CLASS_LIST_SKILLS } from '../../utils/classListSkills';
import { getAssessmentRecordKey } from '../../utils/assessmentWorkflow';
import { getSelectedTeachingClass, withTeachingClass } from '../../utils/teacherClassSelection';

const TAB_COLORS = [
  { active: 'border-blue-600 text-blue-800 bg-white', inactive: 'text-gray-500 hover:text-blue-600 hover:bg-blue-50', headerBg: 'bg-blue-50', headerText: 'text-blue-900', border: 'border-blue-200' },
  { active: 'border-green-600 text-green-800 bg-white', inactive: 'text-gray-500 hover:text-green-600 hover:bg-green-50', headerBg: 'bg-green-50', headerText: 'text-green-900', border: 'border-green-200' },
  { active: 'border-purple-600 text-purple-800 bg-white', inactive: 'text-gray-500 hover:text-purple-600 hover:bg-purple-50', headerBg: 'bg-purple-50', headerText: 'text-purple-900', border: 'border-purple-200' },
  { active: 'border-orange-600 text-orange-800 bg-white', inactive: 'text-gray-500 hover:text-orange-600 hover:bg-orange-50', headerBg: 'bg-orange-50', headerText: 'text-orange-900', border: 'border-orange-200' },
  { active: 'border-pink-600 text-pink-800 bg-white', inactive: 'text-gray-500 hover:text-pink-600 hover:bg-pink-50', headerBg: 'bg-pink-50', headerText: 'text-pink-900', border: 'border-pink-200' },
  { active: 'border-teal-600 text-teal-800 bg-white', inactive: 'text-gray-500 hover:text-teal-600 hover:bg-teal-50', headerBg: 'bg-teal-50', headerText: 'text-teal-900', border: 'border-teal-200' },
];

export const TermAssessmentPage: React.FC<{ user: any }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const className = getSelectedTeachingClass(user, location.search);
  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  
  const [activeTab, setActiveTab] = useState(PRE_PRIMARY_AREAS[0].id);
  const [record, setRecord] = useState<TermAssessmentRecord | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  const loadRecord = async (termId: string, s: Student) => {
    const recordKey = getAssessmentRecordKey(s);
    const existingRecord = await getAssessmentRecord(recordKey, s.id, termId);
    if (existingRecord) {
      setRecord(existingRecord);
    } else {
      setRecord({
        studentId: s.id,
        termId: termId,
        grade: recordKey,
        ratings: {},
        isComplete: false,
        updatedAt: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const s = await getStudentById(id);
        const setts = await getSystemSettings();
        setStudent(s);
        setSettings(setts);
        
        if (className) {
          const classStudents = await getStudentsByAssignedClass(className);
          setStudents(classStudents.filter(st => st.studentStatus === 'ENROLLED'));
        }

        if (s && setts) {
          let termId = setts.activeTermId || 'term-1'; // Fallback
          if (user?.id) {
            const teacher = await getTeacherById(user.id);
            if (teacher && teacher.activeTermId) {
              termId = teacher.activeTermId;
            }
          }
          
          // Ensure termId is valid (one of the 3 terms)
          const validTermIds = ['term-1', 'term-2', 'term-3'];
          if (!validTermIds.includes(termId)) {
            termId = 'term-1';
          }

          setSelectedTerm(termId);
          await loadRecord(termId, s);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [className, id, user]);

  const handleTermChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = e.target.value;
    setSelectedTerm(termId);
    if (student) {
      setLoading(true);
      await loadRecord(termId, student);
      setLoading(false);
    }
  };

  const handleRawScoreChange = async (componentId: string, skillId: string, score: 1 | 2 | 3 | null) => {
    if (!record) return;
    
    // Toggle score if clicking the same one
    const newScore = record.rawScores?.[skillId] === score ? null : score;

    const newRawScores = {
      ...(record.rawScores || {}),
      [skillId]: newScore
    };

    // Calculate new component rating
    const termSkills = CLASS_LIST_SKILLS[record.termId] || {};
    const areaId = activeTab; // We know the area because the user is on that tab
    const areaSkills = termSkills[areaId] || [];
    
    let totalScore = 0;
    let count = 0;

    areaSkills.forEach((theme: any) => {
      theme.skills.forEach((skill: any) => {
        if (skill.componentId === componentId) {
          const s = newRawScores[skill.id];
          if (s) {
            totalScore += s;
            count++;
          }
        }
      });
    });

    let newRating: AssessmentRating | undefined = undefined;
    if (count > 0) {
      const average = totalScore / count;
      if (average >= 2.5) newRating = 'FM';
      else if (average >= 1.5) newRating = 'AM';
      else newRating = 'NM';
    }

    const newRecord = {
      ...record,
      rawScores: newRawScores,
      ratings: {
        ...record.ratings,
      },
      updatedAt: new Date().toISOString()
    };

    if (newRating) {
      newRecord.ratings[componentId] = newRating;
    } else {
      delete newRecord.ratings[componentId];
    }
    
    setRecord(newRecord);
    
    // Auto-save
    await saveAssessmentRecord(newRecord);
  };

  const handleRatingChange = async (componentId: string, rating: AssessmentRating) => {
    if (!record) return;
    
    const newRecord = {
      ...record,
      ratings: {
        ...record.ratings,
        [componentId]: rating
      },
      updatedAt: new Date().toISOString()
    };
    
    setRecord(newRecord);
    
    // Auto-save
    await saveAssessmentRecord(newRecord);
  };

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!record) return;
    setRecord({
      ...record,
      remarks: e.target.value
    });
  };

  const handleSaveRemarks = async () => {
    if (!record) return;
    setSaving(true);
    await saveAssessmentRecord(record);
    setSaving(false);
    setToast({ show: true, msg: 'Remarks saved successfully' });
  };

  const handleMarkComplete = async () => {
    if (!record) return;
    setSaving(true);
    const newRecord = { ...record, isComplete: true, updatedAt: new Date().toISOString() };
    await saveAssessmentRecord(newRecord);
    setRecord(newRecord);
    setSaving(false);
    setToast({ show: true, msg: 'Student marked as complete' });
  };

  const handleNextStudent = () => {
    if (!student || students.length === 0) return;
    const currentIndex = students.findIndex(s => s.id === student.id);
    if (currentIndex >= 0 && currentIndex < students.length - 1) {
      navigate(withTeachingClass(`/teacher/term-assessment/${students[currentIndex + 1].id}`, className));
    } else {
      navigate(withTeachingClass('/teacher/classes', className));
    }
  };

  if (loading) return <Loader />;
  if (!student || !record) return <div className="p-8 text-center">Student not found</div>;

  // Calculate progress
  const totalComponents = PRE_PRIMARY_AREAS.reduce((acc, area) => acc + area.components.length, 0);
  const ratedComponents = Object.keys(record.ratings).length;
  
  let currentScore = 0;
  Object.values(record.ratings).forEach(rating => {
    if (rating === 'FM') currentScore += 2;
    else if (rating === 'AM') currentScore += 1;
  });
  const maxScore = ratedComponents * 2;
  const performanceProgress = maxScore === 0 ? 0 : Math.round((currentScore / maxScore) * 100);
  
  const isAllRated = ratedComponents === totalComponents;

  return (
    <div className="font-sans text-black w-full px-4 sm:px-6 lg:px-8 pb-20">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} variant="success" />
      
      <button onClick={() => navigate(withTeachingClass('/teacher/classes', className))} className="mb-6 p-2 hover:bg-gray-100 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-gray-200 w-fit">
          <ArrowLeft size={16} /> Back to Class List
      </button>

      {/* Header */}
      <div className="bg-white border-2 border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{student.name}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {student.id}</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTerm}
              onChange={handleTermChange}
              className="p-2 border-2 border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-700 bg-white outline-none focus:border-coha-900 transition-colors"
            >
              {settings?.schoolCalendars?.map(term => (
                <option key={term.id} value={term.id}>{term.termName}</option>
              ))}
            </select>
            <div className="text-right">
              <p className="text-3xl font-black text-coha-900">{performanceProgress}%</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</p>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-4 border border-gray-200 p-0.5 overflow-hidden">
            <div className={`h-full transition-all duration-500 ${performanceProgress >= 80 ? 'bg-green-500' : performanceProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${performanceProgress}%` }}></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b-2 border-gray-200 mb-6 sticky top-0 bg-gray-50 z-10">
        {PRE_PRIMARY_AREAS.map((area, index) => {
          const areaComponents = area.components.length;
          const ratedInArea = area.components.filter(c => record.ratings[c.id]).length;
          const isAreaComplete = ratedInArea === areaComponents;
          const colors = TAB_COLORS[index % TAB_COLORS.length];
          
          return (
            <button
              key={area.id}
              onClick={() => setActiveTab(area.id)}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === area.id ? `border-b-4 ${colors.active}` : colors.inactive}`}
            >
              {area.name}
              {isAreaComplete && <CheckCircle size={14} className="text-green-500" />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white border-2 border-gray-200 shadow-sm p-0 mb-6">
        {PRE_PRIMARY_AREAS.map((area, index) => {
          const colors = TAB_COLORS[index % TAB_COLORS.length];
          const termSkills = CLASS_LIST_SKILLS[record.termId] || {};
          const areaThemes = termSkills[area.id] || [];
          
          return (
          <div key={area.id} className={activeTab === area.id ? 'block' : 'hidden'}>
            <div className={`p-6 border-b-2 ${colors.border} ${colors.headerBg}`}>
              <h3 className={`text-lg font-black uppercase tracking-tight ${colors.headerText}`}>{area.name}</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {areaThemes.length > 0 ? (
                areaThemes.map((theme: any) => (
                  <div key={theme.theme} className="p-4 sm:p-6 flex flex-col gap-4 hover:bg-gray-50 transition-colors">
                    <h4 className="font-bold text-gray-900 uppercase tracking-tight">{theme.theme}</h4>
                    <div className="space-y-3">
                      {theme.skills.map((skill: any) => (
                        <div key={skill.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pl-4 border-l-2 border-gray-200">
                          <p className="text-sm text-gray-700 flex-1">{skill.name}</p>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(score => (
                              <button
                                key={score}
                                onClick={() => handleRawScoreChange(skill.componentId, skill.id, score as 1|2|3)}
                                className={`w-8 h-8 flex items-center justify-center text-xs font-black border-2 transition-all ${record.rawScores?.[skill.id] === score ? 'bg-coha-900 border-coha-900 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm text-gray-500 italic">
                  No themes defined for this area in {record.termId}.
                </div>
              )}

              {/* Component Ratings Summary at the bottom */}
              <div className="p-4 sm:p-6 bg-gray-50 border-t-2 border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-tight text-sm">Component Ratings (Auto-calculated)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {area.components.map(comp => (
                    <div key={comp.id} className="flex justify-between items-center p-3 bg-white border-2 border-gray-200">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{comp.name}</span>
                      <div className="flex gap-2">
                        {record.ratings[comp.id] ? (
                          <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest border-2 ${record.ratings[comp.id] === 'FM' ? 'bg-green-100 border-green-500 text-green-800' : record.ratings[comp.id] === 'AM' ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-red-100 border-red-500 text-red-800'}`}>
                            {record.ratings[comp.id]}
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-black uppercase tracking-widest border-2 bg-gray-100 border-gray-300 text-gray-500">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Remarks */}
      <div className="bg-white border-2 border-gray-200 shadow-sm p-6 mb-6">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Remarks (Optional)</h3>
        <textarea
          className="w-full p-4 border-2 border-gray-200 outline-none focus:border-coha-900 min-h-[120px] font-medium text-sm resize-y"
          placeholder="Add notes about the student that will appear on the report card..."
          value={record.remarks || ''}
          onChange={handleRemarksChange}
          onBlur={handleSaveRemarks}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={handleSaveRemarks} disabled={saving} className="text-[10px] px-4 py-2">
            {saving ? 'Saving...' : 'Save Remarks'}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-100 p-6 border-2 border-gray-200">
        <div className="flex gap-4 w-full sm:w-auto">
          <Button 
            onClick={handleMarkComplete} 
            disabled={!isAllRated || record.isComplete || saving}
            className={`px-8 py-4 font-black uppercase tracking-widest text-xs ${record.isComplete ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {record.isComplete ? <><CheckCircle size={16} className="mr-2" /> Completed</> : 'Mark as Complete'}
          </Button>
          
          {record.isComplete && (
            <Button 
              onClick={() => {
                const termName = settings?.schoolCalendars?.find(c => c.id === record.termId)?.termName || record.termId;
                const year = new Date().getFullYear().toString();
                printGrade0Report(student, record, termName, year, user?.name || 'Class Teacher');
              }}
              className="px-8 py-4 font-black uppercase tracking-widest text-xs bg-coha-900 text-white hover:bg-coha-800"
            >
              <Download size={16} className="mr-2" /> Download Report
            </Button>
          )}
        </div>
        
        <Button onClick={handleNextStudent} variant="outline" className="px-8 py-4 font-black uppercase tracking-widest text-xs bg-white w-full sm:w-auto">
          Next Student <ChevronRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};
