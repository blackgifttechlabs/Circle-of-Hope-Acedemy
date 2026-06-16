import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Download, RefreshCw, Search } from 'lucide-react';
import { getActivityLogs, getSystemSettings } from '../../services/dataService';
import { ActivityLog, SystemSettings } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { printActivityReport } from '../../utils/printActivityReport';

type ActivityFilter = 'TODAY' | 'CUSTOM' | 'WEEK' | 'MONTH' | 'TERM';

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

export const ActivitiesPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('TODAY');
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

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      const date = getDate(log.createdAt);
      if (!date || date < filterRange.start || date > filterRange.end) return false;
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
  }, [logs, filterRange, search]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-coha-900">View Activities</h2>
          <p className="text-sm text-gray-500">Audit trail of logins, payments, student movement, lesson plans, and other key portal actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 inline-flex items-center gap-2">
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => printActivityReport(filteredLogs, filterRange.label)}
            className="h-11 px-4 rounded-xl bg-coha-900 text-white text-sm font-bold inline-flex items-center gap-2"
          >
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
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
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.14em] ${filter === item.id ? 'bg-coha-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {filter === 'CUSTOM' && (
              <div className="relative">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => setCustomDate(event.target.value)}
                  className="h-11 rounded-xl border border-gray-200 pl-10 pr-3 text-sm font-semibold"
                />
              </div>
            )}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full sm:w-80 rounded-xl border border-gray-200 pl-10 pr-3 text-sm"
                placeholder="Search action, user, detail"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Current Filter</p>
            <p className="text-lg font-black text-gray-900 mt-1">{filterRange.label}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date Range</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{filterRange.start.toLocaleDateString()} - {filterRange.end.toLocaleDateString()}</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Activities</p>
            <p className="text-lg font-black text-coha-900 mt-1">{filteredLogs.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-5 py-4">Action Time</th>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 align-top">
                  <td className="px-5 py-4 text-xs font-semibold text-gray-600 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-900">{log.actorName}</p>
                    {log.targetName && <p className="text-xs text-gray-500 mt-1">Target: {log.targetName}</p>}
                  </td>
                  <td className="px-5 py-4 text-xs font-black uppercase text-gray-500">{log.actorRole}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-coha-50 px-2 py-1 text-[10px] font-black uppercase text-coha-800">
                      <Activity size={12} /> {log.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-900 min-w-[260px]">{log.action}</td>
                  <td className="px-5 py-4 text-sm text-gray-600 min-w-[280px]">{log.details || '-'}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
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
