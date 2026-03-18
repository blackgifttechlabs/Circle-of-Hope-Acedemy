import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApplications, getStudentsByStatus, verifyPayment, rejectPayment, getReceipts, addReceipt, deleteReceipt, deleteStudent, getPendingActionCounts } from '../../services/dataService';
import { Application, Student, Receipt } from '../../types';
import { Eye, Clock, Search, Filter, Check, X, Plus, Trash2, Key, Mail, DollarSign, Brain, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

type ViewMode = 'APPLICATIONS' | 'PENDING_PAYMENT' | 'VERIFICATION' | 'RECEIPTS';

export const ApplicationsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('APPLICATIONS');
  const [applications, setApplications] = useState<Application[]>([]);
  const [pendingPaymentList, setPendingPaymentList] = useState<Student[]>([]);
  const [verificationList, setVerificationList] = useState<Student[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'REJECTED'>('PENDING');
  const navigate = useNavigate();
  
  const [counts, setCounts] = useState({ pendingApps: 0, pendingVerifications: 0, total: 0 });
  const [newReceiptNumber, setNewReceiptNumber] = useState('');
  const [newReceiptAmount, setNewReceiptAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', show: false, type: 'success' as 'success' | 'error' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{success: boolean, student: Student | null, message: string}>({success: false, student: null, message: ''});

  useEffect(() => {
    loadData();
    getPendingActionCounts().then(setCounts);
  }, [viewMode]);

  const loadData = async () => {
    if (viewMode === 'APPLICATIONS') {
        const data = await getApplications();
        setApplications(data);
    } else if (viewMode === 'PENDING_PAYMENT') {
        const data = await getStudentsByStatus('WAITING_PAYMENT');
        setPendingPaymentList(data);
    } else if (viewMode === 'VERIFICATION') {
        const data = await getStudentsByStatus('PAYMENT_VERIFICATION');
        setVerificationList(data);
    } else if (viewMode === 'RECEIPTS') {
        const data = await getReceipts();
        setReceipts(data);
    }
  };

  const handleVerifyClick = async (student: Student) => {
    if (!student.receiptNumber) return;
    setLoading(true);
    const result = await verifyPayment(student.id, student.receiptNumber);
    setLoading(false);
    
    setVerifyResult({
        success: result.success,
        student: student,
        message: result.success ? 'Payment Verified Successfully.' : 'Invalid Receipt Number.'
    });
    setEmailModalOpen(true);
  };

  const finalizeVerification = async (sendEmail: boolean) => {
     if (!verifyResult.student) return;
     const student = verifyResult.student;
     
     if (verifyResult.success) {
         if (sendEmail) {
             const subject = "Enrollment Update: Payment Verified";
             const body = `Dear ${student.parentName},

We have successfully verified your payment receipt (${student.receiptNumber}).

The student ${student.name} is now ready for assessment.

Regards,
Circle of Hope Academy`;
             window.location.href = `mailto:${student.fatherEmail || student.motherEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
         }
         setToast({ msg: 'Student moved to Assessment.', show: true, type: 'success' });
     } else {
         await rejectPayment(student.id);
         if (sendEmail) {
             const subject = "Enrollment Update: Payment Verification Failed";
             const body = `Dear ${student.parentName},

The receipt number (${student.receiptNumber}) provided for ${student.name} could not be verified.

Please check the number and try again on the parent portal.

Regards,
Circle of Hope Academy`;
             window.location.href = `mailto:${student.fatherEmail || student.motherEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
         }
         setToast({ msg: 'Payment Rejected. Parent notified on dashboard.', show: true, type: 'error' });
     }
     
     setEmailModalOpen(false);
     loadData();
     getPendingActionCounts().then(setCounts);
  };

  const confirmDelete = (student: Student) => {
      setStudentToDelete(student);
      setDeleteModalOpen(true);
  };

  const handleDeleteStudent = async () => {
      if (studentToDelete) {
          await deleteStudent(studentToDelete.id);
          setDeleteModalOpen(false);
          setStudentToDelete(null);
          loadData();
          setToast({ msg: 'Record deleted successfully', show: true, type: 'success' });
      }
  };

  const handleAddReceipt = async () => {
      if (!newReceiptNumber || !newReceiptAmount) return;
      setLoading(true);
      const success = await addReceipt(newReceiptNumber, newReceiptAmount, new Date().toISOString());
      if (success) {
          setNewReceiptNumber('');
          setNewReceiptAmount('');
          loadData();
          setToast({ msg: 'Receipt added successfully', show: true, type: 'success' });
      }
      setLoading(false);
  };

  const handleDeleteReceipt = async (id: string) => {
      if(window.confirm('Delete this receipt?')) {
          await deleteReceipt(id);
          loadData();
      }
  };

  const filteredApps = applications.filter(app => {
      const matchesSearch = (() => {
        const fullName = `${app.firstName} ${app.surname}`.toLowerCase();
        const parent = (app.fatherName || app.motherName || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || parent.includes(term) || (app.grade || '').toLowerCase().includes(term);
      })();
      return matchesSearch && app.status === statusFilter;
  });

  return (
    <div>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({...toast, show: false})} variant={toast.type} />
      
      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteStudent}
        title="Delete Record?"
        message={`Are you sure you want to delete ${studentToDelete?.name}? This will permanently remove them from the system.`}
      />

      {emailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className={`bg-white w-full max-w-lg shadow-2xl border-t-8 ${verifyResult.success ? 'border-green-600' : 'border-red-600'} animate-fade-in`}>
                <div className="p-10 text-center">
                    {verifyResult.success ? (
                      <div className="flex flex-col items-center">
                        <svg className="w-24 h-24 text-green-600 mb-6" viewBox="0 0 52 52">
                          <circle className="stroke-current fill-none" cx="26" cy="26" r="25" strokeWidth="2" />
                          <path className="stroke-current fill-none animate-draw-tick" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>
                        <h3 className="text-2xl font-black uppercase text-green-800 tracking-tight mb-2">Registration Fees Confirmed</h3>
                        <p className="text-gray-500 font-bold text-sm uppercase mb-8">Student: {verifyResult.student?.name}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                           <X size={48} />
                        </div>
                        <h3 className="text-2xl font-black uppercase text-red-800 tracking-tight mb-2">Payment Verification Failed</h3>
                        <p className="text-gray-500 font-bold text-sm uppercase mb-8">Receipt number invalid.</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {verifyResult.success && (
                            <Button fullWidth onClick={() => {
                                setEmailModalOpen(false);
                                navigate(`/admin/assessment/${verifyResult.student?.id}`);
                            }} className="bg-coha-900 border-none py-4 text-xs font-black uppercase tracking-widest shadow-lg hover-pop">
                                <Brain size={18} /> Open Assessment Form <ArrowRight size={18} />
                            </Button>
                        )}
                        <Button fullWidth variant="outline" onClick={() => finalizeVerification(true)} className="py-4 text-xs font-black uppercase tracking-widest hover-pop">
                            <Mail size={18} /> Send Email To Parent
                        </Button>
                        <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-4 hover:text-gray-600">Close</button>
                    </div>
                </div>
            </div>
          </div>
      )}

      <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-coha-900">Admission Portal</h2>
            <p className="text-gray-600">Check applications and verify payments.</p>
        </div>
        <div className="flex flex-wrap bg-white shadow-sm border border-gray-200">
            <button onClick={() => setViewMode('APPLICATIONS')} className={`px-4 py-2 text-sm font-bold uppercase flex items-center gap-2 ${viewMode === 'APPLICATIONS' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                New Apps {counts.pendingApps > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{counts.pendingApps}</span>}
            </button>
            <button onClick={() => setViewMode('PENDING_PAYMENT')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'PENDING_PAYMENT' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Payment Required</button>
            <button onClick={() => setViewMode('VERIFICATION')} className={`px-4 py-2 text-sm font-bold uppercase flex items-center gap-2 ${viewMode === 'VERIFICATION' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Verify {counts.pendingVerifications > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{counts.pendingVerifications}</span>}
            </button>
            <button onClick={() => setViewMode('RECEIPTS')} className={`px-4 py-2 text-sm font-bold uppercase ${viewMode === 'RECEIPTS' ? 'bg-coha-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Receipt Master</button>
        </div>
      </div>

      {viewMode === 'RECEIPTS' ? (
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white p-6 shadow-sm border border-gray-200 h-fit">
                  <h3 className="font-bold text-lg mb-4 text-xs font-black uppercase tracking-widest text-gray-400">Add School Receipt</h3>
                  <div className="space-y-4">
                      <Input label="Receipt #" value={newReceiptNumber} onChange={(e) => setNewReceiptNumber(e.target.value)} placeholder="e.g. R-10029" />
                      <Input label="Amount (N$)" value={newReceiptAmount} onChange={(e) => setNewReceiptAmount(e.target.value)} placeholder="300.00" />
                      <Button fullWidth onClick={handleAddReceipt} disabled={loading} className="hover-pop">
                          <Plus size={20} /> Register Receipt
                      </Button>
                  </div>
              </div>
              <div className="lg:col-span-2 bg-white shadow-sm border border-gray-200">
                  <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 text-xs font-black uppercase tracking-widest">Available Receipt Bank</div>
                  <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-left">
                        <thead className="bg-white text-xs font-bold uppercase text-gray-600 sticky top-0">
                            <tr>
                                <th className="px-6 py-4">Receipt #</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {receipts.map((receipt) => (
                                <tr key={receipt.id} className={receipt.isUsed ? 'bg-gray-100 opacity-70' : ''}>
                                    <td className="px-6 py-4 font-mono font-bold text-coha-900">{receipt.number}</td>
                                    <td className="px-6 py-4 text-gray-800 font-bold">N$ {receipt.amount}</td>
                                    <td className="px-6 py-4">
                                        {receipt.isUsed ? <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-1 uppercase">Allocated</span> : <span className="text-[10px] font-black text-green-600 bg-green-100 px-2 py-1 uppercase tracking-wider">Unused</span>}
                                    </td>
                                    <td className="px-6 py-4">{!receipt.isUsed && <button onClick={() => handleDeleteReceipt(receipt.id!)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      ) : (
          <div className="bg-white border border-gray-200 shadow-sm animate-fade-in">
             <div className="p-4 border-b border-gray-200">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input className="w-full pl-10 pr-4 py-2 border border-gray-300 outline-none" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Student</th>
                            {viewMode === 'VERIFICATION' ? <th className="px-6 py-4">Receipt #</th> : viewMode === 'PENDING_PAYMENT' ? <th className="px-6 py-4">Portal PIN</th> : <th className="px-6 py-4">Grade/Level</th>}
                            <th className="px-6 py-4">Parent</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {(viewMode === 'APPLICATIONS' ? filteredApps : viewMode === 'PENDING_PAYMENT' ? pendingPaymentList : verificationList).map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.id}</td>
                                <td className="px-6 py-4 font-bold text-coha-900">{item.firstName} {item.surname || item.name}</td>
                                <td className="px-6 py-4 font-mono font-bold">
                                    {viewMode === 'VERIFICATION' ? (
                                        <span className="text-blue-600">{item.receiptNumber}</span>
                                    ) : viewMode === 'PENDING_PAYMENT' ? (
                                        <div className="flex items-center gap-2">
                                            <Key size={12} className="text-gray-400" />
                                            <span className="text-coha-500 font-black">{item.parentPin}</span>
                                        </div>
                                    ) : (
                                        item.grade || item.level
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-600">{item.parentName || (item.fatherName || item.motherName)}</td>
                                <td className="px-6 py-4">
                                    {viewMode === 'VERIFICATION' ? (
                                        <Button onClick={() => handleVerifyClick(item)} className="py-1 px-4 text-[10px] font-black uppercase tracking-widest hover-pop">Verify Now</Button>
                                    ) : (
                                        <button onClick={() => navigate(viewMode === 'APPLICATIONS' ? `/admin/applications/${item.id}` : `/admin/students/${item.id}`)} className="text-coha-500 font-bold hover:underline uppercase text-[10px] tracking-widest">Profile</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
      )}
    </div>
  );
};