import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  ReceiptText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  approvePaymentProof,
  getPaymentProofs,
  getReceipts,
  getStudentById,
  getSystemSettings,
  recordAdminPayment,
  rejectPaymentProof,
  searchStudents,
} from '../../services/dataService';
import { PaymentProof, Receipt, Student, SystemSettings } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { Toast } from '../../components/ui/Toast';
import { getStudentParentEmail, getStudentParentPhone } from '../../utils/admissionMessaging';
import { getPaymentOptionLabel, getPaymentOptions, REGISTRATION_FEE_OPTION } from '../../utils/paymentOptions';
import { printSchoolReceipt } from '../../utils/printSchoolReceipt';

interface PaymentsPageProps {
  user?: any;
}

type PaymentsTab = 'INCOMING' | 'ADD' | 'RECEIPTS';
type PaymentCategory = 'FEES' | 'OTHER';

const fmtMoney = (value: number) => `N$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (value: any) => {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const getMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const SCHOOL_CONTACTS = {
  phone: '+264 81 666 4074',
  email: 'circleofhopeacademy@yahoo.com',
  website: 'www.coha-academy.com',
};

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('INCOMING');
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewResults, setReviewResults] = useState<Student[]>([]);
  const [reviewTermId, setReviewTermId] = useState('');
  const [reviewAmount, setReviewAmount] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState<Student[]>([]);
  const [manualStudent, setManualStudent] = useState<Student | null>(null);
  const [manualCategory, setManualCategory] = useState<PaymentCategory>('FEES');
  const [manualTermId, setManualTermId] = useState('');
  const [manualOtherLabel, setManualOtherLabel] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' | 'info' });
  const [notificationDraft, setNotificationDraft] = useState<{ student: Student; receipt: Receipt } | null>(null);

  const paymentOptions = useMemo(() => getPaymentOptions(settings), [settings]);
  const pendingProofs = useMemo(() => proofs.filter((proof) => proof.status === 'PENDING'), [proofs]);
  const filteredReceipts = useMemo(() => {
    const term = receiptSearch.trim().toLowerCase();
    if (!term) return receipts;
    return receipts.filter((receipt) => (
      receipt.number?.toLowerCase().includes(term) ||
      receipt.studentName?.toLowerCase().includes(term) ||
      receipt.studentClass?.toLowerCase().includes(term) ||
      receipt.paymentLabel?.toLowerCase().includes(term)
    ));
  }, [receipts, receiptSearch]);

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      return false;
    }
  };

  const load = async () => {
    const [paymentProofs, setts, receiptData] = await Promise.all([getPaymentProofs(), getSystemSettings(), getReceipts()]);
    const sortedProofs = [...paymentProofs].sort((a, b) => getMillis(b.submittedAt) - getMillis(a.submittedAt));
    const sortedReceipts = [...receiptData].sort((a, b) => getMillis(b.createdAt || b.generatedAt || b.date) - getMillis(a.createdAt || a.generatedAt || a.date));
    const nextPending = sortedProofs.find((item) => item.status === 'PENDING') || null;
    setProofs(sortedProofs);
    setReceipts(sortedReceipts);
    setSettings(setts);
    setSelectedProof((current) => {
      if (current && sortedProofs.some((item) => item.id === current.id && item.status === 'PENDING')) return current;
      return nextPending;
    });
    if (!manualTermId) {
      setManualTermId(setts?.activeTermId || setts?.schoolCalendars?.[0]?.id || REGISTRATION_FEE_OPTION);
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
      if (!selectedProof) {
        setSelectedStudent(null);
        return;
      }
      const student = await getStudentById(selectedProof.studentId);
      setSelectedStudent(student);
      setReviewSearch(selectedProof.studentName);
      setReviewAmount(selectedProof.amountClaimed || '');
      setReviewTermId(selectedProof.termId || settings?.activeTermId || settings?.schoolCalendars?.[0]?.id || REGISTRATION_FEE_OPTION);
      setReviewNotes(selectedProof.reviewNotes || '');
    })();
  }, [selectedProof?.id, settings?.activeTermId]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!reviewSearch.trim()) {
        setReviewResults([]);
        return;
      }
      const found = await searchStudents(reviewSearch);
      setReviewResults(found.slice(0, 8));
    }, 180);
    return () => clearTimeout(timeout);
  }, [reviewSearch]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!manualSearch.trim()) {
        setManualResults([]);
        return;
      }
      const found = await searchStudents(manualSearch);
      setManualResults(found.slice(0, 8));
    }, 180);
    return () => clearTimeout(timeout);
  }, [manualSearch]);

  const getReceiptLabel = (receipt: Receipt) => (
    receipt.paymentLabel ||
    getPaymentOptionLabel(receipt.termId, settings) ||
    (receipt.paymentCategory === 'OTHER' ? 'Other payment' : 'School fees')
  );

  const buildTransactionMessage = (student: Student, receipt: Receipt) => {
    const amount = parseFloat(receipt.amount || '0');
    const balance = receipt.balanceAfterPayment;
    return `Dear ${student.parentName || student.fatherName || student.motherName || 'Parent / Guardian'},

${settings?.schoolName || 'Circle of Hope Academy'} confirms that a payment has been recorded for ${student.name}.

Transaction details
- Receipt number: ${receipt.number}
- Student ID: ${student.id}
- Student class: ${student.assignedClass || student.grade || student.level || '-'}
- Payment for: ${getReceiptLabel(receipt)}
- Amount paid: ${fmtMoney(amount)}
- Date recorded: ${fmtDate(receipt.generatedAt || receipt.createdAt || receipt.date)}
- Recorded by: ${receipt.generatedBy || user?.name || 'Admin'}${typeof balance === 'number' ? `\n- Fee balance after payment: ${fmtMoney(balance)}` : ''}
${receipt.notes ? `- Notes: ${receipt.notes}` : ''}

School details
- ${settings?.schoolName || 'Circle of Hope Academy'}
- Phone: ${SCHOOL_CONTACTS.phone}
- Email: ${SCHOOL_CONTACTS.email}
- Website: ${SCHOOL_CONTACTS.website}

This receipt is available in the parent portal.`;
  };

  const calculateFeeTotalsForStudent = (studentId: string, receipt?: Receipt) => {
    let total = 0;
    (settings?.fees || []).forEach((fee) => {
      const amount = parseFloat(fee.amount) || 0;
      let multiplier = 1;
      if (fee.frequency === 'Monthly') multiplier = 12;
      else if (fee.frequency === 'Termly') multiplier = 3;
      total += amount * multiplier;
    });

    const paid = receipts
      .filter((item) => item.usedByStudentId === studentId && item.paymentCategory !== 'OTHER')
      .reduce((sum, item) => sum + (parseFloat(item.amount || '0') || 0), 0);

    return {
      paid,
      balance: typeof receipt?.balanceAfterPayment === 'number' ? receipt.balanceAfterPayment : total - paid,
    };
  };

  const handleViewReceipt = async (receipt: Receipt) => {
    if (!receipt.usedByStudentId) {
      setToast({ msg: 'This receipt is not linked to a student record.', show: true, type: 'error' });
      return;
    }

    setBusy(true);
    try {
      const student = await getStudentById(receipt.usedByStudentId);
      if (!student) {
        setToast({ msg: 'Student record not found for this receipt.', show: true, type: 'error' });
        return;
      }

      await printSchoolReceipt(student, receipt, calculateFeeTotalsForStudent(student.id, receipt), { mode: 'open' });
    } finally {
      setBusy(false);
    }
  };

  const openEmailDraft = async (student: Student, receipt: Receipt) => {
    const parentEmail = getStudentParentEmail(student);
    const body = buildTransactionMessage(student, receipt);
    await copyToClipboard(body);
    if (!parentEmail) {
      setToast({ msg: 'Message copied, but this student has no parent email on file.', show: true, type: 'info' });
      return;
    }
    const subject = `Payment Receipt ${receipt.number}: ${student.name}`;
    window.location.href = `mailto:${parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setNotificationDraft(null);
  };

  const openWhatsappDraft = (student: Student, receipt: Receipt) => {
    const phone = getStudentParentPhone(student);
    const body = buildTransactionMessage(student, receipt);
    if (!phone) {
      copyToClipboard(body);
      setToast({ msg: 'Message copied, but this student has no parent WhatsApp number on file.', show: true, type: 'info' });
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
    setNotificationDraft(null);
  };

  const selectReviewStudent = (student: Student) => {
    setSelectedStudent(student);
    setReviewSearch(student.name);
    setReviewResults([]);
  };

  const selectManualStudent = (student: Student) => {
    setManualStudent(student);
    setManualSearch(student.name);
    setManualResults([]);
  };

  const handleApprove = async () => {
    if (!selectedProof || !selectedStudent || !reviewTermId || !reviewAmount) return;
    setBusy(true);
    try {
      const result = await approvePaymentProof({
        proofId: selectedProof.id!,
        studentId: selectedStudent.id,
        amount: parseFloat(reviewAmount),
        termId: reviewTermId,
        academicYear: selectedStudent.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        adminName: user?.name || 'Admin',
        notes: reviewNotes,
      });
      if (!result.success) {
        setToast({ msg: result.message || 'Payment approval failed.', show: true, type: 'error' });
        return;
      }

      const [updatedStudent, receiptData] = await Promise.all([
        getStudentById(selectedStudent.id),
        getReceipts(),
      ]);
      const receipt = receiptData.find((item) => item.id === result.receiptId) || receiptData.find((item) => item.number === result.receiptNumber);
      if (updatedStudent && receipt) {
        setNotificationDraft({ student: updatedStudent, receipt });
      }

      setToast({ msg: `Payment approved and receipt ${result.receiptNumber} created.`, show: true, type: 'success' });
      window.dispatchEvent(new CustomEvent('coha-payment-proof-update'));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProof) return;
    setBusy(true);
    try {
      await rejectPaymentProof(selectedProof.id!, selectedProof.studentId, user?.name || 'Admin', reviewNotes);
      setToast({ msg: 'Payment proof rejected.', show: true, type: 'info' });
      window.dispatchEvent(new CustomEvent('coha-payment-proof-update'));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleManualPayment = async () => {
    if (!manualStudent || !manualAmount || (manualCategory === 'FEES' && !manualTermId) || (manualCategory === 'OTHER' && !manualOtherLabel.trim())) {
      setToast({ msg: 'Select a student, enter the amount, and complete the payment details.', show: true, type: 'error' });
      return;
    }

    setBusy(true);
    try {
      const result = await recordAdminPayment({
        studentId: manualStudent.id,
        amount: parseFloat(manualAmount),
        paymentCategory: manualCategory,
        termId: manualCategory === 'FEES' ? manualTermId : '',
        paymentLabel: manualCategory === 'OTHER' ? manualOtherLabel : undefined,
        academicYear: manualStudent.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        adminName: user?.name || 'Admin',
        notes: manualNotes,
      });

      if (!result.success || !result.receipt || !result.student) {
        setToast({ msg: result.message || 'Could not process payment.', show: true, type: 'error' });
        return;
      }

      setToast({ msg: `Payment processed. Receipt ${result.receipt.number} created.`, show: true, type: 'success' });
      setNotificationDraft({ student: result.student, receipt: result.receipt });
      setManualAmount('');
      setManualNotes('');
      setManualOtherLabel('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ ...toast, show: false })} variant={toast.type} />
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-coha-900">Payments</h2>
          <p className="text-sm text-gray-500">Confirm incoming proofs, enter office payments, and keep the receipt log in one place.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-1 flex flex-wrap gap-1">
          {[
            { id: 'INCOMING' as const, label: `Incoming (${pendingProofs.length})` },
            { id: 'ADD' as const, label: 'Add Payment' },
            { id: 'RECEIPTS' as const, label: `Receipts (${receipts.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.14em] ${activeTab === tab.id ? 'bg-coha-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'INCOMING' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Needs Confirmation</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {pendingProofs.length === 0 && <p className="p-5 text-sm text-gray-500">No incoming payment proofs need confirmation.</p>}
              {pendingProofs.map((proof) => (
                <button
                  key={proof.id}
                  onClick={() => setSelectedProof(proof)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-gray-50 ${selectedProof?.id === proof.id ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{proof.studentName}</p>
                      <p className="text-xs text-gray-500 mt-1">{proof.parentName}</p>
                      <p className="text-xs text-gray-400 mt-1">{getPaymentOptionLabel(proof.termId, settings)} - {proof.amountClaimed || 'Amount pending'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">{proof.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {!selectedProof ? (
              <div className="p-8 text-sm text-gray-500">Select an incoming payment proof to review.</div>
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
                    <StudentSearchBox
                      label="Search student"
                      value={reviewSearch}
                      onChange={setReviewSearch}
                      results={reviewResults}
                      selectedStudent={selectedStudent}
                      onSelect={selectReviewStudent}
                    />

                    <PaymentStudentCard student={selectedStudent} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Payment For</label>
                        <select value={reviewTermId} onChange={(e) => setReviewTermId(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm">
                          {paymentOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Amount</label>
                        <input value={reviewAmount} onChange={(e) => setReviewAmount(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" placeholder="Enter amount" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Notes</label>
                      <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={4} className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm" placeholder="Optional review note" />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button disabled={busy || !selectedStudent || !reviewAmount || !reviewTermId} onClick={handleApprove} className="flex-1 h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
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
      )}

      {activeTab === 'ADD' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-5xl">
          <div className="flex items-start gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-coha-900 text-white flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Add Office Payment</h3>
              <p className="text-sm text-gray-500 mt-1">Search the student, enter the amount, choose fees or another payment type, then process the receipt.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <StudentSearchBox
                label="Search student"
                value={manualSearch}
                onChange={setManualSearch}
                results={manualResults}
                selectedStudent={manualStudent}
                onSelect={selectManualStudent}
              />
              <PaymentStudentCard student={manualStudent} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Payment Type</label>
                  <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value as PaymentCategory)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm">
                    <option value="FEES">School Fees</option>
                    <option value="OTHER">Other Payment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Amount Paid</label>
                  <input value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" placeholder="Enter amount" />
                </div>
              </div>

              {manualCategory === 'FEES' ? (
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Term / Fee</label>
                  <select value={manualTermId} onChange={(e) => setManualTermId(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm">
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Other Payment For</label>
                  <input value={manualOtherLabel} onChange={(e) => setManualOtherLabel(e.target.value)} className="mt-2 w-full h-11 border border-gray-200 rounded-xl px-3 text-sm" placeholder="Uniform, stationery, transport..." />
                </div>
              )}

              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Notes</label>
                <textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} rows={4} className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm" placeholder="Optional receipt note" />
              </div>

              <button disabled={busy || !manualStudent || !manualAmount} onClick={handleManualPayment} className="w-full h-12 rounded-xl bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <ReceiptText size={18} /> Process Payment & Create Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RECEIPTS' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Receipt Log</p>
              <p className="text-sm text-gray-500 mt-1">All official receipts, including receipts created from parent proof approvals.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={receiptSearch} onChange={(e) => setReceiptSearch(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl pl-10 pr-3 text-sm" placeholder="Search receipt or student" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-4">Receipt</th>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Payment For</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">By</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id || receipt.number} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-mono text-sm font-black text-coha-900">{receipt.number}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{receipt.studentName || receipt.usedByStudentId || '-'}</p>
                      <p className="text-xs text-gray-500">{receipt.studentClass || '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase ${receipt.paymentCategory === 'OTHER' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                        {getReceiptLabel(receipt)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-gray-500">{fmtDate(receipt.generatedAt || receipt.createdAt || receipt.date)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{receipt.generatedBy || '-'}</td>
                    <td className="px-5 py-4 text-right font-black text-gray-900">{fmtMoney(parseFloat(receipt.amount || '0'))}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleViewReceipt(receipt)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-coha-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-coha-800 hover:bg-coha-900 hover:text-white disabled:opacity-50"
                      >
                        <ReceiptText size={14} /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReceipts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">No receipts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {notificationDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Send Parent Notification?</h3>
                <p className="text-sm text-gray-500 mt-1">Receipt {notificationDraft.receipt.number} was created for {notificationDraft.student.name}.</p>
              </div>
              <button onClick={() => setNotificationDraft(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Draft includes</p>
              <p className="text-sm font-semibold text-gray-800 mt-2">
                Student, receipt number, amount, payment type, balance after payment, and school contact details.
              </p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => openEmailDraft(notificationDraft.student, notificationDraft.receipt)} className="h-12 rounded-xl bg-coha-900 text-white text-sm font-bold inline-flex items-center justify-center gap-2">
                <Mail size={16} /> Email
              </button>
              <button onClick={() => openWhatsappDraft(notificationDraft.student, notificationDraft.receipt)} className="h-12 rounded-xl bg-green-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2">
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button onClick={() => setNotificationDraft(null)} className="h-12 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentSearchBox: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  results: Student[];
  selectedStudent: Student | null;
  onSelect: (student: Student) => void;
}> = ({ label, value, onChange, results, selectedStudent, onSelect }) => (
  <div>
    <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{label}</label>
    <div className="mt-2 relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-11 border border-gray-200 rounded-xl pl-10 pr-3 text-sm" placeholder="Search student name" />
    </div>
    {results.length > 0 && (
      <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
        {results.map((result) => (
          <button key={result.id} onClick={() => onSelect(result)} className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${selectedStudent?.id === result.id ? 'bg-blue-50' : ''}`}>
            <p className="text-sm font-bold text-gray-900">{result.name}</p>
            <p className="text-xs text-gray-500">{result.assignedClass || result.grade || result.level || '-'}</p>
          </button>
        ))}
      </div>
    )}
  </div>
);

const PaymentStudentCard: React.FC<{ student: Student | null }> = ({ student }) => {
  if (!student) return null;
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
      <p className="text-sm font-bold text-gray-900">{student.name}</p>
      <p className="text-xs text-gray-500 mt-1">{student.id} - {student.assignedClass || student.grade || student.level || '-'}</p>
      <p className="text-xs text-gray-500 mt-1">{student.parentName || 'Parent / Guardian'}</p>
    </div>
  );
};
