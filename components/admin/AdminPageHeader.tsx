import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Download, Layers3, Menu, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSystemSettings } from '../../services/dataService';
import { SystemSettings } from '../../types';
import {
  ADMIN_ASSESSMENT_TERM_EVENT,
  getAssessmentTermOptions,
  getStoredAdminAssessmentTerm,
  setStoredAdminAssessmentTerm,
} from '../../utils/adminAssessmentTerm';

const getAdminHeaderMeta = (pathname: string) => {
  if (pathname.includes('/admin/assessment-progress/view/')) {
    return {
      title: 'Assessment Sheet',
      subtitle: 'Review the selected assessment sheet.',
      backPath: '/admin/assessment-progress',
    };
  }
  if (pathname.startsWith('/admin/assessment-progress')) {
    return {
      title: 'View Assessment Progress',
      subtitle: '',
      backPath: '/admin/teachers',
    };
  }
  if (pathname.startsWith('/admin/lesson-plans')) {
    return {
      title: 'View Lesson Plans',
      subtitle: 'Review submitted lesson plans by class.',
      backPath: '/admin/teachers',
    };
  }
  if (pathname.startsWith('/admin/teachers/')) {
    return {
      title: 'Teacher Progress',
      subtitle: 'Review teacher class activity and student performance.',
      backPath: '/admin/teachers',
    };
  }
  if (pathname.startsWith('/admin/teachers')) {
    return { title: 'Teachers', subtitle: 'Teacher allocations and class assignments.' };
  }
  if (pathname.startsWith('/admin/students/')) {
    return { title: 'Student Profile', subtitle: 'Review student records and portal access.', backPath: '/admin/students' };
  }
  if (pathname.startsWith('/admin/students')) {
    return { title: 'Student Directory', subtitle: 'Manage enrollment records and portal access.' };
  }
  if (pathname.startsWith('/admin/payments')) {
    return { title: 'Payments', subtitle: 'Review payment proofs, receipts, and office payments.' };
  }
  if (pathname.startsWith('/admin/applications-history')) {
    return { title: 'Previous Applications', subtitle: 'Review completed and archived applications.' };
  }
  if (pathname.startsWith('/admin/automated-replies')) {
    return { title: 'Automated Replies', subtitle: 'Review system-sent application reply logs.' };
  }
  if (pathname.startsWith('/admin/applications/')) {
    return { title: 'Application Details', subtitle: 'Review applicant information and application status.', backPath: '/admin/applications' };
  }
  if (pathname.startsWith('/admin/applications')) {
    return { title: 'Applications', subtitle: 'Review incoming student applications.' };
  }
  if (pathname.startsWith('/admin/vtc-applications/')) {
    return { title: 'VTC Application Details', subtitle: 'Review vocational training application details.', backPath: '/admin/vtc-applications' };
  }
  if (pathname.startsWith('/admin/vtc-applications')) {
    return { title: 'VTC Applications', subtitle: 'Review vocational training applications.' };
  }
  if (pathname.startsWith('/admin/internships/')) {
    return { title: 'Internship Details', subtitle: 'Review internship application details.', backPath: '/admin/internships' };
  }
  if (pathname.startsWith('/admin/internships')) {
    return { title: 'Internships', subtitle: 'Review internship applications.' };
  }
  if (pathname.startsWith('/admin/activities')) {
    return { title: 'View Activities', subtitle: 'Audit portal actions and activity history.' };
  }
  if (pathname.startsWith('/admin/homeworks')) {
    return { title: 'Homeworks', subtitle: 'Review homework submissions and teacher activity.' };
  }
  if (pathname.startsWith('/admin/matron-records')) {
    return { title: 'Matron Records', subtitle: 'Review hostel care, medication, and matron logs.' };
  }
  if (pathname.startsWith('/admin/settings')) {
    return { title: 'System Settings', subtitle: 'Manage portal settings and school configuration.' };
  }
  if (pathname.startsWith('/admin/dashboard')) {
    return { title: 'Dashboard', subtitle: 'Monitor school operations and admin activity.' };
  }
  return { title: 'Admin Portal', subtitle: 'Circle of Hope Academy administration.' };
};

export const AdminPageHeader: React.FC<{
  user?: any;
  onMenuClick?: () => void;
}> = ({ user, onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = getAdminHeaderMeta(location.pathname);
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const isAssessmentProgress = location.pathname.startsWith('/admin/assessment-progress') && !location.pathname.includes('/admin/assessment-progress/view/');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [termMenuOpen, setTermMenuOpen] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [progressMeta, setProgressMeta] = useState<{
    levelLabel: string;
    subjectsCount: number;
    teacherNames: string;
    onDownloadAllSubjects: () => void | Promise<void>;
    onDownloadSummary: () => void | Promise<void>;
  } | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);

  useEffect(() => {
    if (!isAssessmentProgress) return;
    let mounted = true;
    getSystemSettings().then((data) => {
      if (!mounted) return;
      setSettings(data);
      setSelectedTermId(getStoredAdminAssessmentTerm(data));
    });

    const handleTermChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ termId?: string }>;
      if (customEvent.detail?.termId) setSelectedTermId(customEvent.detail.termId);
    };
    window.addEventListener(ADMIN_ASSESSMENT_TERM_EVENT, handleTermChange as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener(ADMIN_ASSESSMENT_TERM_EVENT, handleTermChange as EventListener);
    };
  }, [isAssessmentProgress]);

  useEffect(() => {
    const handleProgressMeta = (event: Event) => {
      const customEvent = event as CustomEvent<typeof progressMeta>;
      setProgressMeta(customEvent.detail ?? null);
    };
    window.addEventListener('admin-assessment-progress-header', handleProgressMeta as EventListener);
    return () => window.removeEventListener('admin-assessment-progress-header', handleProgressMeta as EventListener);
  }, []);

  const handleDownloadAllSubjects = async () => {
    if (!progressMeta || downloadingAll) return;
    setDownloadingAll(true);
    try {
      await progressMeta.onDownloadAllSubjects();
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (!progressMeta || downloadingSummary) return;
    setDownloadingSummary(true);
    try {
      await progressMeta.onDownloadSummary();
    } finally {
      setDownloadingSummary(false);
    }
  };

  const termOptions = getAssessmentTermOptions(settings);
  const selectedTerm = termOptions.find((term) => term.id === selectedTermId) || termOptions[0];
  const subtitle = isAssessmentProgress && selectedTerm
    ? `Current Term: ${selectedTerm.label}`
    : meta.subtitle;

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className={`flex items-center justify-between gap-4 px-5 lg:px-6 ${isAssessmentProgress ? 'min-h-[118px] py-4' : 'min-h-[76px]'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-purple-200 hover:text-purple-700 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          {meta.backPath && (
            <button
              type="button"
              onClick={() => navigate(meta.backPath)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-purple-200 hover:text-purple-700"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight text-slate-950">{meta.title}</h1>
            {isAssessmentProgress && progressMeta ? (
              <div className="mt-2 min-w-0">
                {subtitle && <p className="truncate text-[10px] font-black uppercase tracking-widest text-purple-700">{subtitle}</p>}
                <p className="mt-1 truncate text-2xl font-black leading-tight text-slate-950">{progressMeta.levelLabel}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                  Subjects: {progressMeta.subjectsCount} • Teacher: {progressMeta.teacherNames}
                </p>
              </div>
            ) : (
              subtitle && <p className="mt-1 truncate text-sm font-semibold text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-l border-slate-200 pl-4">
          {isAssessmentProgress && progressMeta && (
            <div className="hidden items-center gap-2 xl:flex">
              <button
                type="button"
                onClick={handleDownloadAllSubjects}
                disabled={downloadingAll}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-purple-700 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {downloadingAll ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>
                    <Layers3 size={16} />
                    Download All Subjects In 1 File
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadSummary}
                disabled={downloadingSummary}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {downloadingSummary ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>
                    <Download size={16} />
                    Download Summary Sheet
                  </>
                )}
              </button>
            </div>
          )}
          {isAssessmentProgress && selectedTerm && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setTermMenuOpen((open) => !open)}
                className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 shadow-sm transition hover:border-purple-200 hover:bg-white"
              >
                <span>{selectedTerm.label}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${termMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {termMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-30 cursor-default"
                    aria-label="Close term menu"
                    onClick={() => setTermMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-[18px] border border-white/70 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
                    <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Select term</p>
                    {termOptions.map((term) => {
                      const active = term.id === selectedTerm.id;
                      return (
                        <button
                          key={term.id}
                          type="button"
                          onClick={() => {
                            setStoredAdminAssessmentTerm(term.id);
                            setSelectedTermId(term.id);
                            setTermMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-left text-sm font-black transition ${
                            active ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{term.label}</span>
                          {active && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Signed in</p>
            <p className="mt-0.5 max-w-[180px] truncate text-sm font-black text-slate-800">{user?.name || 'Admin'}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2E1065] text-sm font-black text-white shadow-sm">
            {initial || <UserRound size={18} />}
          </div>
        </div>
      </div>
    </header>
  );
};
