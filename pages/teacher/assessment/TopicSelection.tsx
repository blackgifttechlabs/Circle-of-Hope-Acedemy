import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Plus, Edit2, Check, X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStudentsByAssignedClass, getTopicAssessments, addCustomTopic, getCustomTopics, deleteTopic } from '../../../services/dataService';
import { Student, TopicAssessmentRecord } from '../../../types';
import { getTopicsForSubjectAndGrade } from '../../../utils/assessmentTopics';
import { Button } from '../../../components/ui/Button';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

const SkeletonCard = () => (
  <div className="flex flex-col p-5 bg-white border border-slate-200 rounded-xl animate-pulse">
    <div className="flex justify-between items-start w-full mb-3">
      <div className="h-3 w-16 bg-slate-200 rounded"></div>
    </div>
    <div className="h-6 w-3/4 bg-slate-200 rounded mb-4"></div>
    <div className="w-full mt-auto space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-slate-100 rounded"></div>
        <div className="h-4 w-8 bg-slate-100 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded"></div>
        <div className="h-2 w-full bg-slate-100 rounded-full"></div>
      </div>
    </div>
  </div>
);

export default function TopicSelection({ user }: { user: any }) {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<TopicAssessmentRecord[]>([]);
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopic, setEditingTopic] = useState<{ index: number; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ topic: string; index: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isHandwritingGrade1To3 = (subject === 'Handwriting' || subject === 'Grade 1-3 Handwriting') && 
                                 (user?.assignedClass?.match(/Grade [1-3]/i));

  const defaultTopics = getTopicsForSubjectAndGrade(subject || '', user?.assignedClass || '');

  useEffect(() => {
    if (user?.assignedClass) {
      getStudentsByAssignedClass(user.assignedClass).then(setStudents);
    }
  }, [user]);

  const fetchTopics = async () => {
    if (user?.assignedClass && subject) {
      setLoading(true);
      const termId = activeTerm.toLowerCase().replace(' ', '-');
      
      const [assessmentsData, customTopicsData] = await Promise.all([
        getTopicAssessments(user.assignedClass, termId, subject),
        getCustomTopics(user.assignedClass, termId, subject)
      ]);

      setAssessments(assessmentsData);
      
      let finalTopics = [...defaultTopics];
      
      // Add custom topics that were explicitly added
      customTopicsData.forEach(ct => {
        if (!finalTopics.includes(ct)) {
          finalTopics.push(ct);
        }
      });

      // Also add topics from assessments that might not be in custom_topics or default
      const assessedTopics = assessmentsData.map(a => a.topic);
      assessedTopics.forEach(at => {
        if (!finalTopics.includes(at)) {
          finalTopics.push(at);
        }
      });
      
      const customAssessedTopic = assessedTopics.find(t => !defaultTopics.includes(t));
      
      if (defaultTopics.includes('Topic of Own Choice') && customAssessedTopic) {
          finalTopics = finalTopics.map(t => t === 'Topic of Own Choice' ? customAssessedTopic : t);
      }
      
      setActiveTopics(finalTopics);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [user, activeTerm, subject]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const topicName = newTopicName.trim();
    if (topicName && user?.assignedClass && subject) {
      const termId = activeTerm.toLowerCase().replace(' ', '-');
      setLoading(true);
      const success = await addCustomTopic(user.assignedClass, termId, subject, topicName);
      if (success) {
        setNewTopicName('');
        setIsAddingTopic(false);
        await fetchTopics();
      } else {
        setLoading(false);
      }
    }
  };

  const handleDeleteTopic = async () => {
    if (showDeleteConfirm && user?.assignedClass && subject) {
      setIsDeleting(true);
      const termId = activeTerm.toLowerCase().replace(' ', '-');
      const success = await deleteTopic(user.assignedClass, termId, subject, showDeleteConfirm.topic);
      if (success) {
        await fetchTopics();
      }
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  const handleSaveEdit = (index: number) => {
    if (editingTopic && editingTopic.name.trim()) {
      const updatedTopics = [...activeTopics];
      updatedTopics[index] = editingTopic.name.trim();
      setActiveTopics(updatedTopics);
      setEditingTopic(null);
    }
  };

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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTopics.map((topic, index) => {
            const topicAssessments = assessments.filter(a => a.topic === topic);
            const recordedCount = topicAssessments.length;
            const totalStudents = students.length;
            const missingCount = totalStudents - recordedCount;
            
            const passes = topicAssessments.filter(a => a.mark >= 5).length;
            const passRate = recordedCount > 0 ? Math.round((passes / recordedCount) * 100) : 0;
            
            const isTopicOfChoice = topic === 'Topic of Own Choice' || (defaultTopics.includes('Topic of Own Choice') && !defaultTopics.includes(topic));

            return (
              <div
                key={`${topic}-${index}`}
                className="flex flex-col p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all text-left group relative"
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic {index + 1}</span>
                  <div className="flex items-center gap-2">
                    {isTopicOfChoice && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTopic({ index, name: topic });
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm({ topic, index });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {missingCount > 0 && totalStudents > 0 && (
                      <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded text-xs font-bold">
                        <AlertTriangle size={12} />
                        {missingCount} missing
                      </div>
                    )}
                  </div>
                </div>
                
                {editingTopic?.index === index ? (
                  <div className="mb-4 flex gap-2">
                    <input 
                      autoFocus
                      type="text"
                      value={editingTopic.name}
                      onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(index); }}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingTopic(null); }}
                      className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <h3 
                    onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject || '')}/${encodeURIComponent(activeTerm)}/${encodeURIComponent(topic)}`)}
                    className="text-lg font-bold text-slate-800 mb-4 group-hover:text-blue-700 cursor-pointer"
                  >
                    {topic}
                  </h3>
                )}
                
                <div 
                  onClick={() => navigate(`/teacher/assess/${encodeURIComponent(subject || '')}/${encodeURIComponent(activeTerm)}/${encodeURIComponent(topic)}`)}
                  className="w-full mt-auto space-y-3 cursor-pointer"
                >
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
              </div>
            );
          })}

          {isHandwritingGrade1To3 && (
            isAddingTopic ? (
              <form onSubmit={handleAddTopic} className="flex flex-col p-5 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">New Topic</span>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Enter topic name..."
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full px-4 py-3 border border-blue-300 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold"
                />
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Topic'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingTopic(false)}
                    className="px-4 py-2.5 bg-white text-slate-600 font-bold border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingTopic(true)}
                className="flex flex-col items-center justify-center p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group min-h-[180px]"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:border-blue-400 group-hover:text-blue-600 transition-all">
                  <Plus size={24} />
                </div>
                <span className="font-bold text-slate-500 group-hover:text-blue-600">Add Custom Topic</span>
              </button>
            )
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold">Delete Topic?</h3>
            </div>
            
            <p className="text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{showDeleteConfirm.topic}"</span>? 
              This will also remove all assessment records associated with this topic for this term. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteTopic}
                loading={isDeleting}
              >
                Delete Topic
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {!loading && (
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
      )}
    </div>
  );
}
