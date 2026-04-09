import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  FileBadge2,
  FileImage,
  FileText,
  FilePlus2,
  FolderUp,
  GraduationCap,
  Home,
  Loader2,
  RefreshCw,
  Settings,
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
  updateStudent,
  uploadStudentDocument,
} from '../../services/dataService';
import { HomeworkAssignment, HomeworkSubmission, PaymentProof, Receipt, Student, SystemSettings, Teacher, UploadedDocument } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { printSchoolReceipt } from '../../utils/printSchoolReceipt';
import { ParentBottomNav, ParentPrimaryTab } from '../../components/ParentBottomNav';

interface ParentDashboardProps {
  user: any;
  onLogout?: () => void;
}

type ParentTab = ParentPrimaryTab;

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
    <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-700 mb-1">{label}</p>
    <div className={`text-sm ${emphasis ? 'font-bold text-slate-950' : 'text-slate-700'}`}>{value || '-'}</div>
  </div>
);

const SectionLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="inline-flex items-center gap-2 mb-3 text-[11px] uppercase tracking-[0.18em] font-black text-slate-700">
    <span className="text-coha-800">{icon}</span>
    <span>{children}</span>
  </div>
);

const MiniLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ icon, children, className = '' }) => (
  <div className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-black text-slate-700 ${className}`}>
    <span className="text-coha-800">{icon}</span>
    <span>{children}</span>
  </div>
);

const DetailTable: React.FC<{ rows: Array<{ label: string; value: React.ReactNode }> }> = ({ rows }) => (
  <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
    <table className="w-full text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
            <td className="w-[42%] px-4 py-3 text-[11px] uppercase tracking-[0.18em] font-black text-slate-700 bg-slate-50 align-top">
              {row.label}
            </td>
            <td className="px-4 py-3 font-semibold text-slate-900 align-top">
              {row.value || '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const getInitialLetter = (name?: string) => (name?.trim()?.charAt(0) || 'S').toUpperCase();

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
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
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentMessageType, setPaymentMessageType] = useState<'success' | 'error'>('success');
  const [homeworkMessage, setHomeworkMessage] = useState('');
  const [homeworkMessageType, setHomeworkMessageType] = useState<'success' | 'error'>('success');
  const [changedPinValue, setChangedPinValue] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const paymentFileRef = useRef<HTMLInputElement>(null);
  const paymentDeviceFileRef = useRef<HTMLInputElement>(null);
  const homeworkFileRef = useRef<HTMLInputElement>(null);
  const birthFileRef = useRef<HTMLInputElement>(null);
  const medicalFileRef = useRef<HTMLInputElement>(null);
  const otherFileRef = useRef<HTMLInputElement>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);

  const currentTerm = useMemo(() => {
    const activeTerm = settings?.schoolCalendars?.find((term) => term.id === settings?.activeTermId);
    return activeTerm || settings?.schoolCalendars?.[0] || null;
  }, [settings]);

  const academicYear = student?.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const schoolName = settings?.schoolName || 'Circle of Hope Academy';
  const studentProfileImage = student?.profileImageBase64 || '';
  const studentInitial = getInitialLetter(student?.name);
  const getTermLabel = (termId?: string) => settings?.schoolCalendars?.find((term) => term.id === termId)?.termName || termId || '-';

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
  const paidPercent = financials.total > 0 ? Math.min(100, Math.round((financials.paid / financials.total) * 100)) : 0;
  const balancePercent = financials.total > 0 ? Math.min(100, Math.round((Math.max(financials.balance, 0) / financials.total) * 100)) : 0;

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
    if (!student) {
      setPaymentMessageType('error');
      setPaymentMessage('Student record not found.');
      return;
    }
    if (!paymentTerm) {
      setPaymentMessageType('error');
      setPaymentMessage('Please select the school term first.');
      return;
    }
    if (!paymentFile) {
      setPaymentMessageType('error');
      setPaymentMessage('Please take or choose a receipt photo first.');
      return;
    }
    setBusyAction('payment');
    setPaymentMessage('');
    try {
      const imageBase64 = await fileToDataUrl(paymentFile);
      const result = await submitPaymentProof({
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
      if (!result.success) {
        setPaymentMessageType('error');
        setPaymentMessage('Failed to send proof of payment. Please try again.');
        return;
      }
      setPaymentFile(null);
      setPaymentAmount('');
      setPaymentTerm(currentTerm?.id || paymentTerm);
      if (paymentFileRef.current) paymentFileRef.current.value = '';
      if (paymentDeviceFileRef.current) paymentDeviceFileRef.current.value = '';
      await refreshData();
      setPaymentMessageType('success');
      setPaymentMessage('Proof of payment sent successfully.');
      setActiveTab('receipts');
    } catch (error) {
      console.error('Payment proof submission failed:', error);
      setPaymentMessageType('error');
      setPaymentMessage('Could not send proof of payment. Check your connection and try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleHomeworkSubmit = async () => {
    if (!student) {
      setHomeworkMessageType('error');
      setHomeworkMessage('Student record not found.');
      return;
    }
    if (!homeworkFile) {
      setHomeworkMessageType('error');
      setHomeworkMessage('Please choose or capture a homework image first.');
      return;
    }
    setBusyAction('homework');
    setHomeworkMessage('');
    try {
      const imageBase64 = await fileToDataUrl(homeworkFile);
      const result = await submitHomeworkSubmission({
        assignmentId: selectedAssignmentId || undefined,
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName || user?.name || 'Parent',
        className: student.assignedClass || student.grade || student.level || '',
        imageBase64,
        fileName: homeworkFile.name,
        mimeType: homeworkFile.type,
      });
      if (!result.success) {
        setHomeworkMessageType('error');
        setHomeworkMessage('Homework upload failed. Please try again.');
        return;
      }
      setHomeworkFile(null);
      setSelectedAssignmentId('');
      if (homeworkFileRef.current) homeworkFileRef.current.value = '';
      await refreshData();
      setHomeworkMessageType('success');
      setHomeworkMessage('Homework image sent successfully.');
    } catch (error) {
      console.error('Homework submission failed:', error);
      setHomeworkMessageType('error');
      setHomeworkMessage('Failed to send homework. Check your connection and try again.');
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
    <div className="-mx-3 sm:-mx-5">
      <section className="bg-coha-900 px-4 pt-4 pb-10 text-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.2rem] font-black tracking-[0.14em] uppercase truncate">COHA</p>
            <p className="text-sm font-bold text-white/85 mt-1">Parent Portal</p>
            <p className="text-xs font-semibold text-white/70 mt-1">
              {student.assignedClass || student.grade || student.level || '-'} | {currentTerm?.termName || '-'}
            </p>
            <p className="text-xs font-semibold text-white/70 mt-1">
              {academicYear}
            </p>
          </div>
          <div className="h-11 w-11 rounded-full border border-white/15 bg-white/10 inline-flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="https://i.ibb.co/LzYXwYfX/logo.png"
              alt={`${schoolName} logo`}
              className="h-8 w-8 object-contain"
            />
          </div>
        </div>
      </section>

      <section className="-mt-6 rounded-t-[2rem] bg-white px-3 sm:px-5 pt-5 pb-2 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
        <div className="max-w-4xl mx-auto">
          <div className="pt-4">
            <div className="mb-1 px-1">
              <SectionLabel icon={<CreditCard size={14} />}>Fees Summary</SectionLabel>
            </div>
            <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Balance Due:</p>
              <p className="mt-1 text-[1.55rem] font-black tracking-[-0.04em] text-red-600">{fmtMoney(financials.balance)}</p>

              <div className="mt-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Total Fees</p>
                <p className="mt-1 text-base font-black text-slate-950">{fmtMoney(financials.total)}</p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
                  <div className="h-full w-full rounded-full bg-emerald-500" />
                </div>
                <p className="mt-1 text-right text-[11px] font-black text-emerald-600">100%</p>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Fees Paid:</p>
                <p className="mt-1 text-base font-black text-amber-600">{fmtMoney(financials.paid)}</p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${paidPercent}%` }} />
                </div>
                <p className="mt-1 text-right text-[11px] font-black text-amber-600">{paidPercent}%</p>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Balance</p>
                <p className="mt-1 text-base font-black text-rose-600">{fmtMoney(financials.balance)}</p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-rose-100">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${balancePercent}%` }} />
                </div>
                <p className="mt-1 text-right text-[11px] font-black text-rose-600">{balancePercent}%</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setActiveTab('receipts')} className="flex-1 h-12 text-sm font-bold border-2 border-coha-900 text-coha-900 rounded-[1rem] bg-white">
                View receipts
              </button>
              <button onClick={() => setActiveTab('receipts')} className="flex-1 h-12 text-sm font-bold bg-coha-900 text-white rounded-[1rem]">
                Send proof of payment
              </button>
            </div>
          </div>

          <div className="py-5">
            <SectionLabel icon={<Home size={14} />}>Quick Actions</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/parent/assessment')}
                className="min-h-[112px] rounded-[1.45rem] px-3 py-4 text-center text-white relative overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.3), transparent 26%), radial-gradient(circle at bottom left, rgba(255,255,255,0.18), transparent 34%), linear-gradient(135deg, #14206f 0%, #13a0d8 100%)' }}
              >
                <div className="relative z-10 flex h-full flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-2xl bg-white/16 backdrop-blur flex items-center justify-center mb-3">
                    <FileText size={18} />
                  </div>
                  <p className="text-[0.95rem] font-black tracking-[-0.02em]">View Reports</p>
                  <p className="text-[11px] text-white/80 mt-1 font-semibold leading-tight">Assessment progress and report downloads</p>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_38%)]" />
              </button>
              <button
                onClick={() => navigate('/parent/register')}
                className="min-h-[112px] rounded-[1.45rem] px-3 py-4 text-center text-white relative overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.26), transparent 26%), radial-gradient(circle at bottom left, rgba(255,255,255,0.16), transparent 34%), linear-gradient(135deg, #00a37a 0%, #34d399 100%)' }}
              >
                <div className="relative z-10 flex h-full flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-2xl bg-white/16 backdrop-blur flex items-center justify-center mb-3">
                    <ClipboardList size={18} />
                  </div>
                  <p className="text-[0.95rem] font-black tracking-[-0.02em]">View Attendance</p>
                  <p className="text-[11px] text-white/80 mt-1 font-semibold leading-tight">Daily register and attendance history</p>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_38%)]" />
              </button>
              <button
                onClick={() => setActiveTab('homework')}
                className="min-h-[112px] rounded-[1.45rem] px-3 py-4 text-center text-white relative overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.26), transparent 26%), radial-gradient(circle at bottom left, rgba(255,255,255,0.16), transparent 34%), linear-gradient(135deg, #c2410c 0%, #fb7185 100%)' }}
              >
                <div className="relative z-10 flex h-full flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-2xl bg-white/16 backdrop-blur flex items-center justify-center mb-3">
                    <BookOpen size={18} />
                  </div>
                  <p className="text-[0.95rem] font-black tracking-[-0.02em]">Submit Homework</p>
                  <p className="text-[11px] text-white/80 mt-1 font-semibold leading-tight">Capture and send homework images</p>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_38%)]" />
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="min-h-[112px] rounded-[1.45rem] px-3 py-4 text-center text-white relative overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.28), transparent 26%), radial-gradient(circle at bottom left, rgba(255,255,255,0.16), transparent 34%), linear-gradient(135deg, #7e22ce 0%, #d946ef 100%)' }}
              >
                <div className="relative z-10 flex h-full flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-2xl bg-white/16 backdrop-blur flex items-center justify-center mb-3">
                    <FileText size={18} />
                  </div>
                  <p className="text-[0.95rem] font-black tracking-[-0.02em]">Account Settings</p>
                  <p className="text-[11px] text-white/80 mt-1 font-semibold leading-tight">Change PIN and sign out of the portal</p>
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_38%)]" />
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );

  const renderDetails = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <SectionLabel icon={<User size={14} />}>Student Details</SectionLabel>
        <div className="space-y-4">
          <div>
            <MiniLabel icon={<User size={12} />}>Basic Details</MiniLabel>
            <div className="mt-2">
              <DetailTable
                rows={[
                  { label: 'Student Name', value: student.name },
                  { label: 'Student ID', value: student.id },
                  { label: 'Date Of Birth', value: student.dob || '-' },
                  { label: 'Gender', value: student.gender || '-' },
                ]}
              />
            </div>
          </div>

          <div>
            <MiniLabel icon={<GraduationCap size={12} />}>Academic Details</MiniLabel>
            <div className="mt-2">
              <DetailTable
                rows={[
                  { label: 'Division', value: student.division || '-' },
                  { label: 'Class', value: student.assignedClass || student.grade || student.level || '-' },
                  { label: 'Academic Year', value: academicYear },
                  { label: 'Current Term', value: currentTerm?.termName || '-' },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-4 border-b border-slate-200">
        <SectionLabel icon={<User size={14} />}>Parent Details</SectionLabel>
        <DetailTable
          rows={[
            { label: 'Parent / Guardian', value: student.parentName || '-' },
            { label: 'Father Name', value: student.fatherName || '-' },
            { label: 'Father Phone', value: student.fatherPhone || '-' },
            { label: 'Mother Name', value: student.motherName || '-' },
            { label: 'Mother Phone', value: student.motherPhone || '-' },
            { label: 'Address', value: student.address || '-' },
          ]}
        />
      </section>

      <section className="py-4 border-b border-slate-200">
        <SectionLabel icon={<FolderUp size={14} />}>Uploaded Documents</SectionLabel>
        <div className="space-y-4">
          <div>
            <MiniLabel icon={<FilePlus2 size={12} />}>Birth Certificate</MiniLabel>
            <div className="mt-2 flex gap-2">
              <button onClick={() => birthFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
                <FilePlus2 size={16} /> {birthFile ? 'Change file' : 'Upload PDF or image'}
              </button>
              <button disabled={!birthFile || busyAction === 'BIRTH_CERTIFICATE'} onClick={() => uploadDocument('BIRTH_CERTIFICATE', birthFile, 'Birth Certificate', () => { setBirthFile(null); if (birthFileRef.current) birthFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
                Save
              </button>
            </div>
            <input ref={birthFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => setBirthFile(e.target.files?.[0] || null)} />
          </div>

          <div>
            <MiniLabel icon={<ShieldCheck size={12} />}>Medical Documents</MiniLabel>
            <div className="mt-2 flex gap-2">
              <button onClick={() => medicalFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
                <ShieldCheck size={16} /> {medicalFile ? 'Change file' : 'Upload PDF or image'}
              </button>
              <button disabled={!medicalFile || busyAction === 'MEDICAL_DOCUMENT'} onClick={() => uploadDocument('MEDICAL_DOCUMENT', medicalFile, 'Medical Document', () => { setMedicalFile(null); if (medicalFileRef.current) medicalFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
                Save
              </button>
            </div>
            <input ref={medicalFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => setMedicalFile(e.target.files?.[0] || null)} />
          </div>

          <div>
            <MiniLabel icon={<FolderUp size={12} />}>Other Documents</MiniLabel>
            <input value={otherTitle} onChange={(e) => setOtherTitle(e.target.value)} placeholder="Document title" className="w-full h-11 border border-slate-300 px-3 text-sm mt-2 mb-2" />
            <div className="flex gap-2">
              <button onClick={() => otherFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
                <FilePlus2 size={16} /> {otherFile ? 'Change file' : 'Upload PDF or image'}
              </button>
              <button disabled={!otherFile || !otherTitle || busyAction === 'OTHER_DOCUMENT'} onClick={() => uploadDocument('OTHER_DOCUMENT', otherFile, otherTitle, () => { setOtherFile(null); setOtherTitle(''); if (otherFileRef.current) otherFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
                Save
              </button>
            </div>
            <input ref={otherFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => setOtherFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
            {documents.map((item) => (
              <div key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.documentType.replace(/_/g, ' ')} · {fmtDate(item.uploadedAt)}</p>
                  </div>
                  <a href={item.fileBase64} download={item.fileName} className="inline-flex items-center gap-1 text-sm font-semibold text-coha-700">
                    <Download size={15} /> Open
                  </a>
                </div>
                <div className="p-4">
                  {item.mimeType.startsWith('image/') ? (
                    <img src={item.fileBase64} alt={item.title} className="w-full h-48 object-contain bg-slate-50 border border-slate-200 rounded-xl" />
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold">
                      PDF document ready to open
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderReceipts = () => (
    <div>
      <section className="pt-2">
        <div className="rounded-[2rem] bg-coha-900 px-4 pb-5 pt-4 text-white shadow-[0_24px_50px_rgba(43,43,94,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[1.2rem] font-black tracking-[-0.03em] truncate">Payment & Receipts</p>
              <p className="text-xs font-semibold text-white/70 mt-1">{schoolName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('settings')}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/10 inline-flex items-center justify-center"
              >
                <FileText size={18} className="text-white" />
              </button>
              <button
                onClick={refreshData}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/10 inline-flex items-center justify-center"
              >
                <RefreshCw size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[1.9rem] bg-white p-4 text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
            <SectionLabel icon={<FileImage size={14} />}>Send Proof Of Payment</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <select value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} className="h-12 rounded-[0.95rem] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                {(settings?.schoolCalendars || []).map((term) => (
                  <option key={term.id} value={term.id}>{term.termName}</option>
                ))}
              </select>
              <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount paid" className="h-12 rounded-[0.95rem] border border-slate-300 px-3 text-sm font-semibold text-slate-800" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => paymentFileRef.current?.click()} className="h-14 rounded-[0.95rem] border border-slate-300 text-sm font-bold text-slate-800 inline-flex items-center justify-center gap-2 bg-white px-3 text-left">
                <FileImage size={16} />
                <span className="leading-tight">Take photo</span>
              </button>
              <button onClick={() => paymentDeviceFileRef.current?.click()} className="h-14 rounded-[0.95rem] border border-slate-300 text-sm font-bold text-slate-800 inline-flex items-center justify-center gap-2 bg-white px-3 text-left">
                <FileImage size={16} />
                <span className="leading-tight">{paymentFile ? 'Choose different photo' : 'Choose from device'}</span>
              </button>
            </div>
            <div className="mt-2">
              <button disabled={!paymentFile || !paymentTerm || busyAction === 'payment'} onClick={handlePaymentSubmit} className="w-full h-14 rounded-[0.95rem] bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(43,43,94,0.22)]">
                {busyAction === 'payment' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Send proof
              </button>
            </div>
            {paymentMessage && (
              <p className={`mt-3 text-sm font-semibold ${paymentMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {paymentMessage}
              </p>
            )}
            <input
              ref={paymentFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                setPaymentFile(e.target.files?.[0] || null);
                if (paymentMessage) setPaymentMessage('');
              }}
            />
            <input
              ref={paymentDeviceFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setPaymentFile(e.target.files?.[0] || null);
                if (paymentMessage) setPaymentMessage('');
              }}
            />
            {paymentFile && <p className="mt-2 text-xs font-semibold text-slate-500">{paymentFile.name}</p>}
          </div>
        </div>
      </section>

      <section className="pt-4">
        <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm">
          <SectionLabel icon={<FileBadge2 size={14} />}>Submitted Proofs</SectionLabel>
          <div className="space-y-3">
            {paymentProofs.length === 0 && <p className="text-sm text-slate-500">No payment proofs submitted yet.</p>}
            {paymentProofs.map((proof) => (
              <div key={proof.id} className="rounded-[1.15rem] border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-2">
                    <div className="mt-0.5 text-slate-400">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">{getTermLabel(proof.termId)}</p>
                      <p className="text-xs text-slate-500 mt-1">{fmtDate(proof.submittedAt)}</p>
                      {proof.amountClaimed && <p className="text-xs font-semibold text-slate-500 mt-1">{proof.amountClaimed}</p>}
                    </div>
                  </div>
                  <span className={`text-[11px] font-black uppercase ${proof.status === 'APPROVED' ? 'text-emerald-500' : proof.status === 'REJECTED' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {proof.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-4">
        <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm">
          <SectionLabel icon={<FileText size={14} />}>Official Receipts</SectionLabel>
          <div className="space-y-3">
            {receipts.length === 0 && <p className="text-sm text-slate-500">No approved school receipts yet.</p>}
            {receipts.map((receipt) => (
              <div key={receipt.id} className="rounded-[1.2rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                      <img
                        src="https://i.ibb.co/LzYXwYfX/logo.png"
                        alt={`${schoolName} logo`}
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black tracking-[-0.03em] text-slate-950">{receipt.number}</p>
                        <p className="text-xs text-slate-500 mt-1">{fmtDate(receipt.generatedAt || receipt.createdAt || receipt.date)}</p>
                      </div>
                      <button
                        onClick={() => downloadReceipt(receipt)}
                        className="inline-flex items-center justify-center rounded-[0.9rem] bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700"
                      >
                        Download Receipt
                      </button>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-900">{getTermLabel(receipt.termId) || 'School fee payment'}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">{academicYear}</p>
                      </div>
                      <span className="text-[1.55rem] leading-none font-black tracking-[-0.04em] text-slate-950">
                        {fmtMoney(parseFloat(receipt.amount || '0'))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderHomework = () => (
    <div>
      <section className="py-4">
        <SectionLabel icon={<BookOpen size={14} />}>Submit Homework</SectionLabel>
        <button
          onClick={() => homeworkFileRef.current?.click()}
          className="relative w-full overflow-hidden rounded-[2rem] border border-dashed border-coha-300 bg-[radial-gradient(circle_at_center,rgba(43,43,94,0.09),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-10 text-center shadow-sm"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="absolute h-28 w-28 rounded-full border border-coha-200/70 animate-ping [animation-duration:2.8s]" />
            <div className="absolute h-40 w-40 rounded-full border border-coha-200/50 animate-ping [animation-duration:3.2s]" />
            <div className="absolute h-56 w-56 rounded-full border border-coha-100/60 animate-ping [animation-duration:3.8s]" />
          </div>
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coha-900 text-white shadow-[0_14px_30px_rgba(43,43,94,0.18)]">
              <FileImage size={28} />
            </div>
            <p className="max-w-[16rem] text-base font-black tracking-[-0.02em] text-slate-950">
              Click anywhere to upload image of your child's homework
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Camera or device gallery supported
            </p>
            {homeworkFile && <p className="mt-3 text-xs font-black text-coha-800">{homeworkFile.name}</p>}
          </div>
        </button>
        <div className="mt-3">
          <button disabled={!homeworkFile || busyAction === 'homework'} onClick={handleHomeworkSubmit} className="w-full h-12 rounded-[1rem] bg-coha-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busyAction === 'homework' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Send homework
          </button>
        </div>
        {homeworkMessage && (
          <p className={`mt-3 text-sm font-semibold ${homeworkMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {homeworkMessage}
          </p>
        )}
        <input
          ref={homeworkFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            setHomeworkFile(e.target.files?.[0] || null);
            if (homeworkMessage) setHomeworkMessage('');
          }}
        />
      </section>

      <section className="py-4">
        <SectionLabel icon={<BookOpen size={14} />}>Teacher Homework</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {assignments.length === 0 && <p className="text-sm text-slate-500">No homework posted for this class yet.</p>}
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{assignment.title}</p>
                  <p className="text-xs text-slate-600 mt-2">{assignment.description}</p>
                </div>
                {assignment.dueDate && <span className="text-[11px] font-black text-emerald-700">Due {fmtDate(assignment.dueDate)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-4">
        <SectionLabel icon={<Upload size={14} />}>My Uploads</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {homeworkSubmissions.length === 0 && <p className="text-sm text-slate-500">No homework images sent yet.</p>}
          {homeworkSubmissions.map((submission) => (
            <div key={submission.id} className="rounded-[1.4rem] border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{fmtDate(submission.submittedAt)}</p>
                  <p className="text-xs text-slate-600 mt-2">{submission.assignmentId ? 'Linked to assignment' : 'General homework upload'}</p>
                </div>
                <span className={`text-[11px] font-black ${submission.status === 'REVIEWED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {submission.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const handlePinChange = async () => {
    if (!student) return;
    if (currentPinInput !== student.parentPin) {
      setSettingsMessage('Current PIN is incorrect.');
      return;
    }
    if (newPinInput.length < 4) {
      setSettingsMessage('New PIN must be at least 4 digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setSettingsMessage('New PIN and confirm PIN do not match.');
      return;
    }
    setBusyAction('PIN_UPDATE');
    try {
      await updateStudent(student.id, { parentPin: newPinInput });
      const pinUpdate = {
        studentId: student.id,
        parentPin: newPinInput,
        updatedAt: Date.now(),
      };
      localStorage.setItem('coha_parent_pin_update', JSON.stringify(pinUpdate));
      window.dispatchEvent(new CustomEvent('coha-parent-pin-update', { detail: pinUpdate }));
      setChangedPinValue(newPinInput);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setSettingsMessage('PIN updated successfully.');
      await refreshData();
    } finally {
      setBusyAction(null);
    }
  };

  const handleProfileImageSave = async () => {
    if (!student || !profileFile) return;
    setBusyAction('PROFILE_IMAGE');
    setProfileMessage('');
    try {
      const imageBase64 = await fileToDataUrl(profileFile);
      await updateStudent(student.id, { profileImageBase64: imageBase64 });
      setProfileFile(null);
      if (profileFileRef.current) profileFileRef.current.value = '';
      setProfileMessage('Profile photo updated.');
      await refreshData();
    } finally {
      setBusyAction(null);
    }
  };

  const renderSettings = () => (
    <div>
      <section className="py-4 border-b border-slate-200">
        <SectionLabel icon={<FileText size={14} />}>Account Settings</SectionLabel>
        <div className="space-y-3">
          <div>
            <MiniLabel icon={<User size={12} />}>Parent Account</MiniLabel>
            <p className="mt-2 text-base font-black text-slate-950">{student.parentName || user?.name || 'Parent'}</p>
            <p className="text-sm text-slate-600">Linked to {student.name}</p>
          </div>

          <div>
            <MiniLabel icon={<FileImage size={12} />}>Profile Photo</MiniLabel>
            <div className="mt-3 flex items-center gap-4">
              {studentProfileImage ? (
                <img
                  src={studentProfileImage}
                  alt={student.name}
                  className="h-20 w-20 rounded-[1.35rem] object-cover border border-slate-200"
                />
              ) : (
                <div className="h-20 w-20 rounded-[1.35rem] bg-gradient-to-br from-slate-300 to-slate-500 text-white flex items-center justify-center text-3xl font-black">
                  {studentInitial}
                </div>
              )}
              <div className="flex-1">
                <button
                  onClick={() => profileFileRef.current?.click()}
                  className="w-full h-11 border border-slate-300 text-sm font-semibold text-slate-800 rounded-[0.9rem] inline-flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> {profileFile ? 'Change photo' : 'Upload profile photo'}
                </button>
                <input
                  ref={profileFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                />
                {profileFile && <p className="mt-2 text-xs text-slate-500">{profileFile.name}</p>}
              </div>
            </div>
            {profileMessage && <p className="mt-2 text-sm font-semibold text-slate-700">{profileMessage}</p>}
            <button
              disabled={!profileFile || busyAction === 'PROFILE_IMAGE'}
              onClick={handleProfileImageSave}
              className="mt-3 w-full h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50 rounded-[0.9rem] inline-flex items-center justify-center gap-2"
            >
              {busyAction === 'PROFILE_IMAGE' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Save profile photo
            </button>
          </div>

          <div>
            <MiniLabel icon={<FileText size={12} />}>Change PIN</MiniLabel>
            <div className="grid gap-2 mt-2">
              <input value={currentPinInput} onChange={(e) => setCurrentPinInput(e.target.value)} type="password" inputMode="numeric" placeholder="Current PIN" className="w-full h-11 border border-slate-300 px-3 text-sm" />
              <input value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} type="password" inputMode="numeric" placeholder="New PIN" className="w-full h-11 border border-slate-300 px-3 text-sm" />
              <input value={confirmPinInput} onChange={(e) => setConfirmPinInput(e.target.value)} type="password" inputMode="numeric" placeholder="Confirm new PIN" className="w-full h-11 border border-slate-300 px-3 text-sm" />
            </div>
            {settingsMessage && <p className="mt-2 text-sm font-semibold text-slate-700">{settingsMessage}</p>}
            {changedPinValue && (
              <div className="mt-3 rounded-[1.25rem] border border-orange-200 bg-orange-50/70 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] font-black text-orange-600">Changed To</p>
                <p className="mt-2 text-3xl font-black tracking-[0.28em] text-green-600">{changedPinValue}</p>
              </div>
            )}
            <button disabled={busyAction === 'PIN_UPDATE'} onClick={handlePinChange} className="mt-3 w-full h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
              Update PIN
            </button>
          </div>

          <div className="pt-2">
            <MiniLabel icon={<Home size={12} />}>Session</MiniLabel>
            <button
              onClick={() => {
                if (onLogout) onLogout();
                navigate('/login');
              }}
              className="mt-3 w-full h-11 border border-red-200 bg-red-50 text-red-700 text-sm font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="-m-5 min-h-[calc(100vh-64px)] bg-[#f7f8fa] text-slate-900">
      <div className="max-w-4xl mx-auto px-3 sm:px-5 pb-24">
        {tab === 'home' && renderHome()}
        {tab === 'details' && renderDetails()}
        {tab === 'receipts' && renderReceipts()}
        {tab === 'homework' && renderHomework()}
        {tab === 'settings' && renderSettings()}
      </div>

      <ParentBottomNav activeTab={tab} />
    </div>
  );
};
