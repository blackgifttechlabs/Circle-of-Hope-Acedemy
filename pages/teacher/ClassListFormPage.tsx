import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentsByAssignedClass, getSystemSettings, saveAssessmentRecord, getAssessmentRecord, getTeacherById } from '../../services/dataService';
import { Student, SystemSettings, PRE_PRIMARY_AREAS, TermAssessmentRecord, AssessmentRating } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, ChevronRight } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { CLASS_LIST_SKILLS } from '../../utils/classListSkills';

const TAB_COLORS = [
  { active: 'border-blue-600 text-blue-800 bg-white', inactive: 'text-gray-500 hover:text-blue-600 hover:bg-blue-50', headerBg: 'bg-blue-50', headerText: 'text-blue-900', border: 'border-blue-200' },
  { active: 'border-green-600 text-green-800 bg-white', inactive: 'text-gray-500 hover:text-green-600 hover:bg-green-50', headerBg: 'bg-green-50', headerText: 'text-green-900', border: 'border-green-200' },
  { active: 'border-purple-600 text-purple-800 bg-white', inactive: 'text-gray-500 hover:text-purple-600 hover:bg-purple-50', headerBg: 'bg-purple-50', headerText: 'text-purple-900', border: 'border-purple-200' },
  { active: 'border-orange-600 text-orange-800 bg-white', inactive: 'text-gray-500 hover:text-orange-600 hover:bg-orange-50', headerBg: 'bg-orange-50', headerText: 'text-orange-900', border: 'border-orange-200' },
  { active: 'border-pink-600 text-pink-800 bg-white', inactive: 'text-gray-500 hover:text-pink-600 hover:bg-pink-50', headerBg: 'bg-pink-50', headerText: 'text-pink-900', border: 'border-pink-200' },
  { active: 'border-teal-600 text-teal-800 bg-white', inactive: 'text-gray-500 hover:text-teal-600 hover:bg-teal-50', headerBg: 'bg-teal-50', headerText: 'text-teal-900', border: 'border-teal-200' },
];

export const ClassListFormPage: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: '' });
  
  const [activeAreaId, setActiveAreaId] = useState(PRE_PRIMARY_AREAS[0].id);
  const [activeThemeIndex, setActiveThemeIndex] = useState(0);
  
  // Map of studentId -> record
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (user?.assignedClass) {
        const classStudents = await getStudentsByAssignedClass(user.assignedClass);
        const enrolledStudents = classStudents.filter(st => st.studentStatus === 'ENROLLED');
        setStudents(enrolledStudents);
        
        const setts = await getSystemSettings();
        setSettings(setts);

        let termId = setts?.activeTermId || 'Term 1';
        if (user?.id) {
          const teacher = await getTeacherById(user.id);
          if (teacher && teacher.activeTermId) {
            termId = teacher.activeTermId;
          }
        }
        
        const newRecords: Record<string, TermAssessmentRecord> = {};
        for (const s of enrolledStudents) {
          const existingRecord = await getAssessmentRecord(s.grade || 'Grade 0', s.id, termId);
          if (existingRecord) {
            newRecords[s.id] = existingRecord;
          } else {
            newRecords[s.id] = {
              studentId: s.id,
              termId: termId,
              grade: s.grade || 'Grade 0',
              ratings: {},
              isComplete: false,
              updatedAt: new Date().toISOString()
            };
          }
        }
        setRecords(newRecords);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleRawScoreChange = async (studentId: string, componentId: string, skillId: string, score: 1 | 2 | 3 | null) => {
    const currentRecord = records[studentId];
    if (!currentRecord) return;
    
    // Toggle score if clicking the same one
    const newScore = currentRecord.rawScores?.[skillId] === score ? null : score;
    
    const newRawScores = {
      ...(currentRecord.rawScores || {}),
      [skillId]: newScore
    };

    // Calculate new component rating
    const termSkills = CLASS_LIST_SKILLS[currentRecord.termId] || {};
    const areaId = activeAreaId;
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
      ...currentRecord,
      rawScores: newRawScores,
      ratings: {
        ...currentRecord.ratings,
      },
      updatedAt: new Date().toISOString()
    };

    if (newRating) {
      newRecord.ratings[componentId] = newRating;
    } else {
      delete newRecord.ratings[componentId];
    }
    
    setRecords(prev => ({ ...prev, [studentId]: newRecord }));
    
    // Auto-save
    await saveAssessmentRecord(newRecord);
  };

  if (loading) return <Loader />;

  const activeArea = PRE_PRIMARY_AREAS.find(a => a.id === activeAreaId);
  const termId = Object.values(records)[0]?.termId || settings?.activeTermId || 'Term 1';
  const termSkills = CLASS_LIST_SKILLS[termId] || CLASS_LIST_SKILLS['Term 1'] || {};
  const areaSkills = termSkills[activeAreaId] || [];
  const activeTheme = areaSkills[activeThemeIndex];

  return (
    <div className="font-sans text-black w-full px-4 sm:px-6 lg:px-8 pb-20">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} variant="success" />
      
      <button onClick={() => navigate('/teacher/dashboard')} className="mb-6 p-2 hover:bg-gray-100 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-gray-200 w-fit">
          <ArrowLeft size={16} /> Back to Class List
      </button>

      {/* Header */}
      <div className="bg-white border-2 border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Class List Form</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate all students on skills for a specific theme</p>
      </div>

      {/* Area Selection */}
      <div className="flex overflow-x-auto border-b-2 border-gray-200 mb-6 bg-gray-50">
        {PRE_PRIMARY_AREAS.map((area, index) => {
          const colors = TAB_COLORS[index % TAB_COLORS.length];
          return (
          <button
            key={area.id}
            onClick={() => {
              setActiveAreaId(area.id);
              setActiveThemeIndex(0);
            }}
            className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeAreaId === area.id ? `border-b-4 ${colors.active}` : colors.inactive}`}
          >
            {area.name}
          </button>
          );
        })}
      </div>

      {/* Theme Selection */}
      {areaSkills.length > 0 ? (
        <div className="flex overflow-x-auto border-b-2 border-gray-200 mb-6 bg-white p-4 gap-2">
          {areaSkills.map((theme: any, index: number) => {
            const areaIndex = PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId);
            const colors = TAB_COLORS[areaIndex % TAB_COLORS.length];
            return (
            <button
              key={theme.theme}
              onClick={() => setActiveThemeIndex(index)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all ${activeThemeIndex === index ? `border-transparent ${colors.headerBg} ${colors.headerText}` : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
            >
              {theme.theme}
            </button>
            );
          })}
        </div>
      ) : (
        <div className="p-6 bg-white border-2 border-gray-200 mb-6">
          <p className="text-sm text-gray-500 italic">No themes defined for this area in {termId}.</p>
        </div>
      )}

      {/* Student List for Theme */}
      {activeTheme && (
        <div className="bg-white border-2 border-gray-200 shadow-sm p-0 mb-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b-2 ${TAB_COLORS[PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId) % TAB_COLORS.length].border} ${TAB_COLORS[PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId) % TAB_COLORS.length].headerBg}`}>
                <th className="p-4 text-xs font-black uppercase tracking-widest text-gray-900 sticky left-0 bg-inherit z-10">Student</th>
                {activeTheme.skills.map((skill: any) => (
                  <th key={skill.id} className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-700 min-w-[150px]">
                    {skill.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student, idx) => {
                const record = records[student.id];
                
                return (
                  <tr key={student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                    <td className="p-4 sticky left-0 bg-inherit z-10 border-r border-gray-100">
                      <p className="font-bold text-gray-900 whitespace-nowrap">{student.name}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.id}</p>
                    </td>
                    {activeTheme.skills.map((skill: any) => (
                      <td key={skill.id} className="p-4">
                        <div className="flex gap-1 justify-center">
                          {[1, 2, 3].map(score => (
                            <button
                              key={score}
                              onClick={() => handleRawScoreChange(student.id, skill.componentId, skill.id, score as 1|2|3)}
                              className={`w-8 h-8 flex items-center justify-center text-xs font-black border-2 transition-all ${record?.rawScores?.[skill.id] === score ? 'bg-coha-900 border-coha-900 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
