import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Check, Mail, MessageCircle, Phone, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { getInternshipApplicationById, updateInternshipApplication } from '../../services/dataService';
import { InternshipApplication, InternshipApplicationStatus } from '../../types';
import { openGmailDraft } from '../../utils/emailDrafts';

const normalizePhone = (value: string) => {
  let phone = value.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = `264${phone.substring(1)}`;
  return phone;
};

const fmtDate = (value: any) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const DetailItem: React.FC<{ label: string; value?: any }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className={`mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900 ${!value ? 'italic text-slate-400' : ''}`}>{value || 'Not provided'}</p>
  </div>
);

export const InternshipApplicationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<InternshipApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyType, setReplyType] = useState<'email' | 'whatsapp'>('email');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (!id) return;
    getInternshipApplicationById(id).then((data) => {
      setApplication(data);
      setLoading(false);
    });
  }, [id]);

  const defaultMessage = (status: InternshipApplicationStatus) => {
    if (!application) return '';
    return `Dear ${application.firstName} ${application.surname},

Thank you for your interest in Circle of Hope Academy.

${status === 'APPROVED'
  ? `Your ${application.opportunityType.toLowerCase()} application has been approved for further discussion. Our administration team will contact you with the next steps.`
  : `After review, we are not able to proceed with your ${application.opportunityType.toLowerCase()} application at this time.`}

Regards,
Circle of Hope Academy`;
  };

  const openReply = (status: InternshipApplicationStatus, method: 'email' | 'whatsapp') => {
    setReplyType(method);
    setMessage(application?.adminMessage || defaultMessage(status));
    setModalOpen(true);
  };

  const handleStatusChange = async (status: InternshipApplicationStatus) => {
    if (!application?.id) return;
    const success = await updateInternshipApplication(application.id, { status, reviewedAt: new Date().toISOString() });
    if (!success) {
      setToast({ msg: 'Could not update application status.', show: true, type: 'error' });
      return;
    }
    setApplication({ ...application, status, reviewedAt: new Date().toISOString() });
    setToast({ msg: `Application marked ${status.toLowerCase()}.`, show: true, type: 'success' });
    if (status !== 'PENDING') openReply(status, 'email');
  };

  const sendReply = async () => {
    if (!application?.id) return;
    const method = replyType === 'email' ? 'Email' : 'WhatsApp';
    await updateInternshipApplication(application.id, {
      adminMessage: message,
      responseMethod: method,
      reviewedAt: new Date().toISOString(),
    });
    if (replyType === 'email') {
      openGmailDraft({
        to: application.emailAddress,
        subject: `COHA ${application.opportunityType} Application Update`,
        body: message,
      });
    } else {
      window.open(`https://wa.me/${normalizePhone(application.phoneNumber)}?text=${encodeURIComponent(message)}`, '_blank');
    }
    setApplication({ ...application, adminMessage: message, responseMethod: method });
    setModalOpen(false);
    setToast({ msg: `${replyType === 'email' ? 'Gmail' : 'WhatsApp'} draft opened.`, show: true, type: 'success' });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading internship application...</div>;
  if (!application) return <div className="p-8 text-center text-red-500">Application not found.</div>;

  return (
    <div className="pb-12">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ ...toast, show: false })} variant={toast.type} />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-coha-700">Send Message</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{application.firstName} {application.surname}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
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

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <button onClick={() => navigate('/admin/internships')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Back to Internships
        </button>
        <div className="flex flex-wrap gap-2">
          {application.status === 'PENDING' && (
            <>
              <Button onClick={() => handleStatusChange('APPROVED')} className="bg-green-600 hover:bg-green-700">
                <Check size={17} /> Approve
              </Button>
              <Button onClick={() => handleStatusChange('REJECTED')} variant="danger">
                <X size={17} /> Reject
              </Button>
            </>
          )}
          {application.status === 'APPROVED' && (
            <>
              <Button onClick={() => openReply('APPROVED', 'email')} variant="outline">
                <Mail size={17} /> Email
              </Button>
              <Button onClick={() => openReply('APPROVED', 'whatsapp')} className="bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle size={17} /> WhatsApp
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className={`border-b px-6 py-5 ${application.status === 'PENDING' ? 'bg-amber-50' : application.status === 'APPROVED' ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{application.opportunityType}</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">{application.firstName} {application.surname}</h1>
            </div>
            <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-800 shadow-sm">
              {application.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-[1fr_330px]">
          <div className="space-y-8">
            <section>
              <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-950"><Phone size={20} /> Contact Details</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailItem label="Email" value={application.emailAddress} />
                <DetailItem label="Phone" value={application.phoneNumber} />
                <DetailItem label="Country" value={application.country} />
                <DetailItem label="City / Town" value={application.city} />
              </div>
            </section>

            <section>
              <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-950"><Briefcase size={20} /> Opportunity Details</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailItem label="Opportunity Type" value={application.opportunityType} />
                <DetailItem label="School / Organization" value={application.organizationOrSchool} />
                <DetailItem label="Availability" value={application.availability} />
                <DetailItem label="Submitted" value={fmtDate(application.submissionDate)} />
              </div>
            </section>

            <section className="grid gap-6">
              <DetailItem label="Background / Experience" value={application.background} />
              <DetailItem label="Motivation" value={application.motivation} />
              <DetailItem label="Additional Notes" value={application.notes} />
            </section>
          </div>

          <aside className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-black text-slate-950">Admin Response</h2>
            <div className="mt-5 grid gap-5">
              <DetailItem label="Response Method" value={application.responseMethod} />
              <DetailItem label="Reviewed At" value={fmtDate(application.reviewedAt)} />
              <DetailItem label="Last Message" value={application.adminMessage} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
