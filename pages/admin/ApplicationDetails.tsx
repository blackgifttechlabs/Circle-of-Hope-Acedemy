import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApplicationById, updateApplication, getSystemSettings, approveApplicationInitial } from '../../services/dataService';
import { Application, SystemSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Check, X, Printer, AlertTriangle } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const ApplicationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  
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

  const handleApprove = async () => {
    if (!app || !id) return;
    setIsProcessing(true);
    
    try {
        const updatedData = {
            status: 'APPROVED' as any,
            ...officeData
        };
        
        await updateApplication(id, updatedData);
        setApp({ ...app, ...updatedData });

        const result = await approveApplicationInitial(app);

        if (settings && result) {
            const parentEmail = app.fatherEmail || app.motherEmail; 
            const subject = `ADMISSION CONDITIONAL APPROVAL: ${app.firstName} ${app.surname} - COHA`;
            
            const body = `Dear Parent/Guardian,

CONGRATULATIONS! We are pleased to inform you that the application for ${app.firstName} ${app.surname} has been CONDITIONALLY APPROVED for enrollment at Circle of Hope Academy (COHA).

------------------------------------------------------------
URGENT ACTION REQUIRED: REGISTRATION FEE
------------------------------------------------------------
To secure this placement, a non-refundable REGISTRATION FEE of N$ 300.00 is payable immediately. Enrolment is not guaranteed until this payment is verified.

------------------------------------------------------------
OFFICIAL FEE STRUCTURE 2026
------------------------------------------------------------
CATEGORY                        | AMOUNT      | FREQUENCY
------------------------------------------------------------
Registration Fee                | N$ 300.00   | Once-off
Tuition (Special Classes)       | N$ 2,300.00 | Monthly
Tuition (Mainstream - Termly)   | N$ 7,100.00 | Per Term
Kindergarten (Mainstream)       | N$ 550.00   | Monthly
Pre-Primary (Mainstream)        | N$ 650.00   | Monthly
Grades 1 - 3 (Mainstream)       | N$ 1,300.00 | Monthly
Grades 4 - 7 (Mainstream)       | N$ 1,700.00 | Monthly
Hostel Fees (Boarders)          | N$ 1,400.00 | Monthly
------------------------------------------------------------

------------------------------------------------------------
BANKING DETAILS: TUITION, REGISTRATION & HOSTEL
------------------------------------------------------------
Bank Name:      First National Bank (FNB)
Account Name:   COHA TUTORIAL ACADEMY
Account Number: 64283855814
Branch:         Ongwediva
Reference:      ${app.firstName} ${app.surname} (Learner's Full Name)

------------------------------------------------------------
BANKING DETAILS: FOOD CONTRIBUTION (HOSTEL ONLY)
------------------------------------------------------------
Hostel Food:    N$ 3,500.00 (Per Term)
Bank Name:      First National Bank (FNB)
Account Name:   SEFLANA CASH AND CURRY
Account Number: 62260164539 (Cheque)
Reference:      22229 + ${app.firstName} ${app.surname}

IMPORTANT: Please email proof of payment to acoha67@gmail.com within 48 hours of payment.

PORTAL ACCESS:
Use the following details to login and track your child's progress:
Parent Portal URL: [School Website Link]
Parent PIN: ${result.pin}

Warm regards,

Admissions Office
Circle of Hope Academy (COHA)
"Accessible Education for All"`;
            
            window.location.href = `mailto:${parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
    } catch (error) {
        console.error("Error approving:", error);
    }
    setIsProcessing(false);
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

  return (
    <div className="w-full px-5 pb-10">
        <ConfirmModal 
            isOpen={rejectModalOpen}
            onClose={() => setRejectModalOpen(false)}
            onConfirm={handleReject}
            title="Reject Application?"
            message="Are you sure you want to reject this application? This action will mark it as rejected."
            isLoading={isProcessing}
        />

        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/applications')} className="bg-white p-2 border hover:bg-gray-50">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-coha-900">{app.surname}, {app.firstName}</h2>
                    <p className="text-gray-600">Application ID: {app.id}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer size={18} /> Print
                </Button>
            </div>
        </div>

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
  );
};