import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
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
  Users,
  X,
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
import { getPaymentOptionLabel, getPaymentOptions, REGISTRATION_FEE_OPTION } from '../../utils/paymentOptions';

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

const getMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const fileToDataUrl = (file: File, onProgress?: (progress: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadstart = () => onProgress?.(0);
    reader.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
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

const AvatarFallback: React.FC<{ letter: string; sizeClass?: string; textClass?: string }> = ({ letter, sizeClass = 'h-20 w-20', textClass = 'text-3xl' }) => (
  <div className={`${sizeClass} rounded-full bg-gradient-to-br from-coha-700 to-coha-500 text-white flex items-center justify-center ${textClass} font-black border-4 border-white shadow-sm`}>
    {letter}
  </div>
);

const getInitialLetter = (name?: string) => (name?.trim()?.charAt(0) || 'S').toUpperCase();

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = (requestedTab === 'receipts' ? 'home' : (requestedTab as ParentTab)) || 'home';

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
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

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
  const [profileMessageType, setProfileMessageType] = useState<'success' | 'error'>('success');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentMessageType, setPaymentMessageType] = useState<'success' | 'error'>('success');
  const [homeworkMessage, setHomeworkMessage] = useState('');
  const [homeworkMessageType, setHomeworkMessageType] = useState<'success' | 'error'>('success');
  const [documentMessage, setDocumentMessage] = useState('');
  const [documentMessageType, setDocumentMessageType] = useState<'success' | 'error'>('success');
  const [documentUploadTarget, setDocumentUploadTarget] = useState<UploadedDocument['documentType'] | null>(null);
  const [documentUploadProgress, setDocumentUploadProgress] = useState(0);
  const [changedPinValue, setChangedPinValue] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [detailSectionsOpen, setDetailSectionsOpen] = useState({
    profile: true,
    basic: true,
    academic: false,
    parent: false,
    documents: false,
  });
  const [receiptSectionsOpen, setReceiptSectionsOpen] = useState({
    submitted: true,
    official: false,
  });
  const [homeworkSectionsOpen, setHomeworkSectionsOpen] = useState({
    teacher: true,
    uploads: false,
  });
  const [homeworkPreviewImage, setHomeworkPreviewImage] = useState<{ src: string; title: string; fileName?: string } | null>(null);

  const paymentDeviceFileRef = useRef<HTMLInputElement>(null);
  const homeworkFileRef = useRef<HTMLInputElement>(null);
  const birthFileRef = useRef<HTMLInputElement>(null);
  const medicalFileRef = useRef<HTMLInputElement>(null);
  const otherFileRef = useRef<HTMLInputElement>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const profileDeviceFileRef = useRef<HTMLInputElement>(null);

  const currentTerm = useMemo(() => {
    const activeTerm = settings?.schoolCalendars?.find((term) => term.id === settings?.activeTermId);
    return activeTerm || settings?.schoolCalendars?.[0] || null;
  }, [settings]);

  const academicYear = student?.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const schoolName = settings?.schoolName || 'Circle of Hope Academy';
  const studentProfileImage = student?.profileImageBase64 || '';
  const studentInitial = getInitialLetter(student?.name);
  const getTermLabel = (termId?: string) => getPaymentOptionLabel(termId, settings);

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

  const triggerImageDownload = (src: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  useEffect(() => {
    const handleFocus = () => {
      refreshData();
    };

    window.addEventListener('focus', handleFocus);
    const interval = setInterval(refreshData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user?.id]);

  const setActiveTab = (nextTab: ParentTab) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('tab', nextTab);
      return updated;
    });
  };

  useEffect(() => {
    if (requestedTab === 'receipts') {
      setActiveTab('home');
    }
  }, [requestedTab]);

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
      setPaymentTerm(needsPaymentProof ? REGISTRATION_FEE_OPTION : (currentTerm?.id || paymentTerm));
      if (paymentDeviceFileRef.current) paymentDeviceFileRef.current.value = '';
      await refreshData();
      setPaymentMessageType('success');
      setPaymentMessage(`Proof of payment for ${getTermLabel(paymentTerm)} sent successfully.`);
      window.dispatchEvent(new CustomEvent('coha-payment-proof-update'));
      setActiveTab('home');
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
      if (homeworkFileRef.current) homeworkFileRef.current.value = '';
      await refreshData();
      setHomeworkMessageType('success');
      setHomeworkMessage('Homework image sent successfully.');
      window.dispatchEvent(new CustomEvent('coha-homework-submission-update'));
    } catch (error) {
      console.error('Homework submission failed:', error);
      setHomeworkMessageType('error');
      setHomeworkMessage('Failed to send homework. Check your connection and try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const uploadDocument = async (documentType: UploadedDocument['documentType'], file: File | null, title: string, reset: () => void) => {
    if (!student) {
      setDocumentUploadTarget(documentType);
      setDocumentMessageType('error');
      setDocumentMessage('Student record not found.');
      return;
    }
    if (!file) {
      setDocumentUploadTarget(documentType);
      setDocumentMessageType('error');
      setDocumentMessage('Please choose a file first.');
      return;
    }
    setBusyAction(documentType);
    setDocumentUploadTarget(documentType);
    setDocumentUploadProgress(0);
    setDocumentMessage('');
    try {
      const fileBase64 = await fileToDataUrl(file, (progress) => {
        setDocumentUploadProgress(progress);
      });
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
      setDocumentUploadProgress(100);
      setDocumentMessageType('success');
      setDocumentMessage(`${title} uploaded successfully.`);
    } catch (error) {
      console.error('Document upload failed:', error);
      setDocumentMessageType('error');
      setDocumentMessage(`Failed to upload ${title.toLowerCase()}. Please try again.`);
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

  const needsPaymentProof = student?.studentStatus === 'WAITING_PAYMENT' || !!student?.paymentRejected;
  const paymentUnderReview = student?.studentStatus === 'PAYMENT_VERIFICATION';
  const showPaymentCenter = true;
  const recentEnrollmentWindow = 14 * 24 * 60 * 60 * 1000;
  const acceptedAtMs = getMillis(student?.enrolledAt);
  const showEnrollmentBanner = acceptedAtMs > 0 && (Date.now() - acceptedAtMs) <= recentEnrollmentWindow;

  useEffect(() => {
    if (!paymentTerm) {
      setPaymentTerm(needsPaymentProof ? REGISTRATION_FEE_OPTION : (currentTerm?.id || REGISTRATION_FEE_OPTION));
      return;
    }

    if (!needsPaymentProof && paymentTerm === REGISTRATION_FEE_OPTION && currentTerm?.id) {
      setPaymentTerm(currentTerm.id);
    }
  }, [currentTerm?.id, needsPaymentProof, paymentTerm]);

  if (loading) return <Loader />;
  if (!student) return <div className="p-6 text-sm text-slate-500">Student not found.</div>;

  const renderDocumentFeedback = (documentType: UploadedDocument['documentType']) => {
    if (documentUploadTarget !== documentType && !(documentMessage && documentUploadTarget === documentType)) return null;

    return (
      <div className="mt-3 space-y-2">
        {(busyAction === documentType || (documentUploadTarget === documentType && documentUploadProgress > 0)) && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max(documentUploadProgress, busyAction === documentType ? 8 : 0)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
              {busyAction === documentType ? `Uploading ${documentUploadProgress}%` : `Uploaded ${documentUploadProgress}%`}
            </p>
          </div>
        )}
        {documentMessage && documentUploadTarget === documentType && (
          <p className={`text-sm font-semibold ${documentMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {documentMessage}
          </p>
        )}
      </div>
    );
  };

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
            {showEnrollmentBanner && (
              <div className="mb-4 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Student Enrolled</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {student.name} was enrolled on {fmtDate(student.enrolledAt)}. This welcome notice remains visible for 2 weeks after acceptance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {needsPaymentProof && (
              <div className={`mb-4 rounded-[1.35rem] border px-4 py-4 shadow-sm ${student.paymentRejected ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-black uppercase tracking-[0.16em] ${student.paymentRejected ? 'text-rose-700' : 'text-amber-700'}`}>
                      {student.paymentRejected ? 'Proof Needs Attention' : 'Registration Fee Required'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {student.paymentRejected
                        ? 'Please upload a clearer proof of payment image from the payment section below.'
                        : 'Please upload proof of payment for the registration fee from the payment section below.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('payment-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${student.paymentRejected ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}
                  >
                    Upload Now
                  </button>
                </div>
              </div>
            )}

            {paymentUnderReview && (
              <div className="mb-4 rounded-[1.35rem] border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Payment Under Review</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      Your proof of payment has been received and is being reviewed by the administration team.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshData}
                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

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

          {showPaymentCenter && (
            <div className="pb-6">
              {renderReceipts()}
            </div>
          )}

        </div>
      </section>
    </div>
  );

  const renderHomeworkImagePreview = () =>
    homeworkPreviewImage ? (
      <div className="fixed inset-0 z-[90] bg-slate-950/94 px-4 py-6">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{homeworkPreviewImage.title}</p>
              <p className="mt-1 text-xs font-semibold text-white/65">Image preview</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerImageDownload(homeworkPreviewImage.src, homeworkPreviewImage.fileName || `${homeworkPreviewImage.title}.png`)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900"
              >
                <Download size={16} /> Download
              </button>
              <button
                type="button"
                onClick={() => setHomeworkPreviewImage(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHomeworkPreviewImage(null)}
            className="flex-1 overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/5 p-3"
          >
            <img src={homeworkPreviewImage.src} alt={homeworkPreviewImage.title} className="h-full w-full rounded-[1.2rem] object-contain" />
          </button>
        </div>
      </div>
    ) : null;

  const renderDetails = () => (
    <div>
      <section className="py-4">
        <div className="rounded-[1.7rem] bg-[linear-gradient(180deg,#fff7f2_0%,#ffffff_100%)] border border-orange-100 p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {studentProfileImage ? (
              <img
                src={studentProfileImage}
                alt={student.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-sm"
              />
            ) : (
              <AvatarFallback letter={studentInitial} sizeClass="h-24 w-24" textClass="text-4xl" />
            )}
            <div className="mt-3 flex gap-2">
              <label className="inline-flex items-center gap-2 rounded-full bg-coha-500 px-4 py-2 text-white text-sm font-bold cursor-pointer">
                <FileImage size={16} /> Take Photo
                <input
                  ref={profileFileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    setProfileFile(e.target.files?.[0] || null);
                    if (profileMessage) setProfileMessage('');
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 text-sm font-bold cursor-pointer">
                <Upload size={16} /> Choose from device
                <input
                  ref={profileDeviceFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setProfileFile(e.target.files?.[0] || null);
                    if (profileMessage) setProfileMessage('');
                  }}
                />
              </label>
            </div>
            {profileFile && <p className="mt-2 text-xs text-slate-500">{profileFile.name}</p>}
            {profileMessage && <p className={`mt-2 text-sm font-semibold ${profileMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{profileMessage}</p>}
            <button
              disabled={!profileFile || busyAction === 'PROFILE_IMAGE'}
              onClick={handleProfileImageSave}
              className="mt-3 h-11 px-5 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50 rounded-[0.9rem] inline-flex items-center justify-center gap-2"
            >
              {busyAction === 'PROFILE_IMAGE' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Save profile photo
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setDetailSectionsOpen((prev) => ({ ...prev, basic: !prev.basic }))}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-coha-50 text-coha-800 flex items-center justify-center"><User size={18} /></div>
              <span className="font-bold text-slate-900">Profile Details</span>
            </div>
            <ChevronDown size={18} className={`text-slate-500 transition-transform ${detailSectionsOpen.basic ? 'rotate-180' : ''}`} />
          </button>
          {detailSectionsOpen.basic && (
            <div className="px-4 pb-4">
              <DetailTable
                rows={[
                  { label: 'Student Name', value: student.name },
                  { label: 'Student ID', value: student.id },
                  { label: 'Date Of Birth', value: student.dob || '-' },
                  { label: 'Gender', value: student.gender || '-' },
                ]}
              />
            </div>
          )}
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setDetailSectionsOpen((prev) => ({ ...prev, academic: !prev.academic }))}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center"><GraduationCap size={18} /></div>
              <span className="font-bold text-slate-900">Academic Details</span>
            </div>
            <ChevronDown size={18} className={`text-slate-500 transition-transform ${detailSectionsOpen.academic ? 'rotate-180' : ''}`} />
          </button>
          {detailSectionsOpen.academic && (
            <div className="px-4 pb-4">
              <DetailTable
                rows={[
                  { label: 'Division', value: student.division || '-' },
                  { label: 'Class', value: student.assignedClass || student.grade || student.level || '-' },
                  { label: 'Academic Year', value: academicYear },
                  { label: 'Current Term', value: currentTerm?.termName || '-' },
                ]}
              />
            </div>
          )}
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setDetailSectionsOpen((prev) => ({ ...prev, parent: !prev.parent }))}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><Users size={18} /></div>
              <span className="font-bold text-slate-900">Parent Details</span>
            </div>
            <ChevronDown size={18} className={`text-slate-500 transition-transform ${detailSectionsOpen.parent ? 'rotate-180' : ''}`} />
          </button>
          {detailSectionsOpen.parent && (
            <div className="px-4 pb-4">
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
            </div>
          )}
        </section>

        <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setDetailSectionsOpen((prev) => ({ ...prev, documents: !prev.documents }))}
            className="w-full px-4 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center"><FolderUp size={18} /></div>
              <span className="font-bold text-slate-900">Uploaded Documents</span>
            </div>
            <ChevronDown size={18} className={`text-slate-500 transition-transform ${detailSectionsOpen.documents ? 'rotate-180' : ''}`} />
          </button>
          {detailSectionsOpen.documents && (
            <div className="px-4 pb-4 space-y-4">
          <div>
            <MiniLabel icon={<FilePlus2 size={12} />}>Birth Certificate</MiniLabel>
            <div className="mt-2 flex gap-2">
              <button onClick={() => birthFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
                <FilePlus2 size={16} /> {birthFile ? 'Change file' : 'Upload PDF or image'}
              </button>
              <button disabled={!birthFile || busyAction === 'BIRTH_CERTIFICATE'} onClick={() => uploadDocument('BIRTH_CERTIFICATE', birthFile, 'Birth Certificate', () => { setBirthFile(null); if (birthFileRef.current) birthFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
                {busyAction === 'BIRTH_CERTIFICATE' ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Uploading</span> : 'Save'}
              </button>
            </div>
            {renderDocumentFeedback('BIRTH_CERTIFICATE')}
            <input ref={birthFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => { setBirthFile(e.target.files?.[0] || null); if (documentUploadTarget === 'BIRTH_CERTIFICATE') { setDocumentMessage(''); setDocumentUploadProgress(0); } }} />
          </div>

          <div>
            <MiniLabel icon={<ShieldCheck size={12} />}>Medical Documents</MiniLabel>
            <div className="mt-2 flex gap-2">
              <button onClick={() => medicalFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
                <ShieldCheck size={16} /> {medicalFile ? 'Change file' : 'Upload PDF or image'}
              </button>
              <button disabled={!medicalFile || busyAction === 'MEDICAL_DOCUMENT'} onClick={() => uploadDocument('MEDICAL_DOCUMENT', medicalFile, 'Medical Document', () => { setMedicalFile(null); if (medicalFileRef.current) medicalFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
                {busyAction === 'MEDICAL_DOCUMENT' ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Uploading</span> : 'Save'}
              </button>
            </div>
            {renderDocumentFeedback('MEDICAL_DOCUMENT')}
            <input ref={medicalFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => { setMedicalFile(e.target.files?.[0] || null); if (documentUploadTarget === 'MEDICAL_DOCUMENT') { setDocumentMessage(''); setDocumentUploadProgress(0); } }} />
          </div>

          <div>
            <MiniLabel icon={<FolderUp size={12} />}>Other Documents</MiniLabel>
            <input value={otherTitle} onChange={(e) => setOtherTitle(e.target.value)} placeholder="Document title" className="w-full h-11 border border-slate-300 px-3 text-sm mt-2 mb-2" />
            <div className="flex gap-2">
              <button onClick={() => otherFileRef.current?.click()} className="flex-1 h-11 border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center justify-center gap-2">
                <FilePlus2 size={16} /> {otherFile ? 'Change file' : 'Upload PDF or image'}
              </button>
              <button disabled={!otherFile || !otherTitle || busyAction === 'OTHER_DOCUMENT'} onClick={() => uploadDocument('OTHER_DOCUMENT', otherFile, otherTitle, () => { setOtherFile(null); setOtherTitle(''); if (otherFileRef.current) otherFileRef.current.value = ''; })} className="flex-1 h-11 bg-coha-900 text-white text-sm font-semibold disabled:opacity-50">
                {busyAction === 'OTHER_DOCUMENT' ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Uploading</span> : 'Save'}
              </button>
            </div>
            {renderDocumentFeedback('OTHER_DOCUMENT')}
            <input ref={otherFileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => { setOtherFile(e.target.files?.[0] || null); if (documentUploadTarget === 'OTHER_DOCUMENT') { setDocumentMessage(''); setDocumentUploadProgress(0); } }} />
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
          )}
        </section>
      </div>
    </div>
  );

  const renderReceipts = () => (
    <div id="payment-center">
      <section className="pt-2">
        <div className="rounded-[2rem] bg-coha-900 px-4 pb-5 pt-4 text-white shadow-[0_24px_50px_rgba(43,43,94,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[1.2rem] font-black tracking-[-0.03em] truncate">Payments & Enrolment</p>
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
            <>
              <SectionLabel icon={<FileImage size={14} />}>{needsPaymentProof ? 'Upload Registration Fee Proof' : 'Upload Payment Proof'}</SectionLabel>
              <div className="grid grid-cols-1 gap-2">
                <select value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} className="h-12 rounded-[0.95rem] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">
                  {getPaymentOptions(settings).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              {paymentUnderReview && (
                <div className="mt-3 rounded-[1.4rem] border border-blue-200 bg-blue-50 px-4 py-4">
                  <SectionLabel icon={<Clock size={14} />}>Proof Received</SectionLabel>
                  <p className="text-sm font-semibold text-slate-800">
                    Your registration payment proof is under review. You can continue using this payment area for future fee uploads.
                  </p>
                </div>
              )}
                <button
                  onClick={() => paymentDeviceFileRef.current?.click()}
                  className="relative mt-3 w-full overflow-hidden rounded-[1.5rem] border border-dashed border-coha-300 bg-[radial-gradient(circle_at_center,rgba(43,43,94,0.08),transparent_38%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-8 text-center shadow-sm"
                >
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="absolute h-24 w-24 rounded-full border border-coha-200/70 animate-ping [animation-duration:2.8s]" />
                    <div className="absolute h-36 w-36 rounded-full border border-coha-200/50 animate-ping [animation-duration:3.2s]" />
                    <div className="absolute h-52 w-52 rounded-full border border-coha-100/60 animate-ping [animation-duration:3.8s]" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coha-900 text-white shadow-[0_14px_30px_rgba(43,43,94,0.18)]">
                      <FileImage size={28} />
                    </div>
                    <p className="max-w-[16rem] text-base font-black tracking-[-0.02em] text-slate-950">
                      Click anywhere to upload your {getTermLabel(paymentTerm).toLowerCase()} proof image
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Choose from device and send it to the school
                    </p>
                    {paymentFile && <p className="mt-3 text-xs font-black text-coha-800">{paymentFile.name}</p>}
                  </div>
                </button>
                <div className="mt-2">
                  <button disabled={!paymentFile || !paymentTerm || busyAction === 'payment'} onClick={handlePaymentSubmit} className="w-full h-14 rounded-[0.95rem] bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(43,43,94,0.22)]">
                    {busyAction === 'payment' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    Send {getTermLabel(paymentTerm)} Proof
                  </button>
                </div>
                {paymentMessage && (
                  <p className={`mt-3 text-sm font-semibold ${paymentMessageType === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {paymentMessage}
                  </p>
                )}
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
            </>
            {!needsPaymentProof && !paymentUnderReview && (
              <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                <SectionLabel icon={<CheckCircle2 size={14} />}>Payment Status</SectionLabel>
                <p className="text-sm font-semibold text-slate-800">
                  Your payment record has been updated. Approved receipts and submitted proofs remain available below for reference.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="pt-4">
        <div className="space-y-4">
          <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setReceiptSectionsOpen((prev) => ({ ...prev, submitted: !prev.submitted }))}
              className="w-full px-4 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center"><FileBadge2 size={18} /></div>
                <span className="font-bold text-slate-900">Submitted Proofs</span>
              </div>
              <ChevronDown size={18} className={`text-slate-500 transition-transform ${receiptSectionsOpen.submitted ? 'rotate-180' : ''}`} />
            </button>
            {receiptSectionsOpen.submitted && (
              <div className="px-4 pb-4">
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
            )}
          </section>

          <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setReceiptSectionsOpen((prev) => ({ ...prev, official: !prev.official }))}
              className="w-full px-4 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center"><FileText size={18} /></div>
                <span className="font-bold text-slate-900">Official Receipts</span>
              </div>
              <ChevronDown size={18} className={`text-slate-500 transition-transform ${receiptSectionsOpen.official ? 'rotate-180' : ''}`} />
            </button>
            {receiptSectionsOpen.official && (
              <div className="px-4 pb-4">
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
            )}
          </section>
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
        <div className="space-y-4">
          <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setHomeworkSectionsOpen((prev) => ({ ...prev, teacher: !prev.teacher }))}
              className="w-full px-4 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><BookOpen size={18} /></div>
                <span className="font-bold text-slate-900">Teacher Homework</span>
              </div>
              <ChevronDown size={18} className={`text-slate-500 transition-transform ${homeworkSectionsOpen.teacher ? 'rotate-180' : ''}`} />
            </button>
            {homeworkSectionsOpen.teacher && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {assignments.length === 0 && <p className="text-sm text-slate-500">No homework posted for this class yet.</p>}
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{assignment.title}</p>
                          <p className="text-xs text-slate-600 mt-2">{assignment.description}</p>
                          {!!assignment.imageAttachments?.length && (
                            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                              {assignment.imageAttachments.length} image{assignment.imageAttachments.length === 1 ? '' : 's'} attached
                            </p>
                          )}
                        </div>
                        {assignment.dueDate && <span className="text-[11px] font-black text-emerald-700">Due {fmtDate(assignment.dueDate)}</span>}
                      </div>
                      {!!assignment.imageAttachments?.length && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {assignment.imageAttachments.map((image, index) => (
                            <button
                              key={`${assignment.id}-${index}`}
                              type="button"
                              onClick={() => setHomeworkPreviewImage({ src: image.fileBase64, title: image.title, fileName: image.fileName })}
                              className="block overflow-hidden rounded-xl border border-emerald-200 bg-white"
                            >
                              <img src={image.fileBase64} alt={image.title} className="h-24 w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[1.4rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setHomeworkSectionsOpen((prev) => ({ ...prev, uploads: !prev.uploads }))}
              className="w-full px-4 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center"><Upload size={18} /></div>
                <span className="font-bold text-slate-900">My Uploads</span>
              </div>
              <ChevronDown size={18} className={`text-slate-500 transition-transform ${homeworkSectionsOpen.uploads ? 'rotate-180' : ''}`} />
            </button>
            {homeworkSectionsOpen.uploads && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {homeworkSubmissions.length === 0 && <p className="text-sm text-slate-500">No homework images sent yet.</p>}
                  {homeworkSubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-[1.4rem] border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
                      {submission.imageBase64 && (
                        <button
                          type="button"
                          onClick={() => setHomeworkPreviewImage({ src: submission.imageBase64, title: `${submission.studentName} homework upload`, fileName: submission.fileName || `${submission.studentName}-homework.png` })}
                          className="mb-3 block w-full overflow-hidden rounded-[1.1rem] border border-violet-200 bg-white"
                        >
                          <img src={submission.imageBase64} alt={submission.studentName} className="h-28 w-full object-cover" />
                        </button>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{fmtDate(submission.submittedAt)}</p>
                          <p className="text-xs text-slate-600 mt-2">{submission.assignmentId ? 'Linked to assignment' : 'General homework upload'}</p>
                        </div>
                        <span className={`text-[11px] font-black ${submission.status === 'REVIEWED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {submission.status}
                        </span>
                      </div>
                      {submission.imageBase64 && (
                        <button
                          type="button"
                          onClick={() => triggerImageDownload(submission.imageBase64, submission.fileName || `${submission.studentName}-homework.png`)}
                          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white"
                        >
                          <Download size={15} /> Download
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
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
    if (!student) {
      setProfileMessageType('error');
      setProfileMessage('Student record not found.');
      return;
    }
    if (!profileFile) {
      setProfileMessageType('error');
      setProfileMessage('Please take a photo or choose one from your device first.');
      return;
    }
    setBusyAction('PROFILE_IMAGE');
    setProfileMessage('');
    try {
      const imageBase64 = await fileToDataUrl(profileFile);
      const success = await updateStudent(student.id, { profileImageBase64: imageBase64 });
      if (!success) {
        setProfileMessageType('error');
        setProfileMessage('Failed to save profile photo. Please try again.');
        return;
      }
      const profileUpdate = {
        studentId: student.id,
        profileImageBase64: imageBase64,
        updatedAt: Date.now(),
      };
      localStorage.setItem('coha_student_profile_image_update', JSON.stringify(profileUpdate));
      window.dispatchEvent(new CustomEvent('coha-student-profile-image-update', { detail: profileUpdate }));
      setProfileFile(null);
      if (profileFileRef.current) profileFileRef.current.value = '';
      if (profileDeviceFileRef.current) profileDeviceFileRef.current.value = '';
      setProfileMessageType('success');
      setProfileMessage('Profile photo updated.');
      await refreshData();
    } catch (error) {
      console.error('Profile photo update failed:', error);
      setProfileMessageType('error');
      setProfileMessage('Could not upload profile photo. Check your connection and try again.');
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
      {renderHomeworkImagePreview()}
      <div className="max-w-4xl mx-auto px-3 sm:px-5 pb-24">
        {tab === 'home' && renderHome()}
        {tab === 'details' && renderDetails()}
        {tab === 'homework' && renderHomework()}
        {tab === 'settings' && renderSettings()}
      </div>

      <ParentBottomNav activeTab={tab} userId={user?.id} />
    </div>
  );
};
