import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, BarChart2, FileText, Users, CheckSquare } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  addTeacher,
  deleteTeacher,
  getStudents,
  getSystemSettings,
  getTeachers,
  syncTeacherAssignments,
  updateTeacher,
} from '../../services/dataService';
import { Student, SystemSettings, Teacher } from '../../types';
import { getTeacherAssignedClasses } from '../../utils/teacherClassSelection';

export const TeachersPage: React.FC = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const fetchData = async () => {
    const [teachersData, settingsData, studentsData] = await Promise.all([
      getTeachers(),
      getSystemSettings(),
      getStudents(),
    ]);
    setTeachers(teachersData);
    setSettings(settingsData);
    setStudents(studentsData.filter((student) => student.studentStatus === 'ENROLLED'));
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

  const classOptions = useMemo(() => {
    if (!settings) return [];
    return [
      ...settings.grades.map((grade) => ({ label: grade, value: grade })),
      ...settings.specialNeedsLevels.map((level) => ({ label: `${level} (Special Needs)`, value: level })),
    ];
  }, [settings]);

  const studentClass = (student: Student) => student.assignedClass || student.grade || student.level || '';

  const availableStudents = useMemo(() => {
    return students
      .filter((student) => {
        const matchesClass = assignedClasses.length > 0 ? assignedClasses.includes(studentClass(student)) : true;
        const matchesSearch = studentSearch
          ? `${student.name} ${student.id} ${student.assignedTeacherName || ''}`.toLowerCase().includes(studentSearch.toLowerCase())
          : true;
        return matchesClass && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedClasses, studentSearch, students]);

  const handleEdit = (teacher: Teacher) => {
    setName(teacher.name);
    setSubject(teacher.subject || '');
    setAssignedClasses(getTeacherAssignedClasses(teacher));
    setAssignedStudentIds(teacher.assignedStudentIds || []);
    setEditingId(teacher.id);
    setStudentSearch('');
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setName('');
    setSubject('');
    setAssignedClasses([]);
    setAssignedStudentIds([]);
    setStudentSearch('');
    setEditingId(null);
  };

  const toggleClass = (className: string) => {
    setAssignedClasses((prev) => (
      prev.includes(className)
        ? prev.filter((item) => item !== className)
        : [...prev, className]
    ));
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

    setLoading(true);

    let teacherId = editingId;
    let success = false;

    if (editingId) {
      success = await updateTeacher(editingId, {
        name: name.trim(),
        subject: subject.trim(),
        assignedClasses,
        assignedClass: assignedClasses[0] || '',
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

    setLoading(false);
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

  const allVisibleStudentsSelected = availableStudents.length > 0 && availableStudents.every((student) => assignedStudentIds.includes(student.id));

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-coha-900">Teachers</h2>
          <p className="text-gray-600">Assign teachers to multiple classes and individual learners.</p>
        </div>
        <Button onClick={() => (showForm ? handleFormClose() : setShowForm(true))}>
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

      {showForm && (
        <div className="bg-white p-6 mb-8 border-t-4 border-coha-500 shadow-lg animate-fade-in space-y-6">
          <div>
            <h3 className="text-lg font-bold">{editingId ? 'Edit Teacher Details' : 'Add New Teacher'}</h3>
            <p className="text-sm text-gray-500 mt-1">Teachers can teach several mainstream grades and special-needs levels at the same time.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. Mrs. Sarah Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Subject / Role"
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <p className="text-sm font-bold text-coha-900 mb-3">Classes This Teacher Handles</p>
              <div className="flex flex-wrap gap-2">
                {classOptions.map((option) => {
                  const selected = assignedClasses.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleClass(option.value)}
                      className={`px-3 py-2 text-sm font-bold border transition-colors ${
                        selected
                          ? 'bg-coha-900 text-white border-coha-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-coha-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {assignedClasses.length === 0 && (
                <p className="text-xs text-red-500 mt-2">Select at least one class or level.</p>
              )}
            </div>

            <div className="border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-bold text-coha-900">Assign Students</p>
                  <p className="text-xs text-gray-500 mt-1">Only learners from the selected classes are shown below.</p>
                </div>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <div className="relative min-w-[220px]">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-coha-500 outline-none rounded-none"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAssignedStudentIds((prev) => (
                        allVisibleStudentsSelected
                          ? prev.filter((id) => !availableStudents.some((student) => student.id === id))
                          : Array.from(new Set([...prev, ...availableStudents.map((student) => student.id)]))
                      ));
                    }}
                  >
                    <CheckSquare size={16} /> {allVisibleStudentsSelected ? 'Clear Visible' : 'Select Visible'}
                  </Button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {availableStudents.map((student) => {
                  const checked = assignedStudentIds.includes(student.id);
                  return (
                    <label key={student.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${checked ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-coha-900 truncate">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.id} · {studentClass(student)}{student.assignedTeacherName ? ` · ${student.assignedTeacherName}` : ''}</p>
                      </div>
                    </label>
                  );
                })}
                {availableStudents.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    Select one or more classes to load students.
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleFormClose}>Cancel</Button>
              <Button type="submit" disabled={loading || !name.trim() || !subject.trim() || assignedClasses.length === 0}>
                {loading ? 'Saving...' : (editingId ? 'Update Teacher' : 'Save Teacher')}
              </Button>
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
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Assigned Classes</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4">PIN</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeachers.map((teacher) => {
                const teacherClasses = getTeacherAssignedClasses(teacher);
                return (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-coha-900">{teacher.name}</td>
                    <td className="px-6 py-4">{teacher.subject}</td>
                    <td className="px-6 py-4">
                      {teacherClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {teacherClasses.map((className) => (
                            <span key={className} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 font-bold rounded">
                              {className}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Users size={14} className="text-gray-400" />
                        {teacher.assignedStudentIds?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-black text-coha-900 tracking-[0.2em]">{teacher.pin}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/teachers/${teacher.id}/progress`)}
                          className="text-coha-500 hover:text-coha-700 p-1"
                          title="View Progress"
                        >
                          <BarChart2 size={18} />
                        </button>
                        <button onClick={() => handleEdit(teacher)} className="text-coha-500 hover:text-coha-700 p-1" title="Edit">
                          <Edit2 size={18} />
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
