import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, LogOut, X,
  FileText, Settings, Activity, ClipboardList, ChevronLeft,
  ChevronRight, Calendar, BarChart3, CreditCard, BookOpen,
} from 'lucide-react';
import { UserRole } from '../types';
import { getAllHomeworkSubmissions, getHomeworkSubmissionsForClass, getPaymentProofs, getPendingActionCounts, getStudentById } from '../services/dataService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  user?: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, role, user, onLogout }) => {
  const location = useLocation();
  const [applicationBadgeCount, setApplicationBadgeCount] = useState(0);
  const [paymentBadgeCount, setPaymentBadgeCount] = useState(0);
  const [homeworkBadgeCount, setHomeworkBadgeCount] = useState(0);
  const [vtcBadgeCount, setVtcBadgeCount] = useState(0);
  const [isCollapsed, setIsCollapsed]     = useState(false);
  const [studentDivision, setStudentDivision] = useState<string | null>(null);

  const getMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const adminPaymentsViewKey = `coha_seen_admin_payments_${user?.id || 'admin'}`;
  const adminHomeworksViewKey = `coha_seen_admin_homeworks_${user?.id || 'admin'}`;
  const teacherHomeworksViewKey = `coha_seen_teacher_homeworks_${user?.id || 'teacher'}_${user?.assignedClass || 'class'}`;

  useEffect(() => {
    if (role === UserRole.ADMIN && location.pathname.startsWith('/admin/payments')) {
      localStorage.setItem(adminPaymentsViewKey, String(Date.now()));
      setPaymentBadgeCount(0);
    }

    if (role === UserRole.ADMIN && location.pathname.startsWith('/admin/homeworks')) {
      localStorage.setItem(adminHomeworksViewKey, String(Date.now()));
      setHomeworkBadgeCount(0);
    }

    if (role === UserRole.TEACHER && location.pathname.startsWith('/teacher/homework')) {
      localStorage.setItem(teacherHomeworksViewKey, String(Date.now()));
      setHomeworkBadgeCount(0);
    }
  }, [role, location.pathname, adminPaymentsViewKey, adminHomeworksViewKey, teacherHomeworksViewKey]);

  useEffect(() => {
    if (role === UserRole.ADMIN) {
      const fetchCounts = async () => {
        const [counts, paymentProofs, homeworkSubmissions] = await Promise.all([
          getPendingActionCounts(),
          getPaymentProofs(),
          getAllHomeworkSubmissions(),
        ]);
        const lastViewedPaymentsAt = parseInt(localStorage.getItem(adminPaymentsViewKey) || '0', 10) || 0;
        const lastViewedHomeworksAt = parseInt(localStorage.getItem(adminHomeworksViewKey) || '0', 10) || 0;
        setApplicationBadgeCount(counts.pendingApps + counts.pendingVerifications);
        setPaymentBadgeCount(
          location.pathname.startsWith('/admin/payments')
            ? 0
            : paymentProofs.filter((item) => item.status === 'PENDING' && getMillis(item.submittedAt) > lastViewedPaymentsAt).length
        );
        setHomeworkBadgeCount(
          location.pathname.startsWith('/admin/homeworks')
            ? 0
            : homeworkSubmissions.filter((item) => item.status === 'SUBMITTED' && getMillis(item.submittedAt) > lastViewedHomeworksAt).length
        );
        setVtcBadgeCount(counts.pendingVtcApps);
      };

      const handleUpdate = () => {
        fetchCounts();
      };

      fetchCounts();
      window.addEventListener('focus', handleUpdate);
      window.addEventListener('coha-payment-proof-update', handleUpdate as EventListener);
      window.addEventListener('coha-homework-submission-update', handleUpdate as EventListener);
      const interval = setInterval(fetchCounts, 30000);
      return () => {
        window.removeEventListener('focus', handleUpdate);
        window.removeEventListener('coha-payment-proof-update', handleUpdate as EventListener);
        window.removeEventListener('coha-homework-submission-update', handleUpdate as EventListener);
        clearInterval(interval);
      };
    } else if (role === UserRole.TEACHER && user?.assignedClass) {
      const fetchTeacherHomeworkCount = async () => {
        if (location.pathname.startsWith('/teacher/homework')) {
          setHomeworkBadgeCount(0);
          return;
        }
        const submissions = await getHomeworkSubmissionsForClass(user.assignedClass);
        const lastViewedHomeworksAt = parseInt(localStorage.getItem(teacherHomeworksViewKey) || '0', 10) || 0;
        setHomeworkBadgeCount(
          submissions.filter((item) => item.status === 'SUBMITTED' && getMillis(item.submittedAt) > lastViewedHomeworksAt).length
        );
      };

      const handleUpdate = () => {
        fetchTeacherHomeworkCount();
      };

      fetchTeacherHomeworkCount();
      window.addEventListener('focus', handleUpdate);
      window.addEventListener('coha-homework-submission-update', handleUpdate as EventListener);
      const interval = setInterval(fetchTeacherHomeworkCount, 30000);
      return () => {
        window.removeEventListener('focus', handleUpdate);
        window.removeEventListener('coha-homework-submission-update', handleUpdate as EventListener);
        clearInterval(interval);
      };
    } else if (role === UserRole.PARENT && user?.id) {
      const fetchStudent = async () => {
        const student = await getStudentById(user.id);
        if (student) setStudentDivision(student.division || null);
      };
      fetchStudent();
    }
  }, [role, user, adminPaymentsViewKey, adminHomeworksViewKey, teacherHomeworksViewKey, location.pathname]);

  /* ─── nav link definitions ─── */
  const adminLinks = [
    { label: 'Dashboard',        path: '/admin/dashboard',        icon: <LayoutDashboard size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Applications',     path: '/admin/applications',     icon: <FileText        size={17} strokeWidth={2.2} />, badge: applicationBadgeCount },
    { label: 'VTC Applications', path: '/admin/vtc-applications', icon: <FileText        size={17} strokeWidth={2.2} />, badge: vtcBadgeCount },
    { label: 'Teachers',         path: '/admin/teachers',         icon: <Users           size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Lesson Plans',     path: '/admin/lesson-plans',     icon: <FileText        size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Assessments',      path: '/admin/assessment-progress', icon: <BarChart3   size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Payments',         path: '/admin/payments',           icon: <CreditCard  size={17} strokeWidth={2.2} />, badge: paymentBadgeCount },
    { label: 'Homeworks',        path: '/admin/homeworks',          icon: <BookOpen    size={17} strokeWidth={2.2} />, badge: homeworkBadgeCount },
    { label: 'Students',         path: '/admin/students',         icon: <GraduationCap   size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Settings',         path: '/admin/settings',         icon: <Settings        size={17} strokeWidth={2.2} />, badge: 0 },
  ];

  const subAdminLinks = [
    { label: 'Applications',     path: '/admin/applications',     icon: <FileText      size={17} strokeWidth={2.2} />, badge: applicationBadgeCount },
    { label: 'VTC Applications', path: '/admin/vtc-applications', icon: <FileText      size={17} strokeWidth={2.2} />, badge: vtcBadgeCount },
    { label: 'Payments',         path: '/admin/payments',         icon: <CreditCard    size={17} strokeWidth={2.2} />, badge: paymentBadgeCount },
    { label: 'Homeworks',        path: '/admin/homeworks',        icon: <BookOpen      size={17} strokeWidth={2.2} />, badge: homeworkBadgeCount },
    { label: 'Students',         path: '/admin/students',         icon: <GraduationCap size={17} strokeWidth={2.2} />, badge: 0 },
  ];

  const teacherLinks = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <LayoutDashboard size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'My Class',  path: '/teacher/classes',   icon: <GraduationCap   size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Register',  path: '/teacher/register',  icon: <ClipboardList   size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Homework',  path: '/teacher/homework',  icon: <BookOpen        size={17} strokeWidth={2.2} />, badge: homeworkBadgeCount },
    { label: 'Settings',  path: '/teacher/settings',  icon: <Settings        size={17} strokeWidth={2.2} />, badge: 0 },
  ];

  const parentLinks = [
    { label: 'Dashboard',            path: '/parent/dashboard',       icon: <LayoutDashboard size={17} strokeWidth={2.2} />, badge: 0 },
    ...(studentDivision !== 'Mainstream'
      ? [{ label: 'Assessment Info', path: '/parent/assessment-form', icon: <ClipboardList   size={17} strokeWidth={2.2} />, badge: 0 }]
      : []),
    { label: 'Assessment Progress', path: '/parent/assessment',       icon: <Activity        size={17} strokeWidth={2.2} />, badge: 0 },
    { label: 'Daily Register',      path: '/parent/register',         icon: <Calendar        size={17} strokeWidth={2.2} />, badge: 0 },
  ];

  const vtcLinks = [
    { label: 'Dashboard', path: '/vtc/dashboard', icon: <LayoutDashboard size={17} strokeWidth={2.2} />, badge: 0 },
  ];

  let links = parentLinks;
  if (role === UserRole.ADMIN)      links = user?.adminRole === 'sub_admin' ? subAdminLinks : adminLinks;
  if (role === UserRole.TEACHER)    links = teacherLinks;
  if (role === UserRole.VTC_STUDENT) links = vtcLinks;

  /* ─── role display label ─── */
  const rolePillLabel: Record<string, string> = {
    [UserRole.ADMIN]:       user?.adminRole === 'sub_admin' ? 'Sub Administrator' : 'Administrator',
    [UserRole.TEACHER]:     'Teacher',
    [UserRole.PARENT]:      'Parent',
    [UserRole.VTC_STUDENT]: 'VTC Student',
  };

  /* ─── user initials ─── */
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        style={{ fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif" }}
        className={[
          /* base */
          'fixed inset-y-0 left-0 z-50 flex flex-col h-full',
          'lg:static lg:translate-x-0',
          /* background – navy/indigo panel */
          'bg-[#2b2b5e]',
          /* border */
          'border-r border-white/[0.10]',
          /* shadow */
          'shadow-[1px_0_0_0_rgba(255,255,255,0.05)]',
          /* width transition */
          'transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          isCollapsed ? 'w-[72px]' : 'w-[260px]',
          /* mobile slide */
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* subtle tonal gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-blue-900/[0.15]" />

        {/* ── collapse toggle (desktop) ── */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={[
            'hidden lg:flex absolute -right-3.5 top-7 z-20',
            'w-7 h-7 rounded-full items-center justify-center',
            'bg-[#2b2b5e] border border-white/[0.15]',
            'text-white/60 hover:text-white',
            'shadow-[0_2px_10px_rgba(0,0,0,0.5)]',
            'transition-all duration-200 hover:bg-[#3a3a7a]',
          ].join(' ')}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed
            ? <ChevronRight size={13} strokeWidth={2.5} />
            : <ChevronLeft  size={13} strokeWidth={2.5} />}
        </button>

        {/* ── header ── */}
        <div className="relative z-10 flex items-center gap-3 px-4 py-5 border-b border-white/[0.10] shrink-0 min-h-[76px]">
          {/* mobile close */}
          <button onClick={onClose} className="lg:hidden absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>

          {/* logo – white background */}
          <div className="w-10 h-10 rounded-[11px] overflow-hidden shrink-0 relative flex items-center justify-center
                          bg-white
                          shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
            <img
              src="https://i.ibb.co/LzYXwYfX/logo.png"
              alt="COHA Logo"
              className="w-7 h-7 object-contain relative z-10"
            />
          </div>

          {/* brand text – fully white */}
          <div className={[
            'overflow-hidden transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
            isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100',
          ].join(' ')}>
            <p className="text-[13.5px] font-semibold text-white leading-tight tracking-[-0.3px] whitespace-nowrap">
              Circle of Hope
            </p>
            <p className="text-[11px] text-white/70 tracking-[0.15px] whitespace-nowrap mt-0.5">
              Academy Portal
            </p>
          </div>
        </div>

        {/* ── role pill ── */}
        <div className={[
          'relative z-10 mx-3 mt-3 mb-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[20px]',
          'bg-white/[0.10] border border-white/20',
          'transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          isCollapsed ? 'opacity-0 max-h-0 mb-0 mt-0 py-0 overflow-hidden' : 'opacity-100 max-h-10',
        ].join(' ')}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
          <span className="text-[11px] font-medium text-white/80 whitespace-nowrap tracking-[0.1px]">
            {rolePillLabel[role] ?? 'User'}
          </span>
        </div>

        {/* ── nav section label ── */}
        <div className={[
          'relative z-10 px-4 pt-4 pb-1.5',
          'transition-all duration-300',
          isCollapsed ? 'opacity-0 h-0 pt-0 pb-0 overflow-hidden' : 'opacity-100',
        ].join(' ')}>
          {/* WHITE "NAVIGATION" label */}
          <span className="text-[10px] font-semibold tracking-[0.8px] text-white uppercase">
            Navigation
          </span>
        </div>

        {/* ── nav links ── */}
        <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-none">
          <ul className="space-y-0.5">
            {links.map((link) => (
              <li key={link.path} className="relative group">
                <NavLink
                  to={link.path}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  title={isCollapsed ? link.label : undefined}
                  className={({ isActive }) => [
                    'flex items-center gap-2.5 px-2.5 py-2.5 rounded-[10px]',
                    'transition-all duration-200 relative overflow-hidden',
                    isActive
                      ? 'bg-white/[0.15] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.15),0_0_24px_rgba(255,255,255,0.08)]'
                      : 'hover:bg-white/[0.08]',
                  ].join(' ')}
                >
                  {({ isActive }) => (
                    <>
                      {/* active left bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[3px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                      )}

                      {/* icon */}
                      <span className={[
                        'w-8 h-8 flex items-center justify-center rounded-[8px] shrink-0 transition-all duration-200',
                        isActive
                          ? 'text-white bg-white/[0.15]'
                          : 'text-white/50 group-hover:text-white/90',
                      ].join(' ')}>
                        {link.icon}
                      </span>

                      {/* label – all bold, active is larger */}
                      <span className={[
                        'font-[700] tracking-[-0.1px] overflow-hidden whitespace-nowrap',
                        'transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                        isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
                        isActive ? 'text-[15px] text-white' : 'text-[13.5px] text-white/55 group-hover:text-white/90',
                      ].join(' ')}>
                        {link.label}
                      </span>

                      {/* badge – expanded */}
                      {!isCollapsed && link.badge > 0 && (
                        <span className={`ml-auto shrink-0 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${link.label === 'Homework' || link.label === 'Homeworks' ? 'animate-pulse' : ''}`}>
                          {link.badge}
                        </span>
                      )}

                      {/* badge dot – collapsed */}
                      {isCollapsed && link.badge > 0 && (
                        <span className={`absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-red-500 border-[1.5px] border-[#2b2b5e] ${link.label === 'Homework' || link.label === 'Homeworks' ? 'animate-pulse' : ''}`} />
                      )}
                    </>
                  )}
                </NavLink>

                {/* tooltip – collapsed only */}
                {isCollapsed && (
                  <span className={[
                    'pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50',
                    'bg-[#2b2b5e]/97 border border-white/[0.12] text-white/90',
                    'text-[12px] font-medium px-2.5 py-1.5 rounded-[8px] whitespace-nowrap',
                    'shadow-[0_4px_16px_rgba(0,0,0,0.45)]',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                  ].join(' ')}>
                    {link.label}
                    {link.badge > 0 && (
                      <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* ── user + logout ── */}
        <div className="relative z-10 border-t border-white/[0.10] px-2 py-3 shrink-0 space-y-0.5">
          {/* user card */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-white/[0.08] transition-colors cursor-default group">
            <div className="w-8 h-8 rounded-[9px] shrink-0 flex items-center justify-center
                            bg-gradient-to-br from-orange-400 to-rose-500
                            text-[11px] font-semibold text-white
                            shadow-[0_2px_8px_rgba(255,100,50,0.3)]">
              {initials}
            </div>
            <div className={[
              'overflow-hidden transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
              isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
            ].join(' ')}>
              <p className="text-[13px] font-[500] text-white whitespace-nowrap tracking-[-0.2px] leading-tight">
                {user?.name ?? 'My Account'}
              </p>
              <p className="text-[11px] text-white/45 whitespace-nowrap mt-0.5">
                {rolePillLabel[role] ?? 'User'}
              </p>
            </div>
          </div>

          {/* logout */}
          <div className="relative group">
            <button
              onClick={onLogout}
              title={isCollapsed ? 'Sign out' : undefined}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] w-full
                         hover:bg-red-500/[0.12] transition-all duration-200 group/btn"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-[8px] shrink-0
                               text-white/40 group-hover/btn:text-red-400 transition-colors duration-200">
                <LogOut size={17} strokeWidth={2.2} />
              </span>
              <span className={[
                'text-[13.5px] tracking-[-0.1px] text-white/45 group-hover/btn:text-red-400',
                'overflow-hidden whitespace-nowrap transition-all duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
              ].join(' ')}>
                Sign out
              </span>
            </button>

            {/* logout tooltip – collapsed */}
            {isCollapsed && (
              <span className={[
                'pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50',
                'bg-[#2b2b5e]/97 border border-white/[0.12] text-white/90',
                'text-[12px] font-medium px-2.5 py-1.5 rounded-[8px] whitespace-nowrap',
                'shadow-[0_4px_16px_rgba(0,0,0,0.45)]',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
              ].join(' ')}>
                Sign out
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
