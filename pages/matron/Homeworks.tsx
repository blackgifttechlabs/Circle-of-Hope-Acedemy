import React, { useEffect, useMemo, useState } from 'react';
import {
  getHostelStudents,
  getHomeworkAssignmentsForClasses,
  getHomeworkSubmissionsForStudents,
  submitHomeworkAsMatron
} from '../../services/dataService';
import { Student, HomeworkAssignment, HomeworkSubmission } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Search, Home, BookOpen, CheckCircle2, Upload, Image as ImageIcon, X, Clock, ClipboardList, CalendarDays } from 'lucide-react';
import { Button } from '../../components/ui/Button';

type HomeworkRow = {
  student: Student;
  assignment: HomeworkAssignment;
  submission?: HomeworkSubmission;
};

const getStudentClass = (student: Student) => student.assignedClass || student.grade || student.level || '';

const formatDateTime = (value: any) => {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const getAssignmentDateLabel = (assignment: HomeworkAssignment) => {
  if (assignment.dueDate) return assignment.dueDate;
  const created = assignment.createdAt?.toDate ? assignment.createdAt.toDate() : new Date(assignment.createdAt);
  return Number.isNaN(created.getTime()) ? '-' : created.toLocaleDateString();
};

export const MatronHomeworks: React.FC<{ user: any }> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ dorm: 'ALL' });
  const [activeTab, setActiveTab] = useState<'PENDING' | 'FINISHED'>('PENDING');
  const [submitting, setSubmitting] = useState(false);
  const [submissionForm, setSubmissionForm] = useState<{ row: HomeworkRow | null; image: string }>({
    row: null,
    image: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const hostelStudents = await getHostelStudents();
    const classNames = hostelStudents.map(getStudentClass).filter(Boolean);
    const studentIds = hostelStudents.map(student => student.id);
    const [homeworkData, submissionData] = await Promise.all([
      getHomeworkAssignmentsForClasses(classNames),
      getHomeworkSubmissionsForStudents(studentIds),
    ]);
    setStudents(hostelStudents);
    setAssignments(homeworkData);
    setSubmissions(submissionData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rows = useMemo<HomeworkRow[]>(() => {
    return students.flatMap((student) => {
      const studentClass = getStudentClass(student);
      return assignments
        .filter((assignment) => assignment.className === studentClass)
        .map((assignment) => ({
          student,
          assignment,
          submission: submissions.find((submission) => (
            submission.studentId === student.id && submission.assignmentId === assignment.id
          )),
        }));
    });
  }, [students, assignments, submissions]);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return rows.filter(({ student, assignment }) => {
      const matchesSearch = !search ||
        student.name.toLowerCase().includes(search) ||
        assignment.title.toLowerCase().includes(search) ||
        (assignment.subject || '').toLowerCase().includes(search);
      const matchesDorm = filters.dorm === 'ALL' || student.dorm === filters.dorm;
      return matchesSearch && matchesDorm;
    });
  }, [rows, searchTerm, filters.dorm]);

  const pendingRows = filteredRows.filter(row => !row.submission);
  const finishedRows = filteredRows.filter(row => !!row.submission);
  const dorms = Array.from(new Set(students.map(s => s.dorm).filter(Boolean))) as string[];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSubmissionForm(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!submissionForm.row || !submissionForm.image) return;
    const { student, assignment } = submissionForm.row;
    setSubmitting(true);
    const result = await submitHomeworkAsMatron({
      assignmentId: assignment.id,
      studentId: student.id,
      studentName: student.name,
      parentName: student.parentName || 'Matron Submitted',
      className: getStudentClass(student),
      imageBase64: submissionForm.image,
      fileName: 'homework.jpg',
      mimeType: 'image/jpeg'
    }, user.id, user.name);

    if (result.success) {
      await fetchData();
      setSubmissionForm({ row: null, image: '' });
      setActiveTab('FINISHED');
    }
    setSubmitting(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="px-[10px] py-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Homework Tracker</h1>
          <p className="text-sm font-bold text-slate-500">Submit pending homework for hostel students.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending</p>
            <p className="text-2xl font-black text-amber-950">{pendingRows.length}</p>
          </div>
          <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Finished</p>
            <p className="text-2xl font-black text-emerald-950">{finishedRows.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search student, subject, or homework..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-[8px] pl-12 pr-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 font-bold"
            />
          </div>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filters.dorm}
              onChange={e => setFilters({ dorm: e.target.value })}
              className="w-full lg:w-auto pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-[8px] shadow-sm text-sm font-black uppercase tracking-widest outline-none focus:border-coha-500"
            >
              <option value="ALL">All Dorms</option>
              {dorms.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
        <div className="p-1 bg-slate-50 border-b border-slate-200 flex gap-1">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-5 py-2.5 rounded-[8px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('FINISHED')}
            className={`px-5 py-2.5 rounded-[8px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'FINISHED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
          >
            Finished
          </button>
        </div>

        {activeTab === 'PENDING' ? (
          <div className="p-4">
            {pendingRows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingRows.map((row) => (
                  <div key={`${row.student.id}-${row.assignment.id}`} className="rounded-[10px] border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {row.student.profileImageBase64 ? (
                          <img src={row.student.profileImageBase64} alt={row.student.name} className="w-11 h-11 rounded-[10px] object-cover border border-white shadow-sm" />
                        ) : (
                          <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-amber-500 to-sky-600 text-white flex items-center justify-center font-black">
                            {row.student.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 text-sm truncate">{row.student.name}</h3>
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest truncate">{row.student.dorm || 'No Dorm'}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-[6px] bg-white border border-amber-200 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">
                        <Clock size={12} /> Pending
                      </span>
                    </div>

                    <div className="mt-4 rounded-[8px] bg-white border border-amber-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">{row.assignment.subject || 'Homework'}</p>
                      <h4 className="mt-1 text-base font-black text-slate-900">{row.assignment.title}</h4>
                      <p className="mt-2 text-sm font-semibold text-slate-500">{row.assignment.description}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <CalendarDays size={13} /> {getAssignmentDateLabel(row.assignment)}
                      </div>
                    </div>

                    <Button
                      onClick={() => setSubmissionForm({ row, image: '' })}
                      variant="outline"
                      className="mt-4 w-full !py-2 !rounded-[8px] !text-[10px] uppercase font-black tracking-widest bg-white"
                    >
                      <Upload size={14} /> Upload Submission
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen size={34} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No pending homework</p>
                <p className="text-slate-400 text-xs font-bold mt-1">Every visible homework item has been submitted.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-separate border-spacing-0">
              <thead className="bg-coha-900 text-white">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Student</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Homework</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Dorm</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Date Completed</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Completion</th>
                </tr>
              </thead>
              <tbody>
                {finishedRows.map((row, index) => (
                  <tr key={`${row.student.id}-${row.assignment.id}`} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-emerald-50/70 transition-colors`}>
                    <td className="px-5 py-4 border-b border-slate-100">
                      <p className="font-black text-slate-900">{row.student.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getStudentClass(row.student) || '-'}</p>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-100">
                      <p className="font-black text-slate-800">{row.assignment.title}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">{row.assignment.subject || 'Homework'}</p>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-100">
                      <span className="rounded-[6px] bg-amber-50 border border-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                        {row.student.dorm || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-100 text-sm font-bold text-slate-600">
                      {formatDateTime(row.submission?.submittedAt)}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-100">
                      <span className="inline-flex items-center gap-2 rounded-[6px] bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        <CheckCircle2 size={14} /> Completed
                      </span>
                    </td>
                  </tr>
                ))}
                {finishedRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center text-slate-400 font-black uppercase tracking-widest text-sm">
                      No completed homework yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length === 0 && (
        <div className="text-center py-16 bg-white rounded-[10px] border border-slate-200 border-dashed">
          <ClipboardList size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No hostel students have homework</p>
        </div>
      )}

      {submissionForm.row && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[10px] overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Submit Homework</h3>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">For {submissionForm.row.student.name}</p>
              </div>
              <button onClick={() => setSubmissionForm({ row: null, image: '' })} className="p-2 bg-white text-slate-400 rounded-[8px] border border-amber-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-[8px] border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-700 mb-1">{submissionForm.row.assignment.subject || 'Homework'}</p>
                <h4 className="font-black text-slate-900">{submissionForm.row.assignment.title}</h4>
              </div>

              {!submissionForm.image ? (
                <label className="block w-full border-2 border-dashed border-slate-200 rounded-[10px] p-12 text-center cursor-pointer hover:border-coha-500 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="w-16 h-16 bg-coha-50 text-coha-600 rounded-[10px] flex items-center justify-center mx-auto mb-4">
                    <ImageIcon size={32} />
                  </div>
                  <p className="text-slate-900 font-black text-sm">Tap to upload photo</p>
                  <p className="text-slate-400 text-xs font-bold mt-1">Photo proof of completed work</p>
                </label>
              ) : (
                <div className="relative">
                  <img src={submissionForm.image} alt="Preview" className="w-full rounded-[10px] border border-slate-100" />
                  <button
                    onClick={() => setSubmissionForm(prev => ({ ...prev, image: '' }))}
                    className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-[8px] shadow-sm"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 !rounded-[8px] bg-white"
                onClick={() => setSubmissionForm({ row: null, image: '' })}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 !rounded-[8px]"
                onClick={handleSubmit}
                disabled={submitting || !submissionForm.image}
              >
                {submitting ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
