import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVtcApplications, updateVtcApplication } from '../../services/dataService';
import { VtcApplication } from '../../types';
import { Search, Check, X, Eye, Mail, MessageCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

type ViewMode = 'PENDING' | 'PAYMENT_REQUIRED' | 'VERIFYING' | 'APPROVED' | 'VERIFIED' | 'REJECTED';

export const VtcApplicationsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('PENDING');
  const [applications, setApplications] = useState<VtcApplication[]>([]);
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
    const data = await getVtcApplications();
    setApplications(data);
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
        window.location.href = `mailto:${app.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
Login Link: ${window.location.origin}/#/login
Name to search: ${selectedApp.firstName} ${selectedApp.surname}
PIN: ${selectedApp.pin}

Please log in to your portal to view your status and further instructions.

Regards,
COHA VTC Administration`;

    if (replyType === 'email') {
      window.location.href = `mailto:${selectedApp.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      let phone = selectedApp.cellNo.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '264' + phone.substring(1);
      }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
    }
    
    setEmailModalOpen(false);
    setToast({ msg: `${replyType === 'email' ? 'Email' : 'WhatsApp'} draft opened.`, show: true, type: 'success' });
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = `${app.firstName} ${app.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.identityNumber.includes(searchTerm);
    return matchesSearch && app.status === viewMode;
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
                            Open {replyType === 'email' ? 'Email Client' : 'WhatsApp'}
                        </Button>
                        <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-4 hover:text-gray-600">Cancel</button>
                    </div>
                </div>
            </div>
          </div>
      )}

      <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-coha-900">VTC Applications</h2>
            <p className="text-gray-600">Manage Vocational Training Centre applications.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap bg-white shadow-sm border border-gray-200">
                <button onClick={() => setViewMode('PENDING')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'PENDING' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>New</button>
                <button onClick={() => setViewMode('PAYMENT_REQUIRED')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'PAYMENT_REQUIRED' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Payment Req</button>
                <button onClick={() => setViewMode('VERIFYING')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'VERIFYING' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Verify</button>
                <button onClick={() => setViewMode('APPROVED')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'APPROVED' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Approved</button>
                <button onClick={() => setViewMode('VERIFIED')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'VERIFIED' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Verified</button>
                <button onClick={() => setViewMode('REJECTED')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'REJECTED' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Rejected</button>
            </div>
            <button onClick={() => navigate('/admin/applications')} className="px-4 py-2 text-sm font-bold uppercase bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-2 transition-colors">
                Students Application
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm animate-fade-in">
         <div className="p-4 border-b border-gray-200">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input className="w-full pl-10 pr-4 py-2 border border-gray-300 outline-none" placeholder="Search applicants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <tr>
                        <th className="px-6 py-4">Applicant</th>
                        <th className="px-6 py-4">ID Number</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">No applications found in this category.</td>
                      </tr>
                    ) : filteredApps.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50 group">
                            <td className="px-6 py-4 font-bold text-coha-900">{app.firstName} {app.surname}</td>
                            <td className="px-6 py-4 font-mono text-sm">{app.identityNumber}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm">{app.cellNo}</div>
                              <div className="text-xs text-gray-500">{app.emailAddress}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full 
                                ${app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                  app.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                  app.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                                  'bg-blue-100 text-blue-800'}`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 flex items-center gap-2">
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

// Simple DollarSign icon component since it might not be imported correctly above if not in lucide-react export list for this specific version, though usually it is.
function DollarSign(props: any) {
  return <svg width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
}
