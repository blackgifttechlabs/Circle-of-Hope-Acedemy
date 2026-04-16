import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Image as ImageIcon, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { getAllHomeworkSubmissions, markHomeworkSubmissionReviewed, deleteHomeworkSubmissions } from '../../services/dataService';
import { HomeworkSubmission } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Button } from '../../components/ui/Button';

export const AdminHomeworksPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [selected, setSelected] = useState<HomeworkSubmission | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; name: string; fileName?: string } | null>(null);

  const triggerImageDownload = (src: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const load = async () => {
    const data = await getAllHomeworkSubmissions();
    setSubmissions(data);
    if (!selected && data.length > 0) setSelected(data[0]);
    setSelectedIds([]);
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

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || !window.confirm(`Are you sure you want to delete ${selectedIds.length} submissions?`)) return;
    setBusy(true);
    try {
      await deleteHomeworkSubmissions(selectedIds);
      await load();
      if (selected && selectedIds.includes(selected.id || '')) {
        setSelected(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === submissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submissions.map(s => s.id || '').filter(id => id !== ''));
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (loading) return <Loader />;

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
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-coha-900">Homeworks</h2>
          <p className="text-sm text-gray-500">View homework images uploaded by parents across the school.</p>
        </div>
        {selectedIds.length > 0 && (
          <Button variant="danger" onClick={handleDeleteSelected} disabled={busy} className="!rounded-xl !py-2 !text-xs font-black uppercase tracking-widest">
            <Trash2 size={16} /> Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="text-coha-900">
                {selectedIds.length === submissions.length && submissions.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Submissions</p>
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{submissions.length}</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
            {submissions.length === 0 && <p className="p-10 text-center text-sm text-gray-500 italic">No homework submissions yet.</p>}
            {submissions.map((submission) => (
              <div
                key={submission.id}
                onClick={() => setSelected(submission)}
                className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-4 ${selected?.id === submission.id ? 'bg-blue-50/50' : 'bg-white'}`}
              >
                <button onClick={(e) => toggleSelect(e, submission.id || '')} className="text-slate-300 hover:text-coha-900 transition-colors">
                  {selectedIds.includes(submission.id || '') ? <CheckSquare size={20} className="text-coha-900" /> : <Square size={20} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="font-black text-slate-900 truncate">{submission.studentName}</p>
                    <span className="text-[9px] font-bold text-slate-400">{submission.submittedAt?.toDate ? submission.submittedAt.toDate().toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">LVL: {submission.className || 'N/A'}</span>
                    <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${submission.matronName ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      BY: {submission.matronName || 'Parent'}
                    </span>
                  </div>
                </div>
              </div>
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
                    <button
                      type="button"
                      onClick={() => setFullscreenImage({ src: selected.imageBase64, name: `${selected.studentName} homework`, fileName: selected.fileName || `${selected.studentName}-homework.png` })}
                      className="h-full w-full"
                    >
                      <img src={selected.imageBase64} alt={selected.studentName} className="w-full h-full object-contain" />
                    </button>
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <ImageIcon size={28} />
                      <span>No image found</span>
                    </div>
                  )}
                </div>
                {selected.imageBase64 && (
                  <button
                    type="button"
                    onClick={() => triggerImageDownload(selected.imageBase64 || '', selected.fileName || `${selected.studentName}-homework.png`)}
                    className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-coha-900 px-4 text-sm font-bold text-white"
                  >
                    <Download size={16} /> Download
                  </button>
                )}
              </div>

              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Submission Details</p>
                <div className="space-y-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm font-bold text-gray-900">{selected.studentName}</p>
                    <p className="text-xs text-gray-500 mt-1">{selected.parentName}</p>
                    <p className="text-xs text-gray-500 mt-1">{selected.className || '-'}</p>
                    {selected.matronName && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-[10px] font-black uppercase text-coha-600">Submitted by Matron</p>
                        <p className="text-xs font-bold text-gray-700">{selected.matronName}</p>
                      </div>
                    )}
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
