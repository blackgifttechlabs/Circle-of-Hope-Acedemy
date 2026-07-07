import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  BarChart2,
  FileText,
  Users,
  CheckSquare,
  GraduationCap,
  BookOpen,
  Sparkles,
  Shapes,
  PencilRuler,
  HeartHandshake,
  Eye,
  EyeOff,
  LockKeyhole,
  Repeat,
  X,
  CheckCircle2,
  BadgeCheck,
  Hash,
  MousePointerClick,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Toast } from '../../components/ui/Toast';
import {
  addTeacher,
  deleteTeacher,
  getStudents,
  getSystemSettings,
  getTeachers,
  syncTeacherAssignments,
  transferStudentToTeacherAndClass,
  updateTeacher,
  verifyAdminPin,
} from '../../services/dataService';
import { Student, SystemSettings, Teacher } from '../../types';
import { getTeacherAssignedClasses } from '../../utils/teacherClassSelection';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

const CLASS_BUTTON_THEMES = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', active: 'bg-blue-600 text-white border-blue-600', icon: GraduationCap },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-600', icon: BookOpen },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', active: 'bg-amber-500 text-white border-amber-500', icon: PencilRuler },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', active: 'bg-purple-600 text-white border-purple-600', icon: Sparkles },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', active: 'bg-rose-600 text-white border-rose-600', icon: Shapes },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', active: 'bg-cyan-600 text-white border-cyan-600', icon: HeartHandshake },
];

export const TeachersPage: React.FC<{ user?: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' | 'info' });

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [classSearchMap, setClassSearchMap] = useState<Record<string, string>>({});
  const [studentModalTeacher, setStudentModalTeacher] = useState<Teacher | null>(null);
  const [teacherStudentSearch, setTeacherStudentSearch] = useState('');
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);
  const [transferClass, setTransferClass] = useState('');
  const [transferTeacherId, setTransferTeacherId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [revealedTeacherIds, setRevealedTeacherIds] = useState<Set<string>>(new Set());
  const [passwordRevealTeacher, setPasswordRevealTeacher] = useState<Teacher | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);

  const fetchData = async () => {
    if (teachers.length === 0) setTableLoading(true);
    const [teachersData, settingsData, studentsData] = await Promise.all([
      getTeachers(),
      getSystemSettings(),
      getStudents(),
    ]);
    setTeachers(teachersData);
    setSettings(settingsData);
    setStudents(studentsData.filter((student) => (
      student.studentStatus === 'ENROLLED' || student.studentStatus === 'ASSESSMENT' || !student.studentStatus
    )));
    setTableLoading(false);
    return { teachersData, settingsData, studentsData };
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchData();
    };

    const applyTeacherPinUpdate = (teacherId: string, pin: string) => {
      setTeachers((prev) => prev.map((teacher) => (
        teacher.id === teacherId ? { ...teacher, pin } : teacher
      )));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'coha_teacher_pin_update' || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (payload?.teacherId && payload?.pin) {
          applyTeacherPinUpdate(payload.teacherId, payload.pin);
        }
      } catch (error) {
        console.error('Failed to parse teacher pin update:', error);
      }
    };

    const handleCustomPinUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ teacherId: string; pin: string }>;
      if (customEvent.detail?.teacherId && customEvent.detail?.pin) {
        applyTeacherPinUpdate(customEvent.detail.teacherId, customEvent.detail.pin);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('coha-teacher-pin-update', handleCustomPinUpdate as EventListener);
    const interval = setInterval(fetchData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('coha-teacher-pin-update', handleCustomPinUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!studentModalTeacher) return;
    const updatedTeacher = teachers.find((teacher) => teacher.id === studentModalTeacher.id);
    if (updatedTeacher) {
      setStudentModalTeacher(updatedTeacher);
    }
  }, [teachers, studentModalTeacher?.id]);

  const classOptions = useMemo(() => {
    if (!settings) return [];
    return [
      ...(settings.grades || []).map((grade) => ({ label: grade, value: grade })),
      ...(settings.specialNeedsLevels || []).map((level) => ({ label: `${level} (Special Needs)`, value: level })),
    ];
  }, [settings]);

  const studentClass = (student: Student) => student.assignedClass || student.grade || student.level || '';

  const handleEdit = (teacher: Teacher) => {
    const teacherClasses = getTeacherAssignedClasses(teacher);
    setName(teacher.name);
    setSubject(teacher.subject || '');
    setAssignedClasses(teacherClasses);
    setAssignedStudentIds(teacher.assignedStudentIds || []);
    setEditingId(teacher.id);
    setClassSearchMap(Object.fromEntries(teacherClasses.map((className) => [className, ''])));
    setFormStep(1);
    setShowForm(true);
  };

  const openTeacherForm = () => {
    if (showForm) {
      handleFormClose();
      return;
    }
    setFormStep(1);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setFormStep(1);
    setName('');
    setSubject('');
    setAssignedClasses([]);
    setAssignedStudentIds([]);
    setClassSearchMap({});
    setEditingId(null);
  };

  const openPasswordReveal = (teacher: Teacher) => {
    if (revealedTeacherIds.has(teacher.id)) {
      setRevealedTeacherIds((prev) => {
        const next = new Set(prev);
        next.delete(teacher.id);
        return next;
      });
      return;
    }

    setPasswordRevealTeacher(teacher);
    setAdminPassword('');
    setAdminPasswordError('');
  };

  const closePasswordReveal = () => {
    if (adminPasswordLoading) return;
    setPasswordRevealTeacher(null);
    setAdminPassword('');
    setAdminPasswordError('');
  };

  const confirmPasswordReveal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordRevealTeacher) return;

    setAdminPasswordLoading(true);
    setAdminPasswordError('');

    try {
      const adminUser = await verifyAdminPin(adminPassword);
      if (!adminUser) {
        setAdminPasswordError('Incorrect admin password.');
        return;
      }

      setRevealedTeacherIds((prev) => new Set(prev).add(passwordRevealTeacher.id));
      setPasswordRevealTeacher(null);
      setAdminPassword('');
      setAdminPasswordError('');
    } catch (error) {
      console.error('Could not verify admin password:', error);
      setAdminPasswordError('Could not confirm your password. Please try again.');
    } finally {
      setAdminPasswordLoading(false);
    }
  };

  const toggleClass = (className: string) => {
    setAssignedClasses((prev) => {
      const wasSelected = prev.includes(className);
      const nextClasses = wasSelected ? prev.filter((item) => item !== className) : [...prev, className];
      const classStudentIds = students
        .filter((student) => studentClass(student) === className)
        .map((student) => student.id);

      setClassSearchMap((current) => {
        const nextMap = { ...current };
        if (!wasSelected) {
          nextMap[className] = '';
        } else {
          delete nextMap[className];
        }
        return nextMap;
      });

      setAssignedStudentIds((current) => (
        wasSelected
          ? current.filter((id) => !classStudentIds.includes(id))
          : Array.from(new Set([...current, ...classStudentIds]))
      ));

      return nextClasses;
    });
  };

  const toggleStudent = (studentId: string) => {
    setAssignedStudentIds((prev) => (
      prev.includes(studentId)
        ? prev.filter((item) => item !== studentId)
        : [...prev, studentId]
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || assignedClasses.length === 0) return;

    setFormLoading(true);

    let teacherId = editingId;
    let success = false;

    if (editingId) {
      success = await updateTeacher(editingId, {
        name: name.trim(),
        subject: subject.trim(),
        assignedClasses,
        assignedClass: assignedClasses[0] || '',
        activeTeachingClass: assignedClasses[0] || '',
      });
    } else {
      teacherId = await addTeacher(name.trim(), subject.trim(), assignedClasses[0] || '', {
        assignedClasses,
        assignedStudentIds,
        activeTeachingClass: assignedClasses[0] || '',
      });
      success = !!teacherId;
    }

    if (success && teacherId) {
      success = await syncTeacherAssignments(teacherId, assignedClasses, assignedStudentIds);
    }

    if (success) {
      handleFormClose();
      await fetchData();
    }

    setFormLoading(false);
  };

  const confirmDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;
    setLoading(true);
    const success = await deleteTeacher(teacherToDelete.id);
    if (success) {
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
      await fetchData();
    }
    setLoading(false);
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const teacherClasses = getTeacherAssignedClasses(teacher);
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacher.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass ? teacherClasses.includes(filterClass) : true;
    return matchesSearch && matchesClass;
  });

  const getTeacherStudents = (teacher: Teacher) => {
    const assignedIds = new Set(teacher.assignedStudentIds || []);
    const teacherClasses = new Set(getTeacherAssignedClasses(teacher));

    return students
      .filter((student) => {
        if (student.assignedTeacherId === teacher.id) return true;
        if (assignedIds.has(student.id)) return true;
        if (!assignedIds.size && teacherClasses.size) {
          return teacherClasses.has(studentClass(student));
        }
        return false;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getStudentsForClass = (className: string) => {
    const searchValue = classSearchMap[className] || '';
    return students
      .filter((student) => studentClass(student) === className)
      .filter((student) => {
        if (!searchValue) return true;
        return `${student.name} ${student.id} ${student.assignedTeacherName || ''}`.toLowerCase().includes(searchValue.toLowerCase());
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const setClassSearch = (className: string, value: string) => {
    setClassSearchMap((prev) => ({ ...prev, [className]: value }));
  };

  const toggleAllStudentsForClass = (className: string) => {
    const visibleStudentIds = getStudentsForClass(className).map((student) => student.id);
    const allSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => assignedStudentIds.includes(id));

    setAssignedStudentIds((prev) => (
      allSelected
        ? prev.filter((id) => !visibleStudentIds.includes(id))
        : Array.from(new Set([...prev, ...visibleStudentIds]))
    ));
  };

  const openStudentModal = (teacher: Teacher) => {
    setStudentModalTeacher(teacher);
    setTeacherStudentSearch('');
    setTransferStudent(null);
    setTransferClass('');
    setTransferTeacherId('');
  };

  const closeStudentModal = () => {
    setStudentModalTeacher(null);
    setTeacherStudentSearch('');
    setTransferStudent(null);
    setTransferClass('');
    setTransferTeacherId('');
  };

  const startTransfer = (student: Student) => {
    setTransferStudent(student);
    setTransferClass(studentClass(student));
    setTransferTeacherId(student.assignedTeacherId || studentModalTeacher?.id || '');
  };

  const teacherStudents = studentModalTeacher
    ? getTeacherStudents(studentModalTeacher).filter((student) => (
        !teacherStudentSearch.trim()
          ? true
          : `${student.name} ${student.id} ${student.parentName || ''} ${student.assignedClass || student.grade || student.level || ''}`
              .toLowerCase()
              .includes(teacherStudentSearch.toLowerCase())
      ))
    : [];

  const transferTeacherOptions = teachers.filter((teacher) => (
    transferClass ? getTeacherAssignedClasses(teacher).includes(transferClass) : true
  ));

  const handleTransfer = async () => {
    if (!transferStudent || !transferClass || !transferTeacherId) return;
    setTransferLoading(true);
    const success = await transferStudentToTeacherAndClass(
      transferStudent.id,
      transferClass,
      transferTeacherId,
      user?.name || 'Admin',
      user?.id || 'admin'
    );
    setTransferLoading(false);

    if (!success) {
      setToast({ show: true, msg: 'Could not transfer student.', type: 'error' });
      return;
    }

    await fetchData();
    setToast({ show: true, msg: `${transferStudent.name} was transferred to ${transferClass}.`, type: 'success' });
    setTransferStudent(null);
    setTransferClass('');
    setTransferTeacherId('');
  };

  const actionButtonClass = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors';

  return (
    <div>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ ...toast, show: false })} variant={toast.type} />
      <div className="flex justify-end mb-5">
        <Button onClick={openTeacherForm}>
          <Plus size={20} /> {editingId ? 'Edit Teacher' : 'Add Teacher'}
        </Button>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Teacher?"
        message={`Are you sure you want to delete ${teacherToDelete?.name}? This action cannot be undone.`}
        isLoading={loading}
      />

      {passwordRevealTeacher && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={confirmPasswordReveal}
            className="w-full max-w-md border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-coha-900 text-white">
                <LockKeyhole size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">Confirm Admin Access</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Enter admin password to perform this action.
                </p>
              </div>
            </div>

            <Input
              label="Admin Password"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Enter admin password"
              required
            />

            {adminPasswordError && (
              <p className="mt-3 text-sm font-bold text-red-600">{adminPasswordError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closePasswordReveal} disabled={adminPasswordLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={adminPasswordLoading} loading={adminPasswordLoading}>
                View Password
              </Button>
            </div>
          </form>
        </div>
      )}

      {studentModalTeacher && (
        <div className="fixed inset-0 z-50 bg-black/55 p-4">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[1.6rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 px-6 py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Teacher Student List</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-coha-900">{studentModalTeacher.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {teacherStudents.length} student{teacherStudents.length !== 1 ? 's' : ''} currently linked to this teacher.
                </p>
              </div>
              <button
                type="button"
                onClick={closeStudentModal}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] overflow-hidden">
              <div className="flex min-h-0 flex-col border-r border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="relative max-w-lg">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      value={teacherStudentSearch}
                      onChange={(e) => setTeacherStudentSearch(e.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-300 pl-10 pr-4 text-sm outline-none focus:border-coha-500"
                      placeholder="Search linked students by name, ID, parent, or class..."
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full text-left [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
                    <thead className="sticky top-0">
                      <tr>
                        <TableHeaderCell icon={Users}>Student</TableHeaderCell>
                        <TableHeaderCell icon={GraduationCap} className="w-[220px]">Class</TableHeaderCell>
                        <TableHeaderCell icon={HeartHandshake}>Parent</TableHeaderCell>
                        <TableHeaderCell icon={MousePointerClick} className="text-right">Actions</TableHeaderCell>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teacherStudents.map((student) => (
                        <React.Fragment key={student.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="font-bold text-coha-900">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.id}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex min-w-[170px] whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                {student.assignedClass || student.grade || student.level || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-700">{student.parentName || '-'}</td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    closeStudentModal();
                                    navigate(`/admin/students/${student.id}`);
                                  }}
                                  className={`${actionButtonClass} bg-blue-600 hover:bg-blue-700`}
                                >
                                  <Eye size={14} /> View Profile
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startTransfer(student)}
                                  className={`${actionButtonClass} bg-amber-500 hover:bg-amber-600`}
                                >
                                  <Repeat size={14} /> Transfer
                                </button>
                              </div>
                            </td>
                          </tr>
                          {transferStudent?.id === student.id && (
                            <tr className="bg-amber-50/60">
                              <td colSpan={4} className="px-6 py-5">
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_auto]">
                                  <div>
                                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                                      New Class
                                    </label>
                                    <select
                                      value={transferClass}
                                      onChange={(e) => {
                                        setTransferClass(e.target.value);
                                        setTransferTeacherId('');
                                      }}
                                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-coha-500"
                                    >
                                      <option value="">Select class</option>
                                      {classOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                                      New Teacher
                                    </label>
                                    <select
                                      value={transferTeacherId}
                                      onChange={(e) => setTransferTeacherId(e.target.value)}
                                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-coha-500"
                                    >
                                      <option value="">Select teacher</option>
                                      {transferTeacherOptions.map((teacher) => (
                                        <option key={teacher.id} value={teacher.id}>
                                          {teacher.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTransferStudent(null);
                                        setTransferClass('');
                                        setTransferTeacherId('');
                                      }}
                                      className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={transferLoading || !transferClass || !transferTeacherId}
                                      onClick={handleTransfer}
                                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-coha-900 px-4 text-sm font-bold text-white disabled:opacity-50"
                                    >
                                      {transferLoading ? (
                                        <>
                                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" className="opacity-75" />
                                          </svg>
                                          Moving
                                        </>
                                      ) : (
                                        <>
                                          <Repeat size={14} /> Save Transfer
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {teacherStudents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                            No students are currently linked to this teacher.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-auto bg-gray-50 px-6 py-6">
                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Assigned Classes</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {getTeacherAssignedClasses(studentModalTeacher).map((className, index) => {
                      const theme = CLASS_BUTTON_THEMES[index % CLASS_BUTTON_THEMES.length];
                      const Icon = theme.icon;
                      return (
                        <span
                          key={className}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${theme.bg} ${theme.text} ${theme.border}`}
                        >
                          <Icon size={14} />
                          {className}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Transfer Guidance</p>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    Use the transfer button beside any learner to move that learner to a different class and teacher. Once saved, the student is removed from the old teacher and appears on the new teacher's taught-students list after refresh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[18px] border border-white/60 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                  Step {formStep} of 2
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {editingId ? 'Edit Teacher' : 'Add Teacher'}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formStep === 1 ? 'Enter the teacher details first.' : 'Choose classes and assign learners.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleFormClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-200 bg-white">
              <div className={`h-1 ${formStep >= 1 ? 'bg-purple-700' : 'bg-slate-100'}`} />
              <div className={`h-1 ${formStep >= 2 ? 'bg-purple-700' : 'bg-slate-100'}`} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {formStep === 1 ? (
                <div className="mx-auto max-w-3xl space-y-5">
                  <Input
                    label="Teacher Name"
                    placeholder="e.g. Mrs. Sarah Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Role"
                    placeholder="e.g. Mathematics Teacher"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[12px] border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-coha-900">Add Another Class</p>
                        <p className="text-xs font-semibold text-slate-500">Selecting a class automatically checks all listed students in that class.</p>
                      </div>
                      {assignedClasses.length === 0 && (
                        <p className="text-xs font-bold text-red-500">Select at least one class or level.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {classOptions.map((option, index) => {
                        const selected = assignedClasses.includes(option.value);
                        const theme = CLASS_BUTTON_THEMES[index % CLASS_BUTTON_THEMES.length];
                        const Icon = theme.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleClass(option.value)}
                            className={`relative inline-flex min-h-12 items-center gap-2 rounded-[10px] border px-3 py-2 pr-10 text-left text-xs font-black transition-colors ${
                              selected
                                ? theme.active
                                : `${theme.bg} ${theme.text} ${theme.border} hover:brightness-95`
                            }`}
                            aria-pressed={selected}
                          >
                            <Icon size={15} />
                            <span className="truncate">{option.label}</span>
                            {selected && (
                              <span className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
                                <CheckCircle2 size={17} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {assignedClasses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {assignedClasses.map((className, index) => {
                        const classStudents = getStudentsForClass(className);
                        const allListedStudentsSelected = classStudents.length > 0 && classStudents.every((student) => assignedStudentIds.includes(student.id));
                        const theme = CLASS_BUTTON_THEMES[index % CLASS_BUTTON_THEMES.length];
                        const Icon = theme.icon;

                        return (
                          <div key={className} className="min-w-0 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
                            <div className={`border-b px-4 py-3 ${theme.border} ${theme.bg}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Icon size={16} className={theme.text} />
                                  <p className={`font-black ${theme.text}`}>{className}</p>
                                </div>
                                <span className="text-xs font-black text-slate-500">{classStudents.length} students</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                <input
                                  className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-coha-500"
                                  placeholder={`Search ${className} students...`}
                                  value={classSearchMap[className] || ''}
                                  onChange={(e) => setClassSearch(className, e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleAllStudentsForClass(className)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-purple-200 hover:text-purple-700"
                              >
                                <CheckSquare size={15} />
                                {allListedStudentsSelected ? 'Clear Listed' : 'Check Listed'}
                              </button>
                            </div>

                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                              {classStudents.map((student) => {
                                const checked = assignedStudentIds.includes(student.id);
                                return (
                                  <label key={student.id} className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${checked ? 'bg-purple-50/70' : 'bg-white hover:bg-slate-50'}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleStudent(student.id)}
                                      className="h-4 w-4 accent-purple-700"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-black text-slate-900">{student.name}</p>
                                      <p className="truncate text-xs font-semibold text-slate-500">{student.id}{student.assignedTeacherName ? ` · ${student.assignedTeacherName}` : ''}</p>
                                    </div>
                                  </label>
                                );
                              })}
                              {classStudents.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                                  No students found for this class.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[12px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
                      Select a class to reveal its students.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={handleFormClose}>Cancel</Button>
              <div className="flex justify-end gap-2">
                {formStep === 2 && (
                  <Button type="button" variant="outline" onClick={() => setFormStep(1)}>
                    Back
                  </Button>
                )}
                {formStep === 1 ? (
                  <Button
                    type="button"
                    disabled={!name.trim() || !subject.trim()}
                    onClick={() => setFormStep(2)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    loading={formLoading}
                    disabled={formLoading || !name.trim() || !subject.trim() || assignedClasses.length === 0}
                  >
                    Finish
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-coha-500 outline-none rounded-none"
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <CustomSelect
              value={filterClass}
              onChange={setFilterClass}
              options={[{ label: 'All Classes', value: '' }, ...classOptions]}
              placeholder="Filter by class..."
              className="!mb-0"
            />
          </div>
          <div className="w-full sm:w-auto sm:ml-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => navigate('/admin/lesson-plans')}
                className="w-full sm:w-auto !bg-green-600 hover:!bg-green-700 !border-0 text-white flex items-center justify-center gap-2 px-6"
              >
                <FileText size={20} /> View Lesson Plans
              </Button>
              <Button
                onClick={() => navigate('/admin/assessment-progress')}
                className="w-full sm:w-auto !bg-orange-500 hover:!bg-orange-600 !border-0 text-white flex items-center justify-center gap-2 px-6"
              >
                <BarChart2 size={20} /> View Assessment Progress
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-purple-900/30 [&_th:last-child]:border-r-0">
            <thead>
              <tr>
                <TableHeaderCell icon={Users}>Name</TableHeaderCell>
                <TableHeaderCell icon={BookOpen}>Subject</TableHeaderCell>
                <TableHeaderCell icon={GraduationCap}>Assigned Classes</TableHeaderCell>
                <TableHeaderCell icon={Hash}>Students</TableHeaderCell>
                <TableHeaderCell icon={BadgeCheck}>Password</TableHeaderCell>
                <TableHeaderCell icon={MousePointerClick} className="text-right">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableLoading ? (
                <TableSkeletonRows rows={10} columns={6} />
              ) : filteredTeachers.map((teacher) => {
                const teacherClasses = getTeacherAssignedClasses(teacher);
                return (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold text-black">{teacher.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{teacher.subject}</td>
                    <td className="px-6 py-3">
                      {teacherClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {teacherClasses.map((className) => (
                            <span key={className} className="text-xs font-semibold text-slate-700">
                              {className}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Users size={14} className="text-gray-400" />
                          {getTeacherStudents(teacher).length}
                        </div>
                        <button
                          type="button"
                          onClick={() => openStudentModal(teacher)}
                          className="text-xs font-black uppercase tracking-widest text-[#2E1065] underline underline-offset-4 hover:text-purple-800"
                        >
                          View
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`min-w-[120px] select-none font-mono font-black tracking-[0.2em] text-coha-900 transition ${
                            revealedTeacherIds.has(teacher.id) ? '' : 'blur-sm'
                          }`}
                        >
                          {teacher.pin}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPasswordReveal(teacher)}
                          className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-coha-500 hover:text-coha-700"
                          title={revealedTeacherIds.has(teacher.id) ? 'Hide password' : 'View password'}
                        >
                          {revealedTeacherIds.has(teacher.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/teachers/${teacher.id}/progress`)}
                          className={`${actionButtonClass} bg-violet-600 hover:bg-violet-700`}
                          title="View Progress"
                        >
                          <BarChart2 size={14} /> Progress
                        </button>
                        <button
                          onClick={() => openStudentModal(teacher)}
                          className="text-xs font-black uppercase tracking-widest text-[#2E1065] underline underline-offset-4 hover:text-purple-800"
                          title="View Students"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(teacher)}
                          className={`${actionButtonClass} bg-blue-600 hover:bg-blue-700`}
                          title="Edit"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => confirmDelete(teacher)} className="text-red-400 hover:text-red-600 p-1" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
