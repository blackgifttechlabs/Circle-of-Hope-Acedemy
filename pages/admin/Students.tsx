import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { getStudents, getSystemSettings, getStudentsByStatus, calculateFinalStage } from '../../services/dataService';
import { Student, SystemSettings, Division } from '../../types';
import { Plus, Search, Eye, Download, CheckSquare, Activity, Filter, Key } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { printStudentList } from '../../utils/printStudentList';

export const StudentsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'ENROLLED' | 'ASSESSMENT'>('ENROLLED');
  const [students, setStudents] = useState<Student[]>([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({show: false, msg: ''});
  
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'MAINSTREAM' | 'SPECIAL_NEEDS'>('ALL');

  const fetchStudents = async () => {
    setLoading(true);
    let data: Student[] = [];
    if (viewMode === 'ENROLLED') {
         const all = await getStudents();
         data = all.filter(s => s.studentStatus === 'ENROLLED' || !s.studentStatus);
    } else {
         data = await getStudentsByStatus('ASSESSMENT');
    }
    setStudents(data);
    const settingsData = await getSystemSettings();
    setSettings(settingsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [viewMode]);

  const handleFinalizeAssessment = async (studentId: string) => {
      if(window.confirm('Calculate final stage and enroll student?')) {
          setLoading(true);
          const result = await calculateFinalStage(studentId);
          setLoading(false);
          if (result.success) {
              setToast({show: true, msg: `Student enrolled in ${result.assignedClass}`});
              fetchStudents();
          } else {
              setToast({show: true, msg: result.error || 'Could not calculate.'});
          }
      }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (student.parentName && student.parentName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesDivision = true;
    if (divisionFilter === 'MAINSTREAM') matchesDivision = student.division !== Division.SPECIAL_NEEDS;
    if (divisionFilter === 'SPECIAL_NEEDS') matchesDivision = student.division === Division.SPECIAL_NEEDS;

    return matchesSearch && matchesDivision;
  });

  return (
    <div>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} variant="success" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-coha-900 uppercase tracking-tight">Student Directory</h2>
          <p className="text-gray-600 text-sm">Manage enrollment records and portal access.</p>
        </div>
        {viewMode === 'ENROLLED' && (
             <Button variant="outline" onClick={() => printStudentList(filteredStudents, settings)}>
                <Download size={20} /> Download List
            </Button>
        )}
      </div>

      <div className="flex justify-between items-center border-b border-gray-200 mb-6 bg-white shadow-sm flex-wrap">
         <div className="flex">
            <button onClick={() => setViewMode('ENROLLED')} className={`px-6 py-3 font-bold text-sm uppercase border-b-4 ${viewMode === 'ENROLLED' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500'}`}>Registered</button>
            <button onClick={() => setViewMode('ASSESSMENT')} className={`px-6 py-3 font-bold text-sm uppercase border-b-4 ${viewMode === 'ASSESSMENT' ? 'border-coha-900 text-coha-900' : 'border-transparent text-gray-500'}`}>Under Assessment</button>
         </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-coha-500 outline-none rounded-none"
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <select 
                className="p-2 border border-gray-300 outline-none bg-gray-50 text-sm font-medium"
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value as any)}
              >
                  <option value="ALL">All Divisions</option>
                  <option value="MAINSTREAM">Mainstream</option>
                  <option value="SPECIAL_NEEDS">Special Needs</option>
              </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Login PIN</th>
                <th className="px-6 py-4">Division</th>
                <th className="px-6 py-4">Current Grade</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{student.id}</td>
                  <td className="px-6 py-4 font-bold text-coha-900">{student.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Key size={12} className="text-gray-400" />
                      <span className="font-mono font-black text-coha-700 bg-gray-100 px-2 py-0.5">{student.parentPin}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-none border ${student.division === Division.SPECIAL_NEEDS ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-800 border-gray-200'}`}>
                         {student.division || 'Mainstream'}
                     </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-sm">
                      {student.assignedClass || student.grade || student.level}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                        {viewMode === 'ASSESSMENT' ? (
                            <>
                                <button onClick={() => navigate(`/admin/assessment/${student.id}`)} className="p-2 border border-gray-200 hover:bg-coha-900 hover:text-white transition-all">
                                    <Eye size={14} />
                                </button>
                                <Button onClick={() => handleFinalizeAssessment(student.id)} className="py-1 px-3 text-[10px] font-black uppercase">
                                    Finalize
                                </Button>
                            </>
                        ) : (
                            <button 
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                              className="text-coha-500 hover:underline font-bold text-sm flex items-center gap-1"
                            >
                              <Eye size={16} /> Profile
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
               {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">No student records found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};