import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentById, updateStudent, deleteStudent, getSystemSettings, getReceipts, getAssessmentRecordsForStudent } from '../../services/dataService';
import { Student, SystemSettings, Receipt, TermAssessmentRecord, PRE_PRIMARY_AREAS } from '../../types';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { ArrowLeft, Printer, Trash2, Edit2, Save, X, Key, Eye, EyeOff, DollarSign, User, LayoutDashboard, CheckCircle, CreditCard, Heart, Calendar, FileText, Download } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Toast } from '../../components/ui/Toast';
import { printStudentProfile } from '../../utils/printStudentProfile';
import { printGrade0Report } from '../../utils/printGrade0Report';

const calculateAge = (dobString: string): string => {
  if (!dobString) return 'N/A';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return `${age} years old`;
};

export const StudentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [assessmentRecords, setAssessmentRecords] = useState<TermAssessmentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'PARENTS' | 'FINANCE' | 'ASSESSMENTS'>('PERSONAL');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  // Track loading state per report card (keyed by termId)
  const [reportLoadingMap, setReportLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const s = await getStudentById(id);
        const setts = await getSystemSettings();
        const rects = await getReceipts();
        setStudent(s);
        setSettings(setts);
        setReceipts(rects.filter(r => r.usedByStudentId === id));
        
        if (s && s.grade === 'Grade 0') {
            const records = await getAssessmentRecordsForStudent('Grade 0', id);
            setAssessmentRecords(records);
        }
      }
    };
    fetchData();
  }, [id]);

  const financials = useMemo(() => {
    if (!student || !settings) return { total: 0, paid: 0, balance: 0 };
    
    let yearlyFees = 0;
    settings.fees.forEach(f => {
      const amount = parseFloat(f.amount) || 0;
      let multiplier = 1;
      if (f.frequency === 'Monthly') multiplier = 12;
      else if (f.frequency === 'Termly') multiplier = 3;
      yearlyFees += (amount * multiplier);
    });

    const paidTotal = receipts.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    return {
      total: yearlyFees,
      paid: paidTotal,
      balance: yearlyFees - paidTotal
    };
  }, [student, settings, receipts]);

  if (!student) return <Loader />;

  const statusDisplay = student.studentStatus === 'ENROLLED' 
    ? `${student.grade || student.level}${student.stage ? ` - Stage ${student.stage}` : ''}`
    : student.studentStatus;

  const DetailRow = ({ label, value }: { label: string, value: any }) => (
    <div className="mb-4">
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{label}</p>
      <p className="text-gray-900 font-bold">{value || '-'}</p>
    </div>
  );

  const handleDownloadReport = async (record: TermAssessmentRecord) => {
    if (!record.isComplete || reportLoadingMap[record.termId]) return;

    setReportLoadingMap(prev => ({ ...prev, [record.termId]: true }));
    try {
      const termName = settings?.schoolCalendars?.find(c => c.id === record.termId)?.termName || record.termId;
      const year = new Date().getFullYear().toString();
      await printGrade0Report(student, record, termName, year, 'Admin');
    } finally {
      setReportLoadingMap(prev => ({ ...prev, [record.termId]: false }));
    }
  };

  return (
    <div className="-m-5 pb-20 font-sans text-black bg-gray-50 min-h-[calc(100vh-64px)]">
        <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({show:false, msg:''})} />
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

        {/* HERO SECTION / HEADER */}
        <div className="bg-coha-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <button onClick={() => navigate('/admin/students')} className="mb-4 p-2 hover:bg-white/10 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/20 w-fit">
                    <ArrowLeft size={16} /> Back to Directory
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
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
                    <div className="flex flex-wrap gap-2">
                        {/* FIX: was bg-white text-coha-900 border-none — border-none was stripping styles; kept explicit text color */}
                        <Button onClick={() => printStudentProfile(student)} className="bg-white !text-coha-900 border border-gray-300 px-4 py-2 font-black uppercase text-[10px] tracking-widest hover-pop">
                            <Printer size={16} /> Print Profile
                        </Button>
                        <Button variant="danger" onClick={() => setDeleteModalOpen(true)} className="px-4 py-2 font-black uppercase text-[10px] tracking-widest hover-pop">
                            <Trash2 size={16} /> Remove
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-gray-200 overflow-x-auto bg-white shadow-sm sticky top-0 z-20">
            <button 
                onClick={() => setActiveTab('PERSONAL')}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PERSONAL' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
            >
                <User size={16} /> Personal Info
            </button>
            <button 
                onClick={() => setActiveTab('PARENTS')}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PARENTS' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
            >
                <Heart size={16} /> Parent Info
            </button>
            <button 
                onClick={() => setActiveTab('FINANCE')}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'FINANCE' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
            >
                <DollarSign size={16} /> Fees & Finance
            </button>
            {student.grade === 'Grade 0' && (
                <button 
                    onClick={() => setActiveTab('ASSESSMENTS')}
                    className={`px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ASSESSMENTS' ? 'border-b-4 border-coha-900 text-coha-900' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
                >
                    <FileText size={16} /> Assessment Reports
                </button>
            )}
        </div>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">

        {/* TAB CONTENT */}
        <div className="bg-white p-6 sm:p-8 border border-gray-200 shadow-sm animate-fade-in rounded-[20px]">
            {activeTab === 'PERSONAL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2"><LayoutDashboard size={14}/> Student Profile</h3>
                        <DetailRow label="Full Name" value={student.name} />
                        <DetailRow label="Date of Birth" value={student.dob} />
                        <DetailRow label="Gender" value={student.gender} />
                        <DetailRow label="Citizenship" value={student.citizenship} />
                        <DetailRow label="Residential Address" value={student.address} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2"><Calendar size={14}/> Academic Details</h3>
                        <DetailRow label="Division" value={student.division} />
                        <DetailRow label="Initial Grade" value={student.grade} />
                        <DetailRow label="Current Status" value={student.studentStatus} />
                        <DetailRow label="Current Assignment" value={statusDisplay} />
                    </div>
                </div>
            )}

            {activeTab === 'PARENTS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2"><User size={14}/> Parent / Guardian</h3>
                        <DetailRow label="Name" value={student.parentName} />
                        <DetailRow label="Father Name" value={student.fatherName} />
                        <DetailRow label="Father Phone" value={student.fatherPhone} />
                        <DetailRow label="Mother Name" value={student.motherName} />
                        <DetailRow label="Mother Phone" value={student.motherPhone} />
                    </div>
                    <div className="bg-gray-50 p-6 border-l-8 border-coha-500 shadow-inner h-fit">
                        <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-4 flex items-center gap-2"><Key size={14}/> Parent Portal Security</h3>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-4">Portal login details for parent dashboard access.</p>
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-4 border-2 border-gray-200 shadow-sm flex-1 flex justify-between items-center group">
                                <span className="font-mono text-3xl font-black text-coha-900 tracking-widest">{showPin ? student.parentPin : '****'}</span>
                                <button onClick={() => setShowPin(!showPin)} className="text-coha-500 hover:text-coha-900 transition-colors">
                                    {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'FINANCE' && (
                <div className="space-y-12">
                    {/* Summary Containers */}
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
                            <p className="text-3xl font-black">
                                N$ {Math.abs(financials.balance).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Payments Table */}
                    <div>
                        <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] mb-6 border-b pb-2 flex items-center gap-2"><CreditCard size={14}/> Verified Payments Master Log</h3>
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
                                    {receipts.map(r => (
                                        <tr key={r.id}>
                                            <td className="px-6 py-4 font-mono font-bold text-coha-900">{r.number}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(r.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">N$ {parseFloat(r.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {receipts.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 uppercase text-[10px] font-black italic tracking-widest">No verified payments found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ASSESSMENTS' && student.grade === 'Grade 0' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6 border-b pb-2">
                        <h3 className="text-[10px] font-black uppercase text-coha-900 tracking-[0.3em] flex items-center gap-2"><FileText size={14}/> Term Assessment Records</h3>
                    </div>
                    
                    {assessmentRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 font-black uppercase tracking-widest text-xs italic border-2 border-dashed border-gray-200">
                            No assessment records found for this student.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assessmentRecords.map(record => {
                                const isReportLoading = reportLoadingMap[record.termId] === true;
                                return (
                                    <div key={record.termId} className="border-2 border-gray-200 p-6 hover:border-coha-900 transition-colors flex flex-col justify-between h-full bg-gray-50">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="font-black text-xl uppercase tracking-tighter">{record.termId}</h4>
                                                {record.isComplete ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10} /> Complete</span>
                                                ) : (
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">In Progress</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                                                Last Updated: {new Date(record.updatedAt).toLocaleDateString()}
                                            </p>
                                            
                                            <div className="space-y-3 mb-6">
                                                {PRE_PRIMARY_AREAS.map(area => {
                                                    const areaRatings = area.components.map(c => record.ratings[c.id]).filter(Boolean);
                                                    const rated = areaRatings.length;
                                                    let currentScore = 0;
                                                    areaRatings.forEach(rating => {
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
                                                                <div className={`h-full ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        
                                        {/* FIX: removed Edit button entirely, Download Report button now full-width with spinner */}
                                        <button
                                            onClick={() => handleDownloadReport(record)}
                                            disabled={!record.isComplete || isReportLoading}
                                            className={`w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-none rounded-none
                                                ${record.isComplete
                                                    ? 'bg-coha-900 text-white hover:bg-coha-800 cursor-pointer'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }
                                                ${isReportLoading ? 'opacity-80 cursor-wait' : ''}
                                            `}
                                        >
                                            {isReportLoading ? (
                                                <>
                                                    {/* Inline spinner — no extra dependency */}
                                                    <svg
                                                        className="animate-spin h-4 w-4 text-white"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                    >
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
                    )}
                </div>
            )}
        </div>
        </div>
    </div>
  );
};