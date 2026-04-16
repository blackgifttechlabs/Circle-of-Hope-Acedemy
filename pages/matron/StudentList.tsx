import React, { useEffect, useState } from 'react';
import { getStudents, getMedicationAdministrationsToday, getAllStudentMedications, getHomeworkSubmissionsForStudent, getSystemSettings, updateStudent, getAllHomeworkAssignments } from '../../services/dataService';
import { Student, SystemSettings, HomeworkAssignment, MedicationAdministration, HomeworkSubmission, StudentMedication } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Search, ChevronRight, CheckCircle2, Filter, Home, LayoutGrid, Edit2, Clock, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const MatronStudentList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [medicationStatus, setMedicationStatus] = useState<Record<string, boolean>>({});
  const [homeworkStatus, setHomeworkStatus] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'LIST' | 'DORM'>('LIST');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [filters, setFilters] = useState({
    class: 'ALL',
    dorm: 'ALL'
  });
  const [editHostelStudent, setEditHostelStudent] = useState<Student | null>(null);
  const [isUpdatingHostel, setIsUpdatingHostel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [allStudentsData, adminsToday, allMeds, sysSettings, allAssignments] = await Promise.all([
        getStudents(),
        getMedicationAdministrationsToday(),
        getAllStudentMedications(),
        getSystemSettings(),
        getAllHomeworkAssignments()
      ]);

      const studentsData = allStudentsData.filter((s: Student) => s.needsHostel && s.dorm);
      setSettings(sysSettings);

      sessionStorage.setItem('matron_student_context', JSON.stringify(studentsData.map((s: Student) => s.id)));

      const status: Record<string, boolean> = {};
      const adminsByStudent: Record<string, string[]> = {};
      adminsToday.forEach((a: MedicationAdministration) => {
        if (!adminsByStudent[a.student_id]) adminsByStudent[a.student_id] = [];
        adminsByStudent[a.student_id].push(a.student_medication_id);
      });

      const hwStatus: Record<string, boolean> = {};
      const today = new Date();
      today.setHours(0,0,0,0);

      const homeworkChecks = await Promise.all(studentsData.map(async (student: Student) => {
        const studentClass = student.assignedClass || student.grade || student.level;
        const classAssignments = allAssignments.filter((a: HomeworkAssignment) => a.className === studentClass);

        if (classAssignments.length === 0) return { id: student.id, hasHomework: false };

        const submissions = await getHomeworkSubmissionsForStudent(student.id);

        // If there's an assignment that doesn't have a submission yet
        const hasPending = classAssignments.some((assign: HomeworkAssignment) =>
           !submissions.some((sub: HomeworkSubmission) => sub.assignmentId === assign.id)
        );

        return { id: student.id, hasHomework: hasPending };
      }));

      homeworkChecks.forEach((check: any) => {
        hwStatus[check.id] = check.hasHomework;
      });

      for (const student of studentsData) {
        const studentMeds = allMeds.filter((m: StudentMedication) => m.student_id === student.id);
        const adminIds = adminsByStudent[student.id] || [];
        status[student.id] = studentMeds.length > 0 && studentMeds.every((m: StudentMedication) => adminIds.includes(m.id));
      }

      setStudents(studentsData);
      setMedicationStatus(status);
      setHomeworkStatus(hwStatus);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleUpdateHostel = async (hostel: string) => {
    if (!editHostelStudent) return;
    setIsUpdatingHostel(true);
    const success = await updateStudent(editHostelStudent.id, { dorm: hostel });
    if (success) {
      setStudents(prev => prev.map(s => s.id === editHostelStudent.id ? { ...s, dorm: hostel } : s));
      setEditHostelStudent(null);
    }
    setIsUpdatingHostel(false);
  };

  const filteredStudents = students.filter((s: Student) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.assignedClass || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filters.class === 'ALL' || s.assignedClass === filters.class;
    const matchesDorm = filters.dorm === 'ALL' || s.dorm === filters.dorm;
    return matchesSearch && matchesClass && matchesDorm;
  });

  useEffect(() => {
    sessionStorage.setItem('matron_student_context', JSON.stringify(filteredStudents.map(s => s.id)));
  }, [filteredStudents]);

  const dorms = Array.from(new Set(students.map(s => s.dorm).filter(Boolean))) as string[];
  const classes = Array.from(new Set(students.map(s => s.assignedClass).filter(Boolean))) as string[];

  if (loading) return <Loader />;

  return (
    <div className="px-[10px] py-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Students</h1>
          <p className="text-sm font-bold text-slate-500">Manage daily care and medication logs</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('LIST')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-coha-900' : 'text-slate-500'}`}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            onClick={() => setViewMode('DORM')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'DORM' ? 'bg-white shadow-sm text-coha-900' : 'text-slate-500'}`}
          >
            <Home size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 shadow-sm focus:outline-none focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 transition-all font-bold"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filters.class}
              onChange={e => setFilters(prev => ({ ...prev, class: e.target.value }))}
              className="pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-black uppercase tracking-widest outline-none focus:border-coha-500"
            >
              <option value="ALL">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filters.dorm}
              onChange={e => setFilters(prev => ({ ...prev, dorm: e.target.value }))}
              className="pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-black uppercase tracking-widest outline-none focus:border-coha-500"
            >
              <option value="ALL">All Dorms</option>
              {dorms.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => (
            <div key={student.id} className="relative">
              <Link
                to={`/matron/students/${student.id}`}
                className="block bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-coha-500 transition-all group relative overflow-hidden"
              >
                {student.profileImageBase64 ? (
                  <img src={student.profileImageBase64} alt={student.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 text-xl font-black">
                    {student.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 truncate">{student.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 bg-slate-50 px-2 py-0.5 rounded">RM: {student.assignedClass || 'N/A'}</span>
                    {student.dorm && <span className="text-[10px] font-black uppercase tracking-tighter text-coha-600 bg-coha-50 px-2 py-0.5 rounded">{student.dorm}</span>}
                  </div>
                  {homeworkStatus[student.id] && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest animate-pulse border border-orange-100">
                      Student has Homework
                    </div>
                  )}
                </div>
                {medicationStatus[student.id] && (
                  <div className="text-green-500 bg-green-50 p-2 rounded-xl" title="All medications given today">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                <ChevronRight className="text-slate-200 group-hover:text-coha-500 transition-colors" />
              </Link>
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditHostelStudent(student); }}
                  className="p-1.5 bg-white shadow-lg rounded-lg text-slate-400 hover:text-coha-900 transition-colors border border-slate-100"
                >
                  <Edit2 size={14} />
                </button>
                 <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/matron/students/${student.id}?tab=records`); }}
                  className="p-1.5 bg-white shadow-lg rounded-lg text-slate-400 hover:text-coha-900 transition-colors border border-slate-100"
                >
                  <Clock size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {(filters.dorm === 'ALL' ? dorms : [filters.dorm]).map(dorm => {
            const dormStudents = filteredStudents.filter(s => s.dorm === dorm);
            if (dormStudents.length === 0) return null;
            return (
              <div key={dorm}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-coha-900 text-white rounded-lg flex items-center justify-center">
                    <Home size={16} />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-widest text-slate-800">{dorm}</h2>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dormStudents.length} Students</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dormStudents.map(student => (
                    <div key={student.id} className="relative group">
                      <Link
                        to={`/matron/students/${student.id}`}
                        className="block bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-coha-500 transition-all"
                      >
                        {student.profileImageBase64 ? (
                          <img src={student.profileImageBase64} alt={student.name} className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 font-black">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-900 text-sm truncate">{student.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{student.assignedClass || 'No Class'}</p>
                          {homeworkStatus[student.id] && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[8px] font-black uppercase tracking-widest animate-pulse border border-orange-100">
                              Homework
                            </div>
                          )}
                        </div>
                        {medicationStatus[student.id] && <CheckCircle2 size={18} className="text-green-500" />}
                        <ChevronRight size={18} className="text-slate-200 group-hover:text-coha-500" />
                      </Link>
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditHostelStudent(student); }}
                          className="p-1.5 bg-white shadow-lg rounded-lg text-slate-400 hover:text-coha-900 transition-colors border border-slate-100"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/matron/students/${student.id}?tab=records`); }}
                          className="p-1.5 bg-white shadow-lg rounded-lg text-slate-400 hover:text-coha-900 transition-colors border border-slate-100"
                        >
                          <Clock size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredStudents.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-slate-200" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No students found in hostels</p>
        </div>
      )}

      {editHostelStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
              <div className="p-6 bg-coha-900 text-white flex justify-between items-center">
                 <div>
                    <h3 className="font-black uppercase tracking-widest text-sm">Assign Hostel</h3>
                    <p className="text-[10px] text-white/60 font-bold uppercase mt-1 tracking-tight">{editHostelStudent.name}</p>
                 </div>
                 <button onClick={() => setEditHostelStudent(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6">
                 <div className="grid grid-cols-2 gap-3">
                    {(settings?.hostels || []).map(hostel => (
                       <button
                          key={hostel}
                          disabled={isUpdatingHostel}
                          onClick={() => handleUpdateHostel(hostel)}
                          className={`p-4 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${editHostelStudent.dorm === hostel ? 'bg-coha-900 text-white border-coha-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-coha-300'}`}
                       >
                          {hostel}
                       </button>
                    ))}
                 </div>
                 {(!settings?.hostels || settings.hostels.length === 0) && (
                    <p className="text-center text-xs text-slate-400 py-8 italic font-bold">No hostels configured in Settings.</p>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
