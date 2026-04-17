import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitApplication, getSystemSettings, determineSpecialNeedsLevel } from '../services/dataService';
import { ArrowLeft, CheckCircle, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ApplicationFileAttachment, HostelApplicationDetails } from '../types';

type ApplicationStepKey = 'learner' | 'parents' | 'history' | 'medical' | 'documents' | 'hostel' | 'consent';

const BASE_STEPS: { key: ApplicationStepKey; label: string }[] = [
  { key: 'learner', label: 'Learner' },
  { key: 'parents', label: 'Parents' },
  { key: 'history', label: 'History' },
  { key: 'medical', label: 'Medical' },
  { key: 'documents', label: 'Documents' },
  { key: 'consent', label: 'Consent' },
];

const DEFAULT_HOSTEL_APPLICATION: HostelApplicationDetails = {
  homeLanguage: '',
  birthTerm: '',
  deliveryType: '',
  birthWeightKg: '',
  birthComplications: '',
  milestones: {
    satAlone: '',
    walkedAlone: '',
    firstWords: '',
    toiletTrained: '',
  },
  medicalHistory: [],
  diagnosis: [],
  diagnosisOther: '',
  diagnosisDate: '',
  diagnosedBy: '',
  medicationCurrentlyTaken: '',
  seizureHistory: '',
  seizureDetails: '',
  allergies: '',
  immunizationStatus: '',
  communicationNeeds: [],
  mobilityNeeds: [],
  learningSupport: [],
  sensoryNeeds: [],
  sensoryOther: '',
  dailyLivingAssistance: [],
  guardian1Relationship: '',
  guardian1IdPassport: '',
  guardian2Relationship: '',
  guardian2IdPassport: '',
  emergencyAlternativeNumber: '',
  preferredHospitalClinic: '',
  medicalAidInsurance: '',
  previouslyStayedInHostel: '',
  requires24HourAssistance: '',
  specialDietaryRequirements: '',
  dietaryDetails: '',
  declarationGuardianName: '',
};

const medicalHistoryOptions = [
  'Frequent hospital admissions',
  'Convulsions / seizures',
  'Feeding difficulties',
  'Hearing problems',
  'Vision problems',
];

const diagnosisOptions = ['Autism', 'Down Syndrome', 'Learning Disability', 'Other'];
const communicationOptions = ['Verbal', 'Non-verbal', 'Sign language', 'Communication device'];
const mobilityOptions = ['Independent', 'Wheelchair', 'Needs assistance'];
const learningSupportOptions = ['One-on-one', 'Small group', 'Occupational therapy', 'Speech therapy', 'Physiotherapy', 'Behavioral support'];
const sensoryOptions = ['Noise sensitivity', 'Light sensitivity', 'Other'];
const dailyLivingOptions = ['Feeding', 'Toileting', 'Dressing', 'Bathing'];

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

export const ApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gradesList, setGradesList] = useState<string[]>([]);
  const [autoLevel, setAutoLevel] = useState<string>('');
  
  // Validation State
  const [shakeError, setShakeError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    surname: '', firstName: '', dob: '', citizenship: '', gender: 'Male', 
    address: '', region: '', grade: '', isSpecialNeeds: false, specialNeedsType: '',
    needsHostel: false,
    hostelApplication: DEFAULT_HOSTEL_APPLICATION,
    fatherName: '', fatherPhone: '', fatherEmail: '',
    motherName: '', motherPhone: '', motherEmail: '',
    emergencyName: '', emergencyRelationship: '', emergencyWork: '', emergencyCell: '', emergencyEmail: '',
    hasPreviousSchool: true, previousSchool: '', highestGrade: '',
    langEnglish: 'Good', 
    langOther1Name: '', langOther1Rating: 'Fair',
    langOther2Name: '', langOther2Rating: 'Fair',
    medicalConditions: '',
    doctorName: '', doctorContact: '',
    audiologistName: '', audiologistContact: '',
    therapistName: '', therapistContact: '',
    hasMedicalAid: false,
    medicalAidName: '', medicalAidMemberName: '', medicalAidMemberID: '', medicalAidOption: '',
    medicalConsent: false,
    agreed: false,
    birthCertificate: null as ApplicationFileAttachment | null,
    medicalDocuments: [] as ApplicationFileAttachment[],
    otherDocuments: [] as ApplicationFileAttachment[],
  });

  const steps = formData.needsHostel
    ? [
        ...BASE_STEPS.slice(0, 5),
        { key: 'hostel' as ApplicationStepKey, label: 'Hostel Care' },
        BASE_STEPS[5],
      ]
    : BASE_STEPS;
  const currentStepConfig = steps[currentStep] || steps[0];
  const currentStepKey = currentStepConfig.key;

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    const fetchGrades = async () => {
        const settings = await getSystemSettings();
        if (settings && settings.grades) {
            setGradesList(settings.grades);
        } else {
            setGradesList(['Grade 0', 'Grade 1', 'Grade 2', 'Grade 3']);
        }
    };
    fetchGrades();
  }, []);

  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(steps.length - 1);
    }
  }, [currentStep, steps.length]);

  useEffect(() => {
    if (formData.isSpecialNeeds && formData.dob) {
        const lvl = determineSpecialNeedsLevel(formData.dob);
        setAutoLevel(lvl);
    }
  }, [formData.dob, formData.isSpecialNeeds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear error for this field as user types
    if (errors[name]) {
        const newErrors = { ...errors };
        delete newErrors[name];
        setErrors(newErrors);
        setStepError(null);
    }
  };

  const handleCustomSelect = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        const newErrors = { ...errors };
        delete newErrors[name];
        setErrors(newErrors);
        setStepError(null);
    }
  };

  const clearFieldError = (name: string) => {
    if (!errors[name]) return;
    const newErrors = { ...errors };
    delete newErrors[name];
    setErrors(newErrors);
    setStepError(null);
  };

  const updateHostelField = (name: keyof HostelApplicationDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      hostelApplication: {
        ...prev.hostelApplication,
        [name]: value,
      },
    }));
    clearFieldError(`hostelApplication.${String(name)}`);
  };

  const updateHostelMilestone = (name: keyof NonNullable<HostelApplicationDetails['milestones']>, value: string) => {
    setFormData(prev => ({
      ...prev,
      hostelApplication: {
        ...prev.hostelApplication,
        milestones: {
          ...prev.hostelApplication.milestones,
          [name]: value,
        },
      },
    }));
  };

  const toggleHostelList = (
    name: keyof Pick<
      HostelApplicationDetails,
      'medicalHistory' | 'diagnosis' | 'communicationNeeds' | 'mobilityNeeds' | 'learningSupport' | 'sensoryNeeds' | 'dailyLivingAssistance'
    >,
    value: string
  ) => {
    setFormData(prev => {
      const current = (prev.hostelApplication[name] || []) as string[];
      return {
        ...prev,
        hostelApplication: {
          ...prev.hostelApplication,
          [name]: current.includes(value) ? current.filter(item => item !== value) : [...current, value],
        },
      };
    });
  };

  const stripEmptyValues = (value: any): any => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value : undefined;
    }
    if (value && typeof value === 'object') {
      const cleaned = Object.entries(value).reduce<Record<string, any>>((acc, [key, item]) => {
        const nextValue = stripEmptyValues(item);
        if (nextValue !== undefined) acc[key] = nextValue;
        return acc;
      }, {});
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    }
    return value;
  };

  const buildHostelApplicationPayload = (): HostelApplicationDetails | undefined => {
    if (!formData.needsHostel) return undefined;
    const fallbackGuardianName = formData.hostelApplication.declarationGuardianName || formData.fatherName || formData.motherName || '';
    const recordedMedicalAid = [
      formData.medicalAidName,
      formData.medicalAidOption,
      formData.medicalAidMemberID ? `Member ID: ${formData.medicalAidMemberID}` : '',
    ].filter(Boolean).join(' - ');
    const fallbackMedicalAid = formData.hostelApplication.medicalAidInsurance || recordedMedicalAid;
    const fallbackAllergies = formData.hostelApplication.allergies || formData.medicalConditions || '';

    return stripEmptyValues({
      ...formData.hostelApplication,
      allergies: fallbackAllergies,
      medicalAidInsurance: fallbackMedicalAid,
      declarationGuardianName: fallbackGuardianName,
    }) as HostelApplicationDetails;
  };

  const validateStep = (step: ApplicationStepKey): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 'learner') {
        if (!formData.surname.trim()) newErrors.surname = "Surname is required";
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!formData.dob) newErrors.dob = "Date of birth is required";
        if (!formData.citizenship.trim()) newErrors.citizenship = "Citizenship is required";
        if (!formData.address.trim()) newErrors.address = "Address is required";
        if (!formData.isSpecialNeeds && !formData.grade) newErrors.grade = "Grade selection is required";
        if (formData.isSpecialNeeds && !formData.specialNeedsType) newErrors.specialNeedsType = "Please select the type of special needs";
    } else if (step === 'parents') {
        if (!formData.fatherName.trim()) newErrors.fatherName = "Father/Guardian name is required";
        if (!formData.fatherPhone.trim()) newErrors.fatherPhone = "Phone number is required";
        if (!formData.fatherEmail.trim()) newErrors.fatherEmail = "Email is required";
        if (!formData.emergencyName.trim()) newErrors.emergencyName = "Emergency contact name is required";
        if (!formData.emergencyRelationship.trim()) newErrors.emergencyRelationship = "Relationship is required";
        if (!formData.emergencyCell.trim()) newErrors.emergencyCell = "Cell number is required";
    } else if (step === 'history') {
        if (formData.hasPreviousSchool) {
            if (!formData.previousSchool.trim()) newErrors.previousSchool = "Please provide the previous school name";
            if (!formData.highestGrade.trim()) newErrors.highestGrade = "Highest grade is required";
        }
    } else if (step === 'medical') {
        if (formData.hasMedicalAid) {
            if (!formData.medicalAidName?.trim()) newErrors.medicalAidName = "Medical aid name is required";
            if (!formData.medicalAidMemberID?.trim()) newErrors.medicalAidMemberID = "Member ID is required";
        }
    } else if (step === 'hostel') {
        if (!formData.hostelApplication.birthTerm) newErrors['hostelApplication.birthTerm'] = "Select birth term";
        if (!formData.hostelApplication.deliveryType) newErrors['hostelApplication.deliveryType'] = "Select delivery type";
        if (!formData.hostelApplication.immunizationStatus) newErrors['hostelApplication.immunizationStatus'] = "Select immunization status";
        if (!formData.hostelApplication.previouslyStayedInHostel) newErrors['hostelApplication.previouslyStayedInHostel'] = "Select an option";
        if (!formData.hostelApplication.requires24HourAssistance) newErrors['hostelApplication.requires24HourAssistance'] = "Select an option";
        if (!formData.hostelApplication.specialDietaryRequirements) newErrors['hostelApplication.specialDietaryRequirements'] = "Select an option";
        if (formData.hostelApplication.specialDietaryRequirements === 'Yes' && !formData.hostelApplication.dietaryDetails?.trim()) {
          newErrors['hostelApplication.dietaryDetails'] = "Please specify dietary requirements";
        }
        if (!(formData.hostelApplication.declarationGuardianName || formData.fatherName || formData.motherName).trim()) {
          newErrors['hostelApplication.declarationGuardianName'] = "Guardian declaration name is required";
        }
    } else if (step === 'consent') {
        if (!formData.medicalConsent) newErrors.medicalConsent = "You must provide medical consent";
        if (!formData.agreed) newErrors.agreed = "You must agree to the terms";
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
    if (validateStep(currentStepKey)) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
          scrollToTop();
        }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      scrollToTop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStepKey)) return;

    setLoading(true);
    const payload = {
      ...formData,
      hostelApplication: buildHostelApplicationPayload(),
    };
    const success = await submitApplication(payload as any);
    if (success) {
      setSubmitted(true);
      scrollToTop();
    } else {
        setStepError("System failed to submit application. Please try again or contact support.");
    }
    setLoading(false);
  };

  const handleBirthCertificateSelect = async (file?: File | null) => {
    if (!file) return;
    const fileBase64 = await fileToDataUrl(file);
    setFormData(prev => ({
      ...prev,
      birthCertificate: {
        title: 'Birth Certificate',
        fileName: file.name,
        mimeType: file.type,
        fileBase64,
      }
    }));
  };

  const appendApplicationFiles = async (files: FileList | null, bucket: 'medicalDocuments' | 'otherDocuments') => {
    if (!files?.length) return;
    const next = await Promise.all(Array.from(files).map(async (file, index) => ({
      title: bucket === 'medicalDocuments' ? `Medical Document ${Date.now()}-${index + 1}` : file.name.replace(/\.[^.]+$/, '') || `Other Document ${Date.now()}-${index + 1}`,
      fileName: file.name,
      mimeType: file.type,
      fileBase64: await fileToDataUrl(file),
    })));
    setFormData(prev => ({ ...prev, [bucket]: [...prev[bucket], ...next] }));
  };

  const HostelTextInput = ({
    label,
    field,
    type = 'text',
    required = false,
    placeholder = '',
    value,
    onChange,
  }: {
    label: string;
    field: keyof HostelApplicationDetails;
    type?: string;
    required?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) => {
    const errorKey = `hostelApplication.${String(field)}`;
    return (
      <div className="mb-5">
        <label className="block text-gray-800 text-sm font-medium mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          value={value ?? (formData.hostelApplication[field] as string) ?? ''}
          onChange={(event) => (onChange ? onChange(event.target.value) : updateHostelField(field, event.target.value))}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none transition-colors ${
            errors[errorKey] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-emerald-500'
          }`}
        />
        {errors[errorKey] && <p className="mt-1 text-xs font-bold text-red-600">{errors[errorKey]}</p>}
      </div>
    );
  };

  const HostelTextarea = ({
    label,
    field,
    required = false,
    placeholder = '',
  }: {
    label: string;
    field: keyof HostelApplicationDetails;
    required?: boolean;
    placeholder?: string;
  }) => {
    const errorKey = `hostelApplication.${String(field)}`;
    return (
      <div className="mb-5">
        <label className="block text-gray-800 text-sm font-medium mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={(formData.hostelApplication[field] as string) || ''}
          onChange={(event) => updateHostelField(field, event.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none transition-colors ${
            errors[errorKey] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-emerald-500'
          }`}
        />
        {errors[errorKey] && <p className="mt-1 text-xs font-bold text-red-600">{errors[errorKey]}</p>}
      </div>
    );
  };

  const HostelChoiceGroup = ({
    label,
    field,
    options,
    required = false,
  }: {
    label: string;
    field: keyof HostelApplicationDetails;
    options: string[];
    required?: boolean;
  }) => {
    const errorKey = `hostelApplication.${String(field)}`;
    const currentValue = (formData.hostelApplication[field] as string) || '';
    return (
      <div className="mb-5">
        <p className="block text-gray-800 text-sm font-medium mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map(option => (
            <button
              type="button"
              key={option}
              onClick={() => updateHostelField(field, option)}
              className={`rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                currentValue === option
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {errors[errorKey] && <p className="mt-1 text-xs font-bold text-red-600">{errors[errorKey]}</p>}
      </div>
    );
  };

  const HostelCheckboxGrid = ({
    label,
    field,
    options,
  }: {
    label: string;
    field: keyof Pick<
      HostelApplicationDetails,
      'medicalHistory' | 'diagnosis' | 'communicationNeeds' | 'mobilityNeeds' | 'learningSupport' | 'sensoryNeeds' | 'dailyLivingAssistance'
    >;
    options: string[];
  }) => {
    const selected = (formData.hostelApplication[field] || []) as string[];
    return (
      <div className="mb-5">
        <p className="block text-gray-800 text-sm font-medium mb-2">{label}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map(option => (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm font-bold transition-colors ${
                selected.includes(option)
                  ? 'border-teal-400 bg-teal-50 text-teal-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-teal-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleHostelList(field, option)}
                className="h-4 w-4 accent-teal-600"
              />
              {option}
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
        <div className="bg-white p-8 rounded-lg max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Sent!</h2>
          <p className="text-sm text-gray-600 mb-6">
            We have received your details. Our admissions team will be in touch shortly.
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

      {/* Header */}
      <div className="sticky top-0 bg-white z-40 border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="px-5 py-3 flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-coha-900">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-sm font-bold text-gray-600">Online Application</h1>
          </div>
          
          {/* Stepper */}
          <div className="px-5 pb-3 pt-1">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-coha-500 -z-10 transform -translate-y-1/2 transition-all duration-300"
                style={{ width: `${steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0}%` }}
              ></div>

              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div key={step.key} className="flex flex-col items-center bg-white px-1">
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
              <span className="text-xs font-bold text-coha-900 uppercase tracking-wide">{currentStepConfig.label}</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 pt-8 max-w-5xl mx-auto">
        
        {/* Step 1: Learner */}
        {currentStepKey === 'learner' && (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <FormInput name="surname" label="Surname" value={formData.surname} onChange={handleChange} required error={errors.surname} />
                <FormInput name="firstName" label="First Name" value={formData.firstName} onChange={handleChange} required error={errors.firstName} />
                <FormInput name="dob" label="Date of Birth" type="date" value={formData.dob} onChange={handleChange} required error={errors.dob} />
                
                <CustomSelect 
                  label="Gender"
                  value={formData.gender}
                  options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
                  onChange={(val) => handleCustomSelect('gender', val)}
                />

                <FormInput name="citizenship" label="Citizenship" value={formData.citizenship} onChange={handleChange} required error={errors.citizenship} />
            </div>

            <div>
                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-coha-300 transition-colors">
                    <input 
                      type="checkbox" 
                      name="isSpecialNeeds" 
                      checked={formData.isSpecialNeeds} 
                      onChange={handleChange}
                      className="mt-1 w-5 h-5 accent-coha-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800 text-sm">Special Needs Division</span>
                      <p className="text-xs text-gray-500 mt-1">Select this if the learner requires Special Needs education.</p>
                    </div>
                  </label>
                </div>

                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:border-emerald-400 transition-colors">
                    <input
                      type="checkbox"
                      name="needsHostel"
                      checked={formData.needsHostel}
                      onChange={handleChange}
                      className="mt-1 w-5 h-5 accent-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-gray-900 text-sm">Hostel Care & Accommodation</span>
                      <p className="text-xs text-gray-600 mt-1">Select this if you want your child to apply for hostel care.</p>
                    </div>
                  </label>
                  {formData.needsHostel && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">
                      At the end of this application you will complete the hostel care form. Details already entered here will be reused.
                    </div>
                  )}
                </div>

                {formData.isSpecialNeeds ? (
                  <div className="animate-fade-in p-4 bg-blue-50 border-l-4 border-blue-500 mb-6">
                    <h4 className="font-bold text-blue-900 mb-2">Automated Level Assignment</h4>
                    {formData.dob ? (
                         <p className="text-sm text-blue-800">Assigned level: <span className="font-bold text-lg block mt-1">{autoLevel}</span></p>
                    ) : (
                         <p className="text-sm text-blue-600 italic">Enter Date of Birth to see level.</p>
                    )}
                    
                    <div className="mt-4">
                        <CustomSelect 
                        label="Type of Special Needs"
                        value={formData.specialNeedsType}
                        error={errors.specialNeedsType}
                        options={[
                            { label: 'Intellectual/Learning Difficulties', value: 'Intellectual/Learning Difficulties' },
                            { label: 'Down Syndrome', value: 'Down Syndrome' },
                            { label: 'Autism', value: 'Autism' },
                            { label: 'Other', value: 'Other' }
                        ]}
                        onChange={(val) => handleCustomSelect('specialNeedsType', val)}
                        required
                        />
                    </div>
                  </div>
                ) : (
                    <div className="animate-fade-in">
                        <CustomSelect 
                        label="Mainstream Grade"
                        value={formData.grade}
                        error={errors.grade}
                        options={gradesList.map(g => ({ label: g, value: g }))}
                        onChange={(val) => handleCustomSelect('grade', val)}
                        required
                        />
                    </div>
                )}

                <FormInput name="address" label="Residential Address" value={formData.address} onChange={handleChange} required error={errors.address} />
            </div>
          </div>
        )}

        {/* Step 2: Parents */}
        {currentStepKey === 'parents' && (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Parent / Guardian Details</h3>
                <FormInput name="fatherName" label="Father/Guardian Name" value={formData.fatherName} onChange={handleChange} required error={errors.fatherName} />
                <FormInput name="fatherPhone" label="Phone Number" type="tel" value={formData.fatherPhone} onChange={handleChange} required error={errors.fatherPhone} />
                <FormInput name="fatherEmail" label="Email Address" type="email" value={formData.fatherEmail} onChange={handleChange} required error={errors.fatherEmail} />
                <div className="w-full h-px bg-gray-200 my-8"></div>
                <FormInput name="motherName" label="Mother/Guardian Name" value={formData.motherName} onChange={handleChange} />
                <FormInput name="motherPhone" label="Phone Number" type="tel" value={formData.motherPhone} onChange={handleChange} />
                <FormInput name="motherEmail" label="Email Address" type="email" value={formData.motherEmail} onChange={handleChange} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Emergency Contact</h3>
                <div className="bg-red-50 p-4 border-l-4 border-red-400 mb-6 rounded-r-lg">
                  <p className="text-xs text-red-800">Provide a contact other than the parents.</p>
                </div>
                <FormInput name="emergencyName" label="Full Name" value={formData.emergencyName} onChange={handleChange} required error={errors.emergencyName} />
                <FormInput name="emergencyRelationship" label="Relationship" value={formData.emergencyRelationship} onChange={handleChange} required error={errors.emergencyRelationship} />
                <FormInput name="emergencyCell" label="Cell Number" type="tel" value={formData.emergencyCell} onChange={handleChange} required error={errors.emergencyCell} />
                <FormInput name="emergencyWork" label="Work Contact" value={formData.emergencyWork} onChange={handleChange} />
                <FormInput name="emergencyEmail" label="Email Address" type="email" value={formData.emergencyEmail} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* Step 3: History */}
        {currentStepKey === 'history' && (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-6">Educational History</h3>
                 <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="hasPreviousSchool" 
                      checked={!formData.hasPreviousSchool} 
                      onChange={(e) => setFormData({...formData, hasPreviousSchool: !e.target.checked})}
                      className="w-5 h-5 accent-coha-500"
                    />
                    <span className="text-sm text-gray-700">First time attender (No previous school)</span>
                  </label>
                </div>
                {formData.hasPreviousSchool && (
                  <div className="pl-4 border-l-2 border-gray-200 mb-8">
                    <FormInput name="previousSchool" label="Previous School Name" value={formData.previousSchool} onChange={handleChange} required error={errors.previousSchool} />
                    <FormInput name="highestGrade" label="Highest Grade Completed" value={formData.highestGrade} onChange={handleChange} required error={errors.highestGrade} />
                  </div>
                )}
             </div>
             <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Language Proficiency</h3>
                <div className="mb-6">
                  <label className="block text-gray-800 text-sm font-medium mb-2">English Proficiency</label>
                  <div className="flex gap-4">
                    {['Good', 'Fair', 'Poor'].map(rating => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        <input 
                          type="radio" 
                          name="langEnglish" 
                          value={rating} 
                          checked={formData.langEnglish === rating} 
                          onChange={handleChange}
                          className="accent-coha-500" 
                        />
                        <span className="text-sm">{rating}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <FormInput name="langOther1Name" label="Other Language (Optional)" value={formData.langOther1Name} onChange={handleChange} />
             </div>
          </div>
        )}

        {/* Step 4: Medical */}
        {currentStepKey === 'medical' && (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-6">Medical Information</h3>
                 <div className="mb-6">
                    <label className="block text-gray-800 text-sm font-medium mb-2">Known Medical Conditions / Allergies</label>
                    <textarea 
                      name="medicalConditions" 
                      value={formData.medicalConditions} 
                      onChange={handleChange}
                      className="w-full p-3 border-b-2 border-gray-300 focus:border-coha-500 outline-none bg-gray-50 h-24 text-sm"
                      placeholder="List any conditions here..."
                    />
                 </div>
                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Professionals (If Applicable)</h4>
                    <FormInput name="doctorName" label="Family Doctor Name" value={formData.doctorName} onChange={handleChange} className="bg-white" />
                    <FormInput name="doctorContact" label="Doctor Contact" value={formData.doctorContact} onChange={handleChange} className="bg-white" />
                    <FormInput name="therapistName" label="Occupational Therapist" value={formData.therapistName} onChange={handleChange} className="bg-white" />
                 </div>
             </div>
             <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Medical Aid Details</h3>
                 <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input 
                      type="checkbox" 
                      name="hasMedicalAid" 
                      checked={formData.hasMedicalAid} 
                      onChange={handleChange}
                      className="w-5 h-5 accent-coha-500"
                    />
                    <span className="font-bold text-gray-800 text-sm">Learner has Medical Aid</span>
                  </label>
                  {formData.hasMedicalAid && (
                    <div className="pl-4 border-l-2 border-coha-500 animate-fade-in">
                       <FormInput name="medicalAidName" label="Medical Aid Name" value={formData.medicalAidName} onChange={handleChange} required error={errors.medicalAidName} />
                       <FormInput name="medicalAidOption" label="Plan Option" value={formData.medicalAidOption} onChange={handleChange} />
                       <FormInput name="medicalAidMemberID" label="Member ID" value={formData.medicalAidMemberID} onChange={handleChange} required error={errors.medicalAidMemberID} />
                    </div>
                  )}
                 </div>
             </div>
          </div>
        )}

        {/* Step 5: Consent */}
        {currentStepKey === 'documents' && (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-6">Birth Certificate</h3>
                 <label className="block cursor-pointer rounded-xl border-2 border-dashed border-coha-300 bg-coha-50/40 p-5 text-center">
                    <span className="block text-sm font-bold text-coha-900">Tap to upload birth certificate</span>
                    <span className="mt-2 block text-xs text-gray-500">PDF or image</span>
                    <input type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => handleBirthCertificateSelect(e.target.files?.[0] || null)} />
                 </label>
                 {formData.birthCertificate && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                      <p className="text-sm font-bold text-gray-900">{formData.birthCertificate.fileName}</p>
                    </div>
                 )}
             </div>
             <div>
                 <div className="flex items-center justify-between gap-3 mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Medical Documents</h3>
                    <label className="text-sm font-bold text-coha-700 cursor-pointer">
                      Add more
                      <input type="file" multiple accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => appendApplicationFiles(e.target.files, 'medicalDocuments')} />
                    </label>
                 </div>
                 <div className="space-y-3">
                    {formData.medicalDocuments.length === 0 && <p className="text-sm text-gray-500">Optional.</p>}
                    {formData.medicalDocuments.map((item, index) => (
                      <div key={`${item.fileName}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-sm font-bold text-gray-900">{item.fileName}</p>
                      </div>
                    ))}
                 </div>
             </div>
             <div>
                 <div className="flex items-center justify-between gap-3 mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Other Documents</h3>
                    <label className="text-sm font-bold text-coha-700 cursor-pointer">
                      Add more
                      <input type="file" multiple accept="image/*,.pdf,application/pdf" className="hidden" onChange={(e) => appendApplicationFiles(e.target.files, 'otherDocuments')} />
                    </label>
                 </div>
                 <div className="space-y-3">
                    {formData.otherDocuments.length === 0 && <p className="text-sm text-gray-500">Optional.</p>}
                    {formData.otherDocuments.map((item, index) => (
                      <div key={`${item.fileName}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-sm font-bold text-gray-900">{item.fileName}</p>
                      </div>
                    ))}
                 </div>
             </div>
          </div>
        )}

        {/* Hostel Care Form */}
        {currentStepKey === 'hostel' && (
          <div className="animate-fade-in space-y-8">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Hostel Application Form</p>
              <h3 className="mt-2 text-2xl font-black text-gray-900">Hostel Care & Accommodation</h3>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-gray-700">
                We will reuse the learner, grade, parent, emergency, address, and medical aid details you already entered. Complete only the hostel care information below.
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg bg-white p-3 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Learner</p>
                  <p className="font-bold text-gray-900">{formData.firstName} {formData.surname}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Class Applying For</p>
                  <p className="font-bold text-gray-900">{formData.isSpecialNeeds ? autoLevel || 'Special Needs' : formData.grade || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Guardian</p>
                  <p className="font-bold text-gray-900">{formData.fatherName || formData.motherName || '-'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <section className="rounded-lg border border-gray-200 bg-sky-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-700">A & B</p>
                <h4 className="mt-1 mb-5 text-lg font-black text-gray-900">Birth & Development</h4>
                <HostelTextInput label="Home Language" field="homeLanguage" placeholder="Language spoken most at home" />
                <HostelChoiceGroup label="Born" field="birthTerm" options={['Full term', 'Premature', 'Post-term']} required />
                <HostelChoiceGroup label="Delivery" field="deliveryType" options={['Normal', 'Caesarean', 'Assisted']} required />
                <HostelTextInput label="Birth Weight (kg)" field="birthWeightKg" placeholder="e.g. 3.2" />
                <HostelTextarea label="Complications at Birth" field="birthComplications" placeholder="Write none if there were no complications." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <HostelTextInput label="Sat Alone" field="milestones" value={formData.hostelApplication.milestones?.satAlone || ''} onChange={(value) => updateHostelMilestone('satAlone', value)} placeholder="Age or notes" />
                  <HostelTextInput label="Walked Alone" field="milestones" value={formData.hostelApplication.milestones?.walkedAlone || ''} onChange={(value) => updateHostelMilestone('walkedAlone', value)} placeholder="Age or notes" />
                  <HostelTextInput label="Spoke First Words" field="milestones" value={formData.hostelApplication.milestones?.firstWords || ''} onChange={(value) => updateHostelMilestone('firstWords', value)} placeholder="Age or notes" />
                  <HostelTextInput label="Toilet Trained" field="milestones" value={formData.hostelApplication.milestones?.toiletTrained || ''} onChange={(value) => updateHostelMilestone('toiletTrained', value)} placeholder="Age or notes" />
                </div>
                <HostelCheckboxGrid label="Health history" field="medicalHistory" options={medicalHistoryOptions} />
              </section>

              <section className="rounded-lg border border-gray-200 bg-rose-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-700">C</p>
                <h4 className="mt-1 mb-5 text-lg font-black text-gray-900">Medical & Special Needs</h4>
                <HostelCheckboxGrid label="Diagnosis / condition" field="diagnosis" options={diagnosisOptions} />
                {(formData.hostelApplication.diagnosis || []).includes('Other') && (
                  <HostelTextInput label="Other Diagnosis" field="diagnosisOther" placeholder="Specify other diagnosis" />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <HostelTextInput label="Date of Diagnosis" field="diagnosisDate" type="date" />
                  <HostelTextInput label="Diagnosed By" field="diagnosedBy" placeholder="Doctor / specialist" />
                </div>
                <HostelTextarea label="Medication Currently Taken" field="medicationCurrentlyTaken" placeholder="Medicine name, dosage, and schedule" />
                <HostelChoiceGroup label="Seizure History" field="seizureHistory" options={['Yes', 'No']} />
                {formData.hostelApplication.seizureHistory === 'Yes' && (
                  <HostelTextarea label="Seizure Type / Frequency" field="seizureDetails" placeholder="Describe type and frequency" />
                )}
                {formData.medicalConditions.trim() ? (
                  <div className="mb-5 rounded-lg border border-rose-100 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Allergies / Medical Conditions Already Captured</p>
                    <p className="mt-2 text-sm font-bold text-gray-900">{formData.medicalConditions}</p>
                  </div>
                ) : (
                  <HostelTextarea label="Allergies" field="allergies" placeholder="Food, medication, or environmental allergies" />
                )}
                <HostelChoiceGroup label="Immunization Status" field="immunizationStatus" options={['Up to Date', 'Not up to date']} required />
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <section className="rounded-lg border border-gray-200 bg-amber-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">D</p>
                <h4 className="mt-1 mb-5 text-lg font-black text-gray-900">Support Required</h4>
                <HostelCheckboxGrid label="Communication needs" field="communicationNeeds" options={communicationOptions} />
                <HostelCheckboxGrid label="Mobility" field="mobilityNeeds" options={mobilityOptions} />
                <HostelCheckboxGrid label="Learning support required" field="learningSupport" options={learningSupportOptions} />
                <HostelCheckboxGrid label="Sensory needs" field="sensoryNeeds" options={sensoryOptions} />
                {(formData.hostelApplication.sensoryNeeds || []).includes('Other') && (
                  <HostelTextInput label="Other Sensory Needs" field="sensoryOther" placeholder="Specify sensory need" />
                )}
                <HostelCheckboxGrid label="Assistance with daily living" field="dailyLivingAssistance" options={dailyLivingOptions} />
              </section>

              <section className="rounded-lg border border-gray-200 bg-teal-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">E, F & G</p>
                <h4 className="mt-1 mb-5 text-lg font-black text-gray-900">Guardian, Emergency & Hostel Details</h4>
                <div className="mb-5 rounded-lg border border-teal-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Already Captured</p>
                  <p className="mt-2 text-sm font-bold text-gray-900">Residential address: {formData.address || '-'}</p>
                  <p className="text-sm font-bold text-gray-900">Emergency contact: {formData.emergencyName || '-'} {formData.emergencyCell ? `(${formData.emergencyCell})` : ''}</p>
                  <p className="text-sm font-bold text-gray-900">Medical aid: {formData.hasMedicalAid ? formData.medicalAidName || 'Yes' : 'No'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <HostelTextInput label="Guardian 1 Relationship" field="guardian1Relationship" placeholder="e.g. Father" />
                  <HostelTextInput label="Guardian 1 ID / Passport" field="guardian1IdPassport" />
                  <HostelTextInput label="Guardian 2 Relationship" field="guardian2Relationship" placeholder="e.g. Mother" />
                  <HostelTextInput label="Guardian 2 ID / Passport" field="guardian2IdPassport" />
                </div>
                <HostelTextInput label="Alternative Emergency Number" field="emergencyAlternativeNumber" />
                <HostelTextInput label="Preferred Hospital / Clinic" field="preferredHospitalClinic" />
                {!formData.hasMedicalAid && (
                  <HostelTextInput label="Medical Aid / Insurance" field="medicalAidInsurance" placeholder="Name and member details if available" />
                )}
                <HostelChoiceGroup label="Previously Stayed in Hostel" field="previouslyStayedInHostel" options={['Yes', 'No']} required />
                <HostelChoiceGroup label="Requires 24-Hour Assistance" field="requires24HourAssistance" options={['Yes', 'No']} required />
                <HostelChoiceGroup label="Special Dietary Requirements" field="specialDietaryRequirements" options={['Yes', 'No']} required />
                {formData.hostelApplication.specialDietaryRequirements === 'Yes' && (
                  <HostelTextarea label="Dietary Details" field="dietaryDetails" required placeholder="Include prescribed diet details where applicable." />
                )}
                <HostelTextInput
                  label="Declaration Guardian Name"
                  field="declarationGuardianName"
                  value={formData.hostelApplication.declarationGuardianName || formData.fatherName || formData.motherName || ''}
                  onChange={(value) => updateHostelField('declarationGuardianName', value)}
                  required
                />
              </section>
            </div>
          </div>
        )}

        {/* Step 6: Consent */}
        {currentStepKey === 'consent' && (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-6">Consent & Declaration</h3>
                 <div className={`p-5 rounded-lg border-l-4 mb-6 transition-all duration-300 ${errors.medicalConsent ? 'bg-red-50 border-red-600' : 'bg-red-50 border-red-500'}`}>
                    <h4 className="font-bold text-red-800 mb-2">Medical Emergency Consent</h4>
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      In a critical situation, the school reserves the right to utilise medical services if parents cannot be reached.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                       <input 
                          type="checkbox" 
                          name="medicalConsent" 
                          checked={formData.medicalConsent} 
                          onChange={handleChange}
                          className="mt-1 w-6 h-6 accent-red-600"
                        />
                       <span className="text-sm font-bold text-red-900">
                         I agree that emergency treatment may be provided.
                       </span>
                    </label>
                    {errors.medicalConsent && <p className="text-red-700 text-xs mt-2 font-bold uppercase">{errors.medicalConsent}</p>}
                 </div>
             </div>
             <div>
                 <h3 className="text-lg font-bold text-gray-900 mb-6 lg:mt-0 mt-8">Terms & Conditions</h3>
                 <div className={`p-5 rounded-lg border-l-4 mb-8 transition-all duration-300 ${errors.agreed ? 'bg-red-50 border-red-600' : 'bg-gray-50 border-gray-400'}`}>
                    <h4 className="font-bold text-gray-900 mb-4">Declaration</h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-6">
                      <li>I accept school fees and curriculum policies.</li>
                      <li>Fees are paid in advance.</li>
                    </ul>
                    <label className="flex items-start gap-3 cursor-pointer">
                       <input 
                          type="checkbox" 
                          name="agreed" 
                          checked={formData.agreed} 
                          onChange={handleChange}
                          className="mt-1 w-6 h-6 accent-coha-900"
                        />
                       <span className="text-sm font-bold text-gray-900">
                         I declare that information is true and accept terms.
                       </span>
                    </label>
                    {errors.agreed && <p className="text-red-700 text-xs mt-2 font-bold uppercase">{errors.agreed}</p>}
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
                className={`flex-1 ${currentStep === 0 ? 'invisible' : ''}`}
              >
                Back
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={handleNext} className="flex-1 bg-coha-500 hover:bg-coha-600 border-none rounded-lg">
                  Next <ArrowRight size={18} />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={loading}
                  className={`flex-1 rounded-lg border-none text-white ${shakeError ? 'animate-shake bg-red-600' : 'bg-coha-900'}`}
                >
                  {loading ? 'Sending...' : 'Submit Application'}
                </Button>
              )}
           </div>
        </div>

      </form>
    </div>
  );
};
