import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Check, Eye, Mail, MessageCircle, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { getInternshipApplications, updateInternshipApplication } from '../../services/dataService';
import { InternshipApplication, InternshipApplicationStatus } from '../../types';
import { openGmailDraft } from '../../utils/emailDrafts';

type ViewMode = InternshipApplicationStatus;

const normalizePhone = (value: string) => {
  let phone = value.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = `264${phone.substring(1)}`;
  return phone;
};

const fmtDate = (value: any) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleDateString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

export const InternshipApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [replyType, setReplyType] = useState<'email' | 'whatsapp'>('email');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setApplications(await getInternshipApplications());
  };

  const defaultMessage = (app: InternshipApplication, status: InternshipApplicationStatus) => {
    const approved = status === 'APPROVED';
    return `Dear ${app.firstName} ${app.surname},

Thank you for your interest in Circle of Hope Academy.

${approved
  ? `Your ${app.opportunityType.toLowerCase()} application has been approved for further discussion. Our administration team will contact you with the next steps.`
  : `After review, we are not able to proceed with your ${app.opportunityType.toLowerCase()} application at this time.`}

Regards,
Circle of Hope Academy`;
  };

  const openReplyModal = (app: InternshipApplication, status: InternshipApplicationStatus, method: 'email' | 'whatsapp') => {
    setSelectedApp({ ...app, status });
    setReplyType(method);
    setMessage(defaultMessage(app, status));
  };

  const handleStatusChange = async (app: InternshipApplication, status: InternshipApplicationStatus) => {
    if (!app.id) return;
    const success = await updateInternshipApplication(app.id, {
      status,
      reviewedAt: new Date().toISOString(),
    });
    if (!success) {
      setToast({ msg: 'Could not update application status.', show: true, type: 'error' });
      return;
    }
    setToast({ msg: `Application marked ${status.toLowerCase()}.`, show: true, type: 'success' });
    await loadData();
    if (status !== 'PENDING') openReplyModal(app, status, 'email');
  };

  const sendReply = async () => {
    if (!selectedApp?.id) return;
    const method = replyType === 'email' ? 'Email' : 'WhatsApp';
    await updateInternshipApplication(selectedApp.id, {
      status: selectedApp.status,
      adminMessage: message,
      responseMethod: method,
      reviewedAt: new Date().toISOString(),
    });
    if (replyType === 'email') {
      openGmailDraft({
        to: selectedApp.emailAddress,
        subject: `COHA ${selectedApp.opportunityType} Application Update`,
        body: message,
      });
    } else {
      window.open(`https://wa.me/${normalizePhone(selectedApp.phoneNumber)}?text=${encodeURIComponent(message)}`, '_blank');
    }
    setSelectedApp(null);
    setToast({ msg: `${replyType === 'email' ? 'Gmail' : 'WhatsApp'} draft opened.`, show: true, type: 'success' });
    loadData();
  };

  const filteredApps = applications.filter((app) => {
    const needle = searchTerm.toLowerCase();
    const haystack = `${app.firstName} ${app.surname} ${app.emailAddress} ${app.phoneNumber} ${app.opportunityType}`.toLowerCase();
    return app.status === viewMode && haystack.includes(needle);
  });

  return (
    <div>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ ...toast, show: false })} variant={toast.type} />

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-coha-700">Send Message</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{selectedApp.firstName} {selectedApp.surname}</h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <button onClick={() => setReplyType('email')} className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${replyType === 'email' ? 'border-coha-700 bg-coha-50 text-coha-900' : 'border-slate-200 text-slate-600'}`}>
                <Mail size={17} className="mb-1" /> Email
              </button>
              <button onClick={() => setReplyType('whatsapp')} className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${replyType === 'whatsapp' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>
                <MessageCircle size={17} className="mb-1" /> WhatsApp
              </button>
            </div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-800 outline-none focus:border-coha-700"
            />
            <Button onClick={sendReply} className="mt-5 w-full">
              Open {replyType === 'email' ? 'Gmail' : 'WhatsApp'} Draft
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="text-2xl font-bold text-coha-900">Internship Applications</h2>
          <p className="text-gray-600">Review opportunity, placement, exchange, and senior expert programme applications.</p>
        </div>
        <div className="flex flex-wrap bg-white shadow-sm border border-gray-200">
          {(['PENDING', 'APPROVED', 'REJECTED'] as ViewMode[]).map((status) => (
            <button
              key={status}
              onClick={() => setViewMode(status)}
              className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === status ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {status === 'PENDING' ? 'New' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input className="w-full border border-gray-300 py-2 pl-10 pr-4 outline-none" placeholder="Search internship applications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Opportunity</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No internship applications found.</td>
                </tr>
              ) : filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-coha-900">{app.firstName} {app.surname}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Briefcase size={16} /> {app.opportunityType}</div>
                    <div className="mt-1 text-xs text-slate-500">{app.organizationOrSchool || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold">{app.phoneNumber}</div>
                    <div className="text-xs text-gray-500">{app.emailAddress}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{fmtDate(app.submissionDate)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/admin/internships/${app.id}`)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="View">
                        <Eye size={18} />
                      </button>
                      {app.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleStatusChange(app, 'APPROVED')} className="rounded-lg p-2 text-green-600 hover:bg-green-50" title="Approve">
                            <Check size={18} />
                          </button>
                          <button onClick={() => handleStatusChange(app, 'REJECTED')} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Reject">
                            <X size={18} />
                          </button>
                        </>
                      )}
                      {app.status === 'APPROVED' && (
                        <>
                          <button onClick={() => openReplyModal(app, 'APPROVED', 'email')} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" title="Email">
                            <Mail size={18} />
                          </button>
                          <button onClick={() => openReplyModal(app, 'APPROVED', 'whatsapp')} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="WhatsApp">
                            <MessageCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
