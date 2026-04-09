import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  CreditCard,
  Download,
  FileImage,
  FilePlus2,
  FolderUp,
  Home,
  Loader2,
  ShieldCheck,
  Upload,
  User,
} from 'lucide-react';
import {
  getHomeworkAssignmentsForClass,
  getHomeworkSubmissionsForStudent,
  getPaymentProofsForStudent,
  getReceiptsForStudent,
  getStudentById,
  getStudentDocuments,
  getSystemSettings,
  getTeacherByClass,
  submitHomeworkSubmission,
  submitPaymentProof,
  uploadStudentDocument,
} from '../../services/dataService';
import { HomeworkAssignment, HomeworkSubmission, PaymentProof, Receipt, Student, SystemSettings, Teacher, UploadedDocument } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { printSchoolReceipt } from '../../utils/printSchoolReceipt';

interface ParentDashboardProps {
  user: any;
}

type ParentTab = 'home' | 'details' | 'receipts' | 'homework' | 'documents';

const TABS: { id: ParentTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={18} /> },
  { id: 'details', label: 'Details', icon: <User size={18} /> },
  { id: 'receipts', label: 'Receipts', icon: <CreditCard size={18} /> },
  { id: 'homework', label: 'Homework', icon: <BookOpen size={18} /> },
  { id: 'documents', label: 'Documents', icon: <FolderUp size={18} /> },
];

const fmtMoney = (value: number) => `N$ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (value: any) => {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Row: React.FC<{ label: string; value?: React.ReactNode; emphasis?: boolean }> = ({ label, value, emphasis }) => (
  <div className="py-3 border-b border-slate-200 last:border-b-0">
    <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-slate-400 mb-1">{label}</p>
    <div className={`text-sm ${emphasis ? 'font-bold text-slate-950' : 'text-slate-700'}`}>{value || '-'}</div>
  </div>
);

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as ParentTab) || 'home';

  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [paymentTerm, setPaymentTerm] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);

  const [birthFile, setBirthFile] = useState<File | null>(null);
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [otherFile, setOtherFile] = useState<File | null>(null);
  const [otherTitle, setOtherTitle] = useState('');

  const paymentFileRef = useRef<HTMLInputElement>(null);
  const homeworkFileRef = useRef<HTMLInputElement>(null);
  const birthFileRef = useRef<HTMLInputElement>(null);
  const medicalFileRef = useRef<HTMLInputElement>(null);
  const otherFileRef = useRef<HTMLInputElement>(null);

  const currentTerm = useMemo(() => {
    const activeTerm = settings?.schoolCalendars?.find((term) => term.id === settings?.activeTermId);
    return activeTerm || settings?.schoolCalendars?.[0] || null;
  }, [settings]);

  const academicYear = student?.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const financials = useMemo(() => {
    let total = 0;
    (settings?.fees || []).forEach((fee) => {
      const amount = parseFloat(fee.amount) || 0;
      let multiplier = 1;
      if (fee.frequency === 'Monthly') multiplier = 12;
      else if (fee.frequency === 'Termly') multiplier = 3;
      total += amount * multiplier;
    });
    const paid = receipts.reduce((sum, receipt) => sum + (parseFloat(receipt.amount) || 0), 0);
    return { total, paid, balance: total - paid };
  }, [settings, receipts]);

  const refreshData = async () => {
    if (!user?.id) return;
    const stud = await getStudentById(user.id);
    const setts = await getSystemSettings();
    setStudent(stud);
    setSettings(setts);

    if (stud?.assignedClass) {
      const classTeacher = await getTeacherByClass(stud.assignedClass);
      setTeacher(classTeacher);
      const classAssignments = await getHomeworkAssignmentsForClass(stud.assignedClass);
      setAssignments(classAssignments);
    } else {
      setTeacher(null);
      setAssignments([]);
    }

    const [studentReceipts, proofs, submissions, docs] = await Promise.all([
      getReceiptsForStudent(user.id),
      getPaymentProofsForStudent(user.id),
      getHomeworkSubmissionsForStudent(user.id),
      getStudentDocuments(user.id),
    ]);

    setReceipts(studentReceipts.filter((item) => item.type !== 'BANK_REFERENCE' || item.usedByStudentId));
    setPaymentProofs(proofs);
    setHomeworkSubmissions(submissions);
    setDocuments(docs);
  };

  useEffect(() => {
    (async () => {
      await refreshData();
      setLoading(false);
    })();
  }, [user?.id]);

  const setActiveTab = (nextTab: ParentTab) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('tab', nextTab);
      return updated;
    });
  };

  const handlePaymentSubmit = async () => {
    if (!student || !paymentFile || !paymentTerm) return;
    setBusyAction('payment');
    try {
      const imageBase64 = await fileToDataUrl(paymentFile);
      await submitPaymentProof({
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName || user?.name || 'Parent',
        studentClass: student.assignedClass || student.grade || student.level || '',
        academicYear,
        termId: paymentTerm,
        amountClaimed: paymentAmount,
        imageBase64,
        fileName: paymentFile.name,
        mimeType: paymentFile.type,
      });
      setPaymentFile(null);
      setPaymentAmount('');
      setPaymentTerm(currentTerm?.id || paymentTerm);
      if (paymentFileRef.current) paymentFileRef.current.value = '';
      await refreshData();
      setActiveTab('receipts');
    } finally {
      setBusyAction(null);
    }
  };

  const handleHomeworkSubmit = async () => {
    if (!student || !homeworkFile) return;
    setBusyAction('homework');
    try {
      const imageBase64 = await fileToDataUrl(homeworkFile);
      await submitHomeworkSubmission({
        assignmentId: selectedAssignmentId || undefined,
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName || user?.name || 'Parent',
        className: student.assignedClass || student.grade || student.level || '',
        imageBase64,
        fileName: homeworkFile.name,
        mimeType: homeworkFile.type,
      });
      setHomeworkFile(null);
      setSelectedAssignmentId('');
      if (homeworkFileRef.current) homeworkFileRef.current.value = '';
      await refreshData();
    } finally {
      setBusyAction(null);
    }
  };

  const uploadDocument = async (documentType: UploadedDocument['documentType'], file: File | null, title: string, reset: () => void) => {
    if (!student || !file) return;
    setBusyAction(documentType);
    try {
      const fileBase64 = await fileToDataUrl(file);
      await uploadStudentDocument({
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName || user?.name || 'Parent',
        documentType,
        title,
        fileName: file.name,
        mimeType: file.type,
        fileBase64,
      });
      reset();
      await refreshData();
    } finally {
      setBusyAction(null);
    }
  };

  const downloadReceipt = async (receipt: Receipt) => {
    if (!student) return;
    await printSchoolReceipt(student, receipt, {
      paid: financials.paid,
      balance: financials.balance,
    });
  };

  useEffect(() => {
    if (!paymentTerm && currentTerm?.id) {
      setPaymentTerm(currentTerm.id);
    }
  }, [currentTerm?.id, paymentTerm]);

  if (loading) return <Loader />;
  if (!student) return <div className="p-6 text-sm text-slate-500">Student not found.</div>;

  const renderHome = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[1.65rem] leading-none font-black tracking-[-0.05em] text-slate-950">
              {student.parentName || user?.name || 'Parent'}
            </h1>
            <p className="text-sm text-slate-600 mt-2">Parent for <span className="font-bold text-slate-900">{student.name}</span></p>
            <button onClick={() => setActiveTab('details')} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-coha-700">
              Student details <ChevronRight size={16} />
            </button>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Class</p>
            <p className="text-sm font-bold text-slate-900">{student.assignedClass || student.grade || student.level || '-'}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mt-3">Academic Year</p>
            <p className="text-sm font-bold text-slate-900">{academicYear}</p>
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mt-3">Term</p>
            <p className="text-sm font-bold text-slate-900">{currentTerm?.termName || 'Current Term'}</p>
          </div>
        </div>
      </section>

      <section className="py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Fees Summary</p>
          <p className={`text-xs font-bold ${financials.balance <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {financials.balance <= 0 ? 'Up to date' : 'Balance due'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.16em] font-bold">Total</p>
            <p className="font-bold text-slate-900 mt-1">{fmtMoney(financials.total)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.16em] font-bold">Paid</p>
            <p className="font-bold text-emerald-700 mt-1">{fmtMoney(financials.paid)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.16em] font-bold">Balance</p>
            <p className="font-bold text-slate-900 mt-1">{fmtMoney(financials.balance)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setActiveTab('receipts')} className="flex-1 h-11 text-sm font-semibold border border-slate-300 text-slate-800">
            View receipts
          </button>
          <button onClick={() => setActiveTab('receipts')} className="flex-1 h-11 text-sm font-semibold bg-coha-900 text-white">
            Send proof of payment
          </button>
        </div>
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Quick Actions</p>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('homework')} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800">
            Submit homework
          </button>
          <button onClick={() => setActiveTab('documents')} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800">
            Upload documents
          </button>
        </div>
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Overview</p>
        <Row label="Portal status" value={student.studentStatus.replace(/_/g, ' ')} emphasis />
        <Row label="Class teacher" value={teacher?.name || 'Not assigned'} />
        <Row label="Latest payment proof" value={paymentProofs[0] ? `${paymentProofs[0].status} · ${fmtDate(paymentProofs[0].submittedAt)}` : 'No proof sent yet'} />
        <Row label="Latest homework upload" value={homeworkSubmissions[0] ? `${fmtDate(homeworkSubmissions[0].submittedAt)} · ${homeworkSubmissions[0].status}` : 'No homework uploaded yet'} />
      </section>
    </div>
  );

  const renderDetails = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1">Student Details</p>
        <Row label="Student name" value={student.name} emphasis />
        <Row label="Student ID" value={student.id} />
        <Row label="Date of birth" value={student.dob} />
        <Row label="Gender" value={student.gender} />
        <Row label="Division" value={student.division} />
        <Row label="Class" value={student.assignedClass || student.grade || student.level} />
        <Row label="Academic year" value={academicYear} />
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1">Parent Details</p>
        <Row label="Parent / guardian" value={student.parentName || '-'} emphasis />
        <Row label="Father name" value={student.fatherName} />
        <Row label="Father phone" value={student.fatherPhone} />
        <Row label="Mother name" value={student.motherName} />
        <Row label="Mother phone" value={student.motherPhone} />
        <Row label="Address" value={student.address} />
      </section>
    </div>
  );

  const renderReceipts = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400">Send Proof Of Payment</p>
          <span className="text-xs text-slate-500">{currentTerm?.termName || 'Current term'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} className="h-11 border border-slate-300 bg-white px-3 text-sm">
            {(settings?.schoolCalendars || []).map((term) => (
              <option key={term.id} value={term.id}>{term.termName}</option>
            ))}
          </select>
          <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount paid" className="h-11 border border-slate-300 px-3 text-sm" />
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => paymentFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
            <FileImage size={16} /> {paymentFile ? 'Change image' : 'Take / choose receipt'}
          </button>
          <button disabled={!paymentFile || !paymentTerm || busyAction === 'payment'} onClick={handlePaymentSubmit} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busyAction === 'payment' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Send proof
          </button>
        </div>
        <input ref={paymentFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
        {paymentFile && <p className="mt-2 text-xs text-slate-500">{paymentFile.name}</p>}
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Submitted Proofs</p>
        <div className="space-y-3">
          {paymentProofs.length === 0 && <p className="text-sm text-slate-500">No payment proofs submitted yet.</p>}
          {paymentProofs.map((proof) => (
            <div key={proof.id} className="border-b border-slate-200 pb-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{proof.termId}</p>
                  <p className="text-xs text-slate-500">{fmtDate(proof.submittedAt)}</p>
                </div>
                <span className={`text-[11px] font-bold ${proof.status === 'APPROVED' ? 'text-emerald-600' : proof.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'}`}>
                  {proof.status}
                </span>
              </div>
              {proof.amountClaimed && <p className="text-sm text-slate-600 mt-1">Claimed amount: {proof.amountClaimed}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Official Receipts</p>
        <div className="space-y-3">
          {receipts.length === 0 && <p className="text-sm text-slate-500">No approved school receipts yet.</p>}
          {receipts.map((receipt) => (
            <div key={receipt.id} className="border-b border-slate-200 pb-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{receipt.number}</p>
                  <p className="text-xs text-slate-500">{fmtDate(receipt.generatedAt || receipt.createdAt || receipt.date)}</p>
                </div>
                <button onClick={() => downloadReceipt(receipt)} className="inline-flex items-center gap-1 text-sm font-semibold text-coha-700">
                  <Download size={15} /> PDF
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">{receipt.termId || 'School fee payment'}</span>
                <span className="font-bold text-slate-900">{fmtMoney(parseFloat(receipt.amount || '0'))}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderHomework = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Submit Homework</p>
        <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)} className="w-full h-11 border border-slate-300 bg-white px-3 text-sm mb-2">
          <option value="">Select homework task</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>{assignment.title}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={() => homeworkFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
            <FileImage size={16} /> {homeworkFile ? 'Change photo' : 'Take homework photo'}
          </button>
          <button disabled={!homeworkFile || busyAction === 'homework'} onClick={handleHomeworkSubmit} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busyAction === 'homework' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Send homework
          </button>
        </div>
        <input ref={homeworkFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setHomeworkFile(e.target.files?.[0] || null)} />
        {homeworkFile && <p className="mt-2 text-xs text-slate-500">{homeworkFile.name}</p>}
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Teacher Homework</p>
        <div className="space-y-3">
          {assignments.length === 0 && <p className="text-sm text-slate-500">No homework posted for this class yet.</p>}
          {assignments.map((assignment) => (
            <div key={assignment.id} className="border-b border-slate-200 pb-3 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{assignment.description}</p>
                </div>
                {assignment.dueDate && <span className="text-xs font-semibold text-slate-600">Due {fmtDate(assignment.dueDate)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">My Uploads</p>
        <div className="space-y-3">
          {homeworkSubmissions.length === 0 && <p className="text-sm text-slate-500">No homework images sent yet.</p>}
          {homeworkSubmissions.map((submission) => (
            <div key={submission.id} className="border-b border-slate-200 pb-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{fmtDate(submission.submittedAt)}</p>
                  <p className="text-xs text-slate-500">{submission.assignmentId ? 'Linked to assignment' : 'General homework upload'}</p>
                </div>
                <span className={`text-[11px] font-bold ${submission.status === 'REVIEWED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {submission.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderDocuments = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Birth Certificate</p>
        <div className="flex gap-2">
          <button onClick={() => birthFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
            <FilePlus2 size={16} /> {birthFile ? 'Change file' : 'Upload PDF or image'}
          </button>
          <button disabled={!birthFile || busyAction === 'BIRTH_CERTIFICATE'} onClick={() => uploadDocument('BIRTH_CERTIFICATE', birthFile, 'Birth Certificate', () => { setBirthFile(null); if (birthFileRef.current) birthFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
            Save
          </button>
        </div>
        <input ref={birthFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => setBirthFile(e.target.files?.[0] || null)} />
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Medical Documents</p>
        <div className="flex gap-2">
          <button onClick={() => medicalFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
            <ShieldCheck size={16} /> {medicalFile ? 'Change file' : 'Upload PDF or image'}
          </button>
          <button disabled={!medicalFile || busyAction === 'MEDICAL_DOCUMENT'} onClick={() => uploadDocument('MEDICAL_DOCUMENT', medicalFile, 'Medical Document', () => { setMedicalFile(null); if (medicalFileRef.current) medicalFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
            Save
          </button>
        </div>
        <input ref={medicalFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => setMedicalFile(e.target.files?.[0] || null)} />
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Other Documents</p>
        <input value={otherTitle} onChange={(e) => setOtherTitle(e.target.value)} placeholder="Document title" className="w-full h-11 border border-slate-300 px-3 text-sm mb-2" />
        <div className="flex gap-2">
          <button onClick={() => otherFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
            <FilePlus2 size={16} /> {otherFile ? 'Change file' : 'Upload PDF or image'}
          </button>
          <button disabled={!otherFile || !otherTitle || busyAction === 'OTHER_DOCUMENT'} onClick={() => uploadDocument('OTHER_DOCUMENT', otherFile, otherTitle, () => { setOtherFile(null); setOtherTitle(''); if (otherFileRef.current) otherFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
            Save
          </button>
        </div>
        <input ref={otherFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => setOtherFile(e.target.files?.[0] || null)} />
      </section>

      <section className="py-4 border-b border-slate-200">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-3">Uploaded Documents</p>
        <div className="space-y-3">
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
          {documents.map((item) => (
            <div key={item.id} className="border-b border-slate-200 pb-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.documentType.replace(/_/g, ' ')} · {fmtDate(item.uploadedAt)}</p>
                </div>
                <a href={item.fileBase64} download={item.fileName} className="inline-flex items-center gap-1 text-sm font-semibold text-coha-700">
                  <Download size={15} /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="-m-5 min-h-[calc(100vh-64px)] bg-[#f7f8fa] text-slate-900">
      <div className="max-w-4xl mx-auto px-3 sm:px-5 pb-24">
        <div className="pt-3 sticky top-0 z-10 bg-[#f7f8fa] border-b border-slate-200">
          <div className="flex gap-2 overflow-x-auto pb-3">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`h-9 px-3 whitespace-nowrap text-sm font-semibold border ${tab === item.id ? 'bg-coha-900 border-coha-900 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'home' && renderHome()}
        {tab === 'details' && renderDetails()}
        {tab === 'receipts' && renderReceipts()}
        {tab === 'homework' && renderHomework()}
        {tab === 'documents' && renderDocuments()}
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/98 backdrop-blur">
        <div className="grid grid-cols-5">
          {TABS.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${tab === item.id ? 'text-coha-900' : 'text-slate-500'}`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
