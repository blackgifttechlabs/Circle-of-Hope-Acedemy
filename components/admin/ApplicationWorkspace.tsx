import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap, History, ListChecks } from 'lucide-react';
import {
  AdminApplicationTab,
  getAdminApplicationUnreadCounts,
  markAdminApplicationTabSeen,
} from '../../utils/adminApplicationNotifications';

type ApplicationWorkspaceTab = AdminApplicationTab | 'history';

type PendingCounts = Record<AdminApplicationTab, number> & { total: number };

type ApplicationWorkspaceProps = {
  activeTab: ApplicationWorkspaceTab;
  children: React.ReactNode;
  beforeTabs?: React.ReactNode;
  hiddenTabs?: ApplicationWorkspaceTab[];
};

export const ApplicationWorkspace: React.FC<ApplicationWorkspaceProps> = ({
  activeTab,
  children,
  beforeTabs,
  hiddenTabs = [],
}) => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<PendingCounts>({
    student: 0,
    payments: 0,
    vtc: 0,
    internship: 0,
    total: 0,
  });

  useEffect(() => {
    const loadCounts = () => getAdminApplicationUnreadCounts('admin').then(setCounts);
    loadCounts();
    window.addEventListener('focus', loadCounts);
    window.addEventListener('coha-admin-application-tab-seen', loadCounts as EventListener);
    window.addEventListener('coha-payment-proof-update', loadCounts as EventListener);
    return () => {
      window.removeEventListener('focus', loadCounts);
      window.removeEventListener('coha-admin-application-tab-seen', loadCounts as EventListener);
      window.removeEventListener('coha-payment-proof-update', loadCounts as EventListener);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'history') return;
    markAdminApplicationTabSeen(activeTab, 'admin');
    setCounts((current) => {
      const next = { ...current, [activeTab]: 0 };
      next.total = next.student + next.payments + next.vtc + next.internship;
      return next;
    });
  }, [activeTab]);

  const tabs = [
    {
      id: 'student' as const,
      label: 'Student Apps',
      icon: ListChecks,
      path: '/admin/applications',
      count: counts.student,
    },
    {
      id: 'vtc' as const,
      label: 'VTC Applications',
      icon: GraduationCap,
      path: '/admin/vtc-applications',
      count: counts.vtc,
    },
    {
      id: 'internship' as const,
      label: 'Internships',
      icon: Briefcase,
      path: '/admin/internships',
      count: counts.internship,
    },
    {
      id: 'history' as const,
      label: 'Previous Applications',
      icon: History,
      path: '/admin/applications-history',
      count: 0,
    },
  ];

  return (
    <div>
      <style>{`
        .apps-wrap {
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;
          overflow: visible;
        }
        .apps-tabsbar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 16px 0 0 0;
          gap: 16px;
          flex-wrap: wrap;
          background: none;
        }
        .apps-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          min-height: 43px;
          padding-top: 2px;
          order: 1;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .apps-tabs::-webkit-scrollbar {
          display: none;
        }
        .apps-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FFFFFF;
          border: 1px solid #E3DAF1;
          border-bottom: none;
          cursor: pointer;
          padding: 9px 14px 10px 14px;
          min-height: 38px;
          font-size: 12px;
          font-weight: 800;
          color: #000000;
          white-space: nowrap;
          font-family: Arial, Helvetica Neue, sans-serif;
          border-radius: 11px 11px 0 0;
          box-shadow: 0 2px 8px rgba(67, 24, 120, 0.04);
          transform-origin: bottom left;
          transition: color .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease;
          z-index: 1;
        }
        .apps-tab::after {
          display: none;
        }
        .apps-tab svg { flex-shrink: 0; }
        .apps-tab:hover {
          background: #E7DDF7;
          color: #3B1968;
          transform: translateY(-1px);
          box-shadow: 0 8px 16px rgba(67, 24, 120, 0.10);
        }
        @keyframes tabActivate {
          0% {
            transform: translateX(-14px) translateY(0) scale(0.97);
            box-shadow: 0 2px 8px rgba(18, 30, 74, 0.04);
          }
          40% {
            transform: translateX(3px) translateY(-6px) scale(1.045);
            box-shadow: 0 16px 26px rgba(18, 30, 74, 0.26);
          }
          70% {
            transform: translateX(-1px) translateY(-1px) scale(0.99);
            box-shadow: 0 8px 16px rgba(18, 30, 74, 0.18);
          }
          100% {
            transform: translateX(0) translateY(-3px) scale(1);
            box-shadow: 0 12px 22px rgba(76, 0, 176, 0.24);
          }
        }
        .apps-tab.active {
          color: #FFFFFF;
          background: #4C00B0;
          border-color: #4C00B0;
          border-bottom-color: #4C00B0;
          transform: translateY(-3px);
          box-shadow: 0 12px 22px rgba(76, 0, 176, 0.24);
          animation: tabActivate 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .apps-tab.active svg {
          animation: tabIconPop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes tabIconPop {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.25) rotate(-6deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .apps-tab.active .pill {
          animation: pillPop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
        }
        @keyframes pillPop {
          0% { transform: scale(0.7); opacity: 0.6; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .apps-tab .pill {
          background: #6E35C8;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 900;
          min-width: 22px;
          text-align: center;
          padding: 2px 7px;
          border-radius: 999px;
        }
        .apps-tab.active .pill {
          background: #FFFFFF;
          color: #4C00B0;
        }
        .apps-tab .pill.zero {
          background: #ECECF3;
          color: #A0A0AF;
        }
        .apps-tab.active .pill.zero {
          background: rgba(255,255,255,0.22);
          color: #FFFFFF;
        }
        .apps-tab.active::after {
          display: none;
        }
        .apps-tab.active {
          border-radius: 11px 11px 0 0;
        }
        .apps-new-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #2E1065;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 0 18px;
          height: 42px;
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: transform .2s ease, box-shadow .2s ease;
          margin-left: auto;
          order: 2;
        }
        .apps-new-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.28);
        }
        .apps-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 16px;
          border-top: 1px solid #EFEFF4;
          margin-top: 0;
          flex-wrap: wrap;
          background: #FFFFFF;
        }
        .apps-search-wrap {
          position: relative;
          flex: 1;
          max-width: 420px;
          min-width: 240px;
        }
        .apps-search-input {
          width: 100%;
          padding: 9px 12px 9px 38px;
          border: 1px solid #E4E4EC;
          border-radius: 10px;
          font-size: 13px;
          outline: none;
          background: #FAFAFC;
          color: #333;
        }
        .apps-search-input:focus {
          border-color: #2E1065;
          background: #fff;
        }
        .apps-filter-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid #E4E4EC;
          background: #FAFAFC;
          color: #6B21A8;
          cursor: pointer;
        }
        .apps-table {
          width: 100%;
          border-collapse: collapse;
        }
        .apps-table thead th {
          background: #2E1065;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #FFFFFF;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #2E1065;
          white-space: nowrap;
        }
        @keyframes slideInReview {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .apps-table tbody tr {
          border-bottom: 1px solid #F3F3F7;
          position: relative;
          transition: background .15s ease;
        }
        .apps-table tbody tr:hover {
          background: #FAFAFC;
        }
        .apps-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: #333;
          vertical-align: middle;
        }
        .apps-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #6B21A8;
          cursor: pointer;
        }
        .apps-id {
          font-family: monospace;
          font-size: 12px;
          color: #9A9AAE;
          font-weight: 600;
        }
        .apps-name {
          font-weight: 700;
          color: #1F1030;
        }
        .status-dot-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-pending { color: #B45309; background: #FEF6E7; }
        .status-pending .status-dot { background: #F59E0B; }
        .status-approved { color: #047857; background: #ECFDF5; }
        .status-approved .status-dot { background: #10B981; }
        .status-info { color: #1D4ED8; background: #EFF6FF; }
        .status-info .status-dot { background: #3B82F6; }
        .status-rejected { color: #B91C1C; background: #FDECEC; }
        .status-rejected .status-dot { background: #EF4444; }
        .apps-open-btn {
          color: #6B21A8;
          font-weight: 800;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: none;
          border: none;
          cursor: pointer;
        }
        .apps-open-btn:hover { text-decoration: underline; }
        .apps-row-menu {
          color: #B7B7C6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="apps-wrap animate-fade-in">
        <div className="apps-tabsbar">
          <div className="apps-tabs">
            {beforeTabs}
            {tabs.filter((tab) => !hiddenTabs.includes(tab.id)).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === 'student' && activeTab === 'payments');
              return (
                <button
                  key={tab.id}
                  className={`apps-tab ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(tab.path)}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span className={`pill ${tab.count === 0 ? 'zero' : ''}`}>{tab.count}</span>
                </button>
              );
            })}
          </div>

        </div>

        {children}
      </div>
    </div>
  );
};
