import React, { useEffect, useState } from 'react';
import { CheckCircle2, Image as ImageIcon, PlusCircle } from 'lucide-react';
import { createHomeworkAssignment, getHomeworkAssignmentsByTeacher, getHomeworkSubmissionsForClass, getTeacherById, markHomeworkSubmissionReviewed } from '../../services/dataService';
import { HomeworkAssignment, HomeworkSubmission, Teacher } from '../../types';
import { Loader } from '../../components/ui/Loader';

interface TeacherHomeworkPageProps {
  user: any;
}

export const TeacherHomeworkPage: React.FC<TeacherHomeworkPageProps> = ({ user }) => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');

  const load = async (teacherRecord?: Teacher | null) => {
    const currentTeacher = teacherRecord || teacher;
    if (!currentTeacher) return;
    const [teacherAssignments, classSubmissions] = await Promise.all([
      getHomeworkAssignmentsByTeacher(currentTeacher.id),
      getHomeworkSubmissionsForClass(currentTeacher.assignedClass || ''),
    ]);
    setAssignments(teacherAssignments);
    setSubmissions(classSubmissions);
    if (!selectedSubmission && classSubmissions.length > 0) setSelectedSubmission(classSubmissions[0]);
  };

  useEffect(() => {
    (async () => {
      const teacherRecord = await getTeacherById(user.id);
      setTeacher(teacherRecord);
      await load(teacherRecord);
      setLoading(false);
    })();
  }, [user.id]);

  useEffect(() => {
    setReviewNote(selectedSubmission?.notes || '');
  }, [selectedSubmission?.id]);

  const handleCreate = async () => {
    if (!teacher || !title.trim() || !description.trim()) return;
    setBusy(true);
    try {
      await createHomeworkAssignment({
        title: title.trim(),
        description: description.trim(),
        teacherId: teacher.id,
        teacherName: teacher.name,
        className: teacher.assignedClass || '',
        dueDate,
        subject,
      });
      setTitle('');
      setDescription('');
      setSubject('');
      setDueDate('');
      await load(teacher);
    } finally {
      setBusy(false);
    }
  };

  const handleReviewed = async () => {
    if (!selectedSubmission?.id) return;
    setBusy(true);
    try {
      await markHomeworkSubmissionReviewed(selectedSubmission.id, reviewNote);
      await load(teacher);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-coha-900">Homework</h2>
        <p className="text-sm text-gray-500">Post homework for your class and review parent uploads for {teacher?.assignedClass || 'your class'}.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Add Homework</p>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" placeholder="Homework title" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm" placeholder="What should learners do?" />
              <div className="grid grid-cols-2 gap-3">
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" placeholder="Subject" />
                <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" />
              </div>
              <button disabled={busy || !title.trim() || !description.trim()} onClick={handleCreate} className="w-full h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <PlusCircle size={18} /> Publish homework
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Posted Homework</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {assignments.length === 0 && <p className="p-5 text-sm text-gray-500">No homework posted yet.</p>}
              {assignments.map((assignment) => (
                <div key={assignment.id} className="px-5 py-4 border-b border-gray-100">
                  <p className="font-bold text-gray-900">{assignment.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{assignment.description}</p>
                  <p className="text-xs text-gray-400 mt-2">{assignment.subject || 'General'} {assignment.dueDate ? `· Due ${assignment.dueDate}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 2xl:grid-cols-[320px_1fr] min-h-[680px]">
            <div className="border-b 2xl:border-b-0 2xl:border-r border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Parent Uploads</p>
              </div>
              <div className="max-h-[620px] overflow-y-auto">
                {submissions.length === 0 && <p className="p-5 text-sm text-gray-500">No parent homework uploads yet.</p>}
                {submissions.map((submission) => (
                  <button key={submission.id} onClick={() => setSelectedSubmission(submission)} className={`w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 ${selectedSubmission?.id === submission.id ? 'bg-blue-50' : 'bg-white'}`}>
                    <p className="font-bold text-gray-900">{submission.studentName}</p>
                    <p className="text-xs text-gray-500 mt-1">{submission.parentName}</p>
                    <p className="text-xs text-gray-400 mt-1">{submission.submittedAt?.toDate ? submission.submittedAt.toDate().toLocaleDateString() : '-'}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {!selectedSubmission ? (
                <p className="text-sm text-gray-500">Select a parent homework upload to inspect.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Submission Preview</p>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 min-h-[420px] flex items-center justify-center overflow-hidden">
                    {selectedSubmission.imageBase64 ? (
                      <img src={selectedSubmission.imageBase64} alt={selectedSubmission.studentName} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center gap-2">
                        <ImageIcon size={28} />
                        <span>No image found</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Learner</p>
                      <p className="mt-2 text-sm font-bold text-gray-900">{selectedSubmission.studentName}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Status</p>
                      <p className={`mt-2 text-sm font-bold ${selectedSubmission.status === 'REVIEWED' ? 'text-green-600' : 'text-amber-600'}`}>{selectedSubmission.status}</p>
                    </div>
                  </div>

                  <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm" placeholder="Optional teacher note" />

                  <button disabled={busy || selectedSubmission.status === 'REVIEWED'} onClick={handleReviewed} className="w-full h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Mark reviewed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
