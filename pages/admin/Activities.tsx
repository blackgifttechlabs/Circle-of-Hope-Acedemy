import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Filter,
  PieChart,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { getActivityLogs, getSystemSettings } from '../../services/dataService';
import { ActivityLog, SystemSettings } from '../../types';
import { printActivityReport } from '../../utils/printActivityReport';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

type ActivityFilter = 'TODAY' | 'CUSTOM' | 'WEEK' | 'MONTH' | 'TERM';
type ActivityCategoryFilter = 'ALL' | ActivityLog['category'];
type ActivityRoleFilter = 'ALL' | string;

const CATEGORY_OPTIONS: Array<{ id: ActivityCategoryFilter; label: string; color: string; bar: string }> = [
  { id: 'ALL', label: 'All Categories', color: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'bg-slate-500' },
  { id: 'LOGIN', label: 'Login', color: 'bg-sky-50 text-sky-700 border-sky-200', bar: 'bg-sky-500' },
  { id: 'PAYMENT', label: 'Payment', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  { id: 'STUDENT', label: 'Student', color: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
  { id: 'LESSON_PLAN', label: 'Lesson Plan', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: 'bg-indigo-500' },
  { id: 'ADMIN', label: 'Admin', color: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
  { id: 'SYSTEM', label: 'System', color: 'bg-teal-50 text-teal-700 border-teal-200', bar: 'bg-teal-500' },
];

const ACTION_DEFINITIONS = [
  { id: 'LOGIN', label: 'Logged in', category: 'LOGIN', matches: ['logged in'] },
  { id: 'PAYMENT_SUBMITTED', label: 'Payment proof submitted', category: 'PAYMENT', matches: ['submitted payment proof'] },
  { id: 'PAYMENT_APPROVED', label: 'Payment proof approved', category: 'PAYMENT', matches: ['approved a payment proof'] },
  { id: 'PAYMENT_REJECTED', label: 'Payment proof rejected', category: 'PAYMENT', matches: ['rejected payment proof'] },
  { id: 'PAYMENT_RECORDED', label: 'Payment recorded', category: 'PAYMENT', matches: ['processed a transaction'] },
  { id: 'STUDENT_ADDED', label: 'Student added', category: 'STUDENT', matches: ['added student'] },
  { id: 'STUDENT_TRANSFERRED', label: 'Student transferred', category: 'STUDENT', matches: ['transferred'] },
  { id: 'LESSON_SUBMITTED', label: 'Lesson plan submitted', category: 'LESSON_PLAN', matches: ['submitted a lesson plan'] },
  { id: 'LESSON_EDITED', label: 'Lesson plan edited', category: 'LESSON_PLAN', matches: ['edited a lesson plan'] },
  { id: 'LESSON_DELETED', label: 'Lesson plan deleted', category: 'LESSON_PLAN', matches: ['deleted a lesson plan'] },
  { id: 'ADMIN_CREATED', label: 'Admin created', category: 'ADMIN', matches: ['created admin'] },
  { id: 'ADMIN_EDITED', label: 'Admin edited', category: 'ADMIN', matches: ['edited admin'] },
  { id: 'ADMIN_DELETED', label: 'Admin deleted', category: 'ADMIN', matches: ['deleted admin'] },
];

const getDate = (value: any) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const formatDateTime = (value: any) => {
  const date = getDate(value);
  return date ? date.toLocaleString() : '-';
};

const getCategoryMeta = (category: string) => (
  CATEGORY_OPTIONS.find((item) => item.id === category) || CATEGORY_OPTIONS[0]
);

const getActionType = (log: ActivityLog) => {
  const action = (log.action || '').toLowerCase();
  return ACTION_DEFINITIONS.find((item) => (
    (!item.category || item.category === log.category)
    && item.matches.some((match) => action.includes(match))
  ));
};

const getActiveTermRange = (settings: SystemSettings | null) => {
  const activeTerm = settings?.schoolCalendars?.find((term) => term.id === settings.activeTermId) || settings?.schoolCalendars?.[0];
  if (!activeTerm) return null;

  const start = new Date(activeTerm.learnersOpeningDate || activeTerm.teachersOpeningDate);
  const end = new Date(activeTerm.learnersClosingDate || activeTerm.teachersClosingDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return {
    label: activeTerm.termName,
    start: startOfDay(start),
    end: endOfDay(end),
  };
};

const countBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export const ActivitiesPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('TODAY');
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategoryFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<ActivityRoleFilter>('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [activityLogs, settingsData] = await Promise.all([
      getActivityLogs(2000),
      getSystemSettings(),
    ]);
    setLogs(activityLogs);
    setSettings(settingsData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filterRange = useMemo(() => {
    const now = new Date();
    if (filter === 'TODAY') {
      return { label: 'Today', start: startOfDay(now), end: endOfDay(now) };
    }

    if (filter === 'CUSTOM') {
      const date = new Date(customDate);
      return { label: customDate || 'Custom Day', start: startOfDay(date), end: endOfDay(date) };
    }

    if (filter === 'WEEK') {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset));
      const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
      return { label: 'This Week', start, end };
    }

    if (filter === 'MONTH') {
      return {
        label: 'This Month',
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    }

    const termRange = getActiveTermRange(settings);
    return termRange || { label: 'This Term', start: new Date(0), end: endOfDay(now) };
  }, [filter, customDate, settings]);

  const dateLogs = useMemo(() => logs.filter((log) => {
    const date = getDate(log.createdAt);
    return !!date && date >= filterRange.start && date <= filterRange.end;
  }), [logs, filterRange]);

  const roleOptions = useMemo(() => (
    ['ALL', ...countBy(dateLogs, (log) => log.actorRole || 'Unknown').map((item) => item.label)]
  ), [dateLogs]);

  const actionOptions = useMemo(() => {
    const scoped = dateLogs.filter((log) => categoryFilter === 'ALL' || log.category === categoryFilter);
    const actionIds = new Set(scoped.map((log) => getActionType(log)?.id).filter((id): id is string => !!id));
    return ACTION_DEFINITIONS.filter((item) => actionIds.has(item.id));
  }, [dateLogs, categoryFilter]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return dateLogs.filter((log) => {
      if (categoryFilter !== 'ALL' && log.category !== categoryFilter) return false;
      if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
      if (actionFilter !== 'ALL' && getActionType(log)?.id !== actionFilter) return false;
      if (!term) return true;
      return [
        log.action,
        log.actorName,
        log.actorRole,
        log.category,
        log.targetName,
        log.details,
      ].some((value) => (value || '').toLowerCase().includes(term));
    });
  }, [dateLogs, categoryFilter, roleFilter, actionFilter, search]);

  const categoryStats = useMemo(() => {
    const total = Math.max(filteredLogs.length, 1);
    return CATEGORY_OPTIONS
      .filter((item) => item.id !== 'ALL')
      .map((item) => {
        const count = filteredLogs.filter((log) => log.category === item.id).length;
        return { ...item, count, percent: Math.round((count / total) * 100) };
      })
      .filter((item) => item.count > 0 || categoryFilter === item.id);
  }, [filteredLogs, categoryFilter]);

  const roleStats = useMemo(() => countBy(filteredLogs, (log) => log.actorRole || 'Unknown').slice(0, 5), [filteredLogs]);
  const topActor = useMemo(() => countBy(filteredLogs, (log) => log.actorName || 'Unknown')[0], [filteredLogs]);
  const latestLog = filteredLogs[0];
  const paymentCount = filteredLogs.filter((log) => log.category === 'PAYMENT').length;
  const loginCount = filteredLogs.filter((log) => log.category === 'LOGIN').length;
  const tableFilterLabel = `${filterRange.label}${categoryFilter !== 'ALL' ? ` - ${getCategoryMeta(categoryFilter).label}` : ''}`;
  const maxCategoryCount = Math.max(...categoryStats.map((item) => item.count), 1);
  const maxRoleCount = Math.max(...roleStats.map((item) => item.count), 1);

  const resetFilters = () => {
    setCategoryFilter('ALL');
    setRoleFilter('ALL');
    setActionFilter('ALL');
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-end gap-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="h-11 px-4 rounded-[8px] border border-gray-200 bg-white text-sm font-bold text-gray-700 inline-flex items-center gap-2 shadow-sm">
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => printActivityReport(filteredLogs, tableFilterLabel)}
            className="h-11 px-4 rounded-[8px] bg-coha-900 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm"
          >
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-4">
        <div className="rounded-[8px] overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="grid min-h-[210px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="relative flex flex-col justify-between bg-[#f3eef8] p-5 overflow-hidden">
              <div className="absolute right-4 top-4 h-20 w-20 rounded-full border-[14px] border-white/70" />
              <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-amber-300/50" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] bg-coha-900 text-white shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-coha-700">Activity Monitor</p>
                <h3 className="mt-2 text-2xl font-black text-coha-950">System Audit</h3>
                <p className="mt-2 text-sm font-semibold text-slate-600">{filterRange.label} overview across portal activity.</p>
              </div>
              <button onClick={resetFilters} className="relative mt-5 h-10 w-fit rounded-[8px] bg-coha-800 px-4 text-xs font-black uppercase tracking-[0.12em] text-white">
                Clear Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 border-t lg:border-t-0 lg:border-l border-slate-200">
              <div className="p-5 border-b sm:border-b-0 sm:border-r border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Activities</p>
                  <Activity size={18} className="text-coha-700" />
                </div>
                <p className="mt-4 text-4xl font-black text-slate-950">{filteredLogs.length}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">matching current filters</p>
              </div>
              <div className="p-5 border-b sm:border-b-0 sm:border-r border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Payments</p>
                  <TrendingUp size={18} className="text-emerald-600" />
                </div>
                <p className="mt-4 text-4xl font-black text-emerald-700">{paymentCount}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">payment-related events</p>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Logins</p>
                  <Users size={18} className="text-sky-600" />
                </div>
                <p className="mt-4 text-4xl font-black text-sky-700">{loginCount}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">portal access events</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
          <div className="rounded-[8px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">Most Active User</p>
                <p className="mt-2 text-lg font-black text-rose-950">{topActor?.label || 'No activity'}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-[8px] border-rose-200 bg-white text-lg font-black text-rose-700">
                {topActor?.count || 0}
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Latest Activity</p>
                <p className="mt-2 line-clamp-2 text-sm font-black text-emerald-950">{latestLog?.action || 'No recent activity'}</p>
                <p className="mt-2 text-xs font-bold text-emerald-700">{latestLog ? formatDateTime(latestLog.createdAt) : '-'}</p>
              </div>
              <FileText size={28} className="shrink-0 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">Category Distribution</p>
              <p className="text-xs font-semibold text-slate-500">Activity types in the selected view</p>
            </div>
            <BarChart3 size={20} className="text-slate-500" />
          </div>
          <div className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-slate-400">No activity data for this selection.</p>
            ) : categoryStats.map((item) => (
              <div key={item.id} className="grid grid-cols-[120px_minmax(0,1fr)_44px] items-center gap-3">
                <span className="text-xs font-black uppercase text-slate-600">{item.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${Math.max((item.count / maxCategoryCount) * 100, item.count ? 8 : 0)}%` }} />
                </div>
                <span className="text-right text-xs font-black text-slate-700">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900">Role Mix</p>
              <p className="text-xs font-semibold text-slate-500">Who generated the activity</p>
            </div>
            <PieChart size={20} className="text-slate-500" />
          </div>
          <div className="space-y-3">
            {roleStats.length === 0 ? (
              <p className="py-8 text-center text-sm font-semibold text-slate-400">No roles to show.</p>
            ) : roleStats.map((item, index) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${['bg-coha-700', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'][index] || 'bg-slate-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-black uppercase text-slate-600">{item.label}</span>
                    <span className="text-xs font-black text-slate-900">{item.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.max((item.count / maxRoleCount) * 100, 8)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'TODAY' as const, label: 'Today' },
              { id: 'CUSTOM' as const, label: 'Custom Day' },
              { id: 'WEEK' as const, label: 'This Week' },
              { id: 'MONTH' as const, label: 'This Month' },
              { id: 'TERM' as const, label: 'This Term' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`px-4 py-2 rounded-[8px] text-xs font-black uppercase tracking-[0.12em] ${filter === item.id ? 'bg-coha-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[180px_200px_230px_minmax(260px,1fr)] gap-3">
            {filter === 'CUSTOM' && (
              <div className="relative">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                  className="h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-3 text-sm font-semibold"
                />
              </div>
            )}
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value as ActivityCategoryFilter);
                  setActionFilter('ALL');
                }}
                className="h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-700"
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-700"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{role === 'ALL' ? 'All Roles' : role}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Activity size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-700"
              >
                <option value="ALL">All Actions</option>
                {actionOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-3 text-sm"
                placeholder="Search action, user, target, detail"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[8px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <TableHeaderCell icon={CalendarDays}>Action Time</TableHeaderCell>
                <TableHeaderCell icon={User}>User</TableHeaderCell>
                <TableHeaderCell icon={BadgeCheck}>Role</TableHeaderCell>
                <TableHeaderCell icon={Activity}>Category</TableHeaderCell>
                <TableHeaderCell icon={FileText}>Action</TableHeaderCell>
                <TableHeaderCell icon={FileText}>Details</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeletonRows rows={10} columns={6} />
              ) : filteredLogs.map((log) => {
                const meta = getCategoryMeta(log.category);
                return (
                  <tr key={log.id} className="hover:bg-gray-50 align-top">
                    <td className="px-5 py-4 text-xs font-semibold text-gray-600 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{log.actorName}</p>
                      {log.targetName && <p className="text-xs text-gray-500 mt-1">Target: {log.targetName}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs font-black uppercase text-gray-500">{log.actorRole}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[10px] font-black uppercase ${meta.color}`}>
                        <Activity size={12} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-gray-900 min-w-[260px]">{log.action}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 min-w-[280px]">{log.details || '-'}</td>
                  </tr>
                );
              })}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">No activities found for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
