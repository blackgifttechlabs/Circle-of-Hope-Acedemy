import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  createStudentByAdmin,
  calculateFinalStage,
  getStudents,
  getStudentsByStatus,
  getSystemSettings,
  getTeachers,
  transferStudentToTeacherAndClass,
} from '../../services/dataService';
import { Student, SystemSettings, Division, Teacher } from '../../types';
import { Search, Eye, Download, Filter, Key, Repeat, UserPlus } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { printStudentList } from '../../utils/printStudentList';
import { getTeacherAssignedClasses } from '../../utils/teacherClassSelection';

export const StudentsPage: React.FC<{ user?: any }> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'ENROLLED' | 'ASSESSMENT'>('ENROLLED');
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({show: false, msg: ''});
  
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'MAINSTREAM' | 'SPECIAL_NEEDS'>('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [dormFilter, setDormFilter] = useState('ALL');
  const [hostelOnlyFilter, setHostelOnlyFilter] = useState(false);
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);
  const [transferClass, setTransferClass] = useState('');
  const [transferTeacherId, setTransferTeacherId] = useState('');
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    firstName: '',
    surname: '',
    dob: '',
    targetClass: '',
    needsHostel: false,
    dorm: '',
  });

  const fetchStudents = async () => {
    setLoading(true);
    let data: Student[] = [];
    if (viewMode === 'ENROLLED') {
         const all = await getStudents();
         data = all.filter(s => s.studentStatus === 'ENROLLED' || !s.studentStatus);
    } else {
         data = await getStudentsByStatus('ASSESSMENT');
    }
    const [settingsData, teachersData] = await Promise.all([
      getSystemSettings(),
      getTeachers(),
    ]);
    setStudents(data);
    setSettings(settingsData);
    setTeachers(teachersData);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [viewMode]);

  useEffect(() => {
    const handleFocus = () => {
      fetchStudents();
    };

    const applyPinUpdate = (studentId: string, parentPin: string) => {
      setStudents((prev) => {
        const hasMatch = prev.some((student) => student.id === studentId);
        if (!hasMatch) return prev;
        return prev.map((student) => (
          student.id === studentId ? { ...student, parentPin } : student
        ));
      });
    };

    const applyProfileImageUpdate = (studentId: string, profileImageBase64: string) => {
      setStudents((prev) => {
        const hasMatch = prev.some((student) => student.id === studentId);
        if (!hasMatch) return prev;
        return prev.map((student) => (
          student.id === studentId ? { ...student, profileImageBase64 } : student
        ));
      });
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (event.key === 'coha_parent_pin_update' && payload?.studentId && payload?.parentPin) {
          applyPinUpdate(payload.studentId, payload.parentPin);
        }
        if (event.key === 'coha_student_profile_image_update' && payload?.studentId && payload?.profileImageBase64) {
          applyProfileImageUpdate(payload.studentId, payload.profileImageBase64);
        }
      } catch (error) {
        console.error('Failed to parse student update event:', error);
      }
    };

    const handleCustomPinUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId: string; parentPin: string }>;
      if (customEvent.detail?.studentId && customEvent.detail?.parentPin) {
        applyPinUpdate(customEvent.detail.studentId, customEvent.detail.parentPin);
      }
    };

    const handleCustomProfileImageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId: string; profileImageBase64: string }>;
      if (customEvent.detail?.studentId && customEvent.detail?.profileImageBase64) {
        applyProfileImageUpdate(customEvent.detail.studentId, customEvent.detail.profileImageBase64);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('coha-parent-pin-update', handleCustomPinUpdate as EventListener);
    window.addEventListener('coha-student-profile-image-update', handleCustomProfileImageUpdate as EventListener);
    const interval = setInterval(fetchStudents, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('coha-parent-pin-update', handleCustomPinUpdate as EventListener);
      window.removeEventListener('coha-student-profile-image-update', handleCustomProfileImageUpdate as EventListener);
      clearInterval(interval);
    };
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
    
    const matchesHostelOnly = !hostelOnlyFilter || (student.needsHostel && student.dorm);

    let matchesDivision = true;
    if (divisionFilter === 'MAINSTREAM') matchesDivision = student.division !== Division.SPECIAL_NEEDS;
    if (divisionFilter === 'SPECIAL_NEEDS') matchesDivision = student.division === Division.SPECIAL_NEEDS;

    let matchesGrade = true;
    if (divisionFilter === 'MAINSTREAM' && gradeFilter !== 'ALL') {
      matchesGrade = student.grade === gradeFilter;
    }

    let matchesLevel = true;
    let matchesStage = true;
    if (divisionFilter === 'SPECIAL_NEEDS') {
      if (levelFilter !== 'ALL') matchesLevel = student.level === levelFilter;
      if (stageFilter !== 'ALL') matchesStage = student.stage?.toString() === stageFilter;
    }

    let matchesDorm = true;
    if (dormFilter !== 'ALL') matchesDorm = student.dorm === dormFilter;

    return matchesSearch && matchesDivision && matchesGrade && matchesLevel && matchesStage && matchesDorm && matchesHostelOnly;
  });

  const classOptions = settings ? [...settings.grades, ...settings.specialNeedsLevels] : [];
  const teacherOptions = teachers.filter((teacher) => (
    transferClass ? getTeacherAssignedClasses(teacher).includes(transferClass) : true
  ));

  const openTransferModal = (student: Student) => {
    setTransferStudent(student);
    setTransferClass(student.assignedClass || student.grade || student.level || '');
    setTransferTeacherId(student.assignedTeacherId || '');
  };

  const handleTransfer = async () => {
    if (!transferStudent || !transferClass || !transferTeacherId) return;
    setLoading(true);
    const success = await transferStudentToTeacherAndClass(
      transferStudent.id,
      transferClass,
      transferTeacherId,
      user?.name || 'Admin',
      user?.id || 'admin'
    );
    setLoading(false);

    if (success) {
      setToast({ show: true, msg: `${transferStudent.name} was moved to ${transferClass}.` });
      setTransferStudent(null);
      setTransferClass('');
      setTransferTeacherId('');
      fetchStudents();
    } else {
      setToast({ show: true, msg: 'Could not transfer student.' });
    }
  };

  const handleCreateStudent = async () => {
    if (!newStudentForm.firstName.trim() || !newStudentForm.surname.trim() || !newStudentForm.dob || !newStudentForm.targetClass) {
      setToast({ show: true, msg: 'Enter the student name, surname, date of birth, and class.' });
      return;
    }

    setLoading(true);
    const result = await createStudentByAdmin({
      ...newStudentForm,
      adminName: user?.name || 'Admin',
      adminId: user?.id || 'admin',
    });
    setLoading(false);

    if (!result.success) {
      setToast({ show: true, msg: result.message || 'Could not add student.' });
      return;
    }

    setToast({ show: true, msg: `${result.student?.name || 'Student'} was added.` });
    setAddStudentOpen(false);
    setNewStudentForm({ firstName: '', surname: '', dob: '', targetClass: '', needsHostel: false, dorm: '' });
    fetchStudents();
  };

  return (
    <div>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} variant="success" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-coha-900 uppercase tracking-tight">Student Directory</h2>
          <p className="text-gray-600 text-sm">Manage enrollment records and portal access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAddStudentOpen(true)}>
            <UserPlus size={20} /> Add Student
          </Button>
          {viewMode === 'ENROLLED' && (
               <Button variant="outline" onClick={() => printStudentList(filteredStudents, settings)}>
                  <Download size={20} /> Download List
              </Button>
          )}
        </div>
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
          <div className="flex items-center gap-2 flex-wrap">
              <Filter className="text-gray-400" size={20} />
              <select 
                className="p-2 border border-gray-300 outline-none bg-gray-50 text-sm font-medium"
                value={divisionFilter}
                onChange={(e) => {
                  setDivisionFilter(e.target.value as any);
                  setGradeFilter('ALL');
                  setLevelFilter('ALL');
                  setStageFilter('ALL');
                }}
              >
                  <option value="ALL">All Divisions</option>
                  <option value="MAINSTREAM">Mainstream</option>
                  <option value="SPECIAL_NEEDS">Special Needs</option>
              </select>

              {divisionFilter === 'MAINSTREAM' && (
                <select 
                  className="p-2 border border-gray-300 outline-none bg-gray-50 text-sm font-medium"
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                >
                  <option value="ALL">All Grades</option>
                  {settings?.grades?.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}

              <select
                className="p-2 border border-gray-300 outline-none bg-gray-50 text-sm font-medium"
                value={dormFilter}
                onChange={(e) => setDormFilter(e.target.value)}
              >
                <option value="ALL">All Hostels</option>
                {(settings?.hostels || []).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
                {Array.from(new Set(students.map(s => s.dorm).filter(d => d && !(settings?.hostels || []).includes(d)))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <button
                onClick={() => setHostelOnlyFilter(!hostelOnlyFilter)}
                className={`p-2 text-sm font-black uppercase tracking-widest border transition-all ${hostelOnlyFilter ? 'bg-orange-600 text-white border-orange-700' : 'bg-gray-50 text-gray-500 border-gray-300'}`}
              >
                Hostel Only
              </button>

              {divisionFilter === 'SPECIAL_NEEDS' && (
                <>
                  <select 
                    className="p-2 border border-gray-300 outline-none bg-gray-50 text-sm font-medium"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option value="ALL">All Levels</option>
                    {settings?.specialNeedsLevels?.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <select 
                    className="p-2 border border-gray-300 outline-none bg-gray-50 text-sm font-medium"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                  >
                    <option value="ALL">All Stages</option>
                    {[1, 2, 3].map(s => (
                      <option key={s} value={s.toString()}>Stage {s}</option>
                    ))}
                  </select>
                </>
              )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Student</th>
                {user?.adminRole !== 'sub_admin' && <th className="px-6 py-4">Login PIN</th>}
                <th className="px-6 py-4">Division</th>
                <th className="px-6 py-4">Current Grade</th>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{student.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {student.profileImageBase64 ? (
                        <img src={student.profileImageBase64} alt={student.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coha-700 to-coha-500 text-white flex items-center justify-center text-sm font-black">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold text-coha-900">{student.name}</span>
                    </div>
                  </td>
                  {user?.adminRole !== 'sub_admin' && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Key size={12} className="text-gray-400" />
                        <span className="font-mono font-black text-coha-700 bg-gray-100 px-2 py-0.5">{student.parentPin}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-none border ${student.division === Division.SPECIAL_NEEDS ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-50 text-gray-800 border-gray-200'}`}>
                         {student.division || 'Mainstream'}
                     </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-sm">
                      {student.assignedClass || student.grade || student.level}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.assignedTeacherName || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                        {viewMode === 'ASSESSMENT' && user?.adminRole !== 'sub_admin' ? (
                            <>
                                <button onClick={() => navigate(`/admin/assessment/${student.id}`)} className="p-2 border border-gray-200 hover:bg-coha-900 hover:text-white transition-all">
                                    <Eye size={14} />
                                </button>
                                <Button onClick={() => handleFinalizeAssessment(student.id)} className="py-1 px-3 text-[10px] font-black uppercase">
                                    Finalize
                                </Button>
                            </>
                        ) : (
                            <>
                              <button
                                onClick={() => navigate(`/admin/students/${student.id}`)}
                                className="text-coha-500 hover:underline font-bold text-sm flex items-center gap-1"
                              >
                                <Eye size={16} /> Profile
                              </button>
                              <button
                                onClick={() => openTransferModal(student)}
                                className="text-orange-600 hover:underline font-bold text-sm flex items-center gap-1"
                              >
                                <Repeat size={16} /> Transfer
                              </button>
                            </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
               {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={user?.adminRole === 'sub_admin' ? 6 : 7} className="px-6 py-8 text-center text-gray-500 italic">No student records found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {transferStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl shadow-xl">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-coha-900">Transfer Student</h3>
              <p className="text-sm text-gray-500 mt-1">{transferStudent.name} can be moved to a new class and teacher here.</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Target Class</label>
                <select
                  value={transferClass}
                  onChange={(e) => {
                    setTransferClass(e.target.value);
                    setTransferTeacherId('');
                  }}
                  className="w-full p-3 border border-gray-300 bg-white outline-none"
                >
                  <option value="">Select class</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Dorm</label>
                <input
                  value={(newStudentForm as any).dorm || ''}
                  onChange={(e) => setNewStudentForm((prev) => ({ ...prev, dorm: e.target.value }))}
                  className="w-full p-3 border border-gray-300 bg-white outline-none"
                  placeholder="e.g. Blue House"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assign Teacher</label>
                <select
                  value={transferTeacherId}
                  onChange={(e) => setTransferTeacherId(e.target.value)}
                  className="w-full p-3 border border-gray-300 bg-white outline-none"
                >
                  <option value="">Select teacher</option>
                  {teacherOptions.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} · {getTeacherAssignedClasses(teacher).join(', ')}
                    </option>
                  ))}
                </select>
                {transferClass && teacherOptions.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">No teacher is currently assigned to {transferClass}.</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTransferStudent(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleTransfer}
                disabled={loading || !transferClass || !transferTeacherId}
                className="!bg-orange-500 hover:!bg-orange-600"
              >
                {loading ? 'Saving...' : 'Transfer Student'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addStudentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl shadow-xl">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-coha-900">Add Student</h3>
              <p className="text-sm text-gray-500 mt-1">Create a student record directly in the admin portal.</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    value={newStudentForm.firstName}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none"
                    placeholder="Student name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Surname</label>
                  <input
                    value={newStudentForm.surname}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, surname: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none"
                    placeholder="Student surname"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={newStudentForm.dob}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, dob: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Class</label>
                  <select
                    value={newStudentForm.targetClass}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, targetClass: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none"
                  >
                    <option value="">Select class</option>
                    {classOptions.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStudentForm.needsHostel}
                    onChange={(e) => setNewStudentForm(prev => ({ ...prev, needsHostel: e.target.checked }))}
                    className="w-5 h-5 accent-coha-900"
                  />
                  <span className="text-sm font-black uppercase tracking-widest text-coha-900">Requires Hostel Accommodation</span>
                </label>
              </div>

              {newStudentForm.needsHostel && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Select Hostel</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(settings?.hostels || []).map(hostel => (
                      <button
                        key={hostel}
                        type="button"
                        onClick={() => setNewStudentForm(prev => ({ ...prev, dorm: hostel }))}
                        className={`p-3 text-xs font-black uppercase tracking-widest border transition-all ${newStudentForm.dorm === hostel ? 'bg-coha-900 text-white border-coha-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-coha-300'}`}
                      >
                        {hostel}
                      </button>
                    ))}
                    {(!settings?.hostels || settings.hostels.length === 0) && (
                      <p className="col-span-full text-xs text-gray-500 italic">No hostels configured in Settings.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddStudentOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateStudent}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Add Student'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
