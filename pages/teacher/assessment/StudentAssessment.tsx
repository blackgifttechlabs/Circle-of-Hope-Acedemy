import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Save, User } from 'lucide-react';
import { getStudentById, saveTopicAssessments, getTopicAssessments } from '../../../services/dataService';
import { Student } from '../../../types';
import { Toast } from '../../../components/ui/Toast';
import { getTopicsForSubjectAndGrade } from '../../../utils/assessmentTopics';
import { getPromotionalSubjects, getNonPromotionalSubjects } from '../../../utils/subjects';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function StudentAssessment({ user }: { user?: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  
  const [subject, setSubject] = useState<string>('');
  const [term, setTerm] = useState<string>('Term 1');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const grade = user?.assignedClass || student?.grade || '';
  const allSubjects = [...getPromotionalSubjects(grade), ...getNonPromotionalSubjects(grade)];

  useEffect(() => {
    if (id) {
      getStudentById(id).then(data => {
        if (data) setStudent(data);
      });
    }
  }, [id]);

  useEffect(() => {
    const defaultTopics = getTopicsForSubjectAndGrade(subject || '', grade);
    
    if (user?.assignedClass && student && subject && term) {
      const termId = term.toLowerCase().replace(' ', '-');
      getTopicAssessments(user.assignedClass, termId, subject).then(assessments => {
        const studentAssessments = assessments.filter(a => a.studentId === student.id);
        
        let finalTopics = [...defaultTopics];
        
        // If defaultTopics is empty, use the topics from assessments
        if (finalTopics.length === 0) {
            const uniqueTopics = Array.from(new Set(studentAssessments.map(a => a.topic)));
            finalTopics = uniqueTopics;
        }
        
        // Handle "Topic of Own Choice" replacement
        const assessedTopics = studentAssessments.map(a => a.topic);
        const customAssessedTopic = assessedTopics.find(t => !defaultTopics.includes(t));
        
        if (defaultTopics.includes('Topic of Own Choice') && customAssessedTopic) {
            finalTopics = finalTopics.map(t => t === 'Topic of Own Choice' ? customAssessedTopic : t);
        }
        
        setActiveTopics(finalTopics);
        
        const initialMarks: Record<string, string> = {};
        finalTopics.forEach(t => initialMarks[t] = '');
        studentAssessments.forEach(a => {
          initialMarks[a.topic] = a.mark.toString();
        });
        setMarks(initialMarks);
      });
    } else {
      setActiveTopics(defaultTopics);
      const initialMarks: Record<string, string> = {};
      defaultTopics.forEach(t => initialMarks[t] = '');
      setMarks(initialMarks);
    }
  }, [user, student, subject, term, grade]);

  const handleMarkChange = (topic: string, value: string) => {
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 10)) {
      setMarks(prev => ({ ...prev, [topic]: value }));
    }
  };

  const handleTopicNameChange = (oldTopic: string, newTopic: string) => {
    if (oldTopic === newTopic || !newTopic.trim()) return;
    
    setActiveTopics(prev => prev.map(t => t === oldTopic ? newTopic : t));
    
    setMarks(prev => {
      const newMarks = { ...prev };
      newMarks[newTopic] = newMarks[oldTopic];
      delete newMarks[oldTopic];
      return newMarks;
    });
  };

  const handleAddTopic = () => {
    const newTopic = `New Topic ${activeTopics.length + 1}`;
    setActiveTopics(prev => [...prev, newTopic]);
    setMarks(prev => ({ ...prev, [newTopic]: '' }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < activeTopics.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const calculateStats = () => {
    const values = Object.values(marks).map(v => parseInt(v) || 0);
    const total = values.reduce((sum, val) => sum + val, 0);
    const maxTotal = activeTopics.length * 10;
    const average = activeTopics.length > 0 ? Math.round(total / activeTopics.length) : 0;
    const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    
    let symbol = 'U';
    if (percentage >= 80) symbol = 'A';
    else if (percentage >= 70) symbol = 'B';
    else if (percentage >= 60) symbol = 'C';
    else if (percentage >= 50) symbol = 'D';
    else if (percentage >= 40) symbol = 'E';

    return { total, maxTotal, average, percentage, symbol };
  };

  const handleSubmit = async () => {
    if (!user?.assignedClass || !student || !subject || !term) return;
    
    setIsSubmitting(true);
    try {
      const termId = term.toLowerCase().replace(' ', '-');
      
      // We need to save each topic for this student
      // The saveTopicAssessments function expects marks as Record<studentId, mark>
      // So we need to call it for each topic
      for (const [topic, markStr] of Object.entries(marks)) {
        if (markStr !== '') {
          const numericMarks: Record<string, number> = {
            [student.id]: parseInt(markStr)
          };
          await saveTopicAssessments(user.assignedClass, termId, subject, topic, numericMarks);
        }
      }
      
      setToast({ show: true, msg: 'Assessments saved successfully!' });
      setTimeout(() => {
        navigate('/teacher/classes');
      }, 1500);
    } catch (error) {
      console.error("Failed to save assessments", error);
      setToast({ show: true, msg: 'Failed to save assessments.' });
      setIsSubmitting(false);
    }
  };

  if (!student) return <div className="p-8 text-center text-slate-500 font-bold">Loading learner...</div>;

  if (isReviewing) {
    const stats = calculateStats();
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
          <p className="text-sm font-medium text-slate-500 mt-1">{student.name}</p>
        </div>
        
        <hr className="border-slate-200 mb-8" />

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-8">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</p>
              <p className="font-bold text-slate-800">{subject}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Term</p>
              <p className="font-bold text-slate-800">{term}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <tbody>
              {activeTopics.map(topic => (
                <tr key={topic} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-700">{topic}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setIsReviewing(false)}
                      className="font-mono text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {marks[topic] || '-'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-bold text-slate-800">{stats.total} <span className="text-sm text-slate-400">/ {stats.maxTotal}</span></p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average</p>
              <p className="text-xl font-bold text-slate-800">{stats.percentage}%</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Symbol</p>
              <p className={`text-2xl font-black ${
                stats.symbol === 'A' ? 'text-emerald-500' :
                stats.symbol === 'B' ? 'text-blue-500' :
                stats.symbol === 'C' ? 'text-yellow-500' :
                stats.symbol === 'D' ? 'text-orange-500' :
                'text-red-500'
              }`}>{stats.symbol}</p>
            </div>
          </div>
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
              Submit Marks
            </>
          )}
        </button>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="w-full px-5 py-6">
      {toast.show && <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ show: false, msg: '' })} />}
      
      <div className="mb-6">
        <button 
          onClick={() => navigate('/teacher/classes')}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">{student.grade} • Record Marks</p>
          </div>
        </div>
      </div>
      
      <hr className="border-slate-200 mb-8" />

      {!subject ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Select Term</h2>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              {TERMS.map(t => (
                <button
                  key={t}
                  onClick={() => setTerm(t)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    term === t 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Select Subject</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allSubjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all text-left font-bold text-slate-700 hover:text-blue-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</p>
              <button 
                onClick={() => setSubject('')}
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {subject}
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Term</p>
              <p className="font-bold text-slate-800">{term}</p>
            </div>
          </div>

          {activeTopics.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
              <h2 className="text-xl font-bold text-slate-700 mb-2">Topics Coming Soon</h2>
              <p className="text-slate-500 mb-4">Topics for {subject} in {student.grade} are not yet available. You can add them manually.</p>
              <button
                onClick={handleAddTopic}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Add Topic
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-8">
                {activeTopics.map((topic, index) => {
                  const isEditable = getTopicsForSubjectAndGrade(subject || '', grade).length === 0 || 
                                     getTopicsForSubjectAndGrade(subject || '', grade).includes('Topic of Own Choice') && 
                                     (topic === 'Topic of Own Choice' || !getTopicsForSubjectAndGrade(subject || '', grade).includes(topic));
                  return (
                  <div 
                    key={topic} 
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
                  >
                    {isEditable ? (
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => handleTopicNameChange(topic, e.target.value)}
                        className="font-bold text-slate-700 text-lg bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none w-1/2"
                      />
                    ) : (
                      <span className="font-bold text-slate-700 text-lg">{topic}</span>
                    )}
                    <div className="flex items-center gap-3">
                      <input
                        ref={el => inputRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={marks[topic] || ''}
                        onChange={(e) => handleMarkChange(topic, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-20 h-12 text-center text-xl font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        placeholder="-"
                      />
                      <span className="text-slate-400 font-bold">/ 10</span>
                    </div>
                  </div>
                )})}
              </div>
              
              {getTopicsForSubjectAndGrade(subject || '', grade).length === 0 && (
                <div className="mb-8">
                  <button
                    onClick={handleAddTopic}
                    className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 font-bold rounded-xl transition-colors"
                  >
                    + Add Another Topic
                  </button>
                </div>
              )}

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl mb-8">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
                    <p className="text-xl font-bold text-slate-800">{stats.total} <span className="text-sm text-slate-400">/ {stats.maxTotal}</span></p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average</p>
                    <p className="text-xl font-bold text-slate-800">{stats.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Symbol</p>
                    <p className={`text-2xl font-black ${
                      stats.symbol === 'A' ? 'text-emerald-500' :
                      stats.symbol === 'B' ? 'text-blue-500' :
                      stats.symbol === 'C' ? 'text-yellow-500' :
                      stats.symbol === 'D' ? 'text-orange-500' :
                      'text-red-500'
                    }`}>{stats.symbol}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsReviewing(true)}
                disabled={Object.values(marks).filter(m => m !== '').length !== activeTopics.length}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review & Submit
                <CheckCircle size={20} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
