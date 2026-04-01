import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { getStudentsByAssignedClass, getTopicAssessments } from '../../../services/dataService';
import { Student, TopicAssessmentRecord } from '../../../types';
import { getTopicsForSubjectAndGrade } from '../../../utils/assessmentTopics';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function TopicSelection({ user }: { user: any }) {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<TopicAssessmentRecord[]>([]);

  const topics = getTopicsForSubjectAndGrade(subject || '', user?.assignedClass || '');

  useEffect(() => {
    if (user?.assignedClass) {
      getStudentsByAssignedClass(user.assignedClass).then(setStudents);
    }
  }, [user]);

  useEffect(() => {
    if (user?.assignedClass && subject) {
      const termId = activeTerm.toLowerCase().replace(' ', '-');
      getTopicAssessments(user.assignedClass, termId, subject).then(setAssessments);
    }
  }, [user, activeTerm, subject]);

  return (
    <div className="w-full px-5 py-6">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/teacher/assess')}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{subject}</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Select a term and topic</p>
      </div>

      <hr className="border-slate-200 mb-8" />

      {topics.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
          <h2 className="text-xl font-bold text-slate-700 mb-2">Topics Coming Soon</h2>
          <p className="text-slate-500">Topics for {subject} in {user?.assignedClass} are not yet available. They will be added in the future.</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
              {TERMS.map(term => (
                <button
                  key={term}
                  onClick={() => setActiveTerm(term)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeTerm === term 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((topic, index) => {
              const topicAssessments = assessments.filter(a => a.topic === topic);
              const recordedCount = topicAssessments.length;
              const totalStudents = students.length;
              const missingCount = totalStudents - recordedCount;
              
              const passes = topicAssessments.filter(a => a.mark >= 5).length;
              const passRate = recordedCount > 0 ? Math.round((passes / recordedCount) * 100) : 0;
              
              return (
                <button
                  key={topic}
                  onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject || '')}/${encodeURIComponent(activeTerm)}/${encodeURIComponent(topic)}`)}
                  className="flex flex-col p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex justify-between items-start w-full mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic {index + 1}</span>
                    {missingCount > 0 && totalStudents > 0 && (
                      <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded text-xs font-bold">
                        <AlertTriangle size={12} />
                        {missingCount} missing
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-4 group-hover:text-blue-700">{topic}</h3>
                  
                  <div className="w-full mt-auto space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Recorded</span>
                      <span className="font-bold text-slate-700">{recordedCount}/{totalStudents}</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Pass Rate</span>
                        <span className="font-bold text-slate-700">{passRate}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${passRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                          style={{ width: `${passRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-900">End of Term Summary</h3>
              <p className="text-sm text-blue-700 mt-1">Review calculated totals, averages, and symbols for all learners.</p>
            </div>
            <button 
              onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject || '')}/${encodeURIComponent(activeTerm)}/review`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              Review {activeTerm}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
