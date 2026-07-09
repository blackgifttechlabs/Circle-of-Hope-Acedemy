import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarDays, Eye, FileText, Mail, RefreshCw, Search, User, X } from 'lucide-react';
import { ApplicationWorkspace } from '../../components/admin/ApplicationWorkspace';
import { getAutomatedReplyLogs } from '../../services/dataService';
import { AutomatedReplyLog } from '../../types';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

const getDate = (value: any) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const fmtDate = (value: any) => {
  const date = getDate(value);
  return date ? date.toLocaleString() : '-';
};

const statusClass = (status: AutomatedReplyLog['status']) => {
  if (status === 'SENT') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'SKIPPED') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

export const AutomatedRepliesPage: React.FC = () => {
  const [logs, setLogs] = useState<AutomatedReplyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReply, setSelectedReply] = useState<AutomatedReplyLog | null>(null);

  const load = async () => {
    setLoading(true);
    setLogs(await getAutomatedReplyLogs(1500));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((item) => [
      item.recipientEmail,
      item.recipientName,
      item.learnerName,
      item.subject,
      item.status,
      item.replyType,
      item.applicationId,
      item.errorMessage,
    ].some((value) => (value || '').toLowerCase().includes(term)));
  }, [logs, search]);

  const sentCount = logs.filter((item) => item.status === 'SENT').length;
  const failedCount = logs.filter((item) => item.status === 'FAILED').length;
  const skippedCount = logs.filter((item) => item.status === 'SKIPPED').length;

  return (
    <ApplicationWorkspace activeTab="automated">
      {selectedReply && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelectedReply(null)}>
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[8px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Automated Reply</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{selectedReply.subject || 'No subject recorded'}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selectedReply.recipientEmail || 'No recipient email'}</p>
              </div>
              <button onClick={() => setSelectedReply(null)} className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-slate-100 text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid max-h-[72vh] grid-cols-1 overflow-y-auto lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Learner</p>
                    <p className="mt-1 font-black text-slate-900">{selectedReply.learnerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Status</p>
                    <span className={`mt-1 inline-flex rounded-[8px] border px-2 py-1 text-[10px] font-black uppercase ${statusClass(selectedReply.status)}`}>
                      {selectedReply.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Incoming Time</p>
                    <p className="mt-1 font-bold text-slate-700">{fmtDate(selectedReply.incomingAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sent Time</p>
                    <p className="mt-1 font-bold text-slate-700">{fmtDate(selectedReply.sentAt || selectedReply.createdAt)}</p>
                  </div>
                  {selectedReply.errorMessage && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">Error</p>
                      <p className="mt-1 font-bold text-rose-700">{selectedReply.errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5">
                {selectedReply.bodyHtml ? (
                  <div className="overflow-hidden rounded-[8px] border border-slate-200" dangerouslySetInnerHTML={{ __html: selectedReply.bodyHtml }} />
                ) : (
                  <pre className="whitespace-pre-wrap rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{selectedReply.bodyText || 'No message body recorded.'}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="apps-toolbar" style={{ paddingTop: '76px' }}>
        <div className="apps-search-wrap" style={{ marginRight: 'auto' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="apps-search-input"
            placeholder="Search automated replies..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button onClick={load} className="apps-tab">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total Replies</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{logs.length}</p>
        </div>
        <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Sent</p>
          <p className="mt-2 text-2xl font-black text-emerald-950">{sentCount}</p>
        </div>
        <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Skipped</p>
          <p className="mt-2 text-2xl font-black text-amber-950">{skippedCount}</p>
        </div>
        <div className="rounded-[8px] border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">Failed</p>
          <p className="mt-2 text-2xl font-black text-rose-950">{failedCount}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr>
                <TableHeaderCell icon={CalendarDays}>Message Time</TableHeaderCell>
                <TableHeaderCell icon={User}>Recipient</TableHeaderCell>
                <TableHeaderCell icon={FileText}>Learner</TableHeaderCell>
                <TableHeaderCell icon={Mail}>Automated Reply</TableHeaderCell>
                <TableHeaderCell icon={BadgeCheck}>Status</TableHeaderCell>
                <TableHeaderCell icon={Eye}>View</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableSkeletonRows rows={10} columns={6} />
              ) : filteredLogs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-xs font-bold text-slate-600">{fmtDate(item.sentAt || item.createdAt)}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-black text-slate-900">{item.recipientName || '-'}</p>
                    <p className="text-xs font-semibold text-slate-500">{item.recipientEmail || 'No email recorded'}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700">{item.learnerName || '-'}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => setSelectedReply(item)} className="text-left text-sm font-black text-coha-800 hover:underline">
                      {item.subject || item.replyType}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-[8px] border px-2 py-1 text-[10px] font-black uppercase ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setSelectedReply(item)} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-600 hover:bg-slate-100">
                      <Eye size={14} /> Open
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No automated replies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ApplicationWorkspace>
  );
};
