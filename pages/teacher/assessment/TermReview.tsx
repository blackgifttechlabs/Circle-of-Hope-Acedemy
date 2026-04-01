import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getStudentsByAssignedClass, getTopicAssessments } from '../../../services/dataService';
import { Student, TopicAssessmentRecord } from '../../../types';
import { getTopicsForSubjectAndGrade } from '../../../utils/assessmentTopics';

export default function TermReview({ user }: { user: any }) {
  const { subject, term } = useParams<{ subject: string, term: string }>();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<TopicAssessmentRecord[]>([]);

  const topics = getTopicsForSubjectAndGrade(subject || '', user?.assignedClass || '');

  useEffect(() => {
    if (user?.assignedClass && subject && term) {
      const termId = term.toLowerCase().replace(' ', '-');
      
      Promise.all([
        getStudentsByAssignedClass(user.assignedClass),
        getTopicAssessments(user.assignedClass, termId, subject)
      ]).then(([studentsData, assessmentsData]) => {
        const sorted = studentsData.sort((a: Student, b: Student) => a.name.localeCompare(b.name));
        setStudents(sorted);
        setAssessments(assessmentsData);
      });
    }
  }, [user, subject, term]);

  const getStudentMark = (studentId: string, topic: string) => {
    const record = assessments.find(a => a.studentId === studentId && a.topic === topic);
    return record ? record.mark : null;
  };

  const calculateStudentAverage = (studentId: string) => {
    const studentMarks = assessments.filter(a => a.studentId === studentId).map(a => a.mark);
    if (studentMarks.length === 0) return 0;
    const sum = studentMarks.reduce((a, b) => a + b, 0);
    return Math.round((sum / (topics.length * 10)) * 100);
  };

  const calculateTopicAverage = (topic: string) => {
    const topicMarks = assessments.filter(a => a.topic === topic).map(a => a.mark);
    if (topicMarks.length === 0) return 0;
    const sum = topicMarks.reduce((a, b) => a + b, 0);
    return Math.round((sum / (topicMarks.length * 10)) * 100);
  };

  return (
    <div className="w-full px-5 py-6">
      <div className="mb-6">
        <button 
          onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject || '')}`)}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Term Review</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">{subject} • {term}</p>
      </div>

      <hr className="border-slate-200 mb-8" />

      {topics.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
          <h2 className="text-xl font-bold text-slate-700 mb-2">Topics Coming Soon</h2>
          <p className="text-slate-500">Topics for {subject} in {user?.assignedClass} are not yet available. They will be added in the future.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm mb-8">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Learner Name
                </th>
                {topics.map((topic, i) => (
                  <th key={topic} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    T{i + 1}
                  </th>
                ))}
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-blue-50">
                  Average
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const avg = calculateStudentAverage(student.id);
                return (
                  <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100">
                      {student.name}
                    </td>
                    {topics.map(topic => {
                      const mark = getStudentMark(student.id, topic);
                      return (
                        <td key={topic} className="p-4 text-center text-slate-600 font-medium">
                          {mark !== null ? mark : '-'}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center font-bold text-blue-700 bg-blue-50/50">
                      {avg}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="p-4 font-bold text-slate-700 sticky left-0 bg-slate-50 border-r border-slate-200">
                  Topic Average
                </td>
                {topics.map(topic => (
                  <td key={topic} className="p-4 text-center font-bold text-slate-700">
                    {calculateTopicAverage(topic)}%
                  </td>
                ))}
                <td className="p-4 text-center font-bold text-slate-700 bg-blue-50">
                  -
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
