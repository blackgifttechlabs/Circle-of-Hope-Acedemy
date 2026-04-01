import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Save, AlertCircle } from 'lucide-react';
import { getStudentsByAssignedClass, saveTopicAssessments, getTopicAssessments } from '../../../services/dataService';
import { Student } from '../../../types';
import { Toast } from '../../../components/ui/Toast';

export default function TopicAssessment({ user }: { user: any }) {
  const { subject, term, topic } = useParams<{ subject: string, term: string, topic: string }>();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user?.assignedClass && subject && term && topic) {
      const termId = term.toLowerCase().replace(' ', '-');
      
      Promise.all([
        getStudentsByAssignedClass(user.assignedClass),
        getTopicAssessments(user.assignedClass, termId, subject)
      ]).then(([studentsData, assessmentsData]) => {
        const sorted = studentsData.sort((a: Student, b: Student) => a.name.localeCompare(b.name));
        setStudents(sorted);
        
        const initialMarks: Record<string, string> = {};
        sorted.forEach((s: Student) => initialMarks[s.id] = '');
        
        // Populate existing marks
        assessmentsData.forEach(a => {
          if (a.topic === topic) {
            initialMarks[a.studentId] = a.mark.toString();
          }
        });
        
        setMarks(initialMarks);
      });
    }
  }, [user, subject, term, topic]);

  const handleMarkChange = (studentId: string, value: string) => {
    // Only allow numbers 0-10
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 10)) {
      setMarks(prev => ({ ...prev, [studentId]: value }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < students.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (!user?.assignedClass || !subject || !term || !topic) return;
    
    setIsSubmitting(true);
    try {
      const termId = term.toLowerCase().replace(' ', '-');
      const numericMarks: Record<string, number> = {};
      
      Object.entries(marks).forEach(([studentId, markStr]) => {
        if (markStr !== '') {
          numericMarks[studentId] = parseInt(markStr);
        }
      });
      
      await saveTopicAssessments(user.assignedClass, termId, subject, topic, numericMarks);
      
      setToast({ show: true, msg: 'Assessments saved successfully!' });
      setTimeout(() => {
        navigate(`/teacher/assess/${encodeURIComponent(subject)}`);
      }, 1500);
    } catch (error) {
      console.error("Failed to save assessments", error);
      setToast({ show: true, msg: 'Failed to save assessments.' });
      setIsSubmitting(false);
    }
  };

  if (isReviewing) {
    return (
      <div className="w-full px-5 py-6">
        {toast.show && <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ show: false, msg: '' })} />}
        
        <div className="mb-6">
          <button 
            onClick={() => setIsReviewing(false)}
            className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Review Marks</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{subject} • {term} • {topic}</p>
        </div>
        
        <hr className="border-slate-200 mb-8" />

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Learner Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Mark (/10)</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-700">{student.name}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setIsReviewing(false)}
                      className="font-mono text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {marks[student.id] || '-'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-70"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save size={24} />
              Save Marks
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-5 py-6">
      {toast.show && <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ show: false, msg: '' })} />}
      
      <div className="mb-6">
        <button 
          onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject || '')}`)}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{topic}</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">{subject} • {term}</p>
      </div>
      
      <hr className="border-slate-200 mb-8" />

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800 font-medium leading-relaxed">
          Enter marks out of 10 for each learner. Press <kbd className="px-2 py-1 bg-white rounded border border-blue-200 text-xs font-mono shadow-sm mx-1">Enter</kbd> or <kbd className="px-2 py-1 bg-white rounded border border-blue-200 text-xs font-mono shadow-sm mx-1">↓</kbd> to quickly jump to the next learner.
        </p>
      </div>

      <div className="space-y-3 mb-12">
        {students.map((student, index) => (
          <div 
            key={student.id} 
            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
          >
            <span className="font-bold text-slate-700 text-lg">{student.name}</span>
            <div className="flex items-center gap-3">
              <input
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={marks[student.id] || ''}
                onChange={(e) => handleMarkChange(student.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-20 h-12 text-center text-xl font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                placeholder="-"
              />
              <span className="text-slate-400 font-bold">/ 10</span>
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <div className="text-center py-12 text-slate-500 font-medium">
            Loading learners...
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="text-sm font-bold text-slate-500">
              {Object.values(marks).filter(m => m !== '').length} of {students.length} marked
            </div>
            <button 
              onClick={() => setIsReviewing(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              Review & Submit
              <CheckCircle size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
