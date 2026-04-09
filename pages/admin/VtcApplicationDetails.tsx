import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVtcApplicationById, updateVtcApplication } from '../../services/dataService';
import { VtcApplication } from '../../types';
import { ArrowLeft, Check, X, FileText, User, Phone, MapPin, GraduationCap, AlertCircle, Mail, MessageCircle, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

export const VtcApplicationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<VtcApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' });
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [replyType, setReplyType] = useState<'email' | 'whatsapp'>('email');

  useEffect(() => {
    if (id) {
      loadApplication(id);
    }
  }, [id]);

  const loadApplication = async (appId: string) => {
    setLoading(true);
    const data = await getVtcApplicationById(appId);
    setApplication(data);
    setLoading(false);
  };

  const handleStatusChange = async (newStatus: VtcApplication['status']) => {
    if (!application || !application.id) return;
    
    const success = await updateVtcApplication(application.id, { status: newStatus });
    if (success) {
      setToast({ msg: `Application status updated to ${newStatus}`, show: true, type: 'success' });
      setApplication({ ...application, status: newStatus });
      if (newStatus === 'APPROVED') {
        openReplyModal('email');
      } else if (newStatus === 'VERIFIED') {
        const subject = "COHA VTC Payment Verified";
        const body = `Dear ${application.firstName} ${application.surname},

Your payment receipt has been successfully verified. You are now fully enrolled in the COHA Vocational Training Centre.

We will be in touch soon with further details regarding your classes.

Regards,
COHA VTC Administration`;
        window.location.href = `mailto:${application.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
    } else {
      setToast({ msg: 'Failed to update status', show: true, type: 'error' });
    }
  };

  const openReplyModal = (type: 'email' | 'whatsapp') => {
    setReplyType(type);
    setEmailModalOpen(true);
  };

  const sendReply = () => {
    if (!application) return;
    
    const subject = "COHA VTC Application Approved";
    const body = `Dear ${application.firstName} ${application.surname},

Congratulations! Your application to COHA Vocational Training Centre has been approved.

Here are your portal login details:
Login Link: https://cohavtc.edu.na/login
Email: ${application.emailAddress}
(Please use the "Forgot Password" link to set your initial password if you haven't already).

Please log in to your portal to confirm your payment and view further instructions.

Regards,
COHA VTC Administration`;

    if (replyType === 'email') {
      window.location.href = `mailto:${application.emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      let phone = application.cellNo.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '264' + phone.substring(1);
      }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
    }
    
    setEmailModalOpen(false);
    setToast({ msg: `${replyType === 'email' ? 'Email' : 'WhatsApp'} draft opened.`, show: true, type: 'success' });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading application details...</div>;
  }

  if (!application) {
    return <div className="p-8 text-center text-red-500">Application not found.</div>;
  }

  return (
    <div className="w-full px-5 mx-auto pb-12">
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({...toast, show: false})} variant={toast.type} />
      
      {emailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white w-full max-w-lg shadow-2xl border-t-8 border-blue-600 animate-fade-in">
                <div className="p-10 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                         {replyType === 'email' ? <Mail size={40} /> : <MessageCircle size={40} />}
                      </div>
                      <h3 className="text-2xl font-black uppercase text-blue-800 tracking-tight mb-2">Send Login Details</h3>
                      <p className="text-gray-500 font-bold text-sm uppercase mb-8">Applicant: {application.firstName} {application.surname}</p>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => navigate('/admin/vtc-applications')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Applications
        </button>
        
        <div className="flex flex-wrap items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
          {application.status === 'PENDING' && (
            <>
              <Button onClick={() => handleStatusChange('APPROVED')} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <Check size={16} /> <span className="hidden sm:inline">Approve</span><span className="sm:hidden">Approve</span>
              </Button>
              <Button onClick={() => handleStatusChange('PAYMENT_REQUIRED')} className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <DollarSign size={16} /> <span className="hidden sm:inline">Require Payment</span><span className="sm:hidden">Payment</span>
              </Button>
              <Button onClick={() => handleStatusChange('REJECTED')} variant="outline" className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <X size={16} /> <span className="hidden sm:inline">Reject</span><span className="sm:hidden">Reject</span>
              </Button>
            </>
          )}
          
          {application.status === 'VERIFYING' && (
            <>
              <Button onClick={() => handleStatusChange('VERIFIED')} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <Check size={16} /> <span className="hidden sm:inline">Verify Receipt</span><span className="sm:hidden">Verify</span>
              </Button>
              <Button onClick={() => handleStatusChange('PAYMENT_REQUIRED')} variant="outline" className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <X size={16} /> <span className="hidden sm:inline">Reject Payment</span><span className="sm:hidden">Reject</span>
              </Button>
            </>
          )}

          {application.status === 'APPROVED' && (
            <>
              <Button onClick={() => openReplyModal('email')} variant="outline" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <Mail size={16} /> <span className="hidden sm:inline">Send Email</span><span className="sm:hidden">Email</span>
              </Button>
              <Button onClick={() => openReplyModal('whatsapp')} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 sm:gap-2 !px-3 !py-2 sm:!px-6 sm:!py-3 text-xs sm:text-sm rounded-[14px]">
                <MessageCircle size={16} /> <span className="hidden sm:inline">Send WhatsApp</span><span className="sm:hidden">WhatsApp</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-200 overflow-hidden">
        {/* Status Banner */}
        <div className={`px-8 py-4 flex items-center justify-between border-b
          ${application.status === 'PENDING' ? 'bg-yellow-50 border-yellow-100' : 
            application.status === 'APPROVED' ? 'bg-green-50 border-green-100' : 
            application.status === 'REJECTED' ? 'bg-red-50 border-red-100' : 
            'bg-blue-50 border-blue-100'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full 
              ${application.status === 'PENDING' ? 'bg-yellow-500' : 
                application.status === 'APPROVED' ? 'bg-green-500' : 
                application.status === 'REJECTED' ? 'bg-red-500' : 
                'bg-blue-500'}`} 
            />
            <span className="font-bold text-gray-900 uppercase tracking-wider text-sm">
              Status: {application.status}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Submitted: {application.submissionDate ? new Date(application.submissionDate.toDate()).toLocaleDateString() : 'Unknown'}
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Personal Info */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6 border-b pb-2">
                <User size={20} className="text-blue-600" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <DetailItem label="Full Name" value={`${application.title} ${application.firstName} ${application.surname}`} />
                <DetailItem label="Identity Number" value={application.identityNumber} />
                <DetailItem label="Date of Birth" value={application.dateOfBirth} />
                <DetailItem label="Gender" value={application.gender} />
                <DetailItem label="Nationality" value={application.nationality} />
                <DetailItem label="Marital Status" value={application.maritalStatus} />
                <DetailItem label="Physically Challenged" value={application.physicallyChallenged} />
              </div>
            </section>

            {/* Contact Info */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6 border-b pb-2">
                <Phone size={20} className="text-blue-600" /> Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <DetailItem label="Cell/Tel No" value={application.cellNo} />
                <DetailItem label="Email Address" value={application.emailAddress} />
                <div className="sm:col-span-2">
                  <DetailItem label="Residential Address" value={application.residentialAddress} />
                </div>
                <DetailItem label="Town" value={application.town} />
                <DetailItem label="Region" value={application.region} />
                <div className="sm:col-span-2">
                  <DetailItem label="Postal Address" value={application.postalAddress || 'N/A'} />
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6 border-b pb-2">
                <AlertCircle size={20} className="text-blue-600" /> Emergency Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <DetailItem label="Name" value={application.emergencyName} />
                <DetailItem label="Relationship" value={application.emergencyRelationship} />
                <DetailItem label="Cell Number" value={application.emergencyCell} />
                <DetailItem label="Email" value={application.emergencyEmail || 'N/A'} />
                <DetailItem label="Town" value={application.emergencyTown} />
                <DetailItem label="Region" value={application.emergencyRegion} />
              </div>
            </section>

            {/* Education */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6 border-b pb-2">
                <GraduationCap size={20} className="text-blue-600" /> Educational History
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                <DetailItem label="Highest Grade Passed" value={application.highestGradePassed || 'N/A'} />
                <DetailItem label="School Attended" value={application.nameOfSchool || 'N/A'} />
                <DetailItem label="School Town" value={application.schoolTown || 'N/A'} />
              </div>
            </section>

          </div>

          {/* Right Column - Documents */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-[20px] p-6 border border-gray-200 sticky top-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                <FileText size={20} className="text-blue-600" /> Uploaded Documents
              </h3>
              
              <div className="space-y-4">
                <DocumentPreviewCard label="Birth Certificate" item={application.birthCertificate} />
                {(application.medicalDocuments || []).map((item, index) => (
                  <DocumentPreviewCard key={`medical-${index}`} label={`Medical Document ${index + 1}`} item={item} />
                ))}
                {(application.otherDocuments || []).map((item, index) => (
                  <DocumentPreviewCard key={`other-${index}`} label={`Other Document ${index + 1}`} item={item} />
                ))}
                <DocumentLink label="ID / Birth Certificate" url={application.idDocumentUrl} />
                <DocumentLink label="Latest Results" url={application.resultsUrl} />
                <DocumentLink label="Passport Photo" url={application.photoUrl} />
                <DocumentLink label="Proof of Payment" url={application.proofOfPaymentUrl} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col h-full justify-start">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-gray-900 font-medium">{value}</p>
  </div>
);

const DocumentLink = ({ label, url }: { label: string, url?: string }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
    {url ? (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2 break-all"
      >
        <FileText size={16} className="flex-shrink-0" /> View Document
      </a>
    ) : (
      <p className="text-sm text-gray-400 italic">Not provided</p>
    )}
  </div>
);

const DocumentPreviewCard = ({ label, item }: { label: string, item?: any | null }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      {item?.fileBase64 && (
        <a href={item.fileBase64} download={item.fileName} className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
          <Download size={14} /> Open
        </a>
      )}
    </div>
    {!item ? (
      <p className="text-sm text-gray-400 italic">Not provided</p>
    ) : item.mimeType?.startsWith('image/') ? (
      <img src={item.fileBase64} alt={label} className="w-full h-40 object-contain bg-gray-50 border border-gray-200 rounded-xl" />
    ) : (
      <div className="h-40 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-bold">
        PDF document ready to open
      </div>
    )}
  </div>
);

function DollarSign(props: any) {
  return <svg width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
}
