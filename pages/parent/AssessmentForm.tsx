import React, { useState, useEffect } from 'react';
import { Student, SelfCareAssessment, AssessmentResponse } from '../../types';
import { submitPaymentReceipt, getStudentById, saveParentAssessment } from '../../services/dataService';
import { Loader } from '../../components/ui/Loader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle, CheckCircle, Clock, FileText, Heart, Lock } from 'lucide-react';

interface AssessmentFormProps {
  user: any; 
}

const SELF_CARE_QUESTIONS = [
    { id: 's1', text: 'Drink from a cup' },
    { id: 's2', text: 'Feed self with a spoon' },
    { id: 's3', text: 'Wash hands' },
    { id: 's4', text: 'Wash and dry him/herself' },
    { id: 's5', text: 'Dress and undress him/herself' },
    { id: 's6', text: 'Brush teeth and hair by him/herself' },
    { id: 's7', text: 'Go to the toilet by him/herself' },
    { id: 's8', text: 'Assist with simple tasks around the home' },
    { id: 's9', text: 'Can be sent around with messages' },
];

export const ParentAssessmentForm: React.FC<AssessmentFormProps> = ({ user }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<Omit<SelfCareAssessment, 'calculatedScore' | 'completedDate'>>({
      s1: 'No', s2: 'No', s3: 'No', s4: 'No', s5: 'No', s6: 'No', s7: 'No', s8: 'No', s9: 'No',
      comments: ''
  });
  const [assessmentDone, setAssessmentDone] = useState(false);

  useEffect(() => {
    if (user?.id) {
        getStudentById(user.id).then((s) => {
            setStudent(s);
            if (s?.assessment?.parentSelfCare) {
                setAssessmentDone(true);
            }
        });
    }
  }, [user]);

  const handleSubmitReceipt = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!receiptNumber || !student) return;
      setLoading(true);
      const success = await submitPaymentReceipt(student.id, receiptNumber);
      if (success) {
          setStudent({...student, studentStatus: 'PAYMENT_VERIFICATION', paymentRejected: false});
      }
      setLoading(false);
  };

  const handleAssessmentChange = (id: string, value: AssessmentResponse) => {
      setAssessmentForm(prev => ({ ...prev, [id]: value }));
  };

  const handleAssessmentSubmit = async () => {
      if(!student) return;
      setLoading(true);
      const success = await saveParentAssessment(student.id, assessmentForm);
      if(success) {
          setAssessmentDone(true);
          setStudent(await getStudentById(student.id)); 
      }
      setLoading(false);
  };

  if (!student) return <Loader />;

  // 1. PAYMENT FLOWS
  if (student.studentStatus === 'WAITING_PAYMENT') {
      return (
          <div className="max-w-md mx-auto mt-10 animate-fade-in">
              {student.paymentRejected && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 shadow-sm">
                      <div className="flex items-start gap-3">
                          <AlertCircle className="text-red-600 shrink-0" size={24} />
                          <div>
                              <h3 className="text-red-800 font-bold">Payment Verification Failed</h3>
                              <p className="text-red-700 text-sm mt-1">The receipt number you provided was invalid or already used. Please check your receipt and try again.</p>
                          </div>
                      </div>
                  </div>
              )}

              <div className="p-6 bg-white shadow-lg border-t-8 border-coha-900">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Enrollment</h2>
                    <p className="text-gray-600">Your application has been conditionally approved. Please confirm your application fee payment to proceed.</p>
                </div>

                <form onSubmit={handleSubmitReceipt} className="space-y-6">
                    <Input 
                        label="Enter Receipt Number" 
                        placeholder="e.g. R-99382" 
                        value={receiptNumber} 
                        onChange={(e) => setReceiptNumber(e.target.value)} 
                        required
                    />
                    <Button fullWidth disabled={loading}>
                        {loading ? 'Submitting...' : 'Verify Payment'}
                    </Button>
                </form>
              </div>
          </div>
      );
  }

  if (student.studentStatus === 'PAYMENT_VERIFICATION') {
      return (
          <div className="max-w-md mx-auto mt-10 p-8 bg-white shadow-lg text-center animate-fade-in">
               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Clock size={32} />
               </div>
               <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
               <p className="text-gray-600">We have received your receipt number. The administration is currently verifying the payment.</p>
          </div>
      );
  }

  // 2. ASSESSMENT COMPLETED FLOW
  if (student.studentStatus === 'ENROLLED' && student.assessment?.isComplete) {
       return (
          <div className="max-w-4xl mx-auto mt-4 animate-fade-in">
               <div className="bg-white p-12 text-center shadow-lg border-t-8 border-green-600 rounded-lg">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-coha-900 mb-2">Assessment Completed</h2>
                    <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                        Thank you for your participation. The observation period is officially closed. Your child has been placed in their designated class.
                    </p>
                    
                    <div className="inline-block bg-gray-50 border border-gray-200 px-8 py-4 rounded-lg">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Parent Assessment Score</p>
                        <p className="text-3xl font-bold text-coha-900">{student.assessment.parentSelfCare?.calculatedScore || 0} / 5.0</p>
                    </div>
               </div>
          </div>
       );
  }

  // 3. ASSESSMENT ACTIVE FLOW (Form)
  return (
      <div className="max-w-4xl mx-auto mt-4 animate-fade-in pb-12">
           <div className="bg-white p-8 shadow-lg border-t-8 border-purple-600 mb-6">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Parent Assessment Task</h2>
                    <p className="text-gray-600">
                        As part of the 14-day observation, we need your input on your child's self-care abilities at home.
                    </p>
                </div>

                {!assessmentDone ? (
                    <div className="bg-purple-50 p-6 border border-purple-100 rounded-lg">
                        <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                            <Heart size={20}/> Self-care Skills Assessment
                        </h3>
                        <p className="text-sm text-purple-800 mb-6">
                            Please indicate your child's ability to perform the following self-care tasks.
                        </p>
                        
                        {/* Mobile View (Cards) */}
                        <div className="md:hidden space-y-4 mb-6">
                            {SELF_CARE_QUESTIONS.map(q => (
                                <div key={q.id} className="bg-white p-4 border border-purple-100 rounded-lg shadow-sm">
                                    <p className="font-medium text-gray-800 mb-3 text-sm">
                                         <span className="font-bold text-purple-600 mr-2">{q.id.toUpperCase()}:</span>
                                         {q.text}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                         {['Yes', 'No', 'Yes with help'].map(option => (
                                             <label key={option} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${(assessmentForm as any)[q.id] === option ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-100'}`}>
                                                 <input
                                                    type="radio"
                                                    name={`mobile-${q.id}`} 
                                                    value={option}
                                                    checked={(assessmentForm as any)[q.id] === option}
                                                    onChange={() => handleAssessmentChange(q.id, option as AssessmentResponse)}
                                                    className="w-5 h-5 accent-purple-600 mr-3"
                                                 />
                                                 <span className="text-sm font-medium text-gray-700">{option}</span>
                                             </label>
                                         ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block bg-white border border-purple-200 shadow-sm mb-6 overflow-hidden rounded-lg">
                            <table className="w-full text-left">
                                <thead className="bg-purple-100 text-purple-900 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-4 w-1/2">The learner can...</th>
                                        <th className="p-4 text-center">Yes</th>
                                        <th className="p-4 text-center">No</th>
                                        <th className="p-4 text-center">Yes with help</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-purple-50">
                                    {SELF_CARE_QUESTIONS.map((q) => (
                                        <tr key={q.id} className="hover:bg-purple-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-800">
                                                <span className="font-bold text-purple-400 mr-2">{q.id.toUpperCase()}:</span>
                                                {q.text}
                                            </td>
                                            {['Yes', 'No', 'Yes with help'].map((option) => (
                                                <td key={option} className="p-4 text-center">
                                                    <label className="cursor-pointer flex justify-center items-center h-full w-full">
                                                        <input 
                                                            type="radio" 
                                                            name={q.id} 
                                                            value={option}
                                                            checked={(assessmentForm as any)[q.id] === option}
                                                            onChange={() => handleAssessmentChange(q.id, option as AssessmentResponse)}
                                                            className="w-5 h-5 accent-purple-600"
                                                        />
                                                    </label>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mb-6">
                            <label className="block text-purple-900 font-bold mb-2">Other Comments:</label>
                            <textarea 
                                className="w-full p-3 border-2 border-purple-200 focus:border-purple-500 outline-none h-24 bg-white"
                                placeholder="Any additional observations regarding self-care..."
                                value={assessmentForm.comments}
                                onChange={(e) => setAssessmentForm({...assessmentForm, comments: e.target.value})}
                            />
                        </div>
                        
                        <div className="flex justify-end">
                            <Button onClick={handleAssessmentSubmit} disabled={loading} className="px-8 w-full md:w-auto">
                                {loading ? 'Saving...' : 'Submit Assessment'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 p-8 border border-green-200 text-center rounded-lg">
                        <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
                        <h3 className="font-bold text-green-800 text-xl mb-2">Assessment Submitted</h3>
                        <p className="text-green-700">Thank you! Your input has been recorded. The teacher will finalize the observation period shortly.</p>
                        <div className="mt-4 flex justify-center">
                            <span className="bg-white px-4 py-2 rounded text-xs font-bold text-gray-500 border flex items-center gap-2">
                                <Lock size={12}/> Editing Locked
                            </span>
                        </div>
                    </div>
                )}
           </div>
      </div>
  );
};