import React, { useEffect, useState } from 'react';
import { CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { getAllHomeworkSubmissions, markHomeworkSubmissionReviewed } from '../../services/dataService';
import { HomeworkSubmission } from '../../types';
import { Loader } from '../../components/ui/Loader';

export const AdminHomeworksPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selected, setSelected] = useState<HomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await getAllHomeworkSubmissions();
    setSubmissions(data);
    if (!selected && data.length > 0) setSelected(data[0]);
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setReviewNote(selected?.notes || '');
  }, [selected?.id]);

  const handleReview = async () => {
    if (!selected?.id) return;
    setBusy(true);
    try {
      await markHomeworkSubmissionReviewed(selected.id, reviewNote);
      window.dispatchEvent(new CustomEvent('coha-homework-submission-update'));
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-coha-900">Homeworks</h2>
        <p className="text-sm text-gray-500">View homework images uploaded by parents across the school.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Submissions</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {submissions.length === 0 && <p className="p-5 text-sm text-gray-500">No homework submissions yet.</p>}
            {submissions.map((submission) => (
              <button key={submission.id} onClick={() => setSelected(submission)} className={`w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === submission.id ? 'bg-blue-50' : 'bg-white'}`}>
                <p className="font-bold text-gray-900">{submission.studentName}</p>
                <p className="text-xs text-gray-500 mt-1">{submission.className || 'No class'} · {submission.parentName}</p>
                <p className="text-xs text-gray-400 mt-1">{submission.submittedAt?.toDate ? submission.submittedAt.toDate().toLocaleDateString() : '-'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {!selected ? (
            <div className="p-8 text-sm text-gray-500">Select a submission to inspect.</div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b 2xl:border-b-0 2xl:border-r border-gray-200 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Homework Image</p>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 min-h-[480px] flex items-center justify-center overflow-hidden">
                  {selected.imageBase64 ? (
                    <img src={selected.imageBase64} alt={selected.studentName} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <ImageIcon size={28} />
                      <span>No image found</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Submission Details</p>
                <div className="space-y-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm font-bold text-gray-900">{selected.studentName}</p>
                    <p className="text-xs text-gray-500 mt-1">{selected.parentName}</p>
                    <p className="text-xs text-gray-500 mt-1">{selected.className || '-'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Status</p>
                      <p className={`mt-2 text-sm font-bold ${selected.status === 'REVIEWED' ? 'text-green-600' : 'text-amber-600'}`}>{selected.status}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Submitted</p>
                      <p className="mt-2 text-sm font-bold text-gray-900">{selected.submittedAt?.toDate ? selected.submittedAt.toDate().toLocaleDateString() : '-'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Review note</label>
                    <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={5} className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm" placeholder="Optional note for admin / teacher record" />
                  </div>

                  <button disabled={busy || selected.status === 'REVIEWED'} onClick={handleReview} className="w-full h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Mark reviewed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
