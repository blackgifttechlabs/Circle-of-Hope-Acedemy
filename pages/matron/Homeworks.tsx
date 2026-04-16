import React, { useState, useEffect } from 'react';
import {
  getStudents,
  getHomeworkAssignmentsForClass,
  getHomeworkSubmissionsForStudent,
  submitHomeworkAsMatron
} from '../../services/dataService';
import { Student, HomeworkAssignment, HomeworkSubmission } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Search, Filter, Home, BookOpen, CheckCircle2, ChevronRight, Upload, Image as ImageIcon, X, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const MatronHomeworks: React.FC<{ user: any }> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ dorm: 'ALL' });

  const [submitting, setSubmitting] = useState(false);
  const [submissionForm, setSubmissionForm] = useState<{assignment: HomeworkAssignment | null, image: string}>({
    assignment: null,
    image: ''
  });

  useEffect(() => {
    const fetchStudents = async () => {
      const data = await getStudents();
      setStudents(data);
      setLoading(false);
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      const fetchHomework = async () => {
        const [a, s] = await Promise.all([
          getHomeworkAssignmentsForClass(selectedStudent.assignedClass || ''),
          getHomeworkSubmissionsForStudent(selectedStudent.id)
        ]);
        setAssignments(a);
        setSubmissions(s);
      };
      fetchHomework();
    }
  }, [selectedStudent]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDorm = filters.dorm === 'ALL' || s.dorm === filters.dorm;
    return matchesSearch && matchesDorm;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubmissionForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !submissionForm.assignment || !submissionForm.image) return;
    setSubmitting(true);
    const result = await submitHomeworkAsMatron({
      assignmentId: submissionForm.assignment.id,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      parentName: selectedStudent.parentName || 'Matron Submitted',
      className: selectedStudent.assignedClass,
      imageBase64: submissionForm.image,
      fileName: 'homework.jpg',
      mimeType: 'image/jpeg'
    }, user.id, user.name);

    if (result.success) {
      const updatedSubmissions = await getHomeworkSubmissionsForStudent(selectedStudent.id);
      setSubmissions(updatedSubmissions);
      setSubmissionForm({ assignment: null, image: '' });
    }
    setSubmitting(false);
  };

  if (loading) return <Loader />;

  return (
    <div className="px-[10px] py-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Homework Tracker</h1>
        <p className="text-sm font-bold text-slate-500">Monitor and submit student homework</p>
      </div>

      {!selectedStudent ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search student..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-900 shadow-sm focus:outline-none focus:border-coha-500 font-bold"
              />
            </div>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={filters.dorm}
                onChange={e => setFilters({ dorm: e.target.value })}
                className="pl-10 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm font-black uppercase tracking-widest outline-none focus:border-coha-500"
              >
                <option value="ALL">All Dorms</option>
                {Array.from(new Set(students.map(s => s.dorm).filter(Boolean))).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:border-coha-500 transition-all text-left"
              >
                {student.profileImageBase64 ? (
                  <img src={student.profileImageBase64} alt={student.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 font-black">
                    {student.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-black text-slate-900 text-sm truncate">{student.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.dorm || 'No Dorm'}</p>
                </div>
                <ChevronRight size={18} className="text-slate-200" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedStudent(null)}
            className="flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-coha-900 transition-colors"
          >
            <ChevronRight size={16} className="rotate-180" /> Change Student
          </button>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6">
            <div className="w-16 h-16 bg-coha-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
              {selectedStudent.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{selectedStudent.name}</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{selectedStudent.assignedClass}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Assigned Homework</h3>
            {assignments.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {assignments.map(assignment => {
                  const submission = submissions.find(s => s.assignmentId === assignment.id);
                  return (
                    <div key={assignment.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-coha-500 mb-1">{assignment.subject}</p>
                          <h4 className="text-lg font-black text-slate-900">{assignment.title}</h4>
                          <p className="text-sm font-medium text-slate-500 mt-1">{assignment.description}</p>
                        </div>
                        {submission ? (
                          <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-full">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Submitted</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full animate-pulse">
                            <Clock size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                          </div>
                        )}
                      </div>

                      {assignment.imageAttachments && assignment.imageAttachments.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                          {assignment.imageAttachments.map((img, i) => (
                            <img key={i} src={img.fileBase64} alt="Attachment" className="h-24 rounded-xl border border-slate-100" />
                          ))}
                        </div>
                      )}

                      {!submission && (
                        <Button
                          onClick={() => setSubmissionForm({ assignment, image: '' })}
                          variant="outline"
                          className="!py-2 !rounded-xl !text-[10px] uppercase font-black tracking-widest"
                        >
                          <Upload size={14} /> Upload Submission
                        </Button>
                      )}

                      {submission && (
                        <div className="mt-4 pt-4 border-t border-slate-50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">My Submission</p>
                          <img src={submission.imageBase64} alt="Submission" className="h-24 rounded-xl border border-slate-100" />
                          <p className="text-[9px] font-bold text-slate-400 mt-2">
                            Submitted on {submission.submittedAt?.toDate ? submission.submittedAt.toDate().toLocaleString() : new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 border-dashed">
                <BookOpen size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No homework assigned for this class</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {submissionForm.assignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Submit Homework</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">For {selectedStudent?.name}</p>
              </div>
              <button onClick={() => setSubmissionForm({ assignment: null, image: '' })} className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-coha-500 mb-1">{submissionForm.assignment.subject}</p>
                <h4 className="font-black text-slate-900">{submissionForm.assignment.title}</h4>
              </div>

              {!submissionForm.image ? (
                <label className="block w-full border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center cursor-pointer hover:border-coha-500 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="w-16 h-16 bg-coha-50 text-coha-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ImageIcon size={32} />
                  </div>
                  <p className="text-slate-900 font-black text-sm">Tap to upload photo</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Take a photo of the completed work</p>
                </label>
              ) : (
                <div className="relative">
                  <img src={submissionForm.image} alt="Preview" className="w-full rounded-[32px] aspect-[4/3] object-cover" />
                  <button
                    onClick={() => setSubmissionForm(prev => ({ ...prev, image: '' }))}
                    className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full backdrop-blur-md"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <Button
                fullWidth
                disabled={!submissionForm.image || submitting}
                onClick={handleSubmit}
                className="!rounded-2xl !py-4 shadow-xl shadow-coha-900/20"
              >
                {submitting ? 'Submitting...' : 'Submit Work'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
