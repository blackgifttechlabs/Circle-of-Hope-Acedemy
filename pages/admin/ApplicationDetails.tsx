import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplicationById, updateApplication, getSystemSettings, approveApplicationInitial } from '../../services/dataService';
import { Application, SystemSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Check, X, Printer, AlertTriangle, Download, Mail, MessageCircle, ExternalLink } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Toast } from '../../components/ui/Toast';
import {
  buildApplicationApprovalEmailHtml,
  buildApplicationApprovalEmailText,
  buildApplicationApprovalWhatsappText,
  getApplicationParentEmail,
  getApplicationParentPhone,
  getPortalLoginUrl,
} from '../../utils/admissionMessaging';

export const ApplicationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [replyType, setReplyType] = useState<'email' | 'whatsapp'>('email');
  const [draftSending, setDraftSending] = useState(false);
  const [approvalDraft, setApprovalDraft] = useState<{ pin: string; studentId: string } | null>(null);
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' | 'info' });
  
  // Office Use State
  const [officeData, setOfficeData] = useState({
    officeReviewer: '',
    officeReviewDate: new Date().toISOString().split('T')[0],
    officeStatus: 'Successful',
    officeResponseMethod: 'Email',
    officeResponseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const appData = await getApplicationById(id);
        const settingsData = await getSystemSettings();
        setApp(appData);
        setSettings(settingsData);
        
        if (settingsData?.adminName) {
            setOfficeData(prev => ({...prev, officeReviewer: settingsData.adminName}));
        }
        
        if (appData?.officeReviewer) {
            setOfficeData({
                officeReviewer: appData.officeReviewer || '',
                officeReviewDate: appData.officeReviewDate || '',
                officeStatus: appData.officeStatus || 'Successful',
                officeResponseMethod: appData.officeResponseMethod || 'Email',
                officeResponseDate: appData.officeResponseDate || ''
            });
        }
      }
    };
    fetchData();
  }, [id]);

  const handleOfficeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOfficeData({ ...officeData, [e.target.name]: e.target.value });
  };

  const persistResponseMethod = async (method: 'Email' | 'WhatsApp') => {
    if (!id || !app) return;
    const updates = {
      officeResponseMethod: method,
      officeResponseDate: new Date().toISOString().split('T')[0],
    };
    await updateApplication(id, updates);
    setApp({ ...app, ...updates });
    setOfficeData((prev) => ({ ...prev, ...updates }));
  };

  const handleApprove = async () => {
    if (!app || !id) return;
    setIsProcessing(true);
    
    try {
        const result = await approveApplicationInitial(app);
        if (!result) {
            throw new Error('Parent account could not be created.');
        }

        const updatedData = {
            status: 'APPROVED' as any,
            ...officeData,
            approvedStudentId: result.studentId,
            approvedParentPin: result.pin,
        };
        
        await updateApplication(id, updatedData);
        setApp({ ...app, ...updatedData });
        setApprovalDraft(result);
        setReplyType('email');
        setApprovalModalOpen(true);
    } catch (error) {
        console.error("Error approving:", error);
        setToast({ msg: 'Approval failed. The parent account was not created.', show: true, type: 'error' });
    } finally {
        setIsProcessing(false);
    }
  };

  const storedApprovalDraft = approvalDraft || (app?.approvedParentPin && app?.approvedStudentId
    ? { pin: app.approvedParentPin, studentId: app.approvedStudentId }
    : null);

  const portalUrl = getPortalLoginUrl();
  const approvalEmailHtml = app && storedApprovalDraft
    ? buildApplicationApprovalEmailHtml({
        app,
        pin: storedApprovalDraft.pin,
        studentId: storedApprovalDraft.studentId,
        portalUrl,
        schoolName: settings?.schoolName,
      })
    : '';
  const approvalEmailText = app && storedApprovalDraft
    ? buildApplicationApprovalEmailText({
        app,
        pin: storedApprovalDraft.pin,
        studentId: storedApprovalDraft.studentId,
        portalUrl,
        schoolName: settings?.schoolName,
      })
    : '';
  const approvalWhatsappText = app && storedApprovalDraft
    ? buildApplicationApprovalWhatsappText({
        app,
        pin: storedApprovalDraft.pin,
        studentId: storedApprovalDraft.studentId,
        portalUrl,
        schoolName: settings?.schoolName,
      })
    : '';

  const handleSendApprovalDraft = async () => {
    if (!app || !storedApprovalDraft) return;
    setDraftSending(true);
    try {
      if (replyType === 'email') {
        const email = getApplicationParentEmail(app);
        if (!email) {
          setToast({ msg: 'No parent email was provided on the application.', show: true, type: 'error' });
          return;
        }
        await persistResponseMethod('Email');
        const subject = `Conditional Admission Approval: ${app.firstName} ${app.surname} - ${settings?.schoolName || 'Circle of Hope Academy'}`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(approvalEmailText)}`;
        setToast({ msg: 'Email draft opened.', show: true, type: 'success' });
      } else {
        const phone = getApplicationParentPhone(app);
        if (!phone) {
          setToast({ msg: 'No parent WhatsApp number was provided on the application.', show: true, type: 'error' });
          return;
        }
        await persistResponseMethod('WhatsApp');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(approvalWhatsappText)}`, '_blank');
        setToast({ msg: 'WhatsApp draft opened.', show: true, type: 'success' });
      }
      setApprovalModalOpen(false);
    } catch (error) {
      console.error('Error preparing approval draft:', error);
      setToast({ msg: 'Could not prepare the reply draft.', show: true, type: 'error' });
    } finally {
      setDraftSending(false);
    }
  };

  const handleReject = async () => {
      if (!app || !id) return;
      setIsProcessing(true);
      try {
          await updateApplication(id, { status: 'REJECTED' });
          setRejectModalOpen(false);
          setApp({...app, status: 'REJECTED'});
          
          const subject = `Admission Update: ${app.firstName} ${app.surname}`;
          const body = `Dear Parent/Guardian,\n\nWe regret to inform you that the application for ${app.firstName} ${app.surname} was not successful at this time.\n\nRegards,\nCircle of Hope Academy`;
           window.location.href = `mailto:${app.fatherEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      } catch (e) {
          console.error(e);
      }
      setIsProcessing(false);
  };

  if (!app) return <Loader />;

  const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 shadow-sm border border-gray-200 mb-6 ${className}`}>
      <h3 className="text-lg font-bold text-coha-900 mb-4 border-b pb-2 uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {children}
      </div>
    </div>
  );

  const InfoRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
    <div className="mb-2">
      <p className="text-xs text-gray-500 uppercase font-bold">{label}</p>
      <p className={`text-gray-900 font-medium break-words ${!value ? 'text-gray-400 italic' : ''}`}>{value || 'Not provided'}</p>
    </div>
  );

  const DocumentCard: React.FC<{ title: string; item?: any | null }> = ({ title, item }) => (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-black text-gray-900">{title}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">{item?.fileName || 'Not provided'}</p>
        </div>
        {item?.fileBase64 && (
          <a href={item.fileBase64} download={item.fileName} className="text-sm font-bold text-coha-700 inline-flex items-center gap-1">
            <Download size={14} /> Open
          </a>
        )}
      </div>
      <div className="p-5">
        {!item ? (
          <div className="h-52 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-400 font-bold">Not uploaded</div>
        ) : item.mimeType?.startsWith('image/') ? (
          <img src={item.fileBase64} alt={title} className="w-full h-52 object-contain bg-white border border-gray-200 rounded-xl" />
        ) : (
          <div className="h-52 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 font-bold">PDF document ready to open</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="-m-5 pb-20 font-sans text-black bg-gray-50 min-h-[calc(100vh-64px)]">
        <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ ...toast, show: false })} variant={toast.type} />
        <ConfirmModal 
            isOpen={rejectModalOpen}
            onClose={() => setRejectModalOpen(false)}
            onConfirm={handleReject}
            title="Reject Application?"
            message="Are you sure you want to reject this application? This action will mark it as rejected."
            isLoading={isProcessing}
        />
        {approvalModalOpen && app && storedApprovalDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-6xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
              <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr]">
                <div className="bg-slate-950 px-6 py-7 text-white">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-200">Reply Method</p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.04em]">Send Admission Details</h3>
                  <p className="mt-3 text-sm text-slate-300">
                    The draft now uses the actual applicant details and the auto-created parent login for {app.firstName} {app.surname}.
                  </p>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => setReplyType('email')}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${replyType === 'email' ? 'border-blue-400 bg-blue-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Mail size={20} />
                        <div>
                          <p className="font-black">Email Draft</p>
                          <p className="text-xs text-slate-300 mt-1">{getApplicationParentEmail(app) || 'No parent email on file'}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setReplyType('whatsapp')}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${replyType === 'whatsapp' ? 'border-emerald-400 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle size={20} />
                        <div>
                          <p className="font-black">WhatsApp Draft</p>
                          <p className="text-xs text-slate-300 mt-1">{getApplicationParentPhone(app) || 'No parent phone on file'}</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <button
                      onClick={handleSendApprovalDraft}
                      disabled={draftSending}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-60"
                    >
                      {draftSending ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" className="opacity-75" />
                          </svg>
                          Preparing draft
                        </>
                      ) : (
                        <>
                          <ExternalLink size={16} /> Open {replyType === 'email' ? 'Email' : 'WhatsApp'} Draft
                        </>
                      )}
                    </button>
                    <button onClick={() => setApprovalModalOpen(false)} className="text-sm font-bold text-slate-300 hover:text-white">
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-[85vh] overflow-y-auto bg-slate-100 p-5">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {replyType === 'email' ? 'Email Preview' : 'WhatsApp Preview'}
                    </p>
                    {replyType === 'email' ? (
                      <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                        <div dangerouslySetInnerHTML={{ __html: approvalEmailHtml }} />
                      </div>
                    ) : (
                      <pre className="mt-4 whitespace-pre-wrap rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">{approvalWhatsappText}</pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HERO SECTION / HEADER */}
        <div className="bg-coha-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <button onClick={() => navigate('/admin/applications')} className="mb-4 p-2 hover:bg-white/10 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/20 w-fit">
                    <ArrowLeft size={16} /> Back to Applications
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-none">{app.surname}, {app.firstName}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold text-coha-300 uppercase tracking-widest">
                            <span>Application ID: <span className="text-white">{app.id}</span></span>
                            <span>{app.grade}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => window.print()} className="bg-white !text-coha-900 border border-gray-300 px-4 py-2 font-black uppercase text-[10px] tracking-widest hover-pop">
                            <Printer size={16} /> Print
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Section title="Learner Details">
                    <InfoRow label="Full Name" value={`${app.firstName} ${app.surname}`} />
                    <InfoRow label="Date of Birth" value={app.dob} />
                    <InfoRow label="Gender" value={app.gender} />
                    <InfoRow label="Citizenship" value={app.citizenship} />
                    <InfoRow label="Grade Applied" value={app.grade} />
                    <InfoRow label="Residential Address" value={app.address} />
                    <InfoRow label="Region" value={app.region} />
                    <InfoRow label="Special Needs" value={app.isSpecialNeeds ? `Yes - ${app.specialNeedsType}` : 'No'} />
                </Section>
                <Section title="Parent / Guardian Info">
                    <InfoRow label="Father Name" value={app.fatherName} />
                    <InfoRow label="Father Phone" value={app.fatherPhone} />
                    <InfoRow label="Father Email" value={app.fatherEmail} />
                    <div className="md:col-span-2 border-t pt-2 mt-2"></div>
                    <InfoRow label="Mother Name" value={app.motherName} />
                    <InfoRow label="Mother Phone" value={app.motherPhone} />
                </Section>
                <Section title="Emergency Contact">
                    <InfoRow label="Full Name" value={app.emergencyName} />
                    <InfoRow label="Relationship" value={app.emergencyRelationship} />
                    <InfoRow label="Cell Number" value={app.emergencyCell} />
                    <InfoRow label="Work Contact" value={app.emergencyWork} />
                    <InfoRow label="Email" value={app.emergencyEmail} />
                </Section>
                <Section title="Educational History">
                    <InfoRow label="First Time Attender" value={!app.hasPreviousSchool ? 'Yes' : 'No'} />
                    {app.hasPreviousSchool && (
                        <>
                            <InfoRow label="Previous School" value={app.previousSchool} />
                            <InfoRow label="Highest Grade Completed" value={app.highestGrade} />
                        </>
                    )}
                    <div className="md:col-span-2 border-t pt-2 mt-2"></div>
                    <InfoRow label="English Proficiency" value={app.langEnglish} />
                    <InfoRow label="Other Language 1" value={app.langOther1Name ? `${app.langOther1Name} (${app.langOther1Rating})` : null} />
                    <InfoRow label="Other Language 2" value={app.langOther2Name ? `${app.langOther2Name} (${app.langOther2Rating})` : null} />
                </Section>
                <Section title="Medical Information">
                     <InfoRow label="Medical Conditions / Allergies" value={app.medicalConditions} />
                     <div className="md:col-span-2 border-t pt-2 mt-2 grid md:grid-cols-2 gap-4">
                        <InfoRow label="Family Doctor" value={app.doctorName ? `${app.doctorName} (${app.doctorContact})` : null} />
                        <InfoRow label="Audiologist" value={app.audiologistName ? `${app.audiologistName} (${app.audiologistContact})` : null} />
                        <InfoRow label="Occupational Therapist" value={app.therapistName ? `${app.therapistName} (${app.therapistContact})` : null} />
                     </div>
                     <div className="md:col-span-2 border-t pt-2 mt-2"></div>
                     <InfoRow label="Medical Aid" value={app.hasMedicalAid ? 'Yes' : 'No'} />
                     {app.hasMedicalAid && (
                         <>
                            <InfoRow label="Medical Aid Name" value={app.medicalAidName} />
                            <InfoRow label="Plan Option" value={app.medicalAidOption} />
                            <InfoRow label="Member Name" value={app.medicalAidMemberName} />
                            <InfoRow label="Member ID" value={app.medicalAidMemberID} />
                         </>
                     )}
                </Section>
                <Section title="Application Documents" className="md:col-span-2">
                    <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <DocumentCard title="Birth Certificate" item={app.birthCertificate} />
                        {(app.medicalDocuments || []).length > 0 ? (
                            (app.medicalDocuments || []).map((item, index) => (
                                <DocumentCard key={`medical-${index}`} title={`Medical Document ${index + 1}`} item={item} />
                            ))
                        ) : (
                            <DocumentCard title="Medical Documents" item={null} />
                        )}
                        {(app.otherDocuments || []).length > 0 ? (
                            (app.otherDocuments || []).map((item, index) => (
                                <DocumentCard key={`other-${index}`} title={`Other Document ${index + 1}`} item={item} />
                            ))
                        ) : (
                            <DocumentCard title="Other Documents" item={null} />
                        )}
                    </div>
                </Section>
                 <Section title="Declarations">
                    <InfoRow label="Medical Consent Given" value={app.medicalConsent ? 'Yes' : 'No'} />
                    <InfoRow label="Terms & Conditions Accepted" value={app.agreed ? 'Yes' : 'No'} />
                    <InfoRow label="Submission Date" value={app.submissionDate?.toDate().toLocaleString()} />
                </Section>
            </div>

            <div className="lg:col-span-1">
                {/* Office Use Section */}
                <div className="bg-coha-50 p-6 border-l-4 border-coha-900 sticky top-24">
                    <h3 className="text-lg font-bold text-coha-900 mb-6 uppercase tracking-wider">Office Use Only</h3>
                    
                    {app.status === 'APPROVED' ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h3 className="font-bold text-green-800 text-xl">Approved</h3>
                            <p className="text-green-600">Awaiting Payment Verification</p>
                            {!!storedApprovalDraft && (
                              <div className="mt-6 flex flex-col gap-3">
                                <Button fullWidth onClick={() => { setReplyType('email'); setApprovalModalOpen(true); }} className="bg-white !text-coha-900 border border-coha-200">
                                  <Mail size={18} /> Open Email Draft
                                </Button>
                                <Button fullWidth onClick={() => { setReplyType('whatsapp'); setApprovalModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 border-none">
                                  <MessageCircle size={18} /> Open WhatsApp Draft
                                </Button>
                              </div>
                            )}
                        </div>
                    ) : app.status === 'REJECTED' ? (
                        <div className="text-center py-8">
                             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X size={32} />
                            </div>
                            <h3 className="font-bold text-red-800 text-xl">Rejected</h3>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Input label="Reviewed By" name="officeReviewer" value={officeData.officeReviewer} onChange={handleOfficeChange} />
                            <Input label="Date of Review" type="date" name="officeReviewDate" value={officeData.officeReviewDate} onChange={handleOfficeChange} />
                            
                            <div className="pt-6 flex flex-col gap-3">
                                <Button fullWidth onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 border-none">
                                    {isProcessing ? 'Processing...' : <><Check size={20} /> Approve & Request Payment</>}
                                </Button>
                                <Button fullWidth onClick={() => setRejectModalOpen(true)} disabled={isProcessing} variant="danger">
                                    <X size={20} /> Reject Application
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    </div>
  );
};
