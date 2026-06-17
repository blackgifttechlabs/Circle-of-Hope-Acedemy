import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
  getPendingActionCounts,
  getSystemSettings,
  recordAdminPayment,
  searchStudents,
} from '../services/dataService';
import { Student, SystemSettings, UserRole } from '../types';
import { DEFAULT_TEACHER_PASSWORD } from '../utils/credentials';
import { getPaymentOptions } from '../utils/paymentOptions';

type Message = {
  id: string;
  from: 'assistant' | 'admin';
  text: string;
  status?: 'working' | 'success' | 'error';
};

type AssistantFlow = 'MENU' | 'TEACHER_NAME' | 'TEACHER_SUBJECT' | 'TEACHER_CLASSES' | 'TEACHER_CONFIRM' | 'PAYMENT_STUDENT' | 'PAYMENT_AMOUNT' | 'PAYMENT_CATEGORY' | 'PAYMENT_TERM' | 'PAYMENT_LABEL' | 'PAYMENT_NOTES' | 'PAYMENT_CONFIRM';

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

const formatMoney = (value: string) => `N$ ${(parseFloat(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const renderMessageText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    const key = `${lineIndex}_${line}`;
    const numbered = line.match(/^(\d+\.)\s(.+)$/);
    const bullet = line.match(/^(-)\s(.+)$/);
    const label = line.match(/^([^:]{2,36}):\s(.+)$/);
    const done = line.match(/^(Done\.)(.*)$/);
    const latest = line.match(/^(Latest notifications:|What would you like to do\\?|Confirm teacher setup:|Confirm payment:)$/);

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

export const AdminAssistant: React.FC<AdminAssistantProps> = ({ user, isSubAdmin }) => {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [flow, setFlow] = useState<AssistantFlow>('MENU');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [teacherDraft, setTeacherDraft] = useState<TeacherDraft>(initialTeacherDraft);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(initialPaymentDraft);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const showMainMenu = () => {
    setFlow('MENU');
    setTeacherDraft(initialTeacherDraft());
    setPaymentDraft(initialPaymentDraft());
    setStudentSearch('');
    setStudentResults([]);
    const teacherLine = canUseTeacherTools ? '\n1. Add a teacher' : '';
    const paymentNumber = canUseTeacherTools ? '2' : '1';
    const pendingNumber = canUseTeacherTools ? '3' : '2';
    addMessage(
      'assistant',
      `What would you like to do? Reply with a number.${teacherLine}\n${paymentNumber}. Record a payment\n${pendingNumber}. Check pending work`
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
      addMessage('assistant', `Latest notifications:\n${lines.map((line) => `- ${line}`).join('\n')}`, counts.total ? undefined : 'success');
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
    addMessage('assistant', `Good day ${user?.name || 'Admin'}. I can guide you through common admin tasks.`);
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
    setPaymentDraft({ ...initialPaymentDraft(), termId: settings?.activeTermId || paymentOptions[0]?.value || '' });
    setStudentSearch('');
    setStudentResults([]);
    setFlow('PAYMENT_STUDENT');
    addMessage('assistant', 'Payment recording started. Which student are you recording this payment for? Start typing the student name.');
  };

  const handleMenuReply = (value: string) => {
    const trimmed = value.trim();
    if (canUseTeacherTools && trimmed === '1') return startTeacherFlow();
    if ((canUseTeacherTools && trimmed === '2') || (!canUseTeacherTools && trimmed === '1')) return startPaymentFlow();
    if ((canUseTeacherTools && trimmed === '3') || (!canUseTeacherTools && trimmed === '2')) return showNotifications().then(showMainMenu);
    addMessage('assistant', 'Please choose one of the menu numbers.');
  };

  const completeTeacher = async () => {
    if (!teacherDraft.name.trim() || !teacherDraft.subject.trim() || teacherDraft.classes.length === 0) {
      addMessage('assistant', 'Teacher setup is missing a name, subject, or assigned class.', 'error');
      return;
    }

    setBusy(true);
    addMessage('assistant', `Creating teacher profile for ${teacherDraft.name}...`, 'working');
    const id = await addTeacher(teacherDraft.name.trim(), teacherDraft.subject.trim(), teacherDraft.classes[0], {
      assignedClasses: teacherDraft.classes,
      activeTeachingClass: teacherDraft.classes[0],
    });
    setBusy(false);

    if (!id) {
      addMessage('assistant', 'I could not create that teacher. Please check the details and try again.', 'error');
      return;
    }

    addMessage(
      'assistant',
      `Done. ${teacherDraft.name} was added and assigned to ${teacherDraft.classes.join(', ')}. Default teacher password: ${DEFAULT_TEACHER_PASSWORD}. Their login account is created automatically when the backend function is configured.`,
      'success'
    );
    showMainMenu();
  };

  const completePayment = async () => {
    if (!paymentDraft.student || !paymentDraft.amount || (paymentDraft.category === 'FEES' && !paymentDraft.termId) || (paymentDraft.category === 'OTHER' && !paymentDraft.label.trim())) {
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
      academicYear: paymentDraft.student.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
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
    addMessage('assistant', `Done. Receipt ${result.receipt.number} was created for ${paymentDraft.student.name}.`, 'success');
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
        setPaymentDraft((prev) => ({ ...prev, category: 'FEES', termId: prev.termId || paymentOptions[0]?.value || '' }));
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
      addMessage('assistant', `Confirm payment:\nStudent: ${nextDraft.student?.name}\nAmount: ${formatMoney(nextDraft.amount)}\nType: ${nextDraft.category === 'FEES' ? 'School fees' : nextDraft.label}\n\nReply 1 to record payment or 2 to start again.`);
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
    addMessage('assistant', `Confirm teacher setup:\nName: ${teacherDraft.name}\nSubject: ${teacherDraft.subject}\nClasses: ${teacherDraft.classes.join(', ')}\n\nReply 1 to create teacher or 2 to start again.`);
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

  if (!enabled) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full bg-coha-900 text-white shadow-[0_16px_40px_rgba(43,43,94,0.35)] flex items-center justify-center border border-white/20"
          aria-label="Open admin assistant"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className="w-[calc(100vw-32px)] sm:w-[420px] h-[620px] max-h-[calc(100vh-40px)] bg-white border border-gray-200 shadow-[0_24px_80px_rgba(15,23,42,0.25)] rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-coha-900 text-white px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/12 flex items-center justify-center">
                <Bot size={21} />
              </div>
              <div>
                <p className="text-sm font-black">COHA Assistant</p>
                <p className="text-[11px] text-white/70 font-semibold">{isSubAdmin ? 'Sub-admin tools' : 'Super admin tools'}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.from === 'admin'
                    ? 'bg-coha-900 text-white rounded-br-md'
                    : message.status === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-bl-md'
                      : message.status === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-100 rounded-bl-md'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                }`}>
                  {message.status === 'working' && <Loader2 size={15} className="inline mr-2 animate-spin" />}
                  {renderMessageText(message.text)}
                </div>
              </div>
            ))}

            {flow === 'TEACHER_CLASSES' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                  {availableClasses.map((className) => (
                    <button
                      key={className}
                      onClick={() => toggleClass(className)}
                      className={`min-h-[48px] rounded-xl border px-3 text-left text-xs font-black transition ${
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
                <button onClick={sendTeacherClasses} className="mt-3 h-10 w-full rounded-xl bg-coha-900 text-white text-sm font-bold">
                  Send classes
                </button>
              </div>
            )}

            {flow === 'PAYMENT_STUDENT' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm animate-[fadeup_.18s_ease]">
                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Type student name..."
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-coha-900"
                />
                {studentResults.length > 0 && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                    {studentResults.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => selectStudent(student)}
                        className="w-full px-3 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                      >
                        <span>
                          <span className="block text-sm font-black text-slate-900">{student.name}</span>
                          <span className="block text-xs font-semibold text-slate-500">{student.id} · {student.assignedClass || student.grade || student.level || '-'}</span>
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {flow === 'PAYMENT_TERM' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div className="grid gap-2">
                  {paymentOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPaymentDraft((prev) => ({ ...prev, termId: option.value }))}
                      className={`rounded-xl border px-3 py-3 text-left text-xs font-black ${
                        paymentDraft.termId === option.value ? 'border-coha-900 bg-coha-50 text-coha-900' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button onClick={sendPaymentTerm} className="mt-3 h-10 w-full rounded-xl bg-coha-900 text-white text-sm font-bold">
                  Send term
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {canUseTeacherTools && (
                <button onClick={startTeacherFlow} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 inline-flex items-center gap-1">
                  <UserPlus size={13} /> Add teacher
                </button>
              )}
              <button onClick={startPaymentFlow} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 inline-flex items-center gap-1">
                <CreditCard size={13} /> Record payment
              </button>
              <button onClick={() => showNotifications()} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 inline-flex items-center gap-1">
                <Sparkles size={13} /> Pending
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmit();
                }}
                disabled={busy || flow === 'TEACHER_CLASSES' || flow === 'PAYMENT_STUDENT' || flow === 'PAYMENT_TERM'}
                placeholder={busy ? 'Working...' : 'Reply with a number or type here'}
                className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-coha-900 disabled:bg-slate-100"
              />
              <button
                onClick={handleSubmit}
                disabled={busy || !input.trim() || flow === 'TEACHER_CLASSES' || flow === 'PAYMENT_STUDENT' || flow === 'PAYMENT_TERM'}
                className="h-11 w-11 rounded-xl bg-coha-900 text-white disabled:opacity-40 flex items-center justify-center"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
