import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Save, User } from 'lucide-react';
import {
  getCustomTopicEntries,
  getStudentById,
  getTopicAssessments,
  getTopicOverrides,
  saveTopicAssessments,
} from '../../../services/dataService';
import { Student } from '../../../types';
import { Toast } from '../../../components/ui/Toast';
import {
  getAssessmentRecordKey,
  getAssessmentSubjects,
  getDefaultThemesForSubject,
  getDefaultTopicsForTheme,
  getSubjectLabel,
  isGrade1To7Class,
} from '../../../utils/assessmentWorkflow';
import { getTopicLabelParts } from '../../../utils/topicLabelFormat';
import { navigateBackOr } from '../../../utils/navigation';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

type TopicMeta = {
  topicId?: string;
  theme?: string;
  editable?: boolean;
};

export default function StudentAssessment({ user }: { user?: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  
  const [subject, setSubject] = useState<string>('');
  const [term, setTerm] = useState<string>('Term 1');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [topicMeta, setTopicMeta] = useState<Record<string, TopicMeta>>({});
  const [activeThemeId, setActiveThemeId] = useState('0');
  const [themeTabs, setThemeTabs] = useState<string[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const className = user?.assignedClass || student?.assignedClass || student?.grade || '';
  const standardWorkflow = isGrade1To7Class(className);
  const gradeKey = getAssessmentRecordKey(className);
  const maxMark = standardWorkflow ? 10 : 3;
  const allSubjects = getAssessmentSubjects(className);
  const termId = term.toLowerCase().replace(' ', '-');
  const activeTheme = themeTabs[Number(activeThemeId)];

  useEffect(() => {
    if (id) {
      getStudentById(id).then(data => {
        if (data) setStudent(data);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!subject) {
      setThemeTabs([]);
      setActiveThemeId('0');
      setActiveTopics([]);
      setTopicMeta({});
      setMarks({});
      return;
    }
    const themes = getDefaultThemesForSubject(className, termId, subject).map((item) => item.label);
    setThemeTabs(themes);
    if (themes.length > 0 && !themes[Number(activeThemeId)]) {
      setActiveThemeId('0');
    }
  }, [className, subject, termId, activeThemeId]);

  useEffect(() => {
    if (!student || !subject) return;

    const loadTopics = async () => {
      const [assessments, customTopics, overrides] = await Promise.all([
        getTopicAssessments(gradeKey, termId, subject),
        getCustomTopicEntries(gradeKey, termId, subject),
        getTopicOverrides(gradeKey, termId, subject),
      ]);

      const themeLabel = themeTabs[Number(activeThemeId)];
      const defaultTopics = standardWorkflow
        ? getDefaultTopicsForTheme(className, termId, subject, 'default')
        : getDefaultTopicsForTheme(className, termId, subject, activeThemeId);
      const scopedOverrides = overrides.filter((item) => !themeLabel || item.theme === themeLabel || !item.theme);

      const nextTopics: string[] = [];
      const nextMeta: Record<string, TopicMeta> = {};

      defaultTopics.forEach((item) => {
        const override = scopedOverrides.find((entry) => entry.originalTopic === item.label);
        if (override?.deleted) return;
        const topicName = override?.topic || item.label;
        nextTopics.push(topicName);
        nextMeta[topicName] = {
          topicId: item.id,
          theme: item.theme,
          editable: false,
        };
      });

      if (standardWorkflow) {
        customTopics.forEach((item) => {
          if (!nextTopics.includes(item.topic)) {
            nextTopics.push(item.topic);
            nextMeta[item.topic] = { theme: item.theme, editable: true };
          }
        });
      }

      assessments
        .filter((item) => !themeLabel || item.theme === themeLabel || !item.theme)
        .forEach((item) => {
          if (!nextTopics.includes(item.topic)) {
            nextTopics.push(item.topic);
            nextMeta[item.topic] = {
              topicId: item.topicId,
              theme: item.theme,
              editable: standardWorkflow,
            };
          }
        });

      const studentAssessments = assessments.filter((item) => item.studentId === student.id);
      const nextMarks: Record<string, string> = {};
      nextTopics.forEach((topicName) => {
        nextMarks[topicName] = '';
      });
      studentAssessments.forEach((item) => {
        nextMarks[item.topic] = item.mark.toString();
      });

      setActiveTopics(nextTopics);
      setTopicMeta(nextMeta);
      setMarks(nextMarks);
    };

    loadTopics();
  }, [student, subject, termId, activeThemeId, className, gradeKey, standardWorkflow, themeTabs]);

  const handleMarkChange = (topic: string, value: string) => {
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= maxMark)) {
      setMarks(prev => ({ ...prev, [topic]: value }));
    }
  };

  const handleTopicNameChange = (oldTopic: string, newTopic: string) => {
    if (oldTopic === newTopic || !newTopic.trim()) return;
    
    setActiveTopics(prev => prev.map(t => t === oldTopic ? newTopic : t));
    setTopicMeta((prev) => {
      const next = { ...prev, [newTopic]: prev[oldTopic] || { editable: true } };
      delete next[oldTopic];
      return next;
    });
    
    setMarks(prev => {
      const newMarks = { ...prev };
      newMarks[newTopic] = newMarks[oldTopic];
      delete newMarks[oldTopic];
      return newMarks;
    });
  };

  const handleAddTopic = () => {
    if (!standardWorkflow) return;
    const newTopic = `New Topic ${activeTopics.length + 1}`;
    setActiveTopics(prev => [...prev, newTopic]);
    setTopicMeta((prev) => ({ ...prev, [newTopic]: { editable: true } }));
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
    const maxTotal = activeTopics.length * maxMark;
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
    if (!student || !subject || !term) return;
    
    setIsSubmitting(true);
    try {
      for (const [topic, markStr] of Object.entries(marks)) {
        if (markStr !== '') {
          const numericMarks: Record<string, number> = {
            [student.id]: parseInt(markStr)
          };
          await saveTopicAssessments(gradeKey, termId, subject, topic, numericMarks, {
            theme: topicMeta[topic]?.theme || activeTheme,
            topicId: topicMeta[topic]?.topicId,
          });
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
              <p className="font-bold text-slate-800">{getSubjectLabel(subject, className)}</p>
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
                  <td className="p-4 font-bold text-slate-700">{getTopicLabelParts(topic).full}</td>
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
          onClick={() => navigateBackOr(navigate as any, '/teacher/classes')}
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
                  key={s.id}
                  onClick={() => setSubject(s.id)}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all text-left font-bold text-slate-700 hover:text-blue-700"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {!standardWorkflow && themeTabs.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Theme</p>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {themeTabs.map((theme, index) => (
                  <button
                    key={theme}
                    onClick={() => setActiveThemeId(String(index))}
                    className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                      activeThemeId === String(index)
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</p>
              <button 
                onClick={() => setSubject('')}
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {getSubjectLabel(subject, className)}
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
              <p className="text-slate-500 mb-4">Topics for {getSubjectLabel(subject, className)} in {student.grade} are not yet available.</p>
              {standardWorkflow && (
                <button
                  onClick={handleAddTopic}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  Add Topic
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-8">
                {activeTopics.map((topic, index) => {
                  const isEditable = Boolean(topicMeta[topic]?.editable);
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
                      <span className="font-bold text-slate-700 text-lg">{getTopicLabelParts(topic).full}</span>
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
                      <span className="text-slate-400 font-bold">/ {maxMark}</span>
                    </div>
                  </div>
                )})}
              </div>
              
              {standardWorkflow && activeTopics.length > 0 && (
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
