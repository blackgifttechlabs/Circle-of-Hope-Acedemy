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
  const [changedPinValue, setChangedPinValue] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const paymentFileRef = useRef<HTMLInputElement>(null);
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
  const portalTitle = `${schoolName} Parent Portal`;
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
    <div className="-mx-3 sm:-mx-5">
      <section className="bg-coha-900 px-4 pt-4 pb-10 text-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.1rem] font-black tracking-[-0.03em] truncate">{portalTitle}</p>
            <p className="text-xs font-semibold text-white/70 mt-1">Family dashboard</p>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="h-10 w-10 rounded-full border border-white/15 bg-white/10 inline-flex items-center justify-center shrink-0"
          >
            <FileText size={18} className="text-white" />
          </button>
        </div>
      </section>

      <section className="-mt-6 rounded-t-[2rem] bg-white px-3 sm:px-5 pt-5 pb-2 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-[1.9rem] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
            <div className="flex items-center gap-4">
              {studentProfileImage ? (
                <img
                  src={studentProfileImage}
                  alt={student.name}
                  className="h-[72px] w-[72px] rounded-[1.4rem] object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="h-[72px] w-[72px] rounded-[1.4rem] bg-gradient-to-br from-slate-300 to-slate-500 text-white flex items-center justify-center text-3xl font-black shrink-0">
                  {studentInitial}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-[1.9rem] leading-none font-black tracking-[-0.05em] text-slate-950">
                  {student.parentName || user?.name || 'Parent'}
                </h1>
                <p className="text-base text-slate-600 mt-2">
                  Parent for <span className="font-black text-slate-900">{student.name}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-[#e9ecf4] p-1">
              <button
                onClick={() => setActiveTab('details')}
                className="h-11 rounded-full bg-white text-[0.95rem] font-bold text-slate-800 shadow-sm"
              >
                Profile Info
              </button>
              <div className="h-11 rounded-full text-[0.95rem] font-bold text-slate-700 flex items-center justify-center px-3 truncate">
                Student: {student.firstName || student.name.split(' ')[0] || student.name}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm">
              <SectionLabel icon={<User size={14} />}>Student Profile</SectionLabel>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <div>
                  <MiniLabel icon={<GraduationCap size={12} />}>Grade</MiniLabel>
                  <p className="mt-2 text-[1rem] font-black text-slate-950 whitespace-nowrap">{student.assignedClass || student.grade || student.level || '-'}</p>
                </div>
                <div>
                  <MiniLabel icon={<Calendar size={12} />} className="whitespace-nowrap">Academic Year</MiniLabel>
                  <p className="mt-2 text-[0.95rem] font-black text-slate-950 whitespace-nowrap">{academicYear}</p>
                </div>
                <div>
                  <MiniLabel icon={<Calendar size={12} />}>Term</MiniLabel>
                  <p className="mt-2 text-[1rem] font-black text-slate-950 whitespace-nowrap">{currentTerm?.termName || 'Term 1'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <SectionLabel icon={<CreditCard size={14} />}>Fees Summary</SectionLabel>
              <p className={`text-sm font-black ${financials.balance <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {financials.balance <= 0 ? 'Up to date' : 'Balance due'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm text-sm">
              <div className="min-w-0">
                <MiniLabel icon={<CreditCard size={12} />}>Total</MiniLabel>
                <p className="font-black text-slate-900 mt-2 text-[1rem] leading-tight">{fmtMoney(financials.total)}</p>
              </div>
              <div className="min-w-0">
                <MiniLabel icon={<CreditCard size={12} />}>Paid</MiniLabel>
                <p className="font-black text-emerald-600 mt-2 text-[1rem] leading-tight">{fmtMoney(financials.paid)}</p>
              </div>
              <div className="min-w-0">
                <MiniLabel icon={<CreditCard size={12} />}>Balance</MiniLabel>
                <p className="font-black text-slate-900 mt-2 text-[1rem] leading-tight">{fmtMoney(financials.balance)}</p>
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

          <div className="pb-1">
            <SectionLabel icon={<User size={14} />}>Overview</SectionLabel>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <DetailTable
                rows={[
                  { label: 'Portal Status', value: student.studentStatus.replace(/_/g, ' ') },
                  { label: 'Class Teacher', value: teacher?.name || 'Not assigned' },
                  { label: 'Latest Payment', value: paymentProofs[0] ? `${paymentProofs[0].status} · ${fmtDate(paymentProofs[0].submittedAt)}` : 'Waiting for upload' },
                  { label: 'Latest Homework', value: homeworkSubmissions[0] ? `${homeworkSubmissions[0].status} · ${fmtDate(homeworkSubmissions[0].submittedAt)}` : 'Waiting for upload' },
                ]}
              />
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

          <div className="space-y-3 pt-2">
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
                <span className="leading-tight">{paymentFile ? 'Change receipt' : 'Take / choose receipt'}</span>
              </button>
              <button disabled={!paymentFile || !paymentTerm || busyAction === 'payment'} onClick={handlePaymentSubmit} className="h-14 rounded-[0.95rem] bg-coha-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(43,43,94,0.22)]">
                {busyAction === 'payment' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Send proof
              </button>
            </div>
            <input ref={paymentFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
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
                    <div className="h-16 w-16 rounded-full border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-[10px] font-black tracking-[0.16em] text-coha-900">
                      <span>COHA</span>
                      <CheckCircle2 size={14} className="mt-1" />
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black tracking-[-0.03em] text-slate-950">{receipt.number}</p>
                        <p className="text-xs text-slate-500 mt-1">{fmtDate(receipt.generatedAt || receipt.createdAt || receipt.date)}</p>
                      </div>
                      <button onClick={() => downloadReceipt(receipt)} className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
                        <Download size={15} /> PDF
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
      <section className="py-4 border-b border-slate-200">
        <SectionLabel icon={<BookOpen size={14} />}>Submit Homework</SectionLabel>
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
        <SectionLabel icon={<BookOpen size={14} />}>Teacher Homework</SectionLabel>
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
        <SectionLabel icon={<Upload size={14} />}>My Uploads</SectionLabel>
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
        <div className="pt-3" />

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
