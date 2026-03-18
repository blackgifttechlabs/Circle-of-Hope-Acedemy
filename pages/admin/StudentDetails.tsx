import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentById, updateStudent, deleteStudent, getSystemSettings, getReceipts } from '../../services/dataService';
import { Student, SystemSettings, Receipt } from '../../types';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { ArrowLeft, Printer, Trash2, Edit2, Save, X, Key, Eye, EyeOff, DollarSign, User, LayoutDashboard, CheckCircle, CreditCard, Heart, Calendar } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Toast } from '../../components/ui/Toast';
import { printStudentProfile } from '../../utils/printStudentProfile';

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
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'PARENTS' | 'FINANCE'>('PERSONAL');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const s = await getStudentById(id);
        const setts = await getSystemSettings();
        const rects = await getReceipts();
        setStudent(s);
        setSettings(setts);
        setReceipts(rects.filter(r => r.usedByStudentId === id));
      }
    };
    fetchData();
  }, [id]);

  const financials = useMemo(() => {
    if (!student || !settings) return { total: 0, paid: 0, balance: 0 };
    
    // Simple fee calculation for 2026 based on status
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

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans text-black">
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
        <div className="bg-coha-900 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <button onClick={() => navigate('/admin/students')} className="mb-6 p-2 hover:bg-white/10 transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border border-white/20">
                    <ArrowLeft size={16} /> Back to Directory
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none">{student.name}</h2>
                            {student.studentStatus === 'ENROLLED' && <CheckCircle size={28} className="text-green-400" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-coha-300 uppercase tracking-widest">
                            <span>ID: <span className="text-white">{student.id}</span></span>
                            <span>{calculateAge(student.dob || '')}</span>
                            <span>{statusDisplay}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => printStudentProfile(student)} className="bg-white text-coha-900 border-none px-6 py-4 font-black uppercase text-[10px] tracking-widest hover-pop">
                            <Printer size={18} /> Print Profile
                        </Button>
                        <Button variant="danger" onClick={() => setDeleteModalOpen(true)} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest hover-pop">
                            <Trash2 size={18} /> Remove
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b-2 border-gray-200 mb-8 overflow-x-auto bg-white shadow-sm">
            <button 
                onClick={() => setActiveTab('PERSONAL')}
                className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${activeTab === 'PERSONAL' ? 'bg-coha-900 text-white shadow-inner' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
            >
                <User size={16} /> Personal Info
            </button>
            <button 
                onClick={() => setActiveTab('PARENTS')}
                className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${activeTab === 'PARENTS' ? 'bg-coha-900 text-white shadow-inner' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
            >
                <Heart size={16} /> Parent Info
            </button>
            <button 
                onClick={() => setActiveTab('FINANCE')}
                className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${activeTab === 'FINANCE' ? 'bg-coha-900 text-white shadow-inner' : 'text-gray-400 hover:text-coha-900 hover:bg-gray-50'}`}
            >
                <DollarSign size={16} /> Fees & Finance
            </button>
        </div>

        {/* TAB CONTENT */}
        <div className="bg-white p-8 border border-gray-200 shadow-sm animate-fade-in">
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
        </div>
    </div>
  );
};