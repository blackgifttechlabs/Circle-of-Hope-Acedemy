import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentsByAssignedClass, getSystemSettings, getAssessmentRecordsForClass, getTeacherById } from '../../services/dataService';
import { Student, TermAssessmentRecord, SystemSettings, PRE_PRIMARY_AREAS } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { ArrowLeft, Download, Printer } from 'lucide-react';

interface SummaryFormPageProps {
  user: any;
}

export const SummaryFormPage: React.FC<SummaryFormPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<string, TermAssessmentRecord>>({});
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (user?.assignedClass) {
        const [studentsData, settingsData] = await Promise.all([
          getStudentsByAssignedClass(user.assignedClass),
          getSystemSettings()
        ]);
        
        // Filter for Grade 0 students
        const grade0Students = studentsData.filter(s => s.grade === 'Grade 0');
        setStudents(grade0Students);
        setSettings(settingsData);

        if (settingsData) {
          let termId = settingsData.activeTermId || 'Term 1';
          if (user?.id) {
            const teacher = await getTeacherById(user.id);
            if (teacher && teacher.activeTermId) {
              termId = teacher.activeTermId;
            }
          }
          setSelectedTerm(termId);
          await loadRecords(termId, grade0Students);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const loadRecords = async (termId: string, studentsList: Student[]) => {
    if (studentsList.length === 0) return;
    const grade = studentsList[0].grade || 'Grade 0';
    const studentIds = studentsList.map(s => s.id);
    const classRecords = await getAssessmentRecordsForClass(grade, termId, studentIds);
    const recordsMap: Record<string, TermAssessmentRecord> = {};
    classRecords.forEach(r => {
      recordsMap[r.studentId] = r;
    });
    setRecords(recordsMap);
  };

  const handleTermChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = e.target.value;
    setSelectedTerm(termId);
    if (user?.assignedClass) {
      setLoading(true);
      await loadRecords(termId, students);
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/teacher/dashboard')}
            className="flex items-center text-gray-500 hover:text-coha-900 transition-colors mb-2 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-coha-900 tracking-tight">Summary Form</h1>
          <p className="text-gray-500 mt-1">End of term summary for all learners</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedTerm}
            onChange={handleTermChange}
            className="p-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 bg-white"
          >
            {settings?.schoolCalendars?.map(term => (
              <option key={term.id} value={term.id}>{term.termName}</option>
            ))}
          </select>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-coha-900 text-white rounded-lg text-sm font-bold hover:bg-coha-800 transition-colors"
          >
            <Printer size={16} /> Print Summary
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-500 uppercase tracking-widest sticky left-0 z-10 min-w-[200px]">
                  Learner Name
                </th>
                {PRE_PRIMARY_AREAS.map(area => (
                  <th key={area.id} colSpan={area.components.length} className="p-3 border-b border-r border-gray-200 bg-gray-50 text-xs font-black text-gray-700 uppercase tracking-widest text-center">
                    {area.name}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-10"></th>
                {PRE_PRIMARY_AREAS.map(area => (
                  area.components.map(comp => (
                    <th key={comp.id} className="p-2 border-b border-r border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 text-center min-w-[80px] max-w-[120px] truncate" title={comp.name}>
                      {comp.name}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const record = records[student.id];
                return (
                  <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border-b border-r border-gray-200 text-sm font-bold text-gray-900 sticky left-0 z-10 bg-inherit">
                      {student.name}
                    </td>
                    {PRE_PRIMARY_AREAS.map(area => (
                      area.components.map(comp => {
                        const rating = record?.ratings?.[comp.id];
                        return (
                          <td key={comp.id} className="p-2 border-b border-r border-gray-200 text-center">
                            {rating ? (
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                rating === 'FM' ? 'bg-green-100 text-green-800' :
                                rating === 'AM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {rating}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })
                    ))}
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-gray-500 italic">
                    No Mainstream/Grade 0 students found in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-\\[1600px\\] * {
            visibility: visible;
          }
          .max-w-\\[1600px\\] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
          }
          button, select {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};
