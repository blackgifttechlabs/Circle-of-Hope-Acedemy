import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import {
  addCustomTopic,
  deleteTopic,
  getCustomTopicEntries,
  getStudentsForTeacherByClass,
  getTopicAssessments,
  getTopicOverrides,
  renameTopic,
} from '../../../services/dataService';
import { Student, TopicAssessmentRecord } from '../../../types';
import {
  getAssessmentRecordKey,
  getDefaultThemesForSubject,
  getDefaultTopicsForTheme,
  getSubjectLabel,
  isGrade1To7Class,
} from '../../../utils/assessmentWorkflow';
import { getTopicLabelParts } from '../../../utils/topicLabelFormat';
import { navigateBackOr } from '../../../utils/navigation';
import { getSelectedTeachingClass, withTeachingClass } from '../../../utils/teacherClassSelection';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];

type TopicCard = {
  topic: string;
  topicId?: string;
  originalTopic?: string;
  theme?: string;
  componentId?: string;
  isCustom?: boolean;
};

const TopicLabel = ({ topic }: { topic: string }) => {
  const parts = getTopicLabelParts(topic);
  if (!parts.prefix) return <>{parts.full}</>;
  return (
    <>
      <span className="text-blue-600">{parts.prefix}:</span>{' '}
      <span>{parts.suffix}</span>
    </>
  );
};

const SkeletonCard = () => (
  <div className="flex flex-col p-5 bg-white border border-slate-200 rounded-xl animate-pulse">
    <div className="flex justify-between items-start w-full mb-3">
      <div className="h-3 w-16 bg-slate-200 rounded" />
    </div>
    <div className="h-6 w-3/4 bg-slate-200 rounded mb-4" />
    <div className="w-full mt-auto space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-slate-100 rounded" />
        <div className="h-4 w-8 bg-slate-100 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-2 w-full bg-slate-100 rounded-full" />
      </div>
    </div>
  </div>
);

export default function TopicSelection({ user }: { user: any }) {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const className = getSelectedTeachingClass(user, location.search);
  const gradeKey = getAssessmentRecordKey(className);
  const standardWorkflow = isGrade1To7Class(className);
  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [activeThemeId, setActiveThemeId] = useState('0');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<TopicAssessmentRecord[]>([]);
  const [topicCards, setTopicCards] = useState<TopicCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopic, setEditingTopic] = useState<{ index: number; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ topic: TopicCard; index: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const termId = activeTerm.toLowerCase().replace(' ', '-');
  const themes = getDefaultThemesForSubject(className, termId, subject || '');
  const activeThemeLabel = themes[Number(activeThemeId)]?.label;

  useEffect(() => {
    if (className) {
      getStudentsForTeacherByClass(user.id, className).then((data) => {
        setStudents(data.filter((student) => student.studentStatus === 'ENROLLED'));
      });
    }
  }, [className, user.id]);

  useEffect(() => {
    if (themes.length === 0) return;
    if (!themes[Number(activeThemeId)]) {
      setActiveThemeId('0');
    }
  }, [activeTerm, subject, themes.length]);

  const fetchTopics = async () => {
    if (!subject) return;

    setLoading(true);
    const [assessmentsData, customTopics, overrides] = await Promise.all([
      getTopicAssessments(gradeKey, termId, subject),
      getCustomTopicEntries(gradeKey, termId, subject),
      getTopicOverrides(gradeKey, termId, subject),
    ]);

    setAssessments(assessmentsData);

    const defaultTopics = getDefaultTopicsForTheme(className, termId, subject, activeThemeId);
    const scopedOverrides = overrides.filter((override) => !override.theme || override.theme === activeThemeLabel);

    const nextTopics: TopicCard[] = defaultTopics
      .map((topic) => {
        const override = scopedOverrides.find((item) => item.originalTopic === topic.label);
        if (override?.deleted) return null;
        return {
          topic: override?.topic || topic.label,
          topicId: topic.id,
          originalTopic: topic.label,
          theme: topic.theme,
          componentId: topic.componentId,
        };
      })
      .filter(Boolean) as TopicCard[];

    if (standardWorkflow) {
      customTopics.forEach((customTopic) => {
        if (!nextTopics.some((item) => item.topic === customTopic.topic)) {
          nextTopics.push({
            topic: customTopic.topic,
            theme: customTopic.theme,
            isCustom: true,
          });
        }
      });
    }

    assessmentsData
      .filter((item) => !activeThemeLabel || item.theme === activeThemeLabel || !item.theme)
      .forEach((item) => {
        if (!nextTopics.some((topic) => topic.topic === item.topic && topic.theme === item.theme)) {
          nextTopics.push({
            topic: item.topic,
            topicId: item.topicId,
            theme: item.theme,
            isCustom: !defaultTopics.some((topic) => topic.label === item.topic),
          });
        }
      });

    setTopicCards(nextTopics);
    setLoading(false);
  };

  useEffect(() => {
    fetchTopics();
  }, [activeTerm, activeThemeId, subject, className]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const topicName = newTopicName.trim();
    if (!topicName || !subject) return;

    setLoading(true);
    const success = await addCustomTopic(gradeKey, termId, subject, topicName);
    if (success) {
      setNewTopicName('');
      setIsAddingTopic(false);
      await fetchTopics();
    } else {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!showDeleteConfirm || !subject) return;

    setIsDeleting(true);
    const success = await deleteTopic(gradeKey, termId, subject, showDeleteConfirm.topic.topic, {
      theme: showDeleteConfirm.topic.theme,
      originalTopic: showDeleteConfirm.topic.originalTopic,
      isCustom: showDeleteConfirm.topic.isCustom,
    });
    if (success) {
      await fetchTopics();
    }
    setIsDeleting(false);
    setShowDeleteConfirm(null);
  };

  const handleSaveEdit = async (index: number) => {
    if (!editingTopic || !subject) return;
    const currentTopic = topicCards[index];
    const nextName = editingTopic.name.trim();
    if (!currentTopic || !nextName) return;

    const success = await renameTopic(gradeKey, termId, subject, currentTopic.topic, nextName, {
      theme: currentTopic.theme,
      originalTopic: currentTopic.originalTopic,
      topicId: currentTopic.topicId,
      isCustom: currentTopic.isCustom,
    });

    if (success) {
      setEditingTopic(null);
      await fetchTopics();
    }
  };

  return (
    <div className="w-full px-5 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigateBackOr(navigate as any, withTeachingClass('/teacher/classes', className))}
          className="mb-4 p-2 hover:bg-slate-100 rounded-full transition-colors inline-flex"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{getSubjectLabel(subject || '', className)}</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {className ? `${className} · ` : ''}
          {standardWorkflow ? 'Select a term and topic.' : 'Select a term, switch the theme tabs, then choose a topic.'}
        </p>
      </div>

      <hr className="border-slate-200 mb-8" />

      <div className="space-y-6 mb-8">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          {TERMS.map((term) => (
            <button
              key={term}
              onClick={() => setActiveTerm(term)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTerm === term ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {term}
            </button>
          ))}
        </div>

        {!standardWorkflow && themes.length > 0 && (
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {themes.map((theme, index) => (
              <button
                key={theme.label}
                onClick={() => setActiveThemeId(String(index))}
                className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                  activeThemeId === String(index) ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        )}

        {standardWorkflow && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Teachers can edit or remove any topic card here. Added topics stay under this subject.
            </p>
            {!isAddingTopic ? (
              <button
                onClick={() => setIsAddingTopic(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Topic
              </button>
            ) : (
              <form onSubmit={handleAddTopic} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="New topic name"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button type="submit" className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTopic(false);
                    setNewTopicName('');
                  }}
                  className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X size={16} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topicCards.map((topicCard, index) => {
            const topicAssessments = assessments.filter((item) => (
              item.topic === topicCard.topic && (!topicCard.theme || item.theme === topicCard.theme || !item.theme)
            ));
            const recordedCount = topicAssessments.length;
            const totalStudents = students.length;
            const missingCount = Math.max(totalStudents - recordedCount, 0);
            const passes = topicAssessments.filter((item) => item.mark >= (standardWorkflow ? 5 : 2)).length;
            const passRate = recordedCount > 0 ? Math.round((passes / recordedCount) * 100) : 0;

            return (
              <div
                key={`${topicCard.topic}-${index}`}
                className="flex flex-col p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition-all text-left group relative"
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topic {index + 1}</span>
                    {!standardWorkflow && topicCard.theme && (
                      <p className="text-xs text-slate-400 mt-1">{topicCard.theme}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTopic({ index, name: topicCard.topic });
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm({ topic: topicCard, index });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(index);
                      }}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTopic(null);
                      }}
                      className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <h3
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (topicCard.theme) params.set('theme', topicCard.theme);
                      if (topicCard.topicId) params.set('topicId', topicCard.topicId);
                      if (topicCard.originalTopic) params.set('originalTopic', topicCard.originalTopic);
                      const path = `/teacher/assess/${encodeURIComponent(subject || '')}/${encodeURIComponent(activeTerm)}/${encodeURIComponent(topicCard.topic)}${params.toString() ? `?${params.toString()}` : ''}`;
                      navigate(withTeachingClass(path, className));
                    }}
                    className="text-lg font-bold text-slate-800 mb-4 group-hover:text-blue-700 cursor-pointer"
                  >
                    <TopicLabel topic={topicCard.topic} />
                  </h3>
                )}

                <div className="mt-auto space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Recorded</span>
                    <span className="font-bold text-slate-700">{recordedCount}/{totalStudents}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500 font-medium">Pass rate</span>
                      <span className="font-bold text-slate-700">{passRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${passRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {topicCards.length === 0 && (
            <div className="col-span-full p-10 bg-white border border-dashed border-slate-300 rounded-xl text-center text-slate-500">
              No topics are available for this selection yet.
            </div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Delete topic</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Delete <span className="font-bold">{getTopicLabelParts(showDeleteConfirm.topic.topic).full}</span>? Existing marks for this topic will also be removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTopic}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-70"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
