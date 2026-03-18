import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentsByAssignedClass } from '../../services/dataService';
import { Student } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Users, BookOpen, Activity, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface TeacherDashboardProps {
  user: any; // The logged-in teacher object
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClassData = async () => {
      if (user?.assignedClass) {
        const data = await getStudentsByAssignedClass(user.assignedClass);
        setStudents(data);
      }
      setLoading(false);
    };
    fetchClassData();
  }, [user]);

  if (loading) return <Loader />;

  if (!user.assignedClass) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="bg-yellow-100 p-4 rounded-full mb-4">
                  <BookOpen size={48} className="text-yellow-600"/>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">No Class Assigned</h2>
              <p className="text-gray-600 mt-2">You have not been assigned a class yet. Please contact the administrator.</p>
          </div>
      );
  }

  // Split students by status
  const assessmentStudents = students.filter(s => s.studentStatus === 'ASSESSMENT');
  const enrolledStudents = students.filter(s => s.studentStatus === 'ENROLLED');

  const filteredEnrolled = enrolledStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-black">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-coha-900 uppercase tracking-tighter leading-none mb-1">Class Cohort: {user.assignedClass}</h2>
        <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.2em]">Academic Management & Student Observations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div className="bg-white p-6 shadow-sm border-l-8 border-coha-900 border-b border-r border-t border-gray-200">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Population</h3>
                 <Users className="text-coha-500" size={20}/>
             </div>
             <p className="text-4xl font-black text-coha-900 tracking-tighter">{students.length}</p>
         </div>
         <div className="bg-white p-6 shadow-sm border-l-8 border-purple-600 border-b border-r border-t border-gray-200">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Under Observation</h3>
                 <Activity className="text-purple-500" size={20}/>
             </div>
             <p className="text-4xl font-black text-purple-900 tracking-tighter">{assessmentStudents.length}</p>
         </div>
         <div className="bg-white p-6 shadow-sm border-l-8 border-green-600 border-b border-r border-t border-gray-200">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Permanent Register</h3>
                 <CheckCircle className="text-green-500" size={20}/>
             </div>
             <p className="text-4xl font-black text-green-900 tracking-tighter">{enrolledStudents.length}</p>
         </div>
      </div>

      {/* Observation List */}
      {assessmentStudents.length > 0 && (
          <div className="bg-white border-2 border-purple-200 shadow-xl mb-10 animate-fade-in">
             <div className="p-5 bg-purple-50 border-b-2 border-purple-100 flex justify-between items-center">
                 <h3 className="text-purple-900 font-black flex items-center gap-3 uppercase text-xs tracking-widest">
                     <Activity size={20} /> Active Observations (14-Day Cycle)
                 </h3>
                 <span className="bg-purple-600 text-white text-[10px] font-black px-3 py-1 rounded-none uppercase">{assessmentStudents.length} Pending</span>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                         <tr>
                             <th className="px-6 py-4">Student Identification</th>
                             <th className="px-6 py-4">Placement Level</th>
                             <th className="px-6 py-4">Observation Progress</th>
                             <th className="px-6 py-4 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {assessmentStudents.map(student => {
                             const completedDays = student.assessment?.teacherAssessments ? Object.values(student.assessment.teacherAssessments).filter((d:any) => d.completed).length : 0;
                             const progress = (completedDays / 14) * 100;
                             
                             return (
                                 <tr key={student.id} className="hover:bg-purple-50/50 transition-colors group">
                                     <td className="px-6 py-5">
                                         <p className="font-black text-coha-900 text-base uppercase tracking-tight">{student.name}</p>
                                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID: {student.id}</p>
                                     </td>
                                     <td className="px-6 py-5">
                                         <span className="px-3 py-1 bg-white border-2 border-gray-100 text-[10px] font-black text-gray-700 uppercase">{student.level}</span>
                                     </td>
                                     <td className="px-6 py-5">
                                         <div className="w-full bg-gray-100 rounded-none h-4 max-w-[200px] border border-gray-200 p-0.5 overflow-hidden">
                                             <div className="bg-purple-600 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                         </div>
                                         <span className="text-[9px] font-black text-purple-700 mt-2 block uppercase tracking-wider">{completedDays} / 14 Days Logged</span>
                                     </td>
                                     <td className="px-6 py-5 text-right">
                                         <Button onClick={() => navigate(`/teacher/assessment/${student.id}`)} className="py-2 px-6 text-[10px] font-black uppercase tracking-widest bg-purple-600 hover:bg-purple-700 shadow-lg group-hover:translate-y-[-2px] transition-all">
                                             Update Log
                                         </Button>
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {/* Enrolled List / Class Register */}
      <div className="bg-white border-2 border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b-2 border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-gray-900 font-black flex items-center gap-3 uppercase text-xs tracking-widest">
                  <BookOpen size={20} className="text-coha-900"/> Official Class Register
              </h3>
              <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search register..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 text-xs font-bold uppercase tracking-widest outline-none focus:border-coha-900 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                 <thead className="bg-white text-[10px] font-black uppercase text-gray-400 tracking-widest">
                     <tr>
                         <th className="px-6 py-4">Student Name</th>
                         <th className="px-6 py-4">Enrollment Status</th>
                         <th className="px-6 py-4">Assigned Stage</th>
                         <th className="px-6 py-4">Guardian Contact</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {filteredEnrolled.map(student => (
                         <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-6 py-5 font-black text-gray-900 uppercase text-sm">{student.name}</td>
                             <td className="px-6 py-5">
                                 <span className="bg-green-600 text-white text-[9px] px-3 py-1 font-black uppercase tracking-widest shadow-sm">Enrolled</span>
                             </td>
                             <td className="px-6 py-5">
                                 <div className="flex items-center gap-2">
                                     <span className="font-bold text-xs text-gray-800 uppercase">{student.assignedClass || student.grade}</span>
                                     {student.stage && <span className="bg-coha-900 text-white px-2 py-0.5 text-[10px] font-black">S{student.stage}</span>}
                                 </div>
                             </td>
                             <td className="px-6 py-5 text-[11px] font-mono font-bold text-gray-600 tracking-tighter">
                                 {student.fatherPhone || student.motherPhone || 'N/A'}
                             </td>
                         </tr>
                     ))}
                     {filteredEnrolled.length === 0 && (
                         <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-black uppercase tracking-widest text-xs italic">No enrolled learners found in this cohort register.</td></tr>
                     )}
                 </tbody>
             </table>
          </div>
      </div>

    </div>
  );
};