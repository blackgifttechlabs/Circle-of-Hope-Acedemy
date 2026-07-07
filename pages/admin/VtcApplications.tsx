import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVtcApplications, updateVtcApplication } from '../../services/dataService';
import { VtcApplication } from '../../types';
import { Search, Check, X, Eye, Mail, MessageCircle, User, Hash, Phone, BadgeCheck, MousePointerClick } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { openGmailDraft } from '../../utils/emailDrafts';
import { ApplicationWorkspace } from '../../components/admin/ApplicationWorkspace';
import { TableHeaderCell, TableSkeletonRows } from '../../components/ui/TablePrimitives';

type ViewMode = 'PENDING' | 'PAYMENT_REQUIRED' | 'VERIFYING' | 'APPROVED' | 'VERIFIED' | 'REJECTED';

export const VtcApplicationsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('PENDING');
  const [applications, setApplications] = useState<VtcApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' });
  const navigate = useNavigate();

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<VtcApplication | null>(null);
  const [replyType, setReplyType] = useState<'email' | 'whatsapp'>('email');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getVtcApplications();
    setApplications(data);
    setLoading(false);
  };

  const handleStatusChange = async (app: VtcApplication, newStatus: VtcApplication['status']) => {
    let updates: any = { status: newStatus };
    let newPin = app.pin;
    
    if ((newStatus === 'APPROVED' || newStatus === 'PAYMENT_REQUIRED') && !app.pin) {
      newPin = Math.floor(1000 + Math.random() * 9000).toString();
      updates.pin = newPin;
    }

    const success = await updateVtcApplication(app.id!, updates);
    if (success) {
      setToast({ msg: `Application status updated to ${newStatus}`, show: true, type: 'success' });
      loadData();
      
      const updatedApp = { ...app, ...updates };

      if (newStatus === 'APPROVED' || newStatus === 'PAYMENT_REQUIRED') {
        openReplyModal(updatedApp, 'email');
      } else if (newStatus === 'VERIFIED') {
        const subject = "COHA VTC Payment Verified";
        const body = `Dear ${app.firstName} ${app.surname},

Your payment receipt has been successfully verified. You are now fully enrolled in the COHA Vocational Training Centre.

We will be in touch soon with further details regarding your classes.

Regards,
COHA VTC Administration`;
        openGmailDraft({ to: app.emailAddress, subject, body });
      }
    } else {
      setToast({ msg: 'Failed to update status', show: true, type: 'error' });
    }
  };

  const openReplyModal = (app: VtcApplication, type: 'email' | 'whatsapp') => {
    setSelectedApp(app);
    setReplyType(type);
    setEmailModalOpen(true);
  };

  const sendReply = () => {
    if (!selectedApp) return;
    
    const isApproved = selectedApp.status === 'APPROVED';
    const statusText = isApproved ? 'approved' : 'requires payment';
    
    const subject = `COHA VTC Application ${isApproved ? 'Approved' : 'Update'}`;
    const body = `Dear ${selectedApp.firstName} ${selectedApp.surname},

Your application to COHA Vocational Training Centre ${isApproved ? 'has been approved' : 'requires payment'}.

Here are your portal login details:
Login Link: ${window.location.origin}/login
Name to search: ${selectedApp.firstName} ${selectedApp.surname}
PIN: ${selectedApp.pin}

Please log in to your portal to view your status and further instructions.

Regards,
COHA VTC Administration`;

    if (replyType === 'email') {
      openGmailDraft({ to: selectedApp.emailAddress, subject, body });
    } else {
      let phone = selectedApp.cellNo.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '264' + phone.substring(1);
      }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
    }
    
    setEmailModalOpen(false);
    setToast({ msg: `${replyType === 'email' ? 'Gmail' : 'WhatsApp'} draft opened.`, show: true, type: 'success' });
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = `${app.firstName} ${app.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (app.identityNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (app.emailAddress || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (app.cellNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && app.status === viewMode;
  });

  const statusCounts = applications.reduce<Record<ViewMode, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {
    PENDING: 0,
    PAYMENT_REQUIRED: 0,
    VERIFYING: 0,
    APPROVED: 0,
    VERIFIED: 0,
    REJECTED: 0,
  });

  return (
    <div>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({...toast, show: false})} variant={toast.type} />
      
      {emailModalOpen && selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white w-full max-w-lg shadow-2xl border-t-8 border-blue-600 animate-fade-in">
                <div className="p-10 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                         {replyType === 'email' ? <Mail size={40} /> : <MessageCircle size={40} />}
                      </div>
                      <h3 className="text-2xl font-black uppercase text-blue-800 tracking-tight mb-2">Send Login Details</h3>
                      <p className="text-gray-500 font-bold text-sm uppercase mb-8">Applicant: {selectedApp.firstName} {selectedApp.surname}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button fullWidth onClick={sendReply} className="bg-blue-600 hover:bg-blue-700 border-none py-4 text-xs font-black uppercase tracking-widest shadow-lg hover-pop">
                            Open {replyType === 'email' ? 'Gmail' : 'WhatsApp'}
                        </Button>
                        <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-4 hover:text-gray-600">Cancel</button>
                    </div>
                </div>
            </div>
          </div>
      )}

      <ApplicationWorkspace activeTab="vtc">
         <div className="apps-toolbar" style={{ paddingTop: '76px' }}>
            <div className="apps-search-wrap" style={{ marginRight: 'auto' }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input className="apps-search-input" placeholder="Search applicants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="apps-tabs" style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
              {([
                ['PENDING', 'New'],
                ['PAYMENT_REQUIRED', 'Payment Req'],
                ['VERIFYING', 'Verify'],
                ['APPROVED', 'Approved'],
                ['VERIFIED', 'Verified'],
                ['REJECTED', 'Rejected'],
              ] as [ViewMode, string][]).map(([mode, label]) => (
                <button key={mode} onClick={() => setViewMode(mode)} className={`apps-tab ${viewMode === mode ? 'active' : ''}`}>
                  {label}
                  <span className={`pill ${statusCounts[mode] === 0 ? 'zero' : ''}`}>{statusCounts[mode]}</span>
                </button>
              ))}
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="apps-table">
                <thead>
                    <tr>
                        <TableHeaderCell icon={User}>Applicant</TableHeaderCell>
                        <TableHeaderCell icon={Hash}>ID Number</TableHeaderCell>
                        <TableHeaderCell icon={Phone}>Contact</TableHeaderCell>
                        <TableHeaderCell icon={BadgeCheck}>Status</TableHeaderCell>
                        <TableHeaderCell icon={MousePointerClick}>Actions</TableHeaderCell>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                      <TableSkeletonRows rows={10} columns={5} />
                    ) : filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">No applications found in this category.</td>
                      </tr>
                    ) : filteredApps.map((app) => (
                        <tr key={app.id} className="group">
                            <td className="apps-name">{app.firstName} {app.surname}</td>
                            <td className="apps-id">{app.identityNumber}</td>
                            <td>
                              <div className="text-sm">{app.cellNo}</div>
                              <div className="text-xs text-gray-500">{app.emailAddress}</div>
                            </td>
                            <td>
                              <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full 
                                ${app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                  app.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                  app.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                                  'bg-blue-100 text-blue-800'}`}>
                                {app.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button onClick={() => navigate(`/admin/vtc-applications/${app.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                                  <Eye size={18} />
                                </button>
                                
                                {app.status === 'PENDING' && (
                                  <>
                                    <button onClick={() => handleStatusChange(app, 'APPROVED')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve">
                                      <Check size={18} />
                                    </button>
                                    <button onClick={() => handleStatusChange(app, 'PAYMENT_REQUIRED')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Require Payment">
                                      <DollarSign size={18} />
                                    </button>
                                    <button onClick={() => handleStatusChange(app, 'REJECTED')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                                      <X size={18} />
                                    </button>
                                  </>
                                )}
                                
                                {app.status === 'VERIFYING' && (
                                  <>
                                    <button onClick={() => handleStatusChange(app, 'VERIFIED')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Verify Receipt">
                                      <Check size={18} />
                                    </button>
                                    <button onClick={() => handleStatusChange(app, 'PAYMENT_REQUIRED')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject Payment">
                                      <X size={18} />
                                    </button>
                                  </>
                                )}

                                {app.status === 'APPROVED' && (
                                  <>
                                    <button onClick={() => openReplyModal(app, 'email')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Send Email">
                                      <Mail size={18} />
                                    </button>
                                    <button onClick={() => openReplyModal(app, 'whatsapp')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Send WhatsApp">
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
      </ApplicationWorkspace>
    </div>
  );
};

// Simple DollarSign icon component since it might not be imported correctly above if not in lucide-react export list for this specific version, though usually it is.
function DollarSign(props: any) {
  return <svg width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
}
