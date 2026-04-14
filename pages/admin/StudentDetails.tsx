import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  deleteStudent,
  getAssessmentRecordsForStudentAcrossClasses,
  getReceipts,
  getStudentById,
  getStudentDocuments,
  getSystemSettings,
  updateStudent,
} from '../../services/dataService';
import { Student, SystemSettings, Receipt, TermAssessmentRecord, PRE_PRIMARY_AREAS, UploadedDocument } from '../../types';
import { Loader } from '../../components/ui/Loader';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Heart,
  ImagePlus,
  Key,
  LayoutDashboard,
  Printer,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Toast } from '../../components/ui/Toast';
import { printStudentProfile } from '../../utils/printStudentProfile';
import { printGrade0Report } from '../../utils/printGrade0Report';
import { Grade1To7ReportCard, getGrade1To7ReportCards, printGrade1To7Report } from '../../utils/printGrade1To7Report';

const calculateAge = (dobString: string): string => {
  if (!dobString) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return `${age} years old`;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getInitialLetter = (name?: string) => (name?.trim()?.charAt(0) || 'S').toUpperCase();

export const StudentDetailsPage: React.FC<{ user?: any }> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [assessmentRecords, setAssessmentRecords] = useState<TermAssessmentRecord[]>([]);
  const [gradeReports, setGradeReports] = useState<Grade1To7ReportCard[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'PARENTS' | 'FINANCE' | 'ASSESSMENTS' | 'DOCUMENTS'>('PERSONAL');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; variant: 'success' | 'error' | 'info' }>({
    show: false,
    msg: '',
    variant: 'success',
  });
  const [reportLoadingMap, setReportLoadingMap] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState('');
  const canViewAssessments = user?.adminRole !== 'sub_admin';

  const fetchData = async () => {
    if (!id) return;
    setPageLoading(true);
    const [studentData, settingsData, receiptData, documentData] = await Promise.all([
      getStudentById(id),
      getSystemSettings(),
      getReceipts(),
      getStudentDocuments(id),
    ]);

    setStudent(studentData);
    setSettings(settingsData);
    setReceipts(receiptData.filter((receipt) => receipt.usedByStudentId === id));
    setDocuments(documentData);

    if (studentData && canViewAssessments) {
      const [reports, records] = await Promise.all([
        getGrade1To7ReportCards(studentData, settingsData),
        getAssessmentRecordsForStudentAcrossClasses(id),
      ]);
      setGradeReports(reports);
      setAssessmentRecords(records);
    } else {
      setGradeReports([]);
      setAssessmentRecords([]);
    }

    if (studentData) {
      setEditForm(studentData);
      setProfilePreview(studentData.profileImageBase64 || '');
    }

    setPageLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id, canViewAssessments]);

  const financials = useMemo(() => {
    if (!student || !settings) return { total: 0, paid: 0, balance: 0 };

    let yearlyFees = 0;
    settings.fees.forEach((fee) => {
      const amount = parseFloat(fee.amount) || 0;
      let multiplier = 1;
      if (fee.frequency === 'Monthly') multiplier = 12;
      else if (fee.frequency === 'Termly') multiplier = 3;
      yearlyFees += amount * multiplier;
    });

    const paidTotal = receipts
      .filter((receipt) => receipt.paymentCategory !== 'OTHER')
      .reduce((acc, receipt) => acc + (parseFloat(receipt.amount) || 0), 0);
    return {
      total: yearlyFees,
      paid: paidTotal,
      balance: yearlyFees - paidTotal,
    };
  }, [student, settings, receipts]);

  const className = student?.assignedClass || student?.grade || student?.level || '';
  const isGrade1To7Student = /Grade [1-7]/i.test(className);
  const showAssessmentTab = canViewAssessments && student ? (student.grade === 'Grade 0' || isGrade1To7Student || gradeReports.length > 0 || assessmentRecords.length > 0) : false;

  if (pageLoading || !student) return <Loader />;

  const statusDisplay = student.studentStatus === 'ENROLLED'
    ? `${student.grade || student.level}${student.stage ? ` - Stage ${student.stage}` : ''}`
    : student.studentStatus;

  const profileImage = profilePreview || editForm.profileImageBase64 || student.profileImageBase64 || '';

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</p>
      <p className="text-gray-900 font-bold">{value || '-'}</p>
    </div>
  );

  const EditableField = ({
    label,
    field,
    value,
    type = 'text',
    options,
    placeholder,
  }: {
    label: string;
    field: keyof Student;
    value: any;
    type?: 'text' | 'date' | 'select' | 'textarea';
    options?: string[];
    placeholder?: string;
  }) => (
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</p>
      {isEditing ? (
        type === 'select' ? (
          <select
            value={(editForm[field] as string) || ''}
            onChange={(event) => setEditForm((prev) => ({ ...prev, [field]: event.target.value }))}
            className="w-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-coha-600"
          >
            <option value="">Select</option>
            {(options || []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={(editForm[field] as string) || ''}
            onChange={(event) => setEditForm((prev) => ({ ...prev, [field]: event.target.value }))}
            placeholder={placeholder}
            rows={3}
            className="w-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-coha-600"
          />
        ) : (
          <input
            type={type}
            value={(editForm[field] as string) || ''}
            onChange={(event) => setEditForm((prev) => ({ ...prev, [field]: event.target.value }))}
            placeholder={placeholder}
            className="w-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-coha-600"
          />
        )
      ) : (
        <p className="text-gray-900 font-bold">{value || '-'}</p>
      )}
    </div>
  );

  const handleDownloadReport = async (record: TermAssessmentRecord | Grade1To7ReportCard) => {
    const reportKey = `${'recordedClass' in record ? record.recordedClass : record.grade}__${record.termId}`;
    if (!record.isComplete || reportLoadingMap[reportKey]) return;

    setReportLoadingMap((prev) => ({ ...prev, [reportKey]: true }));
    try {
      if ('subjectCount' in record) {
        await printGrade1To7Report(student, record.termId, 'Admin', record.recordedClass);
      } else {
        const termName = settings?.schoolCalendars?.find((calendar) => calendar.id === record.termId)?.termName || record.termId;
        const year = new Date().getFullYear().toString();
        await printGrade0Report(student, record as TermAssessmentRecord, termName, year, 'Admin');
      }
    } finally {
      setReportLoadingMap((prev) => ({ ...prev, [reportKey]: false }));
    }
  };

  const handleProfileFileChange = async (file?: File | null) => {
    if (!file) return;
    setProfileFile(file);
    const preview = await fileToDataUrl(file);
    setProfilePreview(preview);
  };

  const handleSaveStudent = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const payload: Partial<Student> = {
        name: editForm.name || '',
        dob: editForm.dob || '',
        citizenship: editForm.citizenship || '',
        address: editForm.address || '',
        division: editForm.division || student.division,
        grade: editForm.grade || '',
        assignedClass: editForm.assignedClass || '',
        parentName: editForm.parentName || '',
        fatherName: editForm.fatherName || '',
        fatherPhone: editForm.fatherPhone || '',
        motherName: editForm.motherName || '',
        motherPhone: editForm.motherPhone || '',
      };

      if (editForm.gender) {
        payload.gender = editForm.gender;
      }

      if (profileFile) {
        payload.profileImageBase64 = await fileToDataUrl(profileFile);
      }

      const success = await updateStudent(student.id, payload);
      if (!success) {
        setToast({ show: true, msg: 'Failed to update student information.', variant: 'error' });
        return;
      }

      if (payload.profileImageBase64) {
        const imageUpdate = {
          studentId: student.id,
          profileImageBase64: payload.profileImageBase64,
          updatedAt: Date.now(),
        };
        localStorage.setItem('coha_student_profile_image_update', JSON.stringify(imageUpdate));
        window.dispatchEvent(new CustomEvent('coha-student-profile-image-update', { detail: imageUpdate }));
      }

      setToast({ show: true, msg: 'Student information updated.', variant: 'success' });
      setIsEditing(false);
      setProfileFile(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to save student changes:', error);
      setToast({ show: true, msg: 'Could not save student changes.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderAssessmentSection = () => {
    if (gradeReports.length > 0) {
      const prePrimaryRecords = assessmentRecords.filter((record) => /Grade 0/i.test(record.recordedClass || record.grade || ''));
      if (gradeReports.length === 0) {
        return (
          <div className="text-center py-12 text-gray-400 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-gray-200">
            No assessment reports found for this student.
          </div>
        );
      }

      return (
        <div className="space-y-8">
          <div>
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Mainstream Reports</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gradeReports.map((record) => {
                const reportKey = `${record.recordedClass}__${record.termId}`;
                const isReportLoading = reportLoadingMap[reportKey] === true;
                return (
                  <div key={reportKey} className="border-2 border-gray-200 p-6 hover:border-coha-900 transition-colors flex flex-col justify-between h-full bg-gray-50">
                    <div>
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <div>
                          <h4 className="font-black text-xl uppercase tracking-tighter">{record.termName}</h4>
                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">{record.recordedClass}</p>
                        </div>
                        {record.isComplete ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle size={10} /> Ready
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                        Last Updated: {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '-'}
                      </p>
                      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Subjects Recorded</p>
                        <p className="mt-2 text-3xl font-black text-coha-900">{record.subjectCount}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadReport(record)}
                      disabled={!record.isComplete || isReportLoading}
                      className={`mt-6 w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                        ${record.isComplete ? 'bg-coha-900 text-white hover:bg-coha-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        ${isReportLoading ? 'opacity-80 cursor-wait' : ''}
                      `}
                    >
                      {isReportLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download size={14} /> Download Report
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {prePrimaryRecords.length > 0 && (
            <div>
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Pre-Primary Reports</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {prePrimaryRecords.map((record) => {
                  const reportKey = `${record.recordedClass || record.grade}__${record.termId}`;
                  const isReportLoading = reportLoadingMap[reportKey] === true;
                  return (
                    <div key={reportKey} className="border-2 border-gray-200 p-6 hover:border-coha-900 transition-colors flex flex-col justify-between h-full bg-gray-50">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-black text-xl uppercase tracking-tighter">{record.termId}</h4>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">{record.recordedClass || record.grade}</p>
                          </div>
                          {record.isComplete ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle size={10} /> Complete
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                          Last Updated: {new Date(record.updatedAt).toLocaleDateString()}
                        </p>

                        <div className="space-y-3 mb-6">
                          {PRE_PRIMARY_AREAS.map((area) => {
                            const areaRatings = area.components.map((component) => record.ratings[component.id]).filter(Boolean);
                            const rated = areaRatings.length;
                            let currentScore = 0;
                            areaRatings.forEach((rating) => {
                              if (rating === 'FM') currentScore += 2;
                              else if (rating === 'AM') currentScore += 1;
                            });
                            const maxScore = rated * 2;
                            const progress = maxScore === 0 ? 0 : Math.round((currentScore / maxScore) * 100);
                            return (
                              <div key={area.id}>
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                                  <span className="text-gray-600 truncate mr-2">{area.name}</span>
                                  <span className="text-coha-900 shrink-0">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 overflow-hidden">
                                  <div className={`h-full ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadReport(record)}
                        disabled={!record.isComplete || isReportLoading}
                        className={`w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                          ${record.isComplete ? 'bg-coha-900 text-white hover:bg-coha-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                          ${isReportLoading ? 'opacity-80 cursor-wait' : ''}
                        `}
                      >
                        {isReportLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download size={14} /> Download Report
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (assessmentRecords.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-gray-200">
          No assessment records found for this student.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assessmentRecords.map((record) => {
          const reportKey = `${record.recordedClass || record.grade}__${record.termId}`;
          const isReportLoading = reportLoadingMap[reportKey] === true;
          return (
            <div key={reportKey} className="border-2 border-gray-200 p-6 hover:border-coha-900 transition-colors flex flex-col justify-between h-full bg-gray-50">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-black text-xl uppercase tracking-tighter">{record.termId}</h4>
                  {record.isComplete ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle size={10} /> Complete
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 mb-3">{record.recordedClass || record.grade}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                  Last Updated: {new Date(record.updatedAt).toLocaleDateString()}
                </p>

                <div className="space-y-3 mb-6">
                  {PRE_PRIMARY_AREAS.map((area) => {
                    const areaRatings = area.components.map((component) => record.ratings[component.id]).filter(Boolean);
                    const rated = areaRatings.length;
                    let currentScore = 0;
                    areaRatings.forEach((rating) => {
                      if (rating === 'FM') currentScore += 2;
                      else if (rating === 'AM') currentScore += 1;
                    });
                    const maxScore = rated * 2;
                    const progress = maxScore === 0 ? 0 : Math.round((currentScore / maxScore) * 100);
                    return (
                      <div key={area.id}>
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                          <span className="text-gray-600 truncate mr-2">{area.name}</span>
                          <span className="text-coha-900 shrink-0">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 overflow-hidden">
                          <div className={`h-full ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => handleDownloadReport(record)}
                disabled={!record.isComplete || isReportLoading}
                className={`w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                  ${record.isComplete ? 'bg-coha-900 text-white hover:bg-coha-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                  ${isReportLoading ? 'opacity-80 cursor-wait' : ''}
                `}
              >
                {isReportLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Download Report
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="-m-5 pb-20 font-sans text-black bg-gray-50 min-h-[calc(100vh-64px)]">
      <Toast
        message={toast.msg}
        isVisible={toast.show}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        variant={toast.variant}
      />
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          setLoading(true);
          await deleteStudent(student.id);
          navigate('/admin/students');
        }}
        title="Delete Student?"
        message={`Are you sure you want to remove ${student.name} from the school database?`}
        isLoading={loading}
      />

      <div className="bg-coha-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="relative z-10">
          <button onClick={() => navigate('/admin/students')} className="mb-4 p-2 hover:bg-white/10 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/20 w-fit">
            <ArrowLeft size={16} /> Back to Directory
          </button>
          <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
            <div className="flex items-center gap-4">
              {profileImage ? (
                <img src={profileImage} alt={student.name} className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/15 border-4 border-white/20 text-white text-3xl font-black flex items-center justify-center shadow-lg">
                  {getInitialLetter(student.name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-none">{student.name}</h2>
                  {student.studentStatus === 'ENROLLED' && <CheckCircle size={24} className="text-green-400" />}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold text-coha-300 uppercase tracking-widest">
                  <span>ID: <span className="text-white">{student.id}</span></span>
                  <span>{calculateAge(student.dob || '')}</span>
                  <span>{statusDisplay}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveStudent}
                    disabled={saving}
                    className="px-4 py-2 bg-white text-coha-900 font-black uppercase text-[10px] tracking-widest border border-white shadow-sm inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm(student);
                      setProfileFile(null);
                      setProfilePreview(student.profileImageBase64 || '');
                    }}
                    className="px-4 py-2 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest border border-white/20 inline-flex items-center gap-2"
                  >
                    <X size={16} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => printStudentProfile(student)}
                    className="px-4 py-2 bg-white text-coha-900 font-black uppercase text-[10px] tracking-widest border border-white shadow-sm inline-flex items-center gap-2"
                  >
                    <Printer size={16} /> Print Profile
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-white/10 text-white font-black uppercase text-[10px] tracking-widest border border-white/20 inline-flex items-center gap-2"
                  >
                    <Edit2 size={16} /> Edit Student Info
                  </button>
                </>
              )}
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest inline-flex items-center gap-2"
              >
                <Trash2 size={16} /> Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => setActiveTab('PERSONAL')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PERSONAL' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}>
          <User size={16} /> Personal Info
        </button>
        <button onClick={() => setActiveTab('PARENTS')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PARENTS' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}>
          <Heart size={16} /> Parent Info
        </button>
        <button onClick={() => setActiveTab('FINANCE')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'FINANCE' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}>
          <DollarSign size={16} /> Fees & Finance
        </button>
        <button onClick={() => setActiveTab('DOCUMENTS')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'DOCUMENTS' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}>
          <FileText size={16} /> Uploaded Documents
        </button>
        {showAssessmentTab && (
          <button onClick={() => setActiveTab('ASSESSMENTS')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ASSESSMENTS' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}>
            <FileText size={16} /> Assessment Reports
          </button>
        )}
      </div>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <div className="bg-white p-6 sm:p-8 border border-gray-200 shadow-sm animate-fade-in rounded-[20px]">
          {activeTab === 'PERSONAL' && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
              <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 h-fit">
                <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2">
                  <LayoutDashboard size={14} /> Student Profile
                </h3>
                <div className="flex flex-col items-center text-center">
                  {profileImage ? (
                    <img src={profileImage} alt={student.name} className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md" />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-coha-900 text-white text-4xl font-black flex items-center justify-center border-4 border-white shadow-md">
                      {getInitialLetter(student.name)}
                    </div>
                  )}
                  <p className="mt-4 text-lg font-black text-gray-900">{editForm.name || student.name}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">{className || '-'}</p>
                  {isEditing && (
                    <label className="mt-5 inline-flex items-center gap-2 bg-coha-900 text-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] cursor-pointer">
                      <ImagePlus size={16} /> Change Student Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleProfileFileChange(event.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2">
                    <User size={14} /> Student Details
                  </h3>
                  <EditableField label="Full Name" field="name" value={student.name} />
                  <EditableField label="Date of Birth" field="dob" value={student.dob} type="date" />
                  <EditableField label="Gender" field="gender" value={student.gender} type="select" options={['Male', 'Female', 'Other']} />
                  <EditableField label="Citizenship" field="citizenship" value={student.citizenship} />
                  <EditableField label="Residential Address" field="address" value={student.address} type="textarea" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2">
                    <Calendar size={14} /> Academic Details
                  </h3>
                  {isEditing ? (
                    <>
                      <EditableField label="Division" field="division" value={student.division} type="select" options={['Mainstream', 'Special Needs']} />
                      <EditableField label="Grade" field="grade" value={student.grade} />
                      <EditableField label="Assigned Class" field="assignedClass" value={student.assignedClass} />
                    </>
                  ) : (
                    <>
                      <DetailRow label="Division" value={student.division} />
                      <DetailRow label="Initial Grade" value={student.grade} />
                      <DetailRow label="Current Status" value={student.studentStatus} />
                      <DetailRow label="Current Assignment" value={statusDisplay} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PARENTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div>
                <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2">
                  <User size={14} /> Parent / Guardian
                </h3>
                <EditableField label="Parent / Guardian Name" field="parentName" value={student.parentName} />
                <EditableField label="Father Name" field="fatherName" value={student.fatherName} />
                <EditableField label="Father Phone" field="fatherPhone" value={student.fatherPhone} />
                <EditableField label="Mother Name" field="motherName" value={student.motherName} />
                <EditableField label="Mother Phone" field="motherPhone" value={student.motherPhone} />
              </div>
              <div className="bg-gray-50 p-6 border-l-8 border-coha-500 shadow-inner h-fit">
                <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-4 flex items-center gap-2">
                  <Key size={14} /> Parent Portal Security
                </h3>
                <p className="text-xs text-gray-500 font-bold uppercase mb-4">Portal login details for parent dashboard access.</p>
                <div className="bg-white p-4 border-2 border-gray-200 shadow-sm flex justify-between items-center group">
                  <span className="font-mono text-3xl font-black text-coha-900 tracking-widest">{showPin ? student.parentPin : '****'}</span>
                  <button onClick={() => setShowPin(!showPin)} className="text-coha-500 hover:text-coha-900 transition-colors">
                    {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FINANCE' && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-gray-200 shadow-sm text-center">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Yearly Fees</p>
                  <p className="text-3xl font-black text-gray-900">N$ {financials.total.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 border-2 border-green-500 shadow-sm text-center">
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">Verified Paid</p>
                  <p className="text-3xl font-black text-green-700">N$ {financials.paid.toLocaleString()}</p>
                </div>
                <div className={`p-6 border-2 shadow-sm text-center ${financials.balance <= 0 ? 'bg-green-600 border-green-700 text-white' : 'bg-white border-red-500 text-red-600'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${financials.balance <= 0 ? 'text-green-100' : 'text-red-400'}`}>
                    {financials.balance <= 0 ? 'Paid in Advance' : 'Outstanding Balance'}
                  </p>
                  <p className="text-3xl font-black">N$ {Math.abs(financials.balance).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2">
                  <CreditCard size={14} /> Verified Payments Master Log
                </h3>
                <div className="bg-white border border-gray-100 shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Receipt #</th>
                        <th className="px-6 py-4">Date Verified</th>
                        <th className="px-6 py-4 text-right">Amount (N$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {receipts.map((receipt) => (
                        <tr key={receipt.id}>
                          <td className="px-6 py-4 font-mono font-bold text-coha-900">{receipt.number}</td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(receipt.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">N$ {parseFloat(receipt.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                      {receipts.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-gray-400 uppercase text-[10px] font-black italic tracking-widest">
                            No verified payments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ASSESSMENTS' && showAssessmentTab && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6 border-b pb-2">
                <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] flex items-center gap-2">
                  <FileText size={14} /> Assessment Reports
                </h3>
              </div>
              {renderAssessmentSection()}
            </div>
          )}

          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6 border-b pb-2">
                <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] flex items-center gap-2">
                  <FileText size={14} /> Uploaded Documents
                </h3>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-gray-200">
                  No documents uploaded for this learner.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {documents.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                      <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-black text-gray-900">{item.title}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">
                            {item.documentType.replace(/_/g, ' ')} · {item.uploadedAt?.toDate ? item.uploadedAt.toDate().toLocaleDateString() : '-'}
                          </p>
                        </div>
                        <a href={item.fileBase64} download={item.fileName} className="text-sm font-bold text-coha-700 inline-flex items-center gap-1">
                          <Download size={14} /> Open
                        </a>
                      </div>
                      <div className="p-5">
                        {item.mimeType.startsWith('image/') ? (
                          <img src={item.fileBase64} alt={item.title} className="w-full h-72 object-contain bg-white border border-gray-200 rounded-xl" />
                        ) : (
                          <div className="h-72 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-500 font-bold">
                            PDF document ready to open
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
