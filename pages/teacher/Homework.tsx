import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, BookOpen, Calendar as CalendarIcon, CheckCircle2, CheckSquare, ChevronRight, Clock, Download, Image as ImageIcon, Plus, PlusCircle, X } from 'lucide-react';
import { createHomeworkAssignment, getHomeworkAssignmentsByTeacher, getHomeworkSubmissionsForClass, getTeacherById, markHomeworkSubmissionReviewed } from '../../services/dataService';
import { HomeworkAssignment, HomeworkSubmission, Teacher } from '../../types';
import { Loader } from '../../components/ui/Loader';

interface TeacherHomeworkPageProps {
  user: any;
}

export const TeacherHomeworkPage: React.FC<TeacherHomeworkPageProps> = ({ user }) => {
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [viewMode, setViewMode] = useState<'POST' | 'REVIEW'>('POST');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [homeworkImages, setHomeworkImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; name: string; fileName?: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const triggerImageDownload = (src: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      const imageAttachments = await Promise.all(
        homeworkImages.map(async (file, index) => ({
          title: `${title.trim()} Image ${index + 1}`,
          fileName: file.name,
          mimeType: file.type,
          fileBase64: await fileToDataUrl(file),
        }))
      );

      await createHomeworkAssignment({
        title: title.trim(),
        description: description.trim(),
        teacherId: teacher.id,
        teacherName: teacher.name,
        className: teacher.assignedClass || '',
        dueDate,
        subject,
        imageAttachments,
      });
      setTitle('');
      setDescription('');
      setSubject('');
      setDueDate('');
      setHomeworkImages([]);
      setImageError('');
      if (imageInputRef.current) imageInputRef.current.value = '';
      window.dispatchEvent(new CustomEvent('coha-homework-assignment-update'));
      await load(teacher);
    } finally {
      setBusy(false);
    }
  };

  const handleImagePick = (files: FileList | null) => {
    if (!files?.length) return;
    const pickedFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (pickedFiles.length !== files.length) {
      setImageError('Only image files can be added to homework.');
    } else {
      setImageError('');
    }
    setHomeworkImages((prev) => [...prev, ...pickedFiles]);
  };

  const removeHomeworkImage = (targetIndex: number) => {
    setHomeworkImages((prev) => prev.filter((_, index) => index !== targetIndex));
  };

  const handleReviewed = async () => {
    if (!selectedSubmission?.id) return;
    setBusy(true);
    try {
      await markHomeworkSubmissionReviewed(selectedSubmission.id, reviewNote);
      window.dispatchEvent(new CustomEvent('coha-homework-submission-update'));
      await load(teacher);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  const submittedCount = submissions.length;
  const pendingReviewCount = submissions.filter((submission) => submission.status !== 'REVIEWED').length;
  const lateSubmissionCount = submissions.filter((submission) => {
    const assignment = assignments.find((item) => item.id && item.id === submission.assignmentId);
    if (!assignment?.dueDate || !submission.submittedAt?.toDate) return false;
    return submission.submittedAt.toDate() > new Date(`${assignment.dueDate}T23:59:59`);
  }).length;

  return (
    <div className="space-y-6">
      {fullscreenImage && (
        <div className="fixed inset-0 z-[90] bg-slate-950/94 px-4 py-6">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{fullscreenImage.name}</p>
                <p className="mt-1 text-xs font-semibold text-white/65">Homework image preview</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerImageDownload(fullscreenImage.src, fullscreenImage.fileName || `${fullscreenImage.name}.png`)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900"
                >
                  <Download size={16} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenImage(null)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="flex-1 overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/5 p-3"
            >
              <img src={fullscreenImage.src} alt={fullscreenImage.name} className="h-full w-full rounded-[1.2rem] object-contain" />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#14002f]">Homework</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Post homework for your class and review parent uploads for {teacher?.assignedClass || 'your class'}.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setViewMode('POST')} className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-xs font-black uppercase tracking-widest shadow-sm transition-all ${viewMode === 'POST' ? 'bg-purple-800 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
            <Plus size={16} /> Post Work
          </button>
          <button onClick={() => setViewMode('REVIEW')} className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-xs font-black uppercase tracking-widest shadow-sm transition-all ${viewMode === 'REVIEW' ? 'bg-purple-800 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
            <CalendarIcon size={16} /> Review ({submissions.length})
          </button>
        </div>
      </div>

      {viewMode === 'POST' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm self-start">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><BookOpen size={17} /></span>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2b1556]">Add Homework</p>
            </div>
            <div className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-semibold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100" placeholder="Homework title" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} className="w-full resize-none border border-slate-200 rounded-xl px-4 py-4 text-sm font-semibold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100" placeholder="What should learners do?" />
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-500">Subject</span>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-semibold outline-none focus:border-purple-400" placeholder="Select subject" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-500">Due date</span>
                  <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-semibold outline-none focus:border-purple-400" />
                </label>
              </div>
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2b1556]">Homework Images</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">Add one or many images for this homework post.</p>
                  </div>
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-purple-100 bg-white px-4 text-sm font-black text-[#2b1556]">
                    <Plus size={16} /> Add Images
                  </button>
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImagePick(e.target.files)} />
                {imageError && <p className="mt-3 text-sm font-semibold text-red-600">{imageError}</p>}
                {homeworkImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {homeworkImages.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="h-24 w-full rounded-lg object-cover" />
                        <p className="mt-2 truncate text-xs font-semibold text-slate-600">{file.name}</p>
                        <button type="button" onClick={() => removeHomeworkImage(index)} className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button disabled={busy || !title.trim() || !description.trim()} onClick={handleCreate} className="w-full h-14 rounded-xl bg-purple-800 text-white text-sm font-black disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-900/15">
                <PlusCircle size={18} /> Publish homework
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><BarChart3 size={17} /></span>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2b1556]">Homework Overview</p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Total Homework', value: assignments.length, note: 'This term', icon: <BookOpen size={26} />, color: 'text-purple-700 bg-purple-100' },
                  { label: 'Submitted', value: submittedCount, note: `${assignments.length ? Math.round((submittedCount / Math.max(assignments.length, 1)) * 100) : 0}% of total`, icon: <CheckSquare size={26} />, color: 'text-emerald-600 bg-emerald-100' },
                  { label: 'Pending Review', value: pendingReviewCount, note: `${submittedCount ? Math.round((pendingReviewCount / submittedCount) * 100) : 0}% of submitted`, icon: <Clock size={26} />, color: 'text-orange-500 bg-orange-100' },
                  { label: 'Late Submissions', value: lateSubmissionCount, note: `${submittedCount ? Math.round((lateSubmissionCount / submittedCount) * 100) : 0}% of submitted`, icon: <CalendarIcon size={26} />, color: 'text-rose-600 bg-rose-100' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                        <p className="mt-2 text-3xl font-black text-[#14002f]">{stat.value}</p>
                        <p className="mt-3 text-xs font-semibold text-slate-500">{stat.note}</p>
                      </div>
                      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${stat.color}`}>{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Submissions Over Time</p>
                  <button className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600">This Term</button>
                </div>
                <div className="relative h-[235px]">
                  <div className="absolute inset-x-5 top-0 h-[180px]">
                    {[0, 1, 2, 3, 4, 5].map((line) => <div key={line} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: `${line * 20}%` }} />)}
                  </div>
                  <svg viewBox="0 0 600 160" className="absolute inset-x-5 top-4 h-40 w-[calc(100%-2.5rem)] overflow-visible">
                    <polyline fill="none" points="0,130 120,130 240,130 360,130 480,130 600,130" stroke="#bb00ff" strokeWidth="3" />
                    {[0, 120, 240, 360, 480, 600].map((x) => <circle key={x} cx={x} cy="130" r="4" fill="#bb00ff" />)}
                  </svg>
                  <div className="absolute bottom-8 left-5 right-5 grid grid-cols-6 text-center text-xs font-semibold text-slate-500">
                    {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'].map((week) => <span key={week}>{week}</span>)}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-7 text-xs font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-purple-700" /> Submitted</span>
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Pending Review</span>
                    <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Late</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><BookOpen size={17} /></span>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#2b1556]">Posted Homework</p>
              </div>
              <div className="min-h-[205px] rounded-2xl border border-slate-200">
                {assignments.length === 0 ? (
                  <div className="flex min-h-[205px] flex-col items-center justify-center p-8 text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 text-purple-500">
                      <BookOpen size={38} />
                    </div>
                    <p className="font-black text-[#14002f]">No homework posted yet.</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Post your first homework for {teacher?.assignedClass || 'your class'}.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="px-5 py-5 transition-colors hover:bg-slate-50">
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-black text-[#14002f]">{assignment.title}</p>
                            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{assignment.description}</p>
                          </div>
                          <span className="h-fit rounded-md bg-purple-50 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-purple-700">{assignment.subject || 'General'}</span>
                        </div>
                        <p className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-400"><Clock size={12} strokeWidth={2.5} /> Due: {assignment.dueDate || 'No date'}</p>
                        {!!assignment.imageAttachments?.length && (
                          <div className="mt-4 grid grid-cols-6 gap-2">
                            {assignment.imageAttachments.map((image, index) => (
                              <button key={`${assignment.id}-${index}`} type="button" onClick={() => setFullscreenImage({ src: image.fileBase64, name: image.title, fileName: image.fileName })} className="block aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-purple-500">
                                <img src={image.fileBase64} alt={image.title} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col h-[750px]">
            <div className="px-5 py-4 border-b border-gray-200 bg-slate-50">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Student Submissions</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {submissions.length === 0 && <p className="p-10 text-center text-sm text-gray-500 italic">No parent uploads for your class yet.</p>}
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  onClick={() => setSelectedSubmission(submission)}
                  className={`w-full text-left px-5 py-5 transition-all flex items-center gap-4 ${selectedSubmission?.id === submission.id ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                    {submission.studentName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 truncate leading-none mb-1">{submission.studentName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{submission.submittedAt?.toDate ? submission.submittedAt.toDate().toLocaleDateString() : '-'}</span>
                      <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${submission.status === 'REVIEWED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {submission.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-slate-200 transition-all ${selectedSubmission?.id === submission.id ? 'translate-x-1 text-coha-900' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col h-[750px]">
            {!selectedSubmission ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon size={32} />
                </div>
                <p className="text-sm font-black uppercase tracking-widest">Select a submission to review</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                   <div>
                      <h3 className="font-black text-slate-900 text-lg">{selectedSubmission.studentName}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submitted by {selectedSubmission.matronName || 'Parent'} · {selectedSubmission.submittedAt?.toDate ? selectedSubmission.submittedAt.toDate().toLocaleString() : '-'}</p>
                   </div>
                   <div className="flex gap-2">
                     <button
                        type="button"
                        onClick={() => setFullscreenImage({ src: selectedSubmission.imageBase64, name: `${selectedSubmission.studentName} homework`, fileName: selectedSubmission.fileName || `${selectedSubmission.studentName}-homework.png` })}
                        className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-all"
                      >
                        <ImageIcon size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerImageDownload(selectedSubmission.imageBase64, selectedSubmission.fileName || `${selectedSubmission.studentName}-homework.png`)}
                        className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-all"
                      >
                        <Download size={20} />
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
                  <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm overflow-hidden flex items-center justify-center min-h-[500px]">
                    {selectedSubmission.imageBase64 ? (
                        <img src={selectedSubmission.imageBase64} alt={selectedSubmission.studentName} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setFullscreenImage({ src: selectedSubmission.imageBase64, name: `${selectedSubmission.studentName} homework`, fileName: selectedSubmission.fileName || `${selectedSubmission.studentName}-homework.png` })} />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center gap-2">
                        <ImageIcon size={48} />
                        <span className="font-black uppercase tracking-widest text-xs">No image found</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Add Review Notes</p>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-sm font-bold focus:border-coha-500 focus:ring-4 focus:ring-coha-500/10 transition-all outline-none"
                      placeholder="Type your feedback here for the parent..."
                    />
                    <div className="mt-6">
                      <button
                        disabled={busy || selectedSubmission.status === 'REVIEWED'}
                        onClick={handleReviewed}
                        className="w-full h-14 rounded-2xl bg-coha-900 text-white font-black uppercase tracking-widest text-xs disabled:opacity-50 inline-flex items-center justify-center gap-3 shadow-xl shadow-coha-900/20 active:scale-[0.98] transition-all"
                      >
                        <CheckCircle2 size={18} /> {selectedSubmission.status === 'REVIEWED' ? 'Already Reviewed' : 'Mark as Reviewed'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
