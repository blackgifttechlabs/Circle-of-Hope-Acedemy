import React, { useState, useEffect } from 'react';
import { getStudentsByAssignedClass, getDailyRegister, markDailyRegister } from '../../services/dataService';
import { Student, StudentDailyRegister } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { CheckCircle, XCircle, Search, Calendar as CalendarIcon } from 'lucide-react';

export const DailyRegister: React.FC<{ user: any }> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [registerData, setRegisterData] = useState<StudentDailyRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'mark' | 'table'>('mark');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (user?.assignedClass) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const classStudents = await getStudentsByAssignedClass(user.assignedClass);
    setStudents(classStudents);
    
    const data = await getDailyRegister(user.assignedClass);
    setRegisterData(data);
    setLoading(false);
  };

  const handleMarkAttendance = async (studentId: string, studentName: string, status: 'present' | 'absent') => {
    try {
      await markDailyRegister(user.assignedClass, studentId, studentName, selectedDate, status);
      // Optimistic update
      setRegisterData(prev => {
        const existing = prev.find(r => r.id === studentId);
        const timestamp = new Date().toISOString();
        if (existing) {
          return prev.map(r => r.id === studentId ? {
            ...r,
            attendance: { ...r.attendance, [selectedDate]: { status, timestamp } }
          } : r);
        } else {
          return [...prev, {
            id: studentId,
            studentName,
            attendance: { [selectedDate]: { status, timestamp } }
          }];
        }
      });
      
      if (viewMode === 'mark') {
        if (currentIndex < filteredStudents.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // Reached the end
          setCurrentIndex(filteredStudents.length);
        }
      }
    } catch (error) {
      console.error("Failed to mark attendance", error);
    }
  };

  if (loading) return <Loader />;

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Get all unique dates from register data for the table view
  const allDates = Array.from(new Set(registerData.flatMap(r => Object.keys(r.attendance)))).sort().reverse();

  const currentStudent = filteredStudents[currentIndex];
  const isFinished = currentIndex >= filteredStudents.length && filteredStudents.length > 0;

  return (
    <div className="w-full pb-10">
      <div className="bg-white p-6 shadow-sm border-l-8 border-coha-900 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-coha-900">Daily Register</h2>
            <p className="text-gray-600">Class: {user.assignedClass}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('mark')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-widest ${viewMode === 'mark' ? 'bg-coha-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Mark Register
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-widest ${viewMode === 'table' ? 'bg-coha-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              View Full Table
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto bg-white border border-gray-200 shadow-sm rounded-[20px]">
        {viewMode === 'mark' ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="text-gray-400" size={20} />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="border border-gray-300 rounded-md p-2 focus:ring-coha-500 focus:border-coha-500"
                />
              </div>
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentIndex(0);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-coha-500 focus:border-coha-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>
            </div>

            {isFinished ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">All Done!</h3>
                <p className="text-gray-500 mb-6">You have marked the register for all students.</p>
                <button 
                  onClick={() => setCurrentIndex(0)}
                  className="px-6 py-3 bg-coha-900 text-white font-bold uppercase tracking-widest rounded-lg hover:bg-coha-800 transition-colors"
                >
                  Start Over
                </button>
              </div>
            ) : currentStudent ? (
              <div className="max-w-md mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Student {currentIndex + 1} of {filteredStudents.length}
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full mb-8 overflow-hidden">
                  <div 
                    className="bg-coha-900 h-full transition-all duration-300" 
                    style={{ width: `${((currentIndex) / filteredStudents.length) * 100}%` }}
                  />
                </div>
                
                <h3 className="text-3xl font-black text-gray-800 mb-8">{currentStudent.name}</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleMarkAttendance(currentStudent.id, currentStudent.name, 'present')}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-500 transition-all group"
                  >
                    <CheckCircle size={40} className="text-green-500 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-lg text-green-700 uppercase tracking-widest">Present</span>
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(currentStudent.id, currentStudent.name, 'absent')}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-500 transition-all group"
                  >
                    <XCircle size={40} className="text-red-500 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-lg text-red-700 uppercase tracking-widest">Absent</span>
                  </button>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className={`text-sm font-bold uppercase tracking-widest ${currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-coha-900'}`}
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(filteredStudents.length, prev + 1))}
                    className="text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-coha-900"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 italic">No students found.</div>
            )}
          </>
        ) : (
          <>
             <div className="flex justify-end mb-6">
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-coha-500 focus:border-coha-500"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
             </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 font-black text-xs uppercase tracking-widest text-gray-500 sticky left-0 bg-gray-50 z-10">Student Name</th>
                    {allDates.map(date => (
                      <th key={date} className="p-4 font-black text-xs uppercase tracking-widest text-gray-500 text-center whitespace-nowrap">
                        {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                   {filteredStudents.map(student => {
                    const record = registerData.find(r => r.id === student.id);
                    return (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-medium sticky left-0 bg-white z-10">{student.name}</td>
                        {allDates.map(date => {
                           const dayRecord = record?.attendance[date];
                           return (
                             <td key={date} className="p-4 text-center">
                               {dayRecord ? (
                                 <div className="flex flex-col items-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${dayRecord.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {dayRecord.status === 'present' ? 'P' : 'A'}
                                    </span>
                                    <span className="text-[9px] text-gray-400 mt-1">
                                      {new Date(dayRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                               ) : (
                                 <span className="text-gray-300">-</span>
                               )}
                             </td>
                           )
                        })}
                      </tr>
                    )
                   })}
                   {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={allDates.length + 1} className="p-8 text-center text-gray-500 italic">No students found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
             </div>
          </>
        )}
      </div>
    </div>
  );
};
