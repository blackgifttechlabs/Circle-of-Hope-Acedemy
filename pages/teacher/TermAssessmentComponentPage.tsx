import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentsByAssignedClass, getSystemSettings, saveAssessmentRecord, getAssessmentRecord, getTeacherById } from '../../services/dataService';
import { Student, SystemSettings, PRE_PRIMARY_AREAS, TermAssessmentRecord, AssessmentRating } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle, ChevronRight } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { getAssessmentRecordKey } from '../../utils/assessmentWorkflow';

const TAB_COLORS = [
  { active: 'border-blue-600 text-blue-800 bg-white', inactive: 'text-gray-500 hover:text-blue-600 hover:bg-blue-50', headerBg: 'bg-blue-50', headerText: 'text-blue-900', border: 'border-blue-200' },
  { active: 'border-green-600 text-green-800 bg-white', inactive: 'text-gray-500 hover:text-green-600 hover:bg-green-50', headerBg: 'bg-green-50', headerText: 'text-green-900', border: 'border-green-200' },
  { active: 'border-purple-600 text-purple-800 bg-white', inactive: 'text-gray-500 hover:text-purple-600 hover:bg-purple-50', headerBg: 'bg-purple-50', headerText: 'text-purple-900', border: 'border-purple-200' },
  { active: 'border-orange-600 text-orange-800 bg-white', inactive: 'text-gray-500 hover:text-orange-600 hover:bg-orange-50', headerBg: 'bg-orange-50', headerText: 'text-orange-900', border: 'border-orange-200' },
  { active: 'border-pink-600 text-pink-800 bg-white', inactive: 'text-gray-500 hover:text-pink-600 hover:bg-pink-50', headerBg: 'bg-pink-50', headerText: 'text-pink-900', border: 'border-pink-200' },
  { active: 'border-teal-600 text-teal-800 bg-white', inactive: 'text-gray-500 hover:text-teal-600 hover:bg-teal-50', headerBg: 'bg-teal-50', headerText: 'text-teal-900', border: 'border-teal-200' },
];

export const TermAssessmentComponentPage: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  
  const [activeAreaId, setActiveAreaId] = useState(PRE_PRIMARY_AREAS[0].id);
  const [activeComponentId, setActiveComponentId] = useState(PRE_PRIMARY_AREAS[0].components[0].id);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  
  // Map of studentId -> record
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});

  const loadRecords = async (termId: string, enrolledStudents: Student[]) => {
    const newRecords: Record<string, TermAssessmentRecord> = {};
    for (const s of enrolledStudents) {
      const recordKey = getAssessmentRecordKey(s);
      const existingRecord = await getAssessmentRecord(recordKey, s.id, termId);
      if (existingRecord) {
        newRecords[s.id] = existingRecord;
      } else {
        newRecords[s.id] = {
          studentId: s.id,
          termId: termId,
          grade: recordKey,
          ratings: {},
          isComplete: false,
          updatedAt: new Date().toISOString()
        };
      }
    }
    setRecords(newRecords);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user?.assignedClass) {
        const classStudents = await getStudentsByAssignedClass(user.assignedClass);
        const enrolledStudents = classStudents.filter(st => st.studentStatus === 'ENROLLED');
        setStudents(enrolledStudents);
        
        const setts = await getSystemSettings();
        setSettings(setts);

        let termId = setts?.activeTermId || 'term-1';
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
        await loadRecords(termId, enrolledStudents);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleTermChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = e.target.value;
    setSelectedTerm(termId);
    if (user?.assignedClass) {
      setLoading(true);
      await loadRecords(termId, students);
      setLoading(false);
    }
  };

  const handleRatingChange = async (studentId: string, rating: AssessmentRating) => {
    const currentRecord = records[studentId];
    if (!currentRecord) return;
    
    const newRecord = {
      ...currentRecord,
      ratings: {
        ...currentRecord.ratings,
        [activeComponentId]: rating
      },
      updatedAt: new Date().toISOString()
    };
    
    setRecords(prev => ({ ...prev, [studentId]: newRecord }));
    
    // Auto-save
    await saveAssessmentRecord(newRecord);
  };

  if (loading) return <Loader />;

  const activeArea = PRE_PRIMARY_AREAS.find(a => a.id === activeAreaId);
  const activeComponent = activeArea?.components.find(c => c.id === activeComponentId);

  return (
    <div className="font-sans text-black w-full px-4 sm:px-6 lg:px-8 pb-20">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} variant="success" />
      
      <button onClick={() => navigate('/teacher/dashboard')} className="mb-6 p-2 hover:bg-gray-100 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-gray-200 w-fit">
          <ArrowLeft size={16} /> Back to Class List
      </button>

      {/* Header */}
      <div className="bg-white border-2 border-gray-200 shadow-sm p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Component Mode</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate all students on a single skill</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTerm}
            onChange={handleTermChange}
            className="p-2 border-2 border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-700 bg-white outline-none focus:border-coha-900 transition-colors"
          >
            {settings?.schoolCalendars?.map(term => (
              <option key={term.id} value={term.id}>{term.termName}</option>
            ))}
          </select>
        </div>
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
              setActiveComponentId(area.components[0].id);
            }}
            className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeAreaId === area.id ? `border-b-4 ${colors.active}` : colors.inactive}`}
          >
            {area.name}
          </button>
          );
        })}
      </div>

      {/* Component Selection */}
      <div className="flex overflow-x-auto border-b-2 border-gray-200 mb-6 bg-white p-4 gap-2">
        {activeArea?.components.map(comp => {
          const areaIndex = PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId);
          const colors = TAB_COLORS[areaIndex % TAB_COLORS.length];
          return (
          <button
            key={comp.id}
            onClick={() => setActiveComponentId(comp.id)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all ${activeComponentId === comp.id ? `border-transparent ${colors.headerBg} ${colors.headerText}` : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
          >
            {comp.name}
          </button>
          );
        })}
      </div>

      {/* Student List for Component */}
      <div className="bg-white border-2 border-gray-200 shadow-sm p-0 mb-6">
        <div className={`p-6 border-b-2 ${TAB_COLORS[PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId) % TAB_COLORS.length].border} ${TAB_COLORS[PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId) % TAB_COLORS.length].headerBg}`}>
          <h3 className={`text-lg font-black uppercase tracking-tight ${TAB_COLORS[PRE_PRIMARY_AREAS.findIndex(a => a.id === activeAreaId) % TAB_COLORS.length].headerText}`}>{activeComponent?.name}</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {students.map(student => {
            const record = records[student.id];
            const currentRating = record?.ratings[activeComponentId];
            
            return (
              <div key={student.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{student.name}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.id}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleRatingChange(student.id, 'FM')}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 transition-all ${currentRating === 'FM' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}`}
                  >
                    FM
                  </button>
                  <button 
                    onClick={() => handleRatingChange(student.id, 'AM')}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 transition-all ${currentRating === 'AM' ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}`}
                  >
                    AM
                  </button>
                  <button 
                    onClick={() => handleRatingChange(student.id, 'NM')}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 transition-all ${currentRating === 'NM' ? 'bg-red-100 border-red-500 text-red-800' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'}`}
                  >
                    NM
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
