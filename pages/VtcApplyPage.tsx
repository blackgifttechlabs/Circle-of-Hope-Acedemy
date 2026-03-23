import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { submitVtcApplication } from '../services/dataService';
import { CustomSelect } from '../components/ui/CustomSelect';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft, CheckCircle2, AlertCircle, Check, ArrowRight } from 'lucide-react';

const STEPS = [
  "Applicant",
  "Emergency",
  "Education",
  "Documents"
];

// Enhanced Input for Validation Feedback
const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }> = ({ label, className = '', required, error, ...props }) => (
  <div className="w-full mb-6">
    <label className="block text-gray-800 text-sm font-medium mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      className={`w-full p-3 border-b-2 outline-none transition-colors ${error ? 'border-red-500 bg-red-50 focus:bg-white' : 'border-gray-300 bg-gray-50 focus:bg-white focus:border-coha-500'} text-gray-900 ${className}`}
      {...props}
    />
    {error && (
        <p className="text-red-600 text-xs mt-1 flex items-center gap-1 font-medium">
            <AlertCircle size={12} /> {error}
        </p>
    )}
  </div>
);

export const VtcApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'instructions' | 'form' | 'success'>('instructions');
  const [currentFormStep, setCurrentFormStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validation State
  const [shakeError, setShakeError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);

  React.useEffect(() => {
    scrollToTop();
  }, []);

  const [formData, setFormData] = useState({
    title: 'Mr',
    surname: '',
    firstName: '',
    dateOfBirth: '',
    gender: 'Male',
    cellNo: '',
    identityNumber: '',
    nationality: '',
    maritalStatus: 'Single',
    residentialAddress: '',
    town: '',
    postalAddress: '',
    emailAddress: '',
    region: '',
    physicallyChallenged: 'No',
    
    emergencyName: '',
    emergencyCell: '',
    emergencyRelationship: '',
    emergencyRegion: '',
    emergencyEmail: '',
    emergencyTown: '',
    
    highestGradePassed: '',
    nameOfSchool: '',
    schoolTown: '',
    
    idDocumentUrl: '',
    resultsUrl: '',
    photoUrl: '',
    proofOfPaymentUrl: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
        const newErrors = { ...errors };
        delete newErrors[name];
        setErrors(newErrors);
        setStepError(null);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
        const newErrors = { ...errors };
        delete newErrors[name];
        setErrors(newErrors);
        setStepError(null);
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (stepIndex === 0) {
        if (!formData.surname.trim()) newErrors.surname = "Surname is required";
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
        if (!formData.cellNo.trim()) newErrors.cellNo = "Cell number is required";
        if (!formData.identityNumber.trim()) newErrors.identityNumber = "Identity number is required";
        if (!formData.nationality.trim()) newErrors.nationality = "Nationality is required";
        if (!formData.emailAddress.trim()) newErrors.emailAddress = "Email address is required";
        if (!formData.residentialAddress.trim()) newErrors.residentialAddress = "Residential address is required";
        if (!formData.town.trim()) newErrors.town = "Town is required";
        if (!formData.region.trim()) newErrors.region = "Region is required";
    } else if (stepIndex === 1) {
        if (!formData.emergencyName.trim()) newErrors.emergencyName = "Emergency contact name is required";
        if (!formData.emergencyCell.trim()) newErrors.emergencyCell = "Cell number is required";
        if (!formData.emergencyRelationship.trim()) newErrors.emergencyRelationship = "Relationship is required";
        if (!formData.emergencyRegion.trim()) newErrors.emergencyRegion = "Region is required";
        if (!formData.emergencyTown.trim()) newErrors.emergencyTown = "Town is required";
    } else if (stepIndex === 2) {
        // Education history is optional, but if they fill one, maybe they should fill all?
        // Let's keep it optional for now as per original design.
    } else if (stepIndex === 3) {
        // Document uploads are temporarily disabled as per request.
        // Users can submit without them for now.
    }

    const hasErrors = Object.keys(newErrors).length > 0;
    if (hasErrors) {
        setErrors(newErrors);
        setStepError("Please fill in all mandatory fields before proceeding.");
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        return false;
    }

    setErrors({});
    setStepError(null);
    return true;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (validateStep(currentFormStep)) {
        if (currentFormStep < STEPS.length - 1) {
          setCurrentFormStep(prev => prev + 1);
          scrollToTop();
        }
    }
  };

  const handleBack = () => {
    if (currentFormStep > 0) {
      setCurrentFormStep(prev => prev - 1);
      scrollToTop();
    } else {
      setStep('instructions');
      scrollToTop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentFormStep)) return;

    setIsSubmitting(true);
    try {
      const success = await submitVtcApplication(formData);
      if (success) {
        setStep('success');
        scrollToTop();
      } else {
        setStepError("System failed to submit application. Please try again or contact support.");
      }
    } catch (err) {
      setStepError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
        <div className="bg-white p-8 rounded-lg max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Sent!</h2>
          <p className="text-sm text-gray-600 mb-6">
            Thank you for applying to COHA Vocational Training Centre. Your application has been received and is currently under review. 
            We will contact you shortly via email or WhatsApp with further instructions.
          </p>
          <Button fullWidth onClick={() => navigate('/')}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-20">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>

      {step === 'instructions' ? (
        <>
          <div className="sticky top-0 bg-white z-40 border-b border-gray-100 shadow-sm">
            <div className="px-5 py-3 flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-gray-500 hover:text-coha-900">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-sm font-bold text-gray-600">VTC Application</h1>
            </div>
          </div>
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="bg-blue-900 text-white p-8 sm:p-12 text-center">
                <img src="https://i.ibb.co/LzYXwYfX/logo.png" alt="COHA VTC" className="w-20 h-20 mx-auto mb-6 object-contain bg-white/10 rounded-2xl p-2" referrerPolicy="no-referrer" />
                <h1 className="text-3xl sm:text-4xl font-black mb-4 font-archivo tracking-tight">VTC Application Form</h1>
                <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                  Circle of Hope Academy Vocational Training Centre - Ondangwa
                </p>
              </div>
              
              <div className="p-8 sm:p-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Instructions to Applicants</h2>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="text-gray-700 font-medium">Complete all areas on the form accurately.</p>
                      <p className="text-gray-500 text-sm mt-1">Ensure your contact details are correct so we can reach you.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="text-gray-700 font-medium">A non-refundable fee of N$50.00 must accompany this application.</p>
                      <div className="bg-gray-50 p-4 rounded-xl mt-3 border border-gray-200">
                        <p className="text-sm font-bold text-gray-900 mb-2">Our banking details:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li><span className="font-medium text-gray-800">Account Name:</span> COHA TUTORIAL ACADEMY</li>
                          <li><span className="font-medium text-gray-800">Bank:</span> BANK WINDHOEK</li>
                          <li><span className="font-medium text-gray-800">Account No:</span> 8052796955</li>
                          <li><span className="font-medium text-gray-800">Account Type:</span> Cheque</li>
                          <li><span className="font-medium text-gray-800">Branch code:</span> 483378</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="text-gray-700 font-medium">Prepare your documents for upload.</p>
                      <p className="text-gray-500 text-sm mt-1 mb-2">
                        <span className="text-blue-600 font-bold">Note: Document uploads are temporarily disabled.</span> You will be able to submit your application without them for now, but please prepare:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                        <li>Certified copy of ID or Birth Certificate</li>
                        <li>Latest school results</li>
                        <li>Recent passport photo</li>
                        <li>Proof of payment (N$50.00)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end">
                  <Button 
                    onClick={() => {
                      setStep('form');
                      scrollToTop();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2"
                  >
                    Continue to Application
                    <ChevronRight size={20} />
                  </Button>
                </div>
              </div>
            </motion.div>
          </main>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="sticky top-0 bg-white z-40 border-b border-gray-100 shadow-sm">
            <div className="px-5 py-3 flex items-center gap-4">
              <button 
                onClick={() => {
                  setStep('instructions');
                  scrollToTop();
                }} 
                className="text-gray-500 hover:text-coha-900"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-sm font-bold text-gray-600">VTC Application</h1>
            </div>
            
            {/* Stepper */}
            <div className="px-5 pb-3 pt-1">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                <div 
                  className="absolute top-1/2 left-0 h-0.5 bg-coha-500 -z-10 transform -translate-y-1/2 transition-all duration-300"
                  style={{ width: `${(currentFormStep / (STEPS.length - 1)) * 100}%` }}
                ></div>

                {STEPS.map((stepName, index) => {
                  const isCompleted = index < currentFormStep;
                  const isCurrent = index === currentFormStep;
                  
                  return (
                    <div key={index} className="flex flex-col items-center bg-white px-1">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                          isCompleted ? 'bg-coha-500 border-coha-500 text-white' : 
                          isCurrent ? 'bg-white border-coha-500 text-coha-500 scale-110' : 
                          'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        {isCompleted ? <Check size={14} /> : index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-2">
                <span className="text-xs font-bold text-coha-900 uppercase tracking-wide">{STEPS[currentFormStep]}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-5 pt-8 max-w-5xl mx-auto">
            
            {/* Step 1: Applicant */}
            {currentFormStep === 0 && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Applicant Particulars</h3>
                  <CustomSelect
                    label="Title"
                    options={[{value: 'Mr', label: 'Mr'}, {value: 'Miss', label: 'Miss'}, {value: 'Female', label: 'Female'}]}
                    value={formData.title}
                    onChange={(v) => handleSelectChange('title', v)}
                    required
                    error={errors.title}
                  />
                  <FormInput name="surname" label="Surname" value={formData.surname} onChange={handleChange} required error={errors.surname} />
                  <FormInput name="firstName" label="First Name(s)" value={formData.firstName} onChange={handleChange} required error={errors.firstName} />
                  <FormInput name="dateOfBirth" label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={handleChange} required error={errors.dateOfBirth} />
                  <CustomSelect
                    label="Gender"
                    options={[{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}]}
                    value={formData.gender}
                    onChange={(v) => handleSelectChange('gender', v)}
                    required
                    error={errors.gender}
                  />
                  <FormInput name="cellNo" label="Cell/Tel No" value={formData.cellNo} onChange={handleChange} required error={errors.cellNo} />
                  <FormInput name="identityNumber" label="Identity Number" value={formData.identityNumber} onChange={handleChange} required error={errors.identityNumber} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Additional Details</h3>
                  <FormInput name="nationality" label="Nationality" value={formData.nationality} onChange={handleChange} required error={errors.nationality} />
                  <CustomSelect
                    label="Marital Status"
                    options={[{value: 'Single', label: 'Single'}, {value: 'Married', label: 'Married'}]}
                    value={formData.maritalStatus}
                    onChange={(v) => handleSelectChange('maritalStatus', v)}
                    required
                    error={errors.maritalStatus}
                  />
                  <FormInput name="emailAddress" label="Email Address" type="email" value={formData.emailAddress} onChange={handleChange} required error={errors.emailAddress} />
                  <FormInput name="residentialAddress" label="Residential Address" value={formData.residentialAddress} onChange={handleChange} required error={errors.residentialAddress} />
                  <FormInput name="town" label="Town" value={formData.town} onChange={handleChange} required error={errors.town} />
                  <FormInput name="region" label="Region" value={formData.region} onChange={handleChange} required error={errors.region} />
                  <FormInput name="postalAddress" label="Postal Address" value={formData.postalAddress} onChange={handleChange} />
                  <CustomSelect
                    label="Physically Challenged?"
                    options={[{value: 'No', label: 'No'}, {value: 'Yes', label: 'Yes'}]}
                    value={formData.physicallyChallenged}
                    onChange={(v) => handleSelectChange('physicallyChallenged', v)}
                    required
                    error={errors.physicallyChallenged}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Emergency */}
            {currentFormStep === 1 && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Emergency Contact / Legal Guardian</h3>
                  <FormInput name="emergencyName" label="Name" value={formData.emergencyName} onChange={handleChange} required error={errors.emergencyName} />
                  <FormInput name="emergencyCell" label="Cell Number" value={formData.emergencyCell} onChange={handleChange} required error={errors.emergencyCell} />
                  <FormInput name="emergencyRelationship" label="Relationship" value={formData.emergencyRelationship} onChange={handleChange} required error={errors.emergencyRelationship} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Location Details</h3>
                  <FormInput name="emergencyRegion" label="Region" value={formData.emergencyRegion} onChange={handleChange} required error={errors.emergencyRegion} />
                  <FormInput name="emergencyTown" label="Town or Village" value={formData.emergencyTown} onChange={handleChange} required error={errors.emergencyTown} />
                  <FormInput name="emergencyEmail" label="Email Address" type="email" value={formData.emergencyEmail} onChange={handleChange} />
                </div>
              </div>
            )}

            {/* Step 3: Education */}
            {currentFormStep === 2 && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Educational History (If Any)</h3>
                  <FormInput name="highestGradePassed" label="Highest Grade Passed" value={formData.highestGradePassed} onChange={handleChange} />
                  <FormInput name="nameOfSchool" label="Name of School Attended" value={formData.nameOfSchool} onChange={handleChange} />
                  <FormInput name="schoolTown" label="Town" value={formData.schoolTown} onChange={handleChange} />
                </div>
              </div>
            )}

            {/* Step 4: Documents */}
            {currentFormStep === 3 && (
              <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200 mb-2">
                  <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                    <AlertCircle size={18} />
                    Document uploads are temporarily disabled. You may submit your application without them for now.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Required Documents</h3>
                  <div className="w-full mb-6 opacity-60 cursor-not-allowed">
                    <label className="block text-gray-800 text-sm font-medium mb-2">ID / Birth Certificate</label>
                    <input type="file" disabled className="w-full p-3 border-b-2 border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500" />
                  </div>
                  <div className="w-full mb-6 opacity-60 cursor-not-allowed">
                    <label className="block text-gray-800 text-sm font-medium mb-2">Latest Results</label>
                    <input type="file" disabled className="w-full p-3 border-b-2 border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Additional Documents</h3>
                  <div className="w-full mb-6 opacity-60 cursor-not-allowed">
                    <label className="block text-gray-800 text-sm font-medium mb-2">Passport Photo</label>
                    <input type="file" disabled className="w-full p-3 border-b-2 border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500" />
                  </div>
                  <div className="w-full mb-6 opacity-60 cursor-not-allowed">
                    <label className="block text-gray-800 text-sm font-medium mb-2">Proof of Payment (N$50.00)</label>
                    <input type="file" disabled className="w-full p-3 border-b-2 border-gray-300 bg-gray-100 cursor-not-allowed text-gray-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons & Feedback */}
            <div className="mt-8 flex flex-col items-center gap-6 pt-6 border-t border-gray-100 w-full">
               {stepError && (
                  <div className={`flex items-center gap-3 text-red-600 p-4 bg-red-50 border border-red-100 w-full justify-center transition-all ${shakeError ? 'animate-shake' : ''}`}>
                     <AlertCircle size={20} />
                     <span className="text-sm font-bold">{stepError}</span>
                  </div>
               )}

               <div className="flex gap-4 w-full">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleBack} 
                    className={`flex-1 ${currentFormStep === 0 ? 'invisible' : ''}`}
                  >
                    Back
                  </Button>
                  
                  {currentFormStep < STEPS.length - 1 ? (
                    <Button type="button" onClick={handleNext} className="flex-1 bg-coha-500 hover:bg-coha-600 border-none rounded-lg">
                      Next <ArrowRight size={18} />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`flex-1 rounded-lg border-none text-white ${shakeError ? 'animate-shake bg-red-600' : 'bg-coha-900'}`}
                    >
                      {isSubmitting ? 'Sending...' : 'Submit Application'}
                    </Button>
                  )}
               </div>
            </div>

          </form>
        </>
      )}
    </div>
  );
};

