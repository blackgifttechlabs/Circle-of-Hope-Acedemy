import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Image as ImageIcon, Search, XCircle } from 'lucide-react';
import { approvePaymentProof, getPaymentProofs, getStudentById, getSystemSettings, rejectPaymentProof, searchStudents } from '../../services/dataService';
import { PaymentProof, Student, SystemSettings } from '../../types';
import { Loader } from '../../components/ui/Loader';

interface PaymentsPageProps {
  user?: any;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ user }) => {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [termId, setTermId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [paymentProofs, setts] = await Promise.all([getPaymentProofs(), getSystemSettings()]);
    setProofs(paymentProofs);
    setSettings(setts);
    if (!selectedProof && paymentProofs.length > 0) {
      setSelectedProof(paymentProofs[0]);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedProof) return;
      const student = await getStudentById(selectedProof.studentId);
      setSelectedStudent(student);
      setSearch(selectedProof.studentName);
      setAmount(selectedProof.amountClaimed || '');
      setTermId(selectedProof.termId || settings?.activeTermId || settings?.schoolCalendars?.[0]?.id || '');
      setNotes(selectedProof.reviewNotes || '');
    })();
  }, [selectedProof?.id, settings?.activeTermId]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      const found = await searchStudents(search);
      setResults(found.slice(0, 8));
    }, 180);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleApprove = async () => {
    if (!selectedProof || !selectedStudent || !termId || !amount) return;
    setBusy(true);
    try {
      await approvePaymentProof({
        proofId: selectedProof.id!,
        studentId: selectedStudent.id,
        amount: parseFloat(amount),
        termId,
        academicYear: selectedStudent.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        adminName: user?.name || 'Admin',
        notes,
      });
      window.dispatchEvent(new CustomEvent('coha-payment-proof-update'));
      await load();
      const refreshed = await getPaymentProofs();
      const next = refreshed.find((item) => item.status === 'PENDING') || refreshed[0] || null;
      setSelectedProof(next);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProof) return;
    setBusy(true);
    try {
      await rejectPaymentProof(selectedProof.id!, selectedProof.studentId, user?.name || 'Admin', notes);
      window.dispatchEvent(new CustomEvent('coha-payment-proof-update'));
      await load();
      const refreshed = await getPaymentProofs();
      const next = refreshed.find((item) => item.status === 'PENDING') || refreshed[0] || null;
      setSelectedProof(next);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-coha-900">Payments</h2>
        <p className="text-sm text-gray-500">Review proof of payment uploads, match the learner, and generate official school receipts.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Proof Queue</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {proofs.length === 0 && <p className="p-5 text-sm text-gray-500">No payment proofs submitted yet.</p>}
            {proofs.map((proof) => (
              <button
                key={proof.id}
                onClick={() => setSelectedProof(proof)}
                className={`w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 ${selectedProof?.id === proof.id ? 'bg-blue-50' : 'bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{proof.studentName}</p>
                    <p className="text-xs text-gray-500 mt-1">{proof.parentName}</p>
                    <p className="text-xs text-gray-400 mt-1">{proof.termId} · {proof.amountClaimed || 'Amount pending'}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${proof.status === 'APPROVED' ? 'text-green-600' : proof.status === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>
                    {proof.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {!selectedProof ? (
            <div className="p-8 text-sm text-gray-500">Select a payment proof to review.</div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b 2xl:border-b-0 2xl:border-r border-gray-200 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Receipt Image</p>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 min-h-[480px] flex items-center justify-center overflow-hidden">
                  {selectedProof.imageBase64 ? (
                    <img src={selectedProof.imageBase64} alt={selectedProof.studentName} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <ImageIcon size={28} />
                      <span>No image found</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Review Payment</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Search student</label>
                    <div className="mt-2 relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl pl-10 pr-3 text-sm" placeholder="Search student name" />
                    </div>
                    {results.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                        {results.map((result) => (
                          <button key={result.id} onClick={() => { setSelectedStudent(result); setSearch(result.name); setResults([]); }} className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${selectedStudent?.id === result.id ? 'bg-blue-50' : ''}`}>
                            <p className="text-sm font-bold text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-500">{result.assignedClass || result.grade || result.level || '-'}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedStudent && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm font-bold text-gray-900">{selectedStudent.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedStudent.id} · {selectedStudent.assignedClass || selectedStudent.grade || selectedStudent.level || '-'}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Term</label>
                      <select value={termId} onChange={(e) => setTermId(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm">
                        {(settings?.schoolCalendars || []).map((term) => (
                          <option key={term.id} value={term.id}>{term.termName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Amount</label>
                      <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" placeholder="Enter amount" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Notes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm" placeholder="Optional review note" />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button disabled={busy || !selectedStudent || !amount || !termId} onClick={handleApprove} className="flex-1 h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} /> Approve & create receipt
                    </button>
                    <button disabled={busy} onClick={handleReject} className="px-5 h-12 rounded-xl border border-red-200 text-red-600 text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                      <XCircle size={18} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
