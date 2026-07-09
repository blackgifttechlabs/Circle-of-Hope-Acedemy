import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  createStudentByAdmin,
  calculateFinalStage,
  getStudentsByStatus,
  getSystemSettings,
  getTeachers,
  transferStudentToTeacherAndClass,
} from '../../services/dataService';
import { Student, SystemSettings, Division, Teacher } from '../../types';
import { Search, Eye, Download, Filter, Key, Repeat, UserPlus, Users, Home, UserCheck, Hash, GraduationCap, BadgeCheck, MousePointerClick, Mail } from 'lucide-react';
import { Toast } from '../../components/ui/Toast';
import { printStudentList } from '../../utils/printStudentList';
import { getTeacherAssignedClasses } from '../../utils/teacherClassSelection';
import { getStudentParentEmail } from '../../utils/admissionMessaging';
import { openGmailDraft } from '../../utils/emailDrafts';
import {
  STUDENT_FIRST_NAME_SUGGESTIONS,
  STUDENT_GENDER_SUGGESTIONS,
  STUDENT_SURNAME_SUGGESTIONS,
} from '../../utils/studentSuggestions';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

const STUDENT_REFRESH_COOLDOWN_MS = 60_000;
const AVATAR_COLORS = ['bg-purple-700', 'bg-emerald-600', 'bg-sky-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-teal-600'];
type StudentViewMode = 'ENROLLED' | 'ASSESSMENT' | 'WAITING_PAYMENT';

export const StudentsPage: React.FC<{ user?: any }> = ({ user }) => {
  const isSubAdmin = !!user && (user.adminRole === 'sub_admin' || user.id !== 'admin');
  const [viewMode, setViewMode] = useState<StudentViewMode>('ENROLLED');
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
    gender: '',
    dob: '',
    targetClass: '',
    needsHostel: false,
    dorm: '',
  });
  const lastStudentsFetchRef = useRef(0);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      let data: Student[] = [];
      data = await getStudentsByStatus(viewMode);
      setStudents(data);
      lastStudentsFetchRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  const fetchDirectorySetup = useCallback(async () => {
    const [settingsData, teachersData] = await Promise.all([
      getSystemSettings(),
      getTeachers(),
    ]);
    setSettings(settingsData);
    setTeachers(teachersData);
  }, []);

  const refreshStudentsIfStale = useCallback(() => {
    if (Date.now() - lastStudentsFetchRef.current >= STUDENT_REFRESH_COOLDOWN_MS) {
      fetchStudents();
    }
  }, [fetchStudents]);

  useEffect(() => {
    fetchDirectorySetup();
  }, [fetchDirectorySetup]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const applyAssistantDraft = (draft: Partial<typeof newStudentForm> = {}, animate = true) => {
      setAddStudentOpen(true);
      const nextDraft = {
        firstName: draft.firstName || '',
        surname: draft.surname || '',
        gender: draft.gender || '',
        dob: draft.dob || '',
        targetClass: draft.targetClass || '',
        needsHostel: !!draft.needsHostel,
        dorm: draft.dorm || '',
      };

      if (!animate) {
        setNewStudentForm(nextDraft);
        return;
      }

      const fields = Object.keys(nextDraft) as Array<keyof typeof nextDraft>;
      let fieldIndex = 0;
      let charIndex = 0;
      let current = {
        firstName: '',
        surname: '',
        gender: '',
        dob: '',
        targetClass: '',
        needsHostel: nextDraft.needsHostel,
        dorm: '',
      };

      setNewStudentForm(current);

      const tick = () => {
        if (fieldIndex >= fields.length) return;
        const field = fields[fieldIndex];
        const value = nextDraft[field];
        if (typeof value === 'boolean') {
          current = { ...current, [field]: value };
          setNewStudentForm(current);
          fieldIndex += 1;
          charIndex = 0;
          window.setTimeout(tick, 80);
          return;
        }

        const text = String(value || '');
        current = { ...current, [field]: text.slice(0, charIndex + 1) };
        setNewStudentForm(current);
        charIndex += 1;

        if (charIndex >= text.length) {
          fieldIndex += 1;
          charIndex = 0;
          window.setTimeout(tick, 120);
        } else {
          window.setTimeout(tick, 28);
        }
      };

      tick();
    };

    const handleOpenStudentModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ draft?: Partial<typeof newStudentForm>; animate?: boolean }>;
      applyAssistantDraft(customEvent.detail?.draft || {}, customEvent.detail?.animate !== false);
    };

    const handleStudentCreated = () => {
      setAddStudentOpen(false);
      fetchStudents();
    };

    const pending = sessionStorage.getItem('coha_pending_add_student_draft');
    if (pending) {
      sessionStorage.removeItem('coha_pending_add_student_draft');
      try {
        applyAssistantDraft(JSON.parse(pending), true);
      } catch {
        applyAssistantDraft({}, false);
      }
    }

    window.addEventListener('coha-open-add-student', handleOpenStudentModal as EventListener);
    window.addEventListener('coha-student-created', handleStudentCreated as EventListener);
    return () => {
      window.removeEventListener('coha-open-add-student', handleOpenStudentModal as EventListener);
      window.removeEventListener('coha-student-created', handleStudentCreated as EventListener);
    };
  }, [fetchStudents]);

  useEffect(() => {
    const handleFocus = () => {
      refreshStudentsIfStale();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshStudentsIfStale();
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
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('coha-parent-pin-update', handleCustomPinUpdate as EventListener);
    window.addEventListener('coha-student-profile-image-update', handleCustomProfileImageUpdate as EventListener);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('coha-parent-pin-update', handleCustomPinUpdate as EventListener);
      window.removeEventListener('coha-student-profile-image-update', handleCustomProfileImageUpdate as EventListener);
    };
  }, [refreshStudentsIfStale]);

  const filteredStudents = useMemo(() => students.filter(student => {
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
  }), [students, searchTerm, hostelOnlyFilter, divisionFilter, gradeFilter, levelFilter, stageFilter, dormFilter]);

  const classOptions = useMemo(() => settings ? [...(settings.grades || []), ...(settings.specialNeedsLevels || [])] : [], [settings]);
  const teacherOptions = useMemo(() => teachers.filter((teacher) => (
    transferClass ? getTeacherAssignedClasses(teacher).includes(transferClass) : true
  )), [teachers, transferClass]);
  const extraDormOptions = useMemo(() => (
    Array.from(new Set(students.map(s => s.dorm).filter((d): d is string => !!d && !(settings?.hostels || []).includes(d))))
  ), [students, settings]);
  const activeRosterCount = students.length;
  const hostelCount = useMemo(() => students.filter(student => student.needsHostel && student.dorm).length, [students]);
  const unassignedCount = useMemo(() => students.filter(student => !student.assignedTeacherName).length, [students]);

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

  const openTransferModal = (student: Student) => {
    setTransferStudent(student);
    setTransferClass(student.assignedClass || student.grade || student.level || '');
    setTransferTeacherId(student.assignedTeacherId || '');
  };

  const buildRegistrationPaymentDraft = (student: Student) => {
    const studentName = student.name || 'the student';
    const portalUrl = `${window.location.origin}/login`;
    const subject = 'Registration Payment Proof Required';
    const body = `Dear Parent/Guardian,

Your child, ${studentName}, has been added to the Circle of Hope Academy parent portal.

Please log in again and upload proof of registration payment so that we can verify the payment and complete the enrolment process.

Login instructions:

1. Go to the Circle of Hope Academy portal: ${portalUrl}
2. Select Parent login.
3. Search for ${studentName}.
4. Select the student profile.
5. Enter PIN: ${student.parentPin || 'provided by the school'}.
6. Open the payment section and upload the proof of registration payment.

Once submitted, our administration team will review the proof and proceed with the next enrolment step.

Kind regards,
Circle of Hope Academy`;

    return { subject, body };
  };

  const openRegistrationPaymentDraft = async (student: Student) => {
    const draft = buildRegistrationPaymentDraft(student);
    const parentEmail = getStudentParentEmail(student);

    if (parentEmail) {
      openGmailDraft({ to: parentEmail, ...draft });
      setToast({ show: true, msg: `Email draft opened for ${student.name}.` });
      return;
    }

    await navigator.clipboard?.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setToast({ show: true, msg: `Draft copied. No parent email is saved for ${student.name}.` });
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
    setNewStudentForm({ firstName: '', surname: '', gender: '', dob: '', targetClass: '', needsHostel: false, dorm: '' });
    fetchStudents();
  };

  return (
    <div className="space-y-6">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} variant="success" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-coha-900 uppercase tracking-tight">Student Directory</h2>
          <p className="text-gray-600 text-sm">Manage enrollment records and portal access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isSubAdmin && (
            <Button onClick={() => setAddStudentOpen(true)} className="!rounded-[8px] shadow-sm">
              <UserPlus size={20} /> Add Student
            </Button>
          )}
          {viewMode === 'ENROLLED' && (
               <Button variant="outline" onClick={() => printStudentList(filteredStudents, settings)} className="!rounded-[8px] bg-white shadow-sm">
                  <Download size={20} /> Download List
              </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Loaded Records</p>
            <Users size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950">{activeRosterCount}</p>
        </div>
        <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Hostel Students</p>
            <Home size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950">{hostelCount}</p>
        </div>
        <div className="rounded-[10px] border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">No Teacher</p>
            <UserCheck size={18} className="text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-950">{unassignedCount}</p>
        </div>
      </div>

      <div className="flex justify-between items-center border border-slate-200 bg-white shadow-sm flex-wrap rounded-[10px] p-1">
         <div className="flex flex-wrap gap-1">
            <button onClick={() => setViewMode('ENROLLED')} className={`px-5 py-2.5 font-black text-xs uppercase tracking-widest rounded-[8px] transition-all ${viewMode === 'ENROLLED' ? 'bg-coha-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Registered</button>
            <button onClick={() => setViewMode('ASSESSMENT')} className={`px-5 py-2.5 font-black text-xs uppercase tracking-widest rounded-[8px] transition-all ${viewMode === 'ASSESSMENT' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Under Assessment</button>
            <button onClick={() => setViewMode('WAITING_PAYMENT')} className={`px-5 py-2.5 font-black text-xs uppercase tracking-widest rounded-[8px] transition-all ${viewMode === 'WAITING_PAYMENT' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>Pending Payment</button>
         </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-[10px] overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-amber-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 outline-none rounded-[8px] bg-white text-sm font-semibold shadow-sm"
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
              <Filter className="text-slate-500" size={20} />
              <select 
                className="p-2.5 border border-slate-200 outline-none bg-white text-sm font-bold rounded-[8px] shadow-sm focus:border-coha-500"
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
                  className="p-2.5 border border-slate-200 outline-none bg-white text-sm font-bold rounded-[8px] shadow-sm focus:border-coha-500"
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
                className="p-2.5 border border-slate-200 outline-none bg-white text-sm font-bold rounded-[8px] shadow-sm focus:border-coha-500"
                value={dormFilter}
                onChange={(e) => setDormFilter(e.target.value)}
              >
                <option value="ALL">All Hostels</option>
                {(settings?.hostels || []).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
                {extraDormOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <button
                onClick={() => setHostelOnlyFilter(!hostelOnlyFilter)}
                className={`p-2.5 text-xs font-black uppercase tracking-widest border transition-all rounded-[8px] shadow-sm ${hostelOnlyFilter ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-700'}`}
              >
                Hostel Only
              </button>

              {divisionFilter === 'SPECIAL_NEEDS' && (
                <>
                  <select 
                    className="p-2.5 border border-slate-200 outline-none bg-white text-sm font-bold rounded-[8px] shadow-sm focus:border-coha-500"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option value="ALL">All Levels</option>
                    {settings?.specialNeedsLevels?.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <select 
                    className="p-2.5 border border-slate-200 outline-none bg-white text-sm font-bold rounded-[8px] shadow-sm focus:border-coha-500"
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
          <table className="w-full min-w-[920px] text-left border-separate border-spacing-0 [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
            <thead>
              <tr>
                <TableHeaderCell icon={Hash}>ID</TableHeaderCell>
                <TableHeaderCell icon={Users}>Student</TableHeaderCell>
                {!isSubAdmin && <TableHeaderCell icon={Key}>Login PIN</TableHeaderCell>}
                <TableHeaderCell icon={BadgeCheck}>Division</TableHeaderCell>
                <TableHeaderCell icon={GraduationCap}>Current Grade</TableHeaderCell>
                <TableHeaderCell icon={UserCheck}>Teacher</TableHeaderCell>
                {!isSubAdmin && <TableHeaderCell icon={MousePointerClick}>Actions</TableHeaderCell>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows rows={12} columns={isSubAdmin ? 5 : 7} />
              ) : filteredStudents.map((student, index) => (
                <tr
                  key={student.id}
                  className={`group border-b border-slate-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-sky-50/80`}
                >
                  <td className="px-6 py-3 font-mono text-xs font-black text-slate-500 border-b border-slate-100">{student.id}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {student.profileImageBase64 ? (
                        <img src={student.profileImageBase64} alt={student.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]} text-white flex items-center justify-center text-sm font-black shadow-sm`}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-black text-coha-900 leading-tight">{student.name}</p>
                        {student.dorm && (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-700">{student.dorm}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {!isSubAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Key size={12} className="text-amber-500" />
                        <span className="font-mono font-black text-slate-700">{student.parentPin}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-3">
                     <span className="text-xs font-bold text-slate-700">{student.division || 'Mainstream'}</span>
                  </td>
                  <td className="px-6 py-3 font-medium text-sm">
                      <span className="text-xs font-bold text-slate-700">{student.assignedClass || student.grade || student.level || 'Unassigned'}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {student.assignedTeacherName ? (
                      <span className="text-xs font-bold text-slate-700">{student.assignedTeacherName}</span>
                    ) : (
                      <span className="text-xs font-bold text-red-600">Unassigned</span>
                    )}
                  </td>
                  {!isSubAdmin && (
                    <td className="px-6 py-3">
                      <div className="flex gap-2 flex-wrap">
                          {viewMode === 'ASSESSMENT' ? (
                              <>
                                  <button onClick={() => navigate(`/admin/assessment/${student.id}`)} className="p-2 border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white rounded-[8px] transition-all">
                                      <Eye size={14} />
                                  </button>
                                  <Button onClick={() => handleFinalizeAssessment(student.id)} className="py-1 px-3 text-[10px] font-black uppercase !rounded-[8px]">
                                      Finalize
                                  </Button>
                              </>
                          ) : viewMode === 'WAITING_PAYMENT' ? (
                              <>
                                <button
                                  onClick={() => navigate('/admin/payments')}
                                  className="text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-500 hover:text-white font-black text-xs uppercase tracking-widest flex items-center gap-1 rounded-[8px] px-3 py-2 transition-all"
                                >
                                  <Eye size={16} /> Payments
                                </button>
                                <button
                                  onClick={() => openRegistrationPaymentDraft(student)}
                                  className="text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white font-black text-xs uppercase tracking-widest flex items-center gap-1 rounded-[8px] px-3 py-2 transition-all"
                                >
                                  <Mail size={16} /> Resend Draft
                                </button>
                              </>
                          ) : (
                              <>
                                <button
                                  onClick={() => navigate(`/admin/students/${student.id}`)}
                                  className="text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-600 hover:text-white font-black text-xs uppercase tracking-widest flex items-center gap-1 rounded-[8px] px-3 py-2 transition-all"
                                >
                                  <Eye size={16} /> Profile
                                </button>
                                <button
                                  onClick={() => openTransferModal(student)}
                                  className="text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-500 hover:text-white font-black text-xs uppercase tracking-widest flex items-center gap-1 rounded-[8px] px-3 py-2 transition-all"
                                >
                                  <Repeat size={16} /> Transfer
                                </button>
                              </>
                          )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
               {!loading && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={isSubAdmin ? 5 : 7} className="px-6 py-12 text-center text-slate-500">
                    <div className="mx-auto max-w-sm rounded-[10px] border border-dashed border-slate-200 bg-slate-50 p-6">
                      <p className="font-black uppercase tracking-widest text-sm text-slate-600">No student records found</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Change the search or filters to widen the list.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {transferStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl shadow-xl rounded-[10px] overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50">
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
                  className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-amber-500"
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
                  className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-amber-500"
                  placeholder="e.g. Blue House"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assign Teacher</label>
                <select
                  value={transferTeacherId}
                  onChange={(e) => setTransferTeacherId(e.target.value)}
                  className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-amber-500"
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

            <div className="p-5 border-t border-gray-200 flex justify-end gap-2 bg-slate-50">
              <Button type="button" variant="outline" onClick={() => setTransferStudent(null)} className="!rounded-[8px] bg-white">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleTransfer}
                disabled={loading || !transferClass || !transferTeacherId}
                className="!bg-amber-500 hover:!bg-amber-600 !rounded-[8px]"
              >
                {loading ? 'Saving...' : 'Transfer Student'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addStudentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl shadow-xl rounded-[10px] overflow-hidden">
            <div className="p-5 border-b border-emerald-100 bg-emerald-50">
              <h3 className="text-lg font-bold text-coha-900">Add Student</h3>
              <p className="text-sm text-gray-500 mt-1">Create a student record directly in the admin portal.</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    list="coha-student-first-name-suggestions"
                    value={newStudentForm.firstName}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-emerald-500"
                    placeholder="Student name"
                  />
                  <datalist id="coha-student-first-name-suggestions">
                    {STUDENT_FIRST_NAME_SUGGESTIONS.map((name) => <option key={name} value={name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Surname</label>
                  <input
                    list="coha-student-surname-suggestions"
                    value={newStudentForm.surname}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, surname: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-emerald-500"
                    placeholder="Student surname"
                  />
                  <datalist id="coha-student-surname-suggestions">
                    {STUDENT_SURNAME_SUGGESTIONS.map((surname) => <option key={surname} value={surname} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                  <input
                    list="coha-student-gender-suggestions"
                    value={newStudentForm.gender}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, gender: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-emerald-500"
                    placeholder="Male or Female"
                  />
                  <datalist id="coha-student-gender-suggestions">
                    {STUDENT_GENDER_SUGGESTIONS.map((gender) => <option key={gender} value={gender} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={newStudentForm.dob}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, dob: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Class</label>
                  <select
                    value={newStudentForm.targetClass}
                    onChange={(e) => setNewStudentForm((prev) => ({ ...prev, targetClass: e.target.value }))}
                    className="w-full p-3 border border-gray-300 bg-white outline-none rounded-[8px] focus:border-emerald-500"
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
                        className={`p-3 text-xs font-black uppercase tracking-widest border transition-all rounded-[8px] ${newStudentForm.dorm === hostel ? 'bg-amber-500 text-white border-amber-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-700'}`}
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

            <div className="p-5 border-t border-gray-200 flex justify-end gap-2 bg-slate-50">
              <Button type="button" variant="outline" onClick={() => setAddStudentOpen(false)} className="!rounded-[8px] bg-white">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateStudent}
                disabled={loading}
                className="!rounded-[8px]"
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
