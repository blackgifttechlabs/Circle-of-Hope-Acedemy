import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import {
  addTeacher,
  createStudentByAdmin,
  getPendingActionCounts,
  getSystemSettings,
  recordAdminPayment,
  saveSystemSettings,
  searchStudents,
} from '../services/dataService';
import { Student, SystemSettings, UserRole } from '../types';
import { DEFAULT_TEACHER_PASSWORD } from '../utils/credentials';
import { getPaymentOptions } from '../utils/paymentOptions';
import {
  STUDENT_FIRST_NAME_SUGGESTIONS,
  STUDENT_GENDER_SUGGESTIONS,
  STUDENT_SURNAME_SUGGESTIONS,
} from '../utils/studentSuggestions';

type Message = {
  id: string;
  from: 'assistant' | 'admin';
  text: string;
  status?: 'working' | 'success' | 'error' | 'typing';
};

type AssistantFlow = 'MENU' | 'TEACHER_NAME' | 'TEACHER_SUBJECT' | 'TEACHER_CLASSES' | 'TEACHER_CONFIRM' | 'PAYMENT_STUDENT' | 'PAYMENT_AMOUNT' | 'PAYMENT_CATEGORY' | 'PAYMENT_TERM' | 'PAYMENT_LABEL' | 'PAYMENT_NOTES' | 'PAYMENT_CONFIRM' | 'STUDENT_FIRST_NAME' | 'STUDENT_SURNAME' | 'STUDENT_GENDER' | 'STUDENT_DOB' | 'STUDENT_CLASS' | 'STUDENT_HOSTEL' | 'STUDENT_DORM' | 'STUDENT_CONFIRM' | 'TERM_OPENING_DATE';

type TeacherDraft = {
  name: string;
  subject: string;
  classes: string[];
};

type PaymentDraft = {
  student: Student | null;
  amount: string;
  category: 'FEES' | 'OTHER';
  termId: string;
  label: string;
  notes: string;
};

type StudentDraft = {
  firstName: string;
  surname: string;
  gender: string;
  dob: string;
  targetClass: string;
  needsHostel: boolean;
  dorm: string;
};

interface AdminAssistantProps {
  user: any;
  isSubAdmin: boolean;
}

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const initialTeacherDraft = (): TeacherDraft => ({ name: '', subject: '', classes: [] });

const initialPaymentDraft = (): PaymentDraft => ({
  student: null,
  amount: '',
  category: 'FEES',
  termId: '',
  label: '',
  notes: '',
});

const initialStudentDraft = (): StudentDraft => ({
  firstName: '',
  surname: '',
  gender: '',
  dob: '',
  targetClass: '',
  needsHostel: false,
  dorm: '',
});

const toDateInputValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const monthNames: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const natural = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s/-]+([a-zA-Z]+)(?:[\s,/-]+(\d{4}))?$/);
  if (natural) {
    const day = parseInt(natural[1], 10);
    const month = monthNames[natural[2].toLowerCase()];
    if (month !== undefined && day >= 1 && day <= 31) {
      const currentYear = new Date().getFullYear();
      const explicitYear = natural[3] ? parseInt(natural[3], 10) : null;
      let parsed = new Date(explicitYear || currentYear, month, day);
      if (!explicitYear && parsed < new Date()) {
        parsed = new Date(currentYear + 1, month, day);
      }
      if (parsed.getMonth() === month && parsed.getDate() === day) return formatLocalDate(parsed);
    }
  }

  const currentYear = new Date().getFullYear();
  const hasYear = /\d{4}/.test(trimmed);
  let date = new Date(hasYear ? trimmed : `${trimmed} ${currentYear}`);
  if (!hasYear && !Number.isNaN(date.getTime()) && date < new Date()) {
    date = new Date(`${trimmed} ${currentYear + 1}`);
  }
  if (Number.isNaN(date.getTime())) return '';
  return formatLocalDate(date);
};

const getNextCalendarTermId = (settings: SystemSettings | null) => {
  const terms = settings?.schoolCalendars || [];
  const activeIndex = Math.max(terms.findIndex((term) => term.id === settings?.activeTermId), 0);
  return terms[Math.min(activeIndex + 1, Math.max(terms.length - 1, 0))]?.id || 'term-2';
};

const getCalendarSetupIssues = (settings: SystemSettings | null) => {
  const termId = getNextCalendarTermId(settings);
  const schoolTerm = settings?.schoolCalendars?.find((term) => term.id === termId);
  const hostelTerm = settings?.hostelCalendars?.find((term) => term.id === termId);
  const issues = [];
  if (schoolTerm && !schoolTerm.learnersOpeningDate) issues.push(`${schoolTerm.termName} learner opening date`);
  if (hostelTerm && !hostelTerm.hostelOpeningDate) issues.push(`${hostelTerm.termName} hostel opening date`);
  return { termId, termName: schoolTerm?.termName || hostelTerm?.termName || 'next term', issues };
};

const formatMoney = (value: string) =>
  `N$ ${(parseFloat(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const renderMessageText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    const key = `${lineIndex}_${line}`;
    const numbered = line.match(/^(\d+\.)\s(.+)$/);
    const bullet = line.match(/^(-)\s(.+)$/);
    const label = line.match(/^([^:]{2,36}):\s(.+)$/);
    const done = line.match(/^(Done\.)(.*)$/);
    const latest = line.match(/^(Latest notifications:|What would you like to do\?|Confirm teacher setup:|Confirm payment:)$/);

    let content: React.ReactNode = line;
    if (numbered) {
      content = (
        <>
          <strong className="font-black">{numbered[1]}</strong> {numbered[2]}
        </>
      );
    } else if (bullet) {
      content = (
        <>
          <span className="font-black text-coha-700">-</span> {bullet[2]}
        </>
      );
    } else if (label) {
      content = (
        <>
          <strong className="font-black">{label[1]}:</strong> {label[2]}
        </>
      );
    } else if (done) {
      content = (
        <>
          <strong className="font-black text-emerald-700">{done[1]}</strong>{done[2]}
        </>
      );
    } else if (latest) {
      content = <strong className="font-black">{line}</strong>;
    }

    return (
      <React.Fragment key={key}>
        {content}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

const NOTIF_META = [
  { icon: CreditCard, bg: '#2563eb', badge: '#1d4ed8' },
  { icon: UserPlus,   bg: '#059669', badge: '#047857' },
  { icon: Sparkles,   bg: '#7c3aed', badge: '#6d28d9' },
  { icon: Check,      bg: '#d97706', badge: '#b45309' },
  { icon: Bot,        bg: '#dc2626', badge: '#b91c1c' },
];

const animStyles = `
  @keyframes coha-popin {
    0%   { opacity: 0; transform: scale(0.35) translateY(40px); transform-origin: bottom right; }
    60%  { opacity: 1; }
    100% { opacity: 1; transform: scale(1) translateY(0); transform-origin: bottom right; }
  }
  @keyframes coha-popout {
    0%   { opacity: 1; transform: scale(1) translateY(0); transform-origin: bottom right; }
    25%  { transform: scale(1.08) translateY(-6px); transform-origin: bottom right; }
    100% { opacity: 0; transform: scale(0.08) translateY(60px); transform-origin: bottom right; }
  }
  @keyframes coha-ping {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50%       { transform: scale(1.55); opacity: 0; }
  }
  @keyframes coha-fab-idle {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-4px); }
  }
  @keyframes coha-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40%            { transform: translateY(-5px); opacity: 1; }
  }
`;

const closePanel = (setOpen: (v: boolean) => void) => {
  const panel = document.getElementById('coha-panel');
  if (panel) {
    panel.style.animation = 'coha-popout 0.5s cubic-bezier(0.36, 0, 0.66, -0.56) both';
    setTimeout(() => setOpen(false), 520);
  } else {
    setOpen(false);
  }
};

export const AdminAssistant: React.FC<AdminAssistantProps> = ({ user, isSubAdmin }) => {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [flow, setFlow] = useState<AssistantFlow>('MENU');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [teacherDraft, setTeacherDraft] = useState<TeacherDraft>(initialTeacherDraft);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(initialPaymentDraft);
  const [studentDraft, setStudentDraft] = useState<StudentDraft>(initialStudentDraft);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const calendarIssues = useMemo(() => getCalendarSetupIssues(settings), [settings]);
  const isStudentFlow = flow.startsWith('STUDENT_');

  const availableClasses = useMemo(() => {
    const grades = settings?.grades || [];
    const levels = settings?.specialNeedsLevels || [];
    return Array.from(new Set([...grades, ...levels].filter(Boolean)));
  }, [settings]);

  const paymentOptions = useMemo(() => getPaymentOptions(settings), [settings]);
  const canUseTeacherTools = !isSubAdmin;

  const addMessage = (from: Message['from'], text: string, status?: Message['status']) => {
    setMessages((prev) => [...prev, { id: makeId(), from, text, status }]);
  };

  const addTypingThenMessage = (
    from: Message['from'],
    text: string,
    status?: Message['status'],
    delayMs = 700
  ) => {
    const typingId = makeId();
    setMessages((prev) => [...prev, { id: typingId, from, text: '', status: 'typing' }]);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === typingId ? { ...m, text, status } : m))
      );
    }, delayMs);
  };

  const showMainMenu = () => {
    setFlow('MENU');
    setTeacherDraft(initialTeacherDraft());
    setPaymentDraft(initialPaymentDraft());
    setStudentDraft(initialStudentDraft());
    setStudentSearch('');
    setStudentResults([]);
    const teacherLine = canUseTeacherTools ? '\n1. Add a teacher' : '';
    const studentNumber = canUseTeacherTools ? '2' : '1';
    const paymentNumber = canUseTeacherTools ? '3' : '2';
    const pendingNumber = canUseTeacherTools ? '4' : '3';
    addMessage(
      'assistant',
      `What would you like to do? Reply with a number.${teacherLine}\n${studentNumber}. Add a student\n${paymentNumber}. Record a payment\n${pendingNumber}. Check pending work`
    );
  };

  const loadAssistantState = async () => {
    const data = await getSystemSettings();
    setSettings(data);
    setEnabled(!!data?.adminAssistantEnabled);
  };

  const showNotifications = async () => {
    setBusy(true);
    try {
      const counts = await getPendingActionCounts();
      const lines = [
        `${counts.pendingPaymentProofs} payment proof${counts.pendingPaymentProofs === 1 ? '' : 's'} waiting`,
        `${counts.pendingApps} school application${counts.pendingApps === 1 ? '' : 's'} pending`,
        `${counts.pendingVtcApps} VTC application${counts.pendingVtcApps === 1 ? '' : 's'} pending`,
        `${counts.pendingHomeworkSubmissions} homework submission${counts.pendingHomeworkSubmissions === 1 ? '' : 's'} to review`,
        `${counts.pendingVerifications} payment verification record${counts.pendingVerifications === 1 ? '' : 's'}`,
      ];
      addMessage(
        'assistant',
        `__NOTIFICATIONS__${JSON.stringify({ lines, total: counts.total })}`,
        counts.total ? undefined : 'success'
      );
    } catch {
      addMessage('assistant', 'I could not load notifications right now. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAssistantState();
    const refresh = () => loadAssistantState();
    window.addEventListener('coha-assistant-setting-change', refresh);
    return () => window.removeEventListener('coha-assistant-setting-change', refresh);
  }, []);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    addTypingThenMessage(
      'assistant',
      `Good day ${user?.name || 'Admin'}. I can guide you through common admin tasks.`,
      undefined,
      600
    );
    showNotifications().then(showMainMenu);
  }, [open, messages.length, user?.name]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, flow, studentResults]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (flow !== 'PAYMENT_STUDENT' || studentSearch.trim().length < 2) {
        setStudentResults([]);
        return;
      }
      const results = await searchStudents(studentSearch);
      if (!cancelled) setStudentResults(results.slice(0, 8));
    };
    const timer = window.setTimeout(run, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [flow, studentSearch]);

  const startTeacherFlow = () => {
    if (!canUseTeacherTools) {
      addMessage('assistant', 'Teacher setup is only available to the super admin.', 'error');
      showMainMenu();
      return;
    }
    setTeacherDraft(initialTeacherDraft());
    setFlow('TEACHER_NAME');
    addMessage('assistant', 'Teacher setup started. What is the teacher name?');
  };

  const startPaymentFlow = () => {
    setPaymentDraft({
      ...initialPaymentDraft(),
      termId: settings?.activeTermId || paymentOptions[0]?.value || '',
    });
    setStudentSearch('');
    setStudentResults([]);
    setFlow('PAYMENT_STUDENT');
    addMessage(
      'assistant',
      'Payment recording started. Which student are you recording this payment for? Start typing the student name.'
    );
  };

  const openStudentModal = (draft = studentDraft, animate = true) => {
    sessionStorage.setItem('coha_pending_add_student_draft', JSON.stringify(draft));
    navigate('/admin/students');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('coha-open-add-student', { detail: { draft, animate } }));
    }, 180);
  };

  const syncStudentDraft = (draft: StudentDraft, animate = true) => {
    setStudentDraft(draft);
    openStudentModal(draft, animate);
  };

  const startStudentFlow = () => {
    const draft = initialStudentDraft();
    syncStudentDraft(draft, false);
    setFlow('STUDENT_FIRST_NAME');
    addMessage('assistant', 'Student setup started. I opened the Students page and Add Student form. What is the student first name?');
  };

  const startTermSetupFlow = () => {
    setFlow('TERM_OPENING_DATE');
    addMessage('assistant', `Let me help you set up ${calendarIssues.termName}. When is the next term beginning? You can type a date like 18 Feb.`);
  };

  const handleMenuReply = (value: string) => {
    const trimmed = value.trim();
    if (canUseTeacherTools && trimmed === '1') return startTeacherFlow();
    if ((canUseTeacherTools && trimmed === '2') || (!canUseTeacherTools && trimmed === '1'))
      return startStudentFlow();
    if ((canUseTeacherTools && trimmed === '3') || (!canUseTeacherTools && trimmed === '2'))
      return startPaymentFlow();
    if ((canUseTeacherTools && trimmed === '4') || (!canUseTeacherTools && trimmed === '3'))
      return showNotifications().then(showMainMenu);
    addMessage('assistant', 'Please choose one of the menu numbers.');
  };

  const completeStudent = async () => {
    if (!studentDraft.firstName.trim() || !studentDraft.surname.trim() || !studentDraft.dob || !studentDraft.targetClass) {
      addMessage('assistant', 'The student setup still needs first name, surname, date of birth, and class.', 'error');
      return;
    }
    setBusy(true);
    addMessage('assistant', `Creating student profile for ${studentDraft.firstName} ${studentDraft.surname}...`, 'working');
    const result = await createStudentByAdmin({
      ...studentDraft,
      adminName: user?.name || 'Admin',
      adminId: user?.id || 'admin',
    });
    setBusy(false);
    if (!result.success) {
      addMessage('assistant', result.message || 'I could not create that student.', 'error');
      return;
    }
    window.dispatchEvent(new CustomEvent('coha-student-created'));
    addMessage('assistant', `Done. ${result.student?.name || 'Student'} was added to ${studentDraft.targetClass}.`, 'success');
    showMainMenu();
  };

  const saveNextTermOpeningDate = async (value: string) => {
    const dateValue = toDateInputValue(value);
    if (!dateValue || !settings) {
      addMessage('assistant', 'I could not read that date. Try a format like 18 Feb or 2026-02-18.');
      return;
    }
    const termId = calendarIssues.termId;
    const nextSettings: SystemSettings = {
      ...settings,
      activeTermId: settings.activeTermId || 'term-1',
      termStartDate: dateValue,
      schoolCalendars: (settings.schoolCalendars || []).map((term) => (
        term.id === termId
          ? {
              ...term,
              learnersOpeningDate: term.learnersOpeningDate || dateValue,
              teachersOpeningDate: term.teachersOpeningDate || dateValue,
            }
          : term
      )),
      hostelCalendars: (settings.hostelCalendars || []).map((term) => (
        term.id === termId
          ? {
              ...term,
              hostelOpeningDate: term.hostelOpeningDate || dateValue,
              staffOpeningDate: term.staffOpeningDate || dateValue,
            }
          : term
      )),
    };
    setBusy(true);
    const success = await saveSystemSettings(nextSettings);
    setBusy(false);
    if (!success) {
      addMessage('assistant', 'I could not save those calendar settings. Please try again.', 'error');
      return;
    }
    setSettings(nextSettings);
    window.dispatchEvent(new CustomEvent('coha-assistant-setting-change'));
    addMessage('assistant', `Done. I applied ${dateValue} to ${calendarIssues.termName} school and hostel opening dates.`, 'success');
    showMainMenu();
  };

  const completeTeacher = async () => {
    if (!teacherDraft.name.trim() || !teacherDraft.subject.trim() || teacherDraft.classes.length === 0) {
      addMessage('assistant', 'Teacher setup is missing a name, subject, or assigned class.', 'error');
      return;
    }
    setBusy(true);
    addMessage('assistant', `Creating teacher profile for ${teacherDraft.name}...`, 'working');
    const id = await addTeacher(
      teacherDraft.name.trim(),
      teacherDraft.subject.trim(),
      teacherDraft.classes[0],
      { assignedClasses: teacherDraft.classes, activeTeachingClass: teacherDraft.classes[0] }
    );
    setBusy(false);
    if (!id) {
      addMessage('assistant', 'I could not create that teacher. Please check the details and try again.', 'error');
      return;
    }
    addMessage(
      'assistant',
      `Done. ${teacherDraft.name} was added and assigned to ${teacherDraft.classes.join(', ')}. Default teacher password: ${DEFAULT_TEACHER_PASSWORD}. Run the Auth sync before they log in.`,
      'success'
    );
    showMainMenu();
  };

  const completePayment = async () => {
    if (
      !paymentDraft.student ||
      !paymentDraft.amount ||
      (paymentDraft.category === 'FEES' && !paymentDraft.termId) ||
      (paymentDraft.category === 'OTHER' && !paymentDraft.label.trim())
    ) {
      addMessage('assistant', 'Payment details are not complete yet.', 'error');
      return;
    }
    setBusy(true);
    addMessage('assistant', `Recording ${formatMoney(paymentDraft.amount)} for ${paymentDraft.student.name}...`, 'working');
    const result = await recordAdminPayment({
      studentId: paymentDraft.student.id,
      amount: parseFloat(paymentDraft.amount),
      paymentCategory: paymentDraft.category,
      termId: paymentDraft.category === 'FEES' ? paymentDraft.termId : '',
      paymentLabel: paymentDraft.category === 'OTHER' ? paymentDraft.label : undefined,
      academicYear:
        paymentDraft.student.academicYear ||
        `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      adminName: user?.name || 'Admin',
      adminId: user?.id || 'admin',
      notes: paymentDraft.notes,
    });
    setBusy(false);
    if (!result.success || !result.receipt) {
      addMessage('assistant', result.message || 'I could not record that payment.', 'error');
      return;
    }
    window.dispatchEvent(new CustomEvent('coha-payment-proof-update'));
    addMessage(
      'assistant',
      `Done. Receipt ${result.receipt.number} was created for ${paymentDraft.student.name}.`,
      'success'
    );
    showMainMenu();
  };

  const handleSubmit = async () => {
    const value = input.trim();
    if (!value || busy) return;
    addMessage('admin', value);
    setInput('');

    if (['menu', 'cancel', 'start over'].includes(value.toLowerCase())) {
      showMainMenu();
      return;
    }

    if (flow === 'MENU') return handleMenuReply(value);

    if (flow === 'TERM_OPENING_DATE') {
      return saveNextTermOpeningDate(value);
    }

    if (flow === 'STUDENT_FIRST_NAME') {
      const next = { ...studentDraft, firstName: value };
      syncStudentDraft(next);
      setFlow('STUDENT_SURNAME');
      addMessage('assistant', 'What is the student surname?');
      return;
    }

    if (flow === 'STUDENT_SURNAME') {
      const next = { ...studentDraft, surname: value };
      syncStudentDraft(next);
      setFlow('STUDENT_GENDER');
      addMessage('assistant', 'What is the student gender? Type Male, Female, or skip.');
      return;
    }

    if (flow === 'STUDENT_GENDER') {
      const skipped = value.toLowerCase() === 'skip';
      const normalized = value.toLowerCase().startsWith('m') ? 'Male' : value.toLowerCase().startsWith('f') ? 'Female' : '';
      if (!skipped && !normalized) {
        addMessage('assistant', 'Please type Male, Female, or skip.');
        return;
      }
      const next = { ...studentDraft, gender: skipped ? '' : normalized };
      syncStudentDraft(next);
      setFlow('STUDENT_DOB');
      addMessage('assistant', 'What is the date of birth? Use a full date like 2019-04-18.');
      return;
    }

    if (flow === 'STUDENT_DOB') {
      const dateValue = toDateInputValue(value);
      if (!dateValue) {
        addMessage('assistant', 'Please enter a valid date of birth, for example 2019-04-18.');
        return;
      }
      const next = { ...studentDraft, dob: dateValue };
      syncStudentDraft(next);
      setFlow('STUDENT_CLASS');
      addMessage('assistant', 'Choose the class from the cards below, or type the class name.');
      return;
    }

    if (flow === 'STUDENT_CLASS') {
      const next = { ...studentDraft, targetClass: value };
      syncStudentDraft(next);
      setFlow('STUDENT_HOSTEL');
      addMessage('assistant', 'Does this student need hostel accommodation? Reply yes, no, or skip.');
      return;
    }

    if (flow === 'STUDENT_HOSTEL') {
      const answer = value.toLowerCase();
      if (answer === 'yes' || answer === 'y') {
        const next = { ...studentDraft, needsHostel: true };
        syncStudentDraft(next);
        setFlow('STUDENT_DORM');
        addMessage('assistant', 'Which hostel should be assigned? Type a hostel name or skip.');
        return;
      }
      if (answer === 'no' || answer === 'n' || answer === 'skip') {
        const next = { ...studentDraft, needsHostel: false, dorm: '' };
        syncStudentDraft(next);
        setFlow('STUDENT_CONFIRM');
        addMessage('assistant', `Confirm student setup:\nName: ${next.firstName} ${next.surname}\nGender: ${next.gender || 'Skipped'}\nDate of birth: ${next.dob}\nClass: ${next.targetClass}\nHostel: No\n\nReply 1 to create student or 2 to start again.`);
        return;
      }
      addMessage('assistant', 'Reply yes, no, or skip.');
      return;
    }

    if (flow === 'STUDENT_DORM') {
      const next = { ...studentDraft, dorm: value.toLowerCase() === 'skip' ? '' : value };
      syncStudentDraft(next);
      setFlow('STUDENT_CONFIRM');
      addMessage('assistant', `Confirm student setup:\nName: ${next.firstName} ${next.surname}\nGender: ${next.gender || 'Skipped'}\nDate of birth: ${next.dob}\nClass: ${next.targetClass}\nHostel: ${next.needsHostel ? (next.dorm || 'Needed, no dorm selected') : 'No'}\n\nReply 1 to create student or 2 to start again.`);
      return;
    }

    if (flow === 'STUDENT_CONFIRM') {
      if (value === '1') return completeStudent();
      if (value === '2') return startStudentFlow();
      addMessage('assistant', 'Reply 1 to create the student, or 2 to start again.');
      return;
    }

    if (flow === 'TEACHER_NAME') {
      setTeacherDraft((prev) => ({ ...prev, name: value }));
      setFlow('TEACHER_SUBJECT');
      addMessage('assistant', 'What subject or department does this teacher handle?');
      return;
    }

    if (flow === 'TEACHER_SUBJECT') {
      setTeacherDraft((prev) => ({ ...prev, subject: value }));
      setFlow('TEACHER_CLASSES');
      addMessage('assistant', 'Choose the classes to assign. Tick one or more cards, then press Send classes.');
      return;
    }

    if (flow === 'TEACHER_CONFIRM') {
      if (value === '1') return completeTeacher();
      if (value === '2') return startTeacherFlow();
      addMessage('assistant', 'Reply 1 to create the teacher, or 2 to start again.');
      return;
    }

    if (flow === 'PAYMENT_AMOUNT') {
      if (!Number.isFinite(parseFloat(value)) || parseFloat(value) <= 0) {
        addMessage('assistant', 'Please enter a valid amount, for example 500.');
        return;
      }
      setPaymentDraft((prev) => ({ ...prev, amount: value }));
      setFlow('PAYMENT_CATEGORY');
      addMessage('assistant', 'What type of payment is this?\n1. School fees\n2. Other payment');
      return;
    }

    if (flow === 'PAYMENT_CATEGORY') {
      if (value === '1') {
        setPaymentDraft((prev) => ({
          ...prev,
          category: 'FEES',
          termId: prev.termId || paymentOptions[0]?.value || '',
        }));
        setFlow('PAYMENT_TERM');
        addMessage('assistant', 'Choose the fee or term from the cards below, then press Send term.');
        return;
      }
      if (value === '2') {
        setPaymentDraft((prev) => ({ ...prev, category: 'OTHER' }));
        setFlow('PAYMENT_LABEL');
        addMessage('assistant', 'What is this other payment for?');
        return;
      }
      addMessage('assistant', 'Reply 1 for school fees or 2 for another payment.');
      return;
    }

    if (flow === 'PAYMENT_LABEL') {
      setPaymentDraft((prev) => ({ ...prev, label: value }));
      setFlow('PAYMENT_NOTES');
      addMessage('assistant', 'Add a note for the receipt, or type none.');
      return;
    }

    if (flow === 'PAYMENT_NOTES') {
      const notes = value.toLowerCase() === 'none' ? '' : value;
      const nextDraft = { ...paymentDraft, notes };
      setPaymentDraft(nextDraft);
      setFlow('PAYMENT_CONFIRM');
      addMessage(
        'assistant',
        `Confirm payment:\nStudent: ${nextDraft.student?.name}\nAmount: ${formatMoney(nextDraft.amount)}\nType: ${nextDraft.category === 'FEES' ? 'School fees' : nextDraft.label}\n\nReply 1 to record payment or 2 to start again.`
      );
      return;
    }

    if (flow === 'PAYMENT_CONFIRM') {
      if (value === '1') return completePayment();
      if (value === '2') return startPaymentFlow();
      addMessage('assistant', 'Reply 1 to record the payment, or 2 to start again.');
    }
  };

  const toggleClass = (className: string) => {
    setTeacherDraft((prev) => ({
      ...prev,
      classes: prev.classes.includes(className)
        ? prev.classes.filter((item) => item !== className)
        : [...prev.classes, className],
    }));
  };

  const sendTeacherClasses = () => {
    if (teacherDraft.classes.length === 0) {
      addMessage('assistant', 'Select at least one class.');
      return;
    }
    setFlow('TEACHER_CONFIRM');
    addMessage(
      'assistant',
      `Confirm teacher setup:\nName: ${teacherDraft.name}\nSubject: ${teacherDraft.subject}\nClasses: ${teacherDraft.classes.join(', ')}\n\nReply 1 to create teacher or 2 to start again.`
    );
  };

  const selectStudent = (student: Student) => {
    setPaymentDraft((prev) => ({ ...prev, student }));
    setStudentSearch(student.name);
    setStudentResults([]);
    setFlow('PAYMENT_AMOUNT');
    addMessage('admin', `Selected ${student.name}`);
    addMessage('assistant', `How much did ${student.name} pay?`);
  };

  const sendPaymentTerm = () => {
    if (!paymentDraft.termId) {
      addMessage('assistant', 'Choose a fee or term first.');
      return;
    }
    setFlow('PAYMENT_NOTES');
    addMessage('assistant', 'Add a note for the receipt, or type none.');
  };

  const chooseStudentClass = (className: string) => {
    const next = { ...studentDraft, targetClass: className };
    syncStudentDraft(next);
    setFlow('STUDENT_HOSTEL');
    addMessage('admin', `Selected ${className}`);
    addMessage('assistant', 'Does this student need hostel accommodation? Reply yes, no, or skip.');
  };

  const chooseStudentDorm = (dorm: string) => {
    const next = { ...studentDraft, needsHostel: true, dorm };
    syncStudentDraft(next);
    setFlow('STUDENT_CONFIRM');
    addMessage('admin', `Selected ${dorm}`);
    addMessage('assistant', `Confirm student setup:\nName: ${next.firstName} ${next.surname}\nGender: ${next.gender || 'Skipped'}\nDate of birth: ${next.dob}\nClass: ${next.targetClass}\nHostel: ${next.dorm}\n\nReply 1 to create student or 2 to start again.`);
  };

  if (!enabled) return null;

  const isNotif = (text: string) => text.startsWith('__NOTIFICATIONS__');
  const inputSuggestionOptions = flow === 'STUDENT_FIRST_NAME'
    ? STUDENT_FIRST_NAME_SUGGESTIONS
    : flow === 'STUDENT_SURNAME'
    ? STUDENT_SURNAME_SUGGESTIONS
    : flow === 'STUDENT_GENDER'
    ? [...STUDENT_GENDER_SUGGESTIONS, 'Skip']
    : flow === 'STUDENT_CLASS'
    ? availableClasses
    : flow === 'STUDENT_DORM'
    ? [...(settings?.hostels || []), 'Skip']
    : flow === 'STUDENT_HOSTEL'
    ? ['Yes', 'No', 'Skip']
    : flow === 'TERM_OPENING_DATE'
    ? ['18 Feb', '2026-02-18']
    : [];
  const inlineSuggestion = input
    ? inputSuggestionOptions.find((option) => option.toLowerCase().startsWith(input.toLowerCase()) && option.toLowerCase() !== input.toLowerCase())
    : '';

  const renderNotifications = (text: string) => {
    const payload = JSON.parse(text.replace('__NOTIFICATIONS__', ''));
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <p
            className="text-[9px] font-black uppercase"
            style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em' }}
          >
            Pending work
          </p>
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="flex flex-col gap-2">
          {payload.lines.map((line: string, i: number) => {
            const match = line.match(/^(\d+) (.+)$/);
            const count = match ? parseInt(match[1]) : 0;
            const label = match ? match[2] : line;
            const isZero = count === 0;
            const { icon: Icon, bg, badge } = NOTIF_META[i] || NOTIF_META[0];
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                style={{
                  background: isZero ? `${bg}18` : `${bg}28`,
                  border: `1.5px solid ${bg}${isZero ? '40' : '70'}`,
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isZero ? `${bg}35` : bg,
                      boxShadow: isZero ? 'none' : `0 3px 10px ${bg}55`,
                    }}
                  >
                    <Icon size={14} color={isZero ? bg : '#fff'} />
                  </span>
                  <span
                    className="text-xs font-semibold leading-tight"
                    style={{ color: '#fff', fontWeight: 800 }}
                  >
                    {label}
                  </span>
                </span>
                <span
                  className="text-xs font-black rounded-lg flex items-center justify-center"
                  style={{
                    minWidth: '34px',
                    height: '28px',
                    padding: '0 10px',
                    background: isZero ? `${bg}28` : badge,
                    color: '#fff',
                    letterSpacing: '0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 900,
                    boxShadow: isZero ? 'none' : `0 2px 10px ${badge}88`,
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      <style>{animStyles}</style>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full bg-coha-900 text-white flex items-center justify-center border border-white/20 relative"
          aria-label="Open admin assistant"
          style={{
            boxShadow: '0 16px 40px rgba(43,43,94,0.35)',
            animation: 'coha-fab-idle 2.8s ease-in-out infinite',
          }}
        >
          <span
            className="absolute inset-0 rounded-full bg-coha-700 opacity-30"
            style={{ animation: 'coha-ping 2.8s ease-in-out infinite' }}
          />
          <MessageCircle size={24} className="relative z-10" />
        </button>
      )}

      {open && (
        <>
          {!isStudentFlow && (
            <div
              className="fixed inset-0 z-[-1]"
              style={{
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                background: 'rgba(15,23,42,0.35)',
              }}
              onClick={() => closePanel(setOpen)}
            />
          )}

          <div
            id="coha-panel"
            className={`w-[calc(100vw-32px)] ${isStudentFlow ? 'sm:w-[500px] h-[680px]' : 'sm:w-[620px] h-[820px]'} max-h-[calc(100vh-40px)] bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col`}
            style={{
              boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
              animation: 'coha-popin 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}
          >
            {/* Header */}
            <div className="bg-coha-900 text-white px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/12 flex items-center justify-center">
                  <Bot size={21} />
                </div>
                <div>
                  <p className="text-sm font-black">COHA Assistant</p>
                  <p className="text-[11px] text-white/70 font-semibold">
                    {isSubAdmin ? 'Sub-admin tools' : 'Super admin tools'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => closePanel(setOpen)}
                className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.from === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    style={
                      message.from === 'admin'
                        ? {
                            background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)',
                            boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
                          }
                        : isNotif(message.text)
                        ? {
                            background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
                            border: '1.5px solid rgba(255,255,255,0.08)',
                          }
                        : {}
                    }
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.from === 'admin'
                        ? 'text-white rounded-br-md'
                        : isNotif(message.text)
                        ? 'text-white rounded-bl-md shadow-lg'
                        : message.status === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-bl-md shadow-sm'
                        : message.status === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-100 rounded-bl-md shadow-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {message.status === 'typing' ? (
                      <span className="flex items-center gap-1 py-1 px-1">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="h-2 w-2 rounded-full bg-slate-400 inline-block"
                            style={{
                              animation: `coha-dot-bounce 1.2s ease-in-out ${d * 0.18}s infinite`,
                            }}
                          />
                        ))}
                      </span>
                    ) : message.status === 'working' ? (
                      <Loader2 size={15} className="inline mr-2 animate-spin" />
                    ) : null}
                    {message.status !== 'typing' && (
                      isNotif(message.text)
                        ? renderNotifications(message.text)
                        : renderMessageText(message.text)
                    )}
                  </div>
                </div>
              ))}

              {/* Teacher class picker */}
              {flow === 'TEACHER_CLASSES' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {availableClasses.map((className) => (
                      <button
                        key={className}
                        onClick={() => toggleClass(className)}
                        className={`min-h-[48px] rounded-xl border px-3 text-left text-xs font-black transition-all active:scale-95 ${
                          teacherDraft.classes.includes(className)
                            ? 'border-coha-900 bg-coha-50 text-coha-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          {teacherDraft.classes.includes(className) && <Check size={14} />}
                          {className}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={sendTeacherClasses}
                    className="mt-3 h-10 w-full rounded-xl text-white text-sm font-bold transition-all active:scale-98"
                    style={{
                      background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)',
                      boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                    }}
                  >
                    Send classes
                  </button>
                </div>
              )}

              {/* Student search */}
              {flow === 'PAYMENT_STUDENT' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Type student name..."
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-coha-900"
                  />
                  {studentResults.length > 0 && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                      {studentResults.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => selectStudent(student)}
                          className="w-full px-3 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between transition-colors"
                        >
                          <span>
                            <span className="block text-sm font-black text-slate-900">{student.name}</span>
                            <span className="block text-xs font-semibold text-slate-500">
                              {student.id} · {student.assignedClass || student.grade || student.level || '-'}
                            </span>
                          </span>
                          <ChevronRight size={16} className="text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Term picker */}
              {flow === 'PAYMENT_TERM' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                  <div className="grid gap-2">
                    {paymentOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPaymentDraft((prev) => ({ ...prev, termId: option.value }))}
                        className={`rounded-xl border px-3 py-3 text-left text-xs font-black transition-all ${
                          paymentDraft.termId === option.value
                            ? 'border-coha-900 bg-coha-50 text-coha-900'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={sendPaymentTerm}
                    className="mt-3 h-10 w-full rounded-xl text-white text-sm font-bold transition-all active:scale-98"
                    style={{
                      background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                      boxShadow: '0 4px 14px rgba(6,78,59,0.35)',
                    }}
                  >
                    Send term
                  </button>
                </div>
              )}

              {flow === 'STUDENT_CLASS' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {availableClasses.map((className) => (
                      <button
                        key={className}
                        onClick={() => chooseStudentClass(className)}
                        className={`rounded-xl border px-3 py-3 text-left text-xs font-black transition-all ${
                          studentDraft.targetClass === className
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {className}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {flow === 'STUDENT_DORM' && (settings?.hostels || []).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {(settings?.hostels || []).map((dorm) => (
                      <button
                        key={dorm}
                        onClick={() => chooseStudentDorm(dorm)}
                        className={`rounded-xl border px-3 py-3 text-left text-xs font-black transition-all ${
                          studentDraft.dorm === dorm
                            ? 'border-amber-600 bg-amber-50 text-amber-900'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {dorm}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-200 bg-white p-3">
              {calendarIssues.issues.length > 0 && flow === 'MENU' && (
                <button
                  type="button"
                  onClick={() => {
                    addMessage('assistant', `There are settings you did not apply yet:\n- ${calendarIssues.issues.join('\n- ')}`);
                    startTermSetupFlow();
                  }}
                  className="mb-3 w-full rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-left transition-all hover:bg-amber-100"
                  style={{ boxShadow: '0 0 22px rgba(245,158,11,0.35)' }}
                >
                  <span className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.65)]">
                      <AlertTriangle size={20} />
                    </span>
                    <span>
                      <span className="block text-xs font-black uppercase tracking-widest text-amber-900">Settings not applied</span>
                      <span className="block text-xs font-bold text-amber-800">{calendarIssues.termName} calendar needs setup</span>
                    </span>
                  </span>
                </button>
              )}
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {canUseTeacherTools && (
                  <button
                    onClick={startTeacherFlow}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(49,46,129,0.4)',
                    }}
                  >
                    <UserPlus size={13} /> Add teacher
                  </button>
                )}
                <button
                  onClick={startStudentFlow}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(4,120,87,0.4)',
                  }}
                >
                  <UserPlus size={13} /> Add student
                </button>
                <button
                  onClick={startPaymentFlow}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(6,78,59,0.4)',
                  }}
                >
                  <CreditCard size={13} /> Record payment
                </button>
                <button
                  onClick={() => showNotifications()}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(120,53,15,0.4)',
                  }}
                >
                  <Sparkles size={13} /> Pending
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  {inlineSuggestion && !busy && (
                    <span className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 z-0 overflow-hidden whitespace-nowrap text-sm">
                      <span className="text-transparent">{input}</span>
                      <span className="text-slate-300">{inlineSuggestion.slice(input.length)}</span>
                    </span>
                  )}
                  <input
                    value={input}
                    list="coha-admin-assistant-suggestions"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && inlineSuggestion) {
                        e.preventDefault();
                        setInput(inlineSuggestion);
                        return;
                      }
                      if (e.key === 'Enter') handleSubmit();
                    }}
                    disabled={
                      busy ||
                      flow === 'TEACHER_CLASSES' ||
                      flow === 'PAYMENT_STUDENT' ||
                      flow === 'PAYMENT_TERM'
                    }
                    placeholder={busy ? 'Working...' : 'Reply with a number or type here'}
                    className="relative z-10 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-coha-900 disabled:bg-slate-100 transition-colors"
                  />
                  <datalist id="coha-admin-assistant-suggestions">
                    {inputSuggestionOptions.map((option) => <option key={option} value={option} />)}
                  </datalist>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={
                    busy ||
                    !input.trim() ||
                    flow === 'TEACHER_CLASSES' ||
                    flow === 'PAYMENT_STUDENT' ||
                    flow === 'PAYMENT_TERM'
                  }
                  className="h-11 w-11 rounded-xl text-white disabled:opacity-40 flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)',
                    boxShadow: '0 4px 14px rgba(79,70,229,0.45)',
                  }}
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
